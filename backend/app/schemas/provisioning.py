from datetime import datetime

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator
from app.core.phone import OptionalPhoneNumber, PhoneNumber

InitialRole = Literal["doctor_admin"]


class SignupRequest(BaseModel):
    first_name: str = Field(min_length=2, max_length=120)
    last_name: str = Field(min_length=2, max_length=120)
    specialty: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=5, max_length=1000)
    city: str = Field(min_length=2, max_length=120)
    phone: PhoneNumber
    cabinet_phone: OptionalPhoneNumber = None
    email: EmailStr
    cabinet_name: str = Field(min_length=2, max_length=180)
    instance_slug: str | None = Field(default=None, min_length=2, max_length=180)
    plan_slug: str | None = Field(default=None, min_length=2, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    primary_color: str = Field(default="#0f766e", pattern=r"^#[0-9a-fA-F]{6}$")
    logo_url: str | None = Field(default=None, max_length=500)
    admin_username: EmailStr
    password: str = Field(min_length=10, max_length=128)
    password_confirmation: str | None = Field(default=None, min_length=10, max_length=128)
    initial_role: InitialRole = "doctor_admin"
    accept_terms: bool
    accept_privacy: bool = True
    working_days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])
    work_start_time: str = Field(default="09:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    work_end_time: str = Field(default="17:00", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    break_start_time: str | None = Field(default="12:30", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    break_end_time: str | None = Field(default="13:30", pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    consultation_duration_minutes: int = Field(default=30, ge=5, le=480)

    @model_validator(mode="after")
    def validate_work_schedule(self):
        if not self.working_days or any(day < 0 or day > 6 for day in self.working_days):
            raise ValueError("Sélectionnez au moins un jour de travail valide.")
        if self.work_end_time <= self.work_start_time:
            raise ValueError("L’heure de fermeture doit être après l’ouverture.")
        if bool(self.break_start_time) != bool(self.break_end_time):
            raise ValueError("Les deux heures de pause sont nécessaires.")
        if self.break_start_time and self.break_end_time and not (self.work_start_time <= self.break_start_time < self.break_end_time <= self.work_end_time):
            raise ValueError("La pause doit être comprise dans les heures de travail.")
        self.working_days = sorted(set(self.working_days))
        return self


class SignupResponse(BaseModel):
    tenant_id: str
    tenant_slug: str
    tenant_status: str
    trial_ends_at: datetime
    admin_user_id: str
    assigned_role: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
