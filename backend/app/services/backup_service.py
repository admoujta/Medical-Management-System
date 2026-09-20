import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

import psycopg
from psycopg import sql
from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import BackupLog, RestoreLog, User
from app.services.admin_service import log_action, require_super_admin

TABLES=("patient_profiles","appointments","visits","fees","payments","prescriptions","medical_documents","cnss_cases")

def _connection():
    url=make_url(settings.database_url)
    return {"host":url.host or "localhost","port":url.port or 5432,"user":url.username or "postgres","password":url.password or "","dbname":url.database or "postgres"}

def _env():
    env=os.environ.copy();env["PGPASSWORD"]=_connection()["password"];return env

def _sha256(path:Path)->str:
    digest=hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b""):digest.update(chunk)
    return digest.hexdigest()

def _safe_path(relative:str|None)->Path:
    if not relative:raise FileNotFoundError("Chemin de sauvegarde absent.")
    root=Path(settings.backup_dir).resolve();path=(root/relative).resolve()
    if root not in path.parents or not path.is_file():raise FileNotFoundError("Fichier de sauvegarde introuvable.")
    return path

def create_backup(db:Session,user:User|None=None,triggered_by:str="automatic",backup_type:str="full")->BackupLog:
    if user:require_super_admin(user)
    row=BackupLog(backup_type=backup_type,status="running",started_at=datetime.now(UTC),triggered_by=triggered_by,triggered_by_user_id=user.id if user else None);db.add(row);db.commit();db.refresh(row)
    root=Path(settings.backup_dir);root.mkdir(parents=True,exist_ok=True);os.chmod(root,0o700)
    stamp=datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ");name=f"fadaa-full-{stamp}-{row.id[:8]}.tar.gz";target=root/name
    try:
        conn=_connection()
        with tempfile.TemporaryDirectory(prefix="fadaa-backup-") as tmp_name:
            tmp=Path(tmp_name);dump=tmp/"database.dump"
            subprocess.run(["pg_dump","-Fc","-h",conn["host"],"-p",str(conn["port"]),"-U",conn["user"],"-d",conn["dbname"],"-f",str(dump)],env=_env(),check=True,capture_output=True,text=True,timeout=1800)
            uploads=Path(settings.upload_dir);files=[]
            if uploads.exists():
                for path in uploads.rglob("*"):
                    if path.is_file():files.append({"path":str(path.relative_to(uploads)),"size":path.stat().st_size,"sha256":_sha256(path)})
            manifest={"format_version":1,"created_at":datetime.now(UTC).isoformat(),"database":"database.dump","database_sha256":_sha256(dump),"files":files,"required_tables":list(TABLES)}
            (tmp/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf-8")
            with tarfile.open(target,"w:gz") as archive:
                archive.add(dump,arcname="database.dump");archive.add(tmp/"manifest.json",arcname="manifest.json")
                if uploads.exists():archive.add(uploads,arcname="uploads",recursive=True)
        os.chmod(target,0o600);row.status="success";row.backup_path=name;row.size=target.stat().st_size;row.checksum=_sha256(target);row.finished_at=datetime.now(UTC)
        if user:log_action(db,user,"admin.backup.created","backup",row.id,{"type":backup_type,"size":row.size})
    except Exception as exc:
        row.status="failed";row.error_message=str(exc)[:2000];row.finished_at=datetime.now(UTC)
    db.commit();db.refresh(row);return row

def test_restore(db:Session,user:User|None,backup_id:str)->RestoreLog:
    if user:require_super_admin(user)
    backup=db.get(BackupLog,backup_id)
    if not backup or backup.status!="success":raise ValueError("Sauvegarde valide introuvable.")
    row=RestoreLog(backup_log_id=backup.id,status="running",started_at=datetime.now(UTC),restored_by_user_id=user.id if user else None,restore_scope="full");db.add(row);db.commit();db.refresh(row)
    test_db=f"fadaa_restore_test_{uuid4().hex[:12]}";conn=_connection();verification={}
    try:
        archive_path=_safe_path(backup.backup_path)
        if backup.checksum and _sha256(archive_path)!=backup.checksum:raise ValueError("L’archive ne correspond plus à son empreinte SHA-256.")
        with tempfile.TemporaryDirectory(prefix="fadaa-restore-test-") as tmp_name:
            tmp=Path(tmp_name)
            with tarfile.open(archive_path,"r:gz") as archive:archive.extractall(tmp,filter="data")
            manifest=json.loads((tmp/"manifest.json").read_text(encoding="utf-8"));dump=tmp/"database.dump"
            if _sha256(dump)!=manifest["database_sha256"]:raise ValueError("Le dump PostgreSQL est corrompu.")
            missing=[];invalid=[]
            for item in manifest.get("files",[]):
                path=tmp/"uploads"/item["path"]
                if not path.is_file():missing.append(item["path"])
                elif path.stat().st_size!=item["size"] or _sha256(path)!=item["sha256"]:invalid.append(item["path"])
            verification["files"]={"expected":len(manifest.get("files",[])),"missing":len(missing),"invalid":len(invalid)}
            if missing or invalid:raise ValueError(f"Fichiers invalides : {len(missing)} manquants, {len(invalid)} corrompus.")
            with psycopg.connect(host=conn["host"],port=conn["port"],user=conn["user"],password=conn["password"],dbname="postgres",autocommit=True) as admin:
                admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(test_db)))
            restore_process=subprocess.run(["pg_restore","--no-owner","--no-privileges","-h",conn["host"],"-p",str(conn["port"]),"-U",conn["user"],"-d",test_db,str(dump)],env=_env(),check=False,capture_output=True,text=True,timeout=1800)
            restore_messages=(restore_process.stderr or "").strip()
            verification["pg_restore"]={"return_code":restore_process.returncode,"warnings":restore_messages[-2000:] if restore_messages else None}
            with psycopg.connect(host=conn["host"],port=conn["port"],user=conn["user"],password=conn["password"],dbname=test_db) as restored:
                counts={table:restored.execute(sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(table))).fetchone()[0] for table in TABLES}
                orphan_checks={"appointments_without_patient":"SELECT count(*) FROM appointments a LEFT JOIN patient_profiles p ON p.id=a.patient_id WHERE p.id IS NULL","documents_without_patient":"SELECT count(*) FROM medical_documents d LEFT JOIN patient_profiles p ON p.id=d.patient_id WHERE p.id IS NULL","payments_without_fee":"SELECT count(*) FROM payments p LEFT JOIN fees f ON f.id=p.fee_id WHERE f.id IS NULL"}
                orphans={key:restored.execute(query).fetchone()[0] for key,query in orphan_checks.items()}
            verification.update({"database_readable":True,"table_counts":counts,"relation_errors":orphans,"temporary_database":"verified_then_deleted"})
            if any(orphans.values()):raise ValueError("Des relations orphelines ont été détectées dans la restauration.")
            if restore_process.returncode and "transaction_timeout" not in restore_messages:
                raise ValueError(f"pg_restore a signalé une erreur : {restore_messages[-1200:]}")
        row.status="success";row.verification_result=verification;row.finished_at=datetime.now(UTC)
        if user:log_action(db,user,"admin.backup.restore_test.success","backup",backup.id,{"restore_log_id":row.id})
    except Exception as exc:
        row.status="failed";row.error_message=str(exc)[:2000];row.verification_result=verification;row.finished_at=datetime.now(UTC)
        if user:log_action(db,user,"admin.backup.restore_test.failed","backup",backup.id,{"restore_log_id":row.id})
    finally:
        try:
            with psycopg.connect(host=conn["host"],port=conn["port"],user=conn["user"],password=conn["password"],dbname="postgres",autocommit=True) as admin:
                admin.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=%s",(test_db,));admin.execute(sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(test_db)))
        except Exception:pass
    db.commit();db.refresh(row);return row

def cleanup_retention(db:Session)->int:
    threshold=datetime.now(UTC)-timedelta(days=settings.backup_retention_days);rows=db.scalars(select(BackupLog).where(BackupLog.created_at<threshold,BackupLog.status=="success")).all();deleted=0
    for row in rows:
        try:_safe_path(row.backup_path).unlink();deleted+=1
        except FileNotFoundError:pass
    return deleted
