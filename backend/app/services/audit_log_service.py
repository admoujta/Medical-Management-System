from datetime import UTC, datetime

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, PatientProfile, User


def role_code(user: User) -> str:
    names={role.name.upper() for role in user.roles}
    for code in ("MEDECIN_ADMIN","SECRETAIRE","PATIENT"):
        if code in names:return code
    return next(iter(names),"INCONNU")


def log_access(db:Session,user:User,*,patient_id:str|None,action:str,resource_type:str,resource_id:str|None,request:Request|None=None,details:str|None=None) -> None:
    if not user.tenant_id:return
    if patient_id:
        exists=db.scalar(select(PatientProfile.id).where(PatientProfile.id==patient_id,PatientProfile.tenant_id==user.tenant_id))
        if not exists:raise HTTPException(403,"Le patient n’appartient pas à ce cabinet.")
    forwarded=request.headers.get("x-forwarded-for") if request else None
    ip=(forwarded.split(",",1)[0].strip() if forwarded else request.client.host if request and request.client else None)
    db.add(AuditLog(tenant_id=user.tenant_id,user_id=user.id,user_role=role_code(user),patient_id=patient_id,action=action,resource_type=resource_type,resource_id=resource_id,ip_address=ip,user_agent=(request.headers.get("user-agent","")[:500] or None) if request else None,access_datetime=datetime.now(UTC),details=details,event_metadata={"medical_content_included":False}))
    db.commit()


def cabinet_logs(db:Session,user:User):
    if role_code(user)!="MEDECIN_ADMIN":raise HTTPException(403,"Accès réservé au médecin administrateur.")
    return list(db.scalars(select(AuditLog).where(AuditLog.tenant_id==user.tenant_id).order_by(AuditLog.access_datetime.desc()).limit(5000)).all())


def patient_logs(db:Session,user:User,patient_id:str):
    if role_code(user)!="MEDECIN_ADMIN":raise HTTPException(403,"Accès réservé au médecin administrateur.")
    if not db.scalar(select(PatientProfile.id).where(PatientProfile.id==patient_id,PatientProfile.tenant_id==user.tenant_id)):raise HTTPException(404,"Patient introuvable.")
    return list(db.scalars(select(AuditLog).where(AuditLog.tenant_id==user.tenant_id,AuditLog.patient_id==patient_id).order_by(AuditLog.access_datetime.desc())).all())


def user_logs(db:Session,user:User,user_id:str):
    if role_code(user)!="MEDECIN_ADMIN":raise HTTPException(403,"Accès réservé au médecin administrateur.")
    if not db.scalar(select(User.id).where(User.id==user_id,User.tenant_id==user.tenant_id)):raise HTTPException(404,"Utilisateur introuvable.")
    return list(db.scalars(select(AuditLog).where(AuditLog.tenant_id==user.tenant_id,AuditLog.user_id==user_id).order_by(AuditLog.access_datetime.desc())).all())
