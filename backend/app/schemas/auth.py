from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, EmailStr, Field
from app.core.phone import PhoneNumber


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    cabinet_code: str | None = Field(default=None, max_length=180)
    role: Literal["MEDECIN_ADMIN", "SECRETAIRE", "PATIENT", "SUPER_ADMIN", "SUPER_ADMIN_IRMA"] | None = None
    device_name: str | None = Field(default=None, max_length=160)


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    tenant_id: str | None
    user_id: str
    full_name: str
    role: str | None
    tenant_status: str | None = None
    redirect_to: str


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=20)


class StaffActivationInfo(BaseModel):
    full_name: str
    email: EmailStr
    cabinet_name: str
    expires_at: datetime


class StaffActivationRequest(BaseModel):
    token: str = Field(min_length=32, max_length=200)
    password: str = Field(min_length=10, max_length=128)
    password_confirmation: str = Field(min_length=10, max_length=128)


class PatientActivationInfo(BaseModel):
    full_name: str
    email: EmailStr
    cabinet_name: str
    expires_at: datetime


class PatientActivationRequest(StaffActivationRequest):
    pass


class MessageResponse(BaseModel):
    message: str


class PatientRegisterRequest(BaseModel):
    cabinet_code: str = Field(min_length=2, max_length=180)
    first_name: str = Field(min_length=2, max_length=120)
    last_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: PhoneNumber
    birth_date: date
    gender: Literal["M", "F"]
    address: str | None = Field(default=None, max_length=1000)
    password: str = Field(min_length=10, max_length=128)
    password_confirmation: str = Field(min_length=10, max_length=128)
    accept_terms: bool
    accept_privacy: bool


class PatientRegisterResponse(BaseModel):
    message: str
    tenant_id: str
    patient_user_id: str
    status: str


class AuthUser(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: str | None


class TenantSummary(BaseModel):
    id: str
    name: str
    slug: str
    status: str
    trial_ends_at: datetime
    primary_color: str


class AuthMeResponse(BaseModel):
    user: AuthUser
    tenant: TenantSummary | None
    read_only: bool
    notice: str | None = None


class DashboardStats(BaseModel):
    appointments_today: int
    patients_registered: int
    visits_this_month: int
    confirmed_appointments: int
    absent_appointments: int
    amount_collected: float
    total_unpaid: float
    pending_cnss: int


class UpcomingAppointment(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    date: date
    start_time: time
    end_time: time
    reason: str | None
    status: str


class LatestPatient(BaseModel):
    id: str
    full_name: str
    email: EmailStr | None
    phone: str | None
    status: str
    created_at: datetime


class DoctorDashboardResponse(BaseModel):
    user: AuthUser
    tenant: TenantSummary
    stats: DashboardStats
    today_appointments: list[UpcomingAppointment]
    upcoming_appointments: list[UpcomingAppointment]
    latest_appointments: list[UpcomingAppointment]
    latest_patients: list[LatestPatient]
    read_only: bool
    notice: str | None = None


class StaffRecentPayment(BaseModel):
    id: str
    patient_name: str
    amount: float
    method: str
    paid_at: datetime


class StaffDashboardResponse(BaseModel):
    user: AuthUser
    tenant: TenantSummary
    permissions: dict[str, str]
    appointments_today: int
    today_appointments: list[UpcomingAppointment]
    upcoming_appointments: list[UpcomingAppointment]
    recent_patients: list[LatestPatient]
    recent_payments: list[StaffRecentPayment]
    read_only: bool
    notice: str | None = None
