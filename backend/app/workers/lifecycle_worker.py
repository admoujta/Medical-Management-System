from datetime import UTC, datetime

from apscheduler.schedulers.blocking import BlockingScheduler

from app.core.database import SessionLocal
from app.services.lifecycle_service import suspend_expired_trials
from app.services.backup_service import cleanup_retention, create_backup, test_restore
from app.services.automatic_reminder_service import process_automatic_reminders
from app.models import BackupLog, PatientNotification, PaymentReminder
from sqlalchemy import select


def run_lifecycle_job() -> None:
    db = SessionLocal()
    try:
        suspended_count = suspend_expired_trials(db)
        print(f"Lifecycle job completed. Expired tenants: {suspended_count}")
    finally:
        db.close()


def run_daily_backup() -> None:
    db=SessionLocal()
    try:
        row=create_backup(db,triggered_by="automatic",backup_type="full");cleanup_retention(db);db.commit()
        print(f"Backup job completed: {row.id} {row.status}")
    finally:db.close()


def run_monthly_restore_test() -> None:
    db=SessionLocal()
    try:
        backup=db.scalar(select(BackupLog).where(BackupLog.status=="success").order_by(BackupLog.created_at.desc()))
        if backup:
            row=test_restore(db,None,backup.id)
            print(f"Monthly restore test completed: {row.id} {row.status}")
    finally:db.close()


def publish_scheduled_patient_reminders() -> None:
    """Publish due portal reminders without ever crossing tenant/patient boundaries."""
    db = SessionLocal()
    try:
        now = datetime.now(UTC)
        reminders = db.scalars(
            select(PaymentReminder).where(
                PaymentReminder.channel == "ESPACE_PATIENT",
                PaymentReminder.status == "PLANIFIEE",
                PaymentReminder.scheduled_at.is_not(None),
                PaymentReminder.scheduled_at <= now,
            )
        ).all()
        for reminder in reminders:
            db.add(PatientNotification(
                tenant_id=reminder.tenant_id,
                patient_id=reminder.patient_id,
                notification_type="PAYMENT_REMINDER",
                title="Rappel de paiement",
                message=reminder.message,
                resource_id=reminder.id,
            ))
            reminder.status = "ENVOYEE"
            reminder.sent_at = now
        db.commit()
        if reminders:
            print(f"Scheduled patient reminders published: {len(reminders)}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def run_automatic_reminders() -> None:
    db = SessionLocal()
    try:
        counters = process_automatic_reminders(db)
        if counters["sent"] or counters["failed"]:
            print(f"Automatic reminders completed: {counters}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def main() -> None:
    scheduler = BlockingScheduler(timezone="Africa/Casablanca")
    scheduler.add_job(run_lifecycle_job, "interval", hours=1, id="tenant_lifecycle")
    scheduler.add_job(run_daily_backup,"cron",hour=2,minute=15,id="daily_full_backup",misfire_grace_time=3600)
    scheduler.add_job(run_monthly_restore_test,"cron",day=1,hour=4,minute=0,id="monthly_restore_test",misfire_grace_time=7200)
    scheduler.add_job(publish_scheduled_patient_reminders,"interval",minutes=1,id="scheduled_patient_reminders",max_instances=1)
    scheduler.add_job(run_automatic_reminders,"interval",minutes=1,id="automatic_reminders",max_instances=1,coalesce=True)
    run_lifecycle_job()
    publish_scheduled_patient_reminders()
    run_automatic_reminders()
    scheduler.start()


if __name__ == "__main__":
    main()
