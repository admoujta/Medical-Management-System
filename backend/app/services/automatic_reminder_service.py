from datetime import UTC, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    Appointment,
    AutomaticReminderLog,
    CNSSCase,
    Fee,
    Payment,
    PatientNotification,
    UserNotification,
    PatientProfile,
    Tenant,
    TenantSettings,
)
from app.schemas.reminder import AutomaticReminderSettings
from app.services import whatsapp_service


ACTIVE_APPOINTMENT_STATUSES = {"planned", "confirmed", "waiting"}
PENDING_CNSS_STATUSES = {"REQUESTED", "PROCESSING", "READY_FOR_PICKUP", "DELIVERED_TO_PATIENT", "SUBMITTED_TO_CNSS"}
CNSS_NOT_DEPOSITED_STATUSES = {"REQUESTED", "PROCESSING", "READY_FOR_PICKUP", "DELIVERED_TO_PATIENT"}


def _existing_log(db: Session, tenant_id: str, rule_key: str, entity_type: str, entity_id: str, channel: str) -> AutomaticReminderLog | None:
    return db.scalar(select(AutomaticReminderLog).where(
        AutomaticReminderLog.tenant_id == tenant_id,
        AutomaticReminderLog.rule_key == rule_key,
        AutomaticReminderLog.entity_type == entity_type,
        AutomaticReminderLog.entity_id == entity_id,
        AutomaticReminderLog.channel == channel,
    ).limit(1))


def _deliver(
    db: Session, *, tenant: Tenant, patient: PatientProfile, entity_type: str,
    entity_id: str, rule_key: str, channel: str, scheduled_for: datetime,
    title: str, notification_type: str, message_type: str, message: str,
    template_values: dict[str, str],
) -> str:
    log = _existing_log(db, tenant.id, rule_key, entity_type, entity_id, channel)
    if log and (log.status != "ECHEC" or log.attempt_count >= 3):
        return "skipped"
    if log:
        log.status = "EN_ATTENTE"
        log.attempt_count += 1
        log.error_message = None
    else:
        log = AutomaticReminderLog(
            tenant_id=tenant.id, patient_id=patient.id, entity_type=entity_type,
            entity_id=entity_id, rule_key=rule_key, channel=channel,
            status="EN_ATTENTE", scheduled_for=scheduled_for, attempt_count=1,
        )
        db.add(log)
    db.flush()
    try:
        if channel == "ESPACE_PATIENT":
            db.add(PatientNotification(
                tenant_id=tenant.id, patient_id=patient.id,
                notification_type=notification_type, title=title,
                message=message, resource_id=entity_id,
            ))
        elif channel == "WHATSAPP":
            template = whatsapp_service.recover_approved_template(
                db, tenant.id, message_type, patient.preferred_whatsapp_language,
            )
            item = whatsapp_service.send_message(
                db, tenant_id=tenant.id, patient=patient, content=message,
                message_type=message_type, actor_id=None,
                appointment_id=entity_id if entity_type == "APPOINTMENT" else None,
                # Payment reminders can aggregate several fees for one patient.
                # Never place a patient id inside the fee_id foreign key.
                fee_id=None,
                template_id=template.id if template else None,
                template_values=template_values,
            )
            if item.status == "echec":
                raise RuntimeError(item.error_message or "Meta a refusé le message.")
        else:
            raise RuntimeError("Canal automatique non pris en charge.")
        log.status="ENVOYEE";log.sent_at=datetime.now(UTC);log.error_message=None
    except (HTTPException, RuntimeError) as exc:
        log.status="ECHEC";log.error_message=str(exc.detail if isinstance(exc,HTTPException) else exc)
    db.commit()
    return "sent" if log.status == "ENVOYEE" else "failed"


def process_automatic_reminders(db: Session, now: datetime | None = None) -> dict[str, int]:
    now = now or datetime.now(UTC)
    counters = {"sent": 0, "failed": 0, "skipped": 0}
    settings_rows = db.scalars(select(TenantSettings)).all()
    for row in settings_rows:
        tenant = db.get(Tenant, row.tenant_id)
        if not tenant or tenant.status not in {"trial", "active"}:
            continue
        rules = AutomaticReminderSettings.model_validate(row.reminder_settings or {})
        timezone = ZoneInfo(row.timezone or "Africa/Casablanca")

        if rules.appointments.enabled or db.scalar(select(Appointment.id).where(
            Appointment.tenant_id == tenant.id,
            Appointment.reminder_enabled.is_(True),
        ).limit(1)):
            appointments = db.scalars(select(Appointment).where(
                Appointment.tenant_id == tenant.id,
                Appointment.status.in_(ACTIVE_APPOINTMENT_STATUSES),
                Appointment.date >= now.astimezone(timezone).date(),
            )).all()
            for appointment in appointments:
                enabled = appointment.reminder_enabled if appointment.reminder_enabled is not None else rules.appointments.enabled
                if not enabled:
                    continue
                offset = appointment.reminder_offset_minutes or rules.appointments.offset_minutes
                channels = appointment.reminder_channels or rules.appointments.channels
                starts_local = datetime.combine(appointment.date, appointment.start_time, tzinfo=timezone)
                starts_at = starts_local.astimezone(UTC)
                scheduled_for = starts_at - timedelta(minutes=offset)
                if not (scheduled_for <= now < starts_at):
                    continue
                patient=appointment.patient
                values={"patient_name":f"{patient.user.first_name} {patient.user.last_name}","date":appointment.date.strftime("%d/%m/%Y"),"heure":appointment.start_time.strftime("%H:%M"),"cabinet_name":tenant.name}
                message=whatsapp_service.render_template(None,whatsapp_service.DEFAULT_TEMPLATES["rappel_rdv"][1],values)
                for channel in channels:
                    result=_deliver(db,tenant=tenant,patient=patient,entity_type="APPOINTMENT",entity_id=appointment.id,rule_key=f"appointment:{offset}",channel=channel,scheduled_for=scheduled_for,title="Rappel de rendez-vous",notification_type="APPOINTMENT_REMINDER",message_type="rappel_rdv",message=message,template_values=values)
                    counters[result]+=1

        if rules.payments.enabled:
            patients=db.scalars(select(PatientProfile).where(PatientProfile.tenant_id==tenant.id,PatientProfile.status=="active")).all()
            bucket=now.astimezone(timezone).date().toordinal()//rules.payments.repeat_days
            cutoff=now-timedelta(days=rules.payments.overdue_days)
            for patient in patients:
                fees=db.scalars(select(Fee).where(Fee.tenant_id==tenant.id,Fee.patient_id==patient.id,Fee.status!="cancelled",Fee.created_at<=cutoff)).all()
                remaining=sum((max(Decimal("0.00"),Decimal(str(fee.amount or 0))-Decimal(str(fee.paid_amount or 0))) for fee in fees),Decimal("0.00"))
                if remaining<=0:continue
                values={"patient_name":f"{patient.user.first_name} {patient.user.last_name}","rap":f"{remaining:.2f}","cabinet_name":tenant.name}
                message=whatsapp_service.render_template(None,whatsapp_service.DEFAULT_TEMPLATES["relance_paiement"][1],values)
                for channel in rules.payments.channels:
                    result=_deliver(db,tenant=tenant,patient=patient,entity_type="PAYMENT",entity_id=patient.id,rule_key=f"payment:{bucket}",channel=channel,scheduled_for=now,title="Rappel de paiement",notification_type="PAYMENT_REMINDER",message_type="relance_paiement",message=message,template_values=values)
                    counters[result]+=1

        if rules.cheques.enabled:
            local_today = now.astimezone(timezone).date()
            alert_until = local_today + timedelta(days=rules.cheques.days_before)
            cheques = db.scalars(select(Payment).where(
                Payment.tenant_id == tenant.id,
                Payment.method == "cheque",
                Payment.cheque_status.in_({"RECU", "DEPOSE", "EN_ATTENTE"}),
                Payment.cheque_expected_cashing_date.is_not(None),
                Payment.cheque_expected_cashing_date <= alert_until,
            )).all()
            repeat_cutoff = now - timedelta(days=rules.cheques.repeat_days)
            for cheque in cheques:
                if not cheque.created_by_user_id:
                    continue
                previous = db.scalar(select(UserNotification).where(
                    UserNotification.tenant_id == tenant.id,
                    UserNotification.user_id == cheque.created_by_user_id,
                    UserNotification.notification_type == "CHEQUE_COLLECTION_REMINDER",
                    UserNotification.resource_id == cheque.id,
                    UserNotification.created_at >= repeat_cutoff,
                ).limit(1))
                if previous:
                    counters["skipped"] += 1
                    continue
                late = cheque.cheque_expected_cashing_date < local_today
                db.add(UserNotification(
                    tenant_id=tenant.id,
                    user_id=cheque.created_by_user_id,
                    notification_type="CHEQUE_COLLECTION_REMINDER",
                    title="Chèque en retard" if late else "Chèque à encaisser",
                    message=(
                        f"Le chèque n° {cheque.cheque_number or '—'} de {float(cheque.amount):.2f} MAD "
                        f"devait être encaissé le {cheque.cheque_expected_cashing_date.strftime('%d/%m/%Y')}."
                        if late else
                        f"Le chèque n° {cheque.cheque_number or '—'} de {float(cheque.amount):.2f} MAD "
                        f"est prévu à l’encaissement le {cheque.cheque_expected_cashing_date.strftime('%d/%m/%Y')}."
                    ),
                    resource_id=cheque.id,
                ))
                db.commit()
                counters["sent"] += 1

        local_today = now.astimezone(timezone).date()
        deadline_cases = db.scalars(select(CNSSCase).where(
            CNSSCase.tenant_id == tenant.id,
            CNSSCase.status.in_(CNSS_NOT_DEPOSITED_STATUSES),
            CNSSCase.deposit_deadline.is_not(None),
            CNSSCase.deposit_deadline >= local_today,
        )).all()
        for case in deadline_cases:
            patient = db.get(PatientProfile, case.patient_id)
            if not patient:
                continue
            reminder_days = max(0, min(30, patient.cnss_deposit_reminder_days))
            reminder_date = case.deposit_deadline - timedelta(days=reminder_days)
            if local_today < reminder_date:
                continue
            deadline_label = case.deposit_deadline.strftime("%d/%m/%Y")
            message = (
                f"La date limite de dépôt de votre dossier CNSS/CNOPS « {case.label} » "
                f"est fixée au {deadline_label}."
            )
            result = _deliver(
                db,
                tenant=tenant,
                patient=patient,
                entity_type="CNSS",
                entity_id=case.id,
                rule_key=f"cnss-deposit-deadline:{case.deposit_deadline.isoformat()}:{reminder_days}",
                channel="ESPACE_PATIENT",
                scheduled_for=now,
                title="Dépôt CNSS/CNOPS à effectuer",
                notification_type="CNSS_DEPOSIT_DEADLINE",
                message_type="cnss",
                message=message,
                template_values={
                    "patient_name": f"{patient.user.first_name} {patient.user.last_name}",
                    "cabinet_name": tenant.name,
                    "date_limite": deadline_label,
                },
            )
            counters[result] += 1

        if rules.cnss.enabled:
            bucket=now.astimezone(timezone).date().toordinal()//rules.cnss.repeat_days
            cutoff=now-timedelta(days=rules.cnss.pending_days)
            cases=db.scalars(select(CNSSCase).where(CNSSCase.tenant_id==tenant.id,CNSSCase.status.in_(PENDING_CNSS_STATUSES),CNSSCase.updated_at<=cutoff)).all()
            for case in cases:
                patient=db.get(PatientProfile,case.patient_id)
                if not patient:continue
                values={"patient_name":f"{patient.user.first_name} {patient.user.last_name}","cabinet_name":tenant.name}
                message=whatsapp_service.render_template(None,whatsapp_service.DEFAULT_TEMPLATES["cnss"][1],values)
                for channel in rules.cnss.channels:
                    result=_deliver(db,tenant=tenant,patient=patient,entity_type="CNSS",entity_id=case.id,rule_key=f"cnss:{bucket}",channel=channel,scheduled_for=now,title="Dossier CNSS/CNOPS en attente",notification_type="CNSS_REMINDER",message_type="cnss",message=message,template_values=values)
                    counters[result]+=1
    return counters
