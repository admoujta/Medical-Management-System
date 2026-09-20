import datetime as dt
from pydantic import BaseModel, Field, model_validator


class ScheduleDay(BaseModel):
    weekday: int = Field(ge=0, le=6)
    is_working: bool = True
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    break_start_time: dt.time | None = None
    break_end_time: dt.time | None = None

    @model_validator(mode="after")
    def validate_times(self):
        if self.is_working and (self.start_time is None or self.end_time is None or self.end_time <= self.start_time):
            raise ValueError("Un jour travaillé nécessite une heure de début et de fin valides.")
        if (self.break_start_time is None) != (self.break_end_time is None):
            raise ValueError("Les deux heures de pause sont obligatoires.")
        if self.break_start_time and self.break_end_time and self.break_end_time <= self.break_start_time:
            raise ValueError("La fin de pause doit être après son début.")
        if self.is_working and self.break_start_time and self.break_end_time and not (self.start_time <= self.break_start_time < self.break_end_time <= self.end_time):
            raise ValueError("La pause doit être comprise dans les horaires d’ouverture.")
        return self


class ScheduleConfigIn(BaseModel):
    default_duration_minutes: int = Field(default=30, ge=5, le=480)
    minimum_booking_delay_minutes: int = Field(default=0, ge=0, le=43200)
    maximum_appointments_per_day: int | None = Field(default=None, ge=1, le=200)


class ScheduleUpdate(BaseModel):
    days: list[ScheduleDay]
    config: ScheduleConfigIn


class ScheduleResponse(BaseModel):
    days: list[ScheduleDay]
    config: ScheduleConfigIn


class TimeOffCreate(BaseModel):
    start_date: dt.date
    end_date: dt.date
    reason: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_range(self):
        if self.end_date < self.start_date:
            raise ValueError("La fin du congé doit être après son début.")
        return self


class TimeOffOut(TimeOffCreate):
    id: str


class BlockedSlotCreate(BaseModel):
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    reason: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_range(self):
        if self.end_time <= self.start_time:
            raise ValueError("La fin du blocage doit être après son début.")
        return self


class BlockedSlotOut(BlockedSlotCreate):
    id: str
