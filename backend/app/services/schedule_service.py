from datetime import UTC, date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models import Appointment, BlockedSlot, DoctorSchedule, DoctorScheduleConfig, DoctorTimeOff, User
from app.schemas.schedule import BlockedSlotCreate, BlockedSlotOut, ScheduleConfigIn, ScheduleDay, ScheduleResponse, ScheduleUpdate, TimeOffCreate, TimeOffOut
from app.services.crud_service import ensure_write_allowed, get_doctor_id, require_role, require_tenant


def get_schedule(db: Session, user: User) -> ScheduleResponse:
    require_role(user, {"MEDECIN_ADMIN", "SECRETAIRE"})
    doctor_id = get_doctor_id(db, user)
    rows = db.scalars(select(DoctorSchedule).where(DoctorSchedule.tenant_id == require_tenant(user), DoctorSchedule.doctor_id == doctor_id).order_by(DoctorSchedule.weekday)).all()
    config = db.scalar(select(DoctorScheduleConfig).where(DoctorScheduleConfig.tenant_id == user.tenant_id, DoctorScheduleConfig.doctor_id == doctor_id))
    days_by_weekday = {row.weekday: row for row in rows}
    days = [ScheduleDay.model_validate(days_by_weekday[weekday], from_attributes=True) if weekday in days_by_weekday else ScheduleDay(weekday=weekday, is_working=weekday < 5, start_time="09:00", end_time="17:00", break_start_time="12:30", break_end_time="13:30") for weekday in range(7)]
    config_out = ScheduleConfigIn.model_validate(config, from_attributes=True) if config else ScheduleConfigIn()
    return ScheduleResponse(days=days, config=config_out)


def update_schedule(db: Session, user: User, payload: ScheduleUpdate) -> ScheduleResponse:
    require_role(user, {"MEDECIN_ADMIN"}); ensure_write_allowed(user)
    tenant_id = require_tenant(user); doctor_id = get_doctor_id(db, user)
    if len({day.weekday for day in payload.days}) != len(payload.days):
        raise HTTPException(status_code=422, detail="Un jour de la semaine est présent plusieurs fois.")
    existing = {row.weekday: row for row in db.scalars(select(DoctorSchedule).where(DoctorSchedule.tenant_id == tenant_id, DoctorSchedule.doctor_id == doctor_id)).all()}
    for day in payload.days:
        row = existing.get(day.weekday) or DoctorSchedule(tenant_id=tenant_id, doctor_id=doctor_id, weekday=day.weekday)
        for field, value in day.model_dump().items(): setattr(row, field, value)
        db.add(row)
    config = db.scalar(select(DoctorScheduleConfig).where(DoctorScheduleConfig.tenant_id == tenant_id, DoctorScheduleConfig.doctor_id == doctor_id)) or DoctorScheduleConfig(tenant_id=tenant_id, doctor_id=doctor_id)
    for field, value in payload.config.model_dump().items(): setattr(config, field, value)
    db.add(config); db.commit()
    return get_schedule(db, user)


def list_time_offs(db: Session, user: User) -> list[TimeOffOut]:
    doctor_id = get_doctor_id(db, user)
    rows = db.scalars(select(DoctorTimeOff).where(DoctorTimeOff.tenant_id == require_tenant(user), DoctorTimeOff.doctor_id == doctor_id).order_by(DoctorTimeOff.start_date)).all()
    return [TimeOffOut.model_validate(row, from_attributes=True) for row in rows]


def create_time_off(db: Session, user: User, payload: TimeOffCreate) -> TimeOffOut:
    require_role(user, {"MEDECIN_ADMIN"}); ensure_write_allowed(user)
    row = DoctorTimeOff(tenant_id=require_tenant(user), doctor_id=get_doctor_id(db, user), **payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return TimeOffOut.model_validate(row, from_attributes=True)


def delete_time_off(db: Session, user: User, item_id: str) -> None:
    require_role(user, {"MEDECIN_ADMIN"}); ensure_write_allowed(user)
    row = db.scalar(select(DoctorTimeOff).where(DoctorTimeOff.id == item_id, DoctorTimeOff.tenant_id == require_tenant(user), DoctorTimeOff.doctor_id == get_doctor_id(db, user)))
    if not row: raise HTTPException(status_code=404, detail="Congé introuvable.")
    db.delete(row); db.commit()


def list_blocked_slots(db: Session, user: User) -> list[BlockedSlotOut]:
    doctor_id = get_doctor_id(db, user)
    rows = db.scalars(select(BlockedSlot).where(BlockedSlot.tenant_id == require_tenant(user), BlockedSlot.doctor_id == doctor_id).order_by(BlockedSlot.date, BlockedSlot.start_time)).all()
    return [BlockedSlotOut.model_validate(row, from_attributes=True) for row in rows]


def create_blocked_slot(db: Session, user: User, payload: BlockedSlotCreate) -> BlockedSlotOut:
    require_role(user, {"MEDECIN_ADMIN"}); ensure_write_allowed(user)
    row = BlockedSlot(tenant_id=require_tenant(user), doctor_id=get_doctor_id(db, user), **payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return BlockedSlotOut.model_validate(row, from_attributes=True)


def delete_blocked_slot(db: Session, user: User, item_id: str) -> None:
    require_role(user, {"MEDECIN_ADMIN"}); ensure_write_allowed(user)
    row = db.scalar(select(BlockedSlot).where(BlockedSlot.id == item_id, BlockedSlot.tenant_id == require_tenant(user), BlockedSlot.doctor_id == get_doctor_id(db, user)))
    if not row: raise HTTPException(status_code=404, detail="Créneau bloqué introuvable.")
    db.delete(row); db.commit()


def validate_availability(db: Session, user: User, doctor_id: str, date, start_time, end_time, exclude_appointment_id: str | None = None) -> None:
    tenant_id = require_tenant(user)
    if datetime.combine(date, start_time, tzinfo=UTC) < datetime.now(UTC):
        raise HTTPException(status_code=422, detail="Un rendez-vous ne peut pas être créé dans le passé.")
    # La configuration du cabinet est la source unique pour l'agenda web,
    # les disponibilités publiques et la validation de chaque rendez-vous.
    schedule = db.scalar(select(DoctorSchedule).where(DoctorSchedule.tenant_id == tenant_id, DoctorSchedule.doctor_id == doctor_id, DoctorSchedule.weekday == date.weekday()))
    is_working = schedule.is_working if schedule else date.weekday() < 5
    work_start = schedule.start_time if schedule else datetime.strptime("09:00", "%H:%M").time()
    work_end = schedule.end_time if schedule else datetime.strptime("17:00", "%H:%M").time()
    break_start = schedule.break_start_time if schedule else datetime.strptime("12:30", "%H:%M").time()
    break_end = schedule.break_end_time if schedule else datetime.strptime("13:30", "%H:%M").time()
    if not is_working:
        raise HTTPException(status_code=409, detail="Le cabinet ne travaille pas ce jour-là.")
    if start_time < work_start or end_time > work_end:
        raise HTTPException(status_code=409, detail=f"Ce rendez-vous doit être compris entre {work_start.strftime('%H:%M')} et {work_end.strftime('%H:%M')}.")
    if break_start and break_end and start_time < break_end and end_time > break_start:
        raise HTTPException(status_code=409, detail=f"Le cabinet est en pause de {break_start.strftime('%H:%M')} à {break_end.strftime('%H:%M')}.")
    if db.scalar(select(DoctorTimeOff).where(DoctorTimeOff.tenant_id == tenant_id, DoctorTimeOff.doctor_id == doctor_id, DoctorTimeOff.start_date <= date, DoctorTimeOff.end_date >= date)):
        raise HTTPException(status_code=409, detail="Le médecin est en congé ou absent à cette date.")
    if db.scalar(select(BlockedSlot).where(BlockedSlot.tenant_id == tenant_id, BlockedSlot.doctor_id == doctor_id, BlockedSlot.date == date, BlockedSlot.start_time < end_time, BlockedSlot.end_time > start_time)):
        raise HTTPException(status_code=409, detail="Ce créneau a été bloqué par le médecin.")
    config = db.scalar(select(DoctorScheduleConfig).where(DoctorScheduleConfig.tenant_id == tenant_id, DoctorScheduleConfig.doctor_id == doctor_id))
    if config:
        if datetime.combine(date, start_time, tzinfo=UTC) < datetime.now(UTC) + timedelta(minutes=config.minimum_booking_delay_minutes):
            raise HTTPException(status_code=409, detail="Le délai minimum avant réservation n’est pas respecté.")
        if config.maximum_appointments_per_day:
            query = select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tenant_id, Appointment.doctor_id == doctor_id, Appointment.date == date, Appointment.status != "cancelled")
            if exclude_appointment_id: query = query.where(Appointment.id != exclude_appointment_id)
            if (db.scalar(query) or 0) >= config.maximum_appointments_per_day:
                raise HTTPException(status_code=409, detail="Le nombre maximum de rendez-vous pour cette journée est atteint.")


def public_availability(db: Session, doctor_id: str, days: int = 21) -> list[dict]:
    config = db.scalar(select(DoctorScheduleConfig).where(DoctorScheduleConfig.doctor_id == doctor_id))
    duration = config.default_duration_minutes if config else 30
    minimum_delay = config.minimum_booking_delay_minutes if config else 0
    now = datetime.now(UTC)
    result: list[dict] = []
    for offset in range(days):
        current_date = date.today() + timedelta(days=offset)
        schedule = db.scalar(select(DoctorSchedule).where(DoctorSchedule.doctor_id == doctor_id, DoctorSchedule.weekday == current_date.weekday()))
        is_working = schedule.is_working if schedule else current_date.weekday() < 5
        start = schedule.start_time if schedule else datetime.strptime("09:00", "%H:%M").time()
        end = schedule.end_time if schedule else datetime.strptime("17:00", "%H:%M").time()
        break_start = schedule.break_start_time if schedule else datetime.strptime("12:30", "%H:%M").time()
        break_end = schedule.break_end_time if schedule else datetime.strptime("13:30", "%H:%M").time()
        if not is_working or not start or not end:
            continue
        if db.scalar(select(DoctorTimeOff).where(DoctorTimeOff.doctor_id == doctor_id, DoctorTimeOff.start_date <= current_date, DoctorTimeOff.end_date >= current_date)):
            continue
        appointments = db.scalars(select(Appointment).where(Appointment.doctor_id == doctor_id, Appointment.date == current_date, Appointment.status.notin_({"cancelled", "rejected"}))).all()
        if config and config.maximum_appointments_per_day and len(appointments) >= config.maximum_appointments_per_day:
            continue
        blocked = db.scalars(select(BlockedSlot).where(BlockedSlot.doctor_id == doctor_id, BlockedSlot.date == current_date)).all()
        cursor = datetime.combine(current_date, start)
        day_end = datetime.combine(current_date, end)
        slots = []
        while cursor + timedelta(minutes=duration) <= day_end:
            slot_end = cursor + timedelta(minutes=duration)
            start_time, end_time = cursor.time(), slot_end.time()
            in_break = bool(break_start and break_end and start_time < break_end and end_time > break_start)
            occupied = any(item.start_time < end_time and item.end_time > start_time for item in appointments)
            unavailable = any(item.start_time < end_time and item.end_time > start_time for item in blocked)
            enough_delay = cursor.replace(tzinfo=UTC) >= now + timedelta(minutes=minimum_delay)
            if not in_break and not occupied and not unavailable and enough_delay:
                slots.append({"start_time": start_time.strftime("%H:%M"), "end_time": end_time.strftime("%H:%M")})
            cursor = slot_end
        if slots:
            result.append({"date": current_date.isoformat(), "slots": slots})
    return result
