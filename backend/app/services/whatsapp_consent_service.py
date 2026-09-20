from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.phone import normalize_phone
from app.models import AutomaticReminderLog, PatientProfile, PaymentReminder, User, WhatsAppConsentLog


VALID_SOURCES = {
    "patient_space", "registration", "cabinet_reception", "signed_form", "other",
    "formulaire_patient", "accueil_cabinet", "inscription_web",
    "confirmation_whatsapp", "import", "autre",
}


def can_send_whatsapp(patient: PatientProfile) -> bool:
    return bool(
        patient.whatsapp_opt_in
        and patient.whatsapp_consent_status == "accepted"
        and patient.whatsapp_opt_out_at is None
        and (patient.whatsapp_phone_number or patient.user.phone)
    )


def require_can_send(patient: PatientProfile) -> None:
    if patient.whatsapp_consent_status == "withdrawn" or patient.whatsapp_opt_out_at is not None:
        raise HTTPException(409, "Ce patient a retiré son consentement pour les communications WhatsApp.")
    if patient.whatsapp_consent_status == "refused":
        raise HTTPException(409, "Ce patient refuse les communications WhatsApp.")
    if patient.whatsapp_consent_status != "accepted" or not patient.whatsapp_opt_in:
        raise HTTPException(409, "Ce patient n’a pas encore donné son consentement pour les communications WhatsApp.")
    if not (patient.whatsapp_phone_number or patient.user.phone):
        raise HTTPException(409, "Aucun numéro WhatsApp valide n’est renseigné pour ce patient.")


def _phone(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return normalize_phone(value)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


def _record(
    db: Session, patient: PatientProfile, previous_status: str | None, new_status: str,
    action: str, actor_id: str | None, source: str | None, note: str | None,
) -> None:
    db.add(WhatsAppConsentLog(
        tenant_id=patient.tenant_id,
        patient_id=patient.id,
        previous_status=previous_status,
        new_status=new_status,
        action=action,
        phone_number=patient.whatsapp_phone_number,
        source=source,
        performed_by_user_id=actor_id,
        note=note,
    ))


def grant_consent(
    db: Session, patient: PatientProfile, phone_number: str, source: str,
    actor_id: str | None, language: str = "fr", note: str | None = None,
) -> PatientProfile:
    previous = patient.whatsapp_consent_status
    patient.whatsapp_phone_number = _phone(phone_number)
    if not patient.whatsapp_phone_number:
        raise HTTPException(422, "Renseignez un numéro WhatsApp valide avant d’enregistrer le consentement.")
    patient.whatsapp_opt_in = True
    patient.whatsapp_consent_status = "accepted"
    patient.whatsapp_consent_at = datetime.now(UTC)
    patient.whatsapp_opt_out_at = None
    patient.whatsapp_consent_source = source
    patient.whatsapp_consent_collected_by_user_id = actor_id
    patient.preferred_whatsapp_language = language
    patient.whatsapp_consent_note = note
    _record(db, patient, previous, "accepted", "consent_granted", actor_id, source, note)
    db.commit()
    db.refresh(patient)
    return patient


def refuse_consent(
    db: Session, patient: PatientProfile, source: str, actor_id: str | None,
    note: str | None = None,
) -> PatientProfile:
    previous = patient.whatsapp_consent_status
    patient.whatsapp_opt_in = False
    patient.whatsapp_consent_status = "refused"
    patient.whatsapp_opt_out_at = None
    patient.whatsapp_consent_source = source
    patient.whatsapp_consent_collected_by_user_id = actor_id
    patient.whatsapp_consent_note = note
    _record(db, patient, previous, "refused", "consent_refused", actor_id, source, note)
    db.commit()
    db.refresh(patient)
    return patient


def withdraw_consent(
    db: Session, patient: PatientProfile, actor_id: str | None, reason: str | None = None,
    source: str | None = None,
) -> PatientProfile:
    previous = patient.whatsapp_consent_status
    patient.whatsapp_opt_in = False
    patient.whatsapp_consent_status = "withdrawn"
    patient.whatsapp_opt_out_at = datetime.now(UTC)
    if source is not None:
        patient.whatsapp_consent_source = source
    patient.whatsapp_consent_collected_by_user_id = actor_id
    patient.whatsapp_consent_note = reason
    _record(db, patient, previous, "withdrawn", "consent_withdrawn", actor_id, source or patient.whatsapp_consent_source, reason)
    db.execute(update(PaymentReminder).where(
        PaymentReminder.tenant_id == patient.tenant_id,
        PaymentReminder.patient_id == patient.id,
        PaymentReminder.channel == "WHATSAPP",
        PaymentReminder.status == "PLANIFIEE",
    ).values(status="ANNULEE"))
    db.execute(update(AutomaticReminderLog).where(
        AutomaticReminderLog.tenant_id == patient.tenant_id,
        AutomaticReminderLog.patient_id == patient.id,
        AutomaticReminderLog.channel == "WHATSAPP",
        AutomaticReminderLog.status == "EN_ATTENTE",
    ).values(status="ANNULEE", error_message="Consentement WhatsApp retiré."))
    db.commit()
    db.refresh(patient)
    return patient


def update_consent_preferences(
    db: Session, patient: PatientProfile, actor_id: str | None,
    language: str | None = None, phone_number: str | None = None, note: str | None = None,
) -> PatientProfile:
    previous = patient.whatsapp_consent_status
    if language is not None:
        patient.preferred_whatsapp_language = language
    if phone_number is not None:
        patient.whatsapp_phone_number = _phone(phone_number)
    if note is not None:
        patient.whatsapp_consent_note = note
    _record(db, patient, previous, previous, "consent_updated", actor_id, patient.whatsapp_consent_source, note)
    db.commit()
    db.refresh(patient)
    return patient


def consent_out(db: Session, patient: PatientProfile) -> dict:
    collector = db.get(User, patient.whatsapp_consent_collected_by_user_id) if patient.whatsapp_consent_collected_by_user_id else None
    return {
        "patient_id": patient.id,
        "whatsapp_opt_in": patient.whatsapp_opt_in,
        "status": patient.whatsapp_consent_status,
        "phone_number": patient.whatsapp_phone_number,
        "opt_in_at": patient.whatsapp_consent_at,
        "opt_out_at": patient.whatsapp_opt_out_at,
        "source": patient.whatsapp_consent_source,
        "preferred_language": patient.preferred_whatsapp_language,
        "note": patient.whatsapp_consent_note,
        "collected_by_user_id": patient.whatsapp_consent_collected_by_user_id,
        "collected_by_name": f"{collector.first_name} {collector.last_name}" if collector else None,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at,
    }


def get_consent_history(db: Session, tenant_id: str, patient_id: str) -> list[dict]:
    rows = db.scalars(select(WhatsAppConsentLog).where(
        WhatsAppConsentLog.tenant_id == tenant_id,
        WhatsAppConsentLog.patient_id == patient_id,
    ).order_by(WhatsAppConsentLog.created_at.desc())).all()
    result = []
    for row in rows:
        actor = db.get(User, row.performed_by_user_id) if row.performed_by_user_id else None
        result.append({
            "id": row.id, "previous_status": row.previous_status, "new_status": row.new_status,
            "action": row.action, "phone_number": row.phone_number, "source": row.source,
            "performed_by_user_id": row.performed_by_user_id,
            "performed_by_name": f"{actor.first_name} {actor.last_name}" if actor else None,
            "note": row.note, "created_at": row.created_at,
        })
    return result
