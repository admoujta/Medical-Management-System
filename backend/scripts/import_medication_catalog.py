import argparse
import csv
import json
from pathlib import Path

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import MedicationCatalog, Tenant


parser = argparse.ArgumentParser(description="Importer un catalogue de médicaments CSV ou JSON.")
parser.add_argument("file", type=Path)
parser.add_argument("--source", required=True, help="Nom stable de la source, par exemple ANAM_MA.")
parser.add_argument("--specialty", action="append", default=[], help="Spécialité par défaut, option répétable.")
parser.add_argument("--tenant", help="Slug du cabinet pour un catalogue privé. Sans valeur, le catalogue est global.")
args = parser.parse_args()


def records(path: Path) -> list[dict]:
    if path.suffix.lower() == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, list) else payload.get("medications", [])
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as handle:
            return list(csv.DictReader(handle))
    raise SystemExit("Format non pris en charge. Utilisez .csv ou .json.")


rows = records(args.file)
if not rows:
    raise SystemExit("Le fichier ne contient aucun médicament.")

with SessionLocal() as db:
    tenant_id = None
    if args.tenant:
        tenant = db.scalar(select(Tenant).where(Tenant.slug == args.tenant))
        if not tenant:
            raise SystemExit("Cabinet introuvable.")
        tenant_id = tenant.id
    imported = updated = 0
    for raw in rows:
        name = str(raw.get("name") or raw.get("medication") or "").strip()
        external_code = str(raw.get("external_code") or raw.get("code") or "").strip() or None
        if not name:
            continue
        specialties = raw.get("specialties") or args.specialty
        if isinstance(specialties, str):
            specialties = [value.strip() for value in specialties.replace(";", ",").split(",") if value.strip()]
        item = db.scalar(select(MedicationCatalog).where(
            MedicationCatalog.source == args.source,
            MedicationCatalog.external_code == external_code,
            MedicationCatalog.tenant_id == tenant_id,
        )) if external_code else None
        values = {
            "name": name,
            "generic_name": raw.get("generic_name") or raw.get("active_ingredient"),
            "strength": raw.get("strength"),
            "form": raw.get("form"),
            "route": raw.get("route"),
            "specialties": specialties or None,
            "default_dosage": raw.get("default_dosage"),
            "default_frequency": raw.get("default_frequency"),
            "default_duration": raw.get("default_duration"),
            "default_instructions": raw.get("default_instructions"),
            "is_active": True,
        }
        if item:
            for field, value in values.items():
                setattr(item, field, value)
            updated += 1
        else:
            db.add(MedicationCatalog(
                tenant_id=tenant_id,
                source=args.source,
                external_code=external_code,
                **values,
            ))
            imported += 1
    db.commit()
    print(f"Import terminé : {imported} ajouté(s), {updated} mis à jour.")
