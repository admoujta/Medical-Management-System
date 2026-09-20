import datetime as dt
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AppointmentDetailsActor(BaseModel):
    id: str | None
    full_name: str


class AppointmentDetailsAppointment(BaseModel):
    id: str
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    actual_start_time: dt.datetime | None
    actual_end_time: dt.datetime | None
    duration_seconds: int | None
    reason: str | None
    notes: str | None
    status: str


class AppointmentDetailsPatient(BaseModel):
    id: str
    full_name: str
    phone: str | None
    email: str | None
    gender: str | None
    birth_date: dt.date
    address: str | None
    account_status: str


class AppointmentDetailsDoctor(BaseModel):
    id: str
    full_name: str
    specialty: str
    phone: str | None
    email: str | None


class AppointmentDetailsCabinet(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    email: str | None = None


class AppointmentDetailsVisit(BaseModel):
    id: str
    status: str
    visit_date: dt.date
    started_at: dt.datetime | None
    completed_at: dt.datetime | None
    duration_seconds: int | None
    notes: str | None
    created_at: dt.datetime
    updated_at: dt.datetime | None = None


class AppointmentDetailsFee(BaseModel):
    id: str
    label: str
    description: str | None
    status: str
    total_amount: Decimal
    paid_amount: Decimal
    remaining_amount: Decimal
    currency: str = "MAD"
    created_at: dt.datetime
    updated_at: dt.datetime


class AppointmentDetailsPayment(BaseModel):
    id: str
    honoraire_id: str
    amount: Decimal
    payment_method: str
    status: str
    payment_date: dt.datetime
    reference: str | None
    created_at: dt.datetime
    created_by: AppointmentDetailsActor


class AppointmentDetailsPrescription(BaseModel):
    id: str
    prescription_date: dt.date
    doctor: AppointmentDetailsActor
    status: str | None = None
    summary: str
    items: list[dict[str, Any]] = Field(default_factory=list)
    created_at: dt.datetime


class AppointmentDetailsDocument(BaseModel):
    id: str
    name: str
    document_type: str
    description: str | None
    download_url: str | None
    uploaded_at: dt.datetime
    uploaded_by: AppointmentDetailsActor


class AppointmentDetailsCNSS(BaseModel):
    id: str
    status: str
    request_date: dt.datetime
    ready_date: dt.datetime | None
    delivered_date: dt.datetime | None
    submitted_date: dt.datetime | None
    decision_date: dt.date | None
    rejection_reason: str | None
    created_at: dt.datetime
    updated_at: dt.datetime | None


class AppointmentDetailsActivity(BaseModel):
    id: str
    event_type: str
    previous_value: Any | None
    new_value: Any | None
    description: str | None
    occurred_at: dt.datetime
    date: dt.date
    time: dt.time
    responsible_user: AppointmentDetailsActor


class AppointmentDetailsResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "appointment": {
                        "id": "appointment-uuid",
                        "date": "2026-07-28",
                        "start_time": "09:00:00",
                        "end_time": "09:30:00",
                        "actual_start_time": "2026-07-28T09:03:00+01:00",
                        "actual_end_time": "2026-07-28T09:27:00+01:00",
                        "duration_seconds": 1440,
                        "reason": "Consultation",
                        "notes": None,
                        "status": "completed",
                    },
                    "patient": {
                        "id": "patient-uuid",
                        "full_name": "Pat Patient",
                        "phone": "+212600000000",
                        "email": "patient@example.com",
                        "gender": "M",
                        "birth_date": "1990-01-01",
                        "address": "Casablanca",
                        "account_status": "active",
                    },
                    "doctor": {
                        "id": "doctor-uuid",
                        "full_name": "Dr Mad Médecin",
                        "specialty": "Médecine générale",
                        "phone": "+212611111111",
                        "email": "doctor@example.com",
                    },
                    "cabinet": {
                        "id": "cabinet-uuid",
                        "name": "Cabinet Santé",
                        "address": "Casablanca",
                        "phone": "+212522000000",
                        "email": None,
                    },
                    "visit": None,
                    "honoraires": [],
                    "payments": [],
                    "prescriptions": [],
                    "documents": [],
                    "cnss_records": [],
                    "activity_history": [],
                }
            ]
        }
    )

    appointment: AppointmentDetailsAppointment
    patient: AppointmentDetailsPatient
    doctor: AppointmentDetailsDoctor
    cabinet: AppointmentDetailsCabinet
    visit: AppointmentDetailsVisit | None
    honoraires: list[AppointmentDetailsFee] = Field(default_factory=list)
    payments: list[AppointmentDetailsPayment] = Field(default_factory=list)
    prescriptions: list[AppointmentDetailsPrescription] = Field(default_factory=list)
    documents: list[AppointmentDetailsDocument] = Field(default_factory=list)
    cnss_records: list[AppointmentDetailsCNSS] = Field(default_factory=list)
    activity_history: list[AppointmentDetailsActivity] = Field(default_factory=list)
