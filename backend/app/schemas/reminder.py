from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class PaymentReminderCreate(BaseModel):
    patient_id: str
    fee_id: str | None = None
    due_date_id: str | None = None
    channel: Literal["WHATSAPP", "ESPACE_PATIENT"]
    message: str = Field(min_length=3, max_length=2000)
    scheduled_at: datetime | None = None


class PaymentReminderOut(BaseModel):
    id: str
    patient_id: str
    fee_id: str | None
    due_date_id: str | None
    amount_due: Decimal
    channel: str
    status: str
    message: str
    scheduled_at: datetime | None
    sent_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentReminderBulkCreate(BaseModel):
    channel: Literal["WHATSAPP", "ESPACE_PATIENT"]
    message_template: str = Field(
        default="Bonjour {patient}, nous vous rappelons qu’un montant de {montant} MAD reste à régler auprès du cabinet. Merci de nous contacter pour régulariser votre situation.",
        min_length=3,
        max_length=2000,
    )


class PaymentReminderBulkOut(BaseModel):
    channel: str
    eligible_count: int
    created_count: int
    skipped_paid_count: int
    skipped_consent_count: int
    skipped_duplicate_count: int
    sent_count: int = 0
    failed_count: int = 0


ReminderChannel = Literal["WHATSAPP", "ESPACE_PATIENT"]


class AppointmentReminderRule(BaseModel):
    enabled: bool = True
    offset_minutes: int = Field(default=1440, ge=60, le=43200)
    channels: list[ReminderChannel] = Field(default_factory=lambda: ["ESPACE_PATIENT"], min_length=1)


class PaymentAutomaticReminderRule(BaseModel):
    enabled: bool = False
    overdue_days: int = Field(default=1, ge=0, le=365)
    repeat_days: int = Field(default=7, ge=1, le=90)
    channels: list[ReminderChannel] = Field(default_factory=lambda: ["ESPACE_PATIENT"], min_length=1)


class CNSSAutomaticReminderRule(BaseModel):
    enabled: bool = False
    pending_days: int = Field(default=7, ge=1, le=365)
    repeat_days: int = Field(default=7, ge=1, le=90)
    channels: list[ReminderChannel] = Field(default_factory=lambda: ["ESPACE_PATIENT"], min_length=1)


class ChequeAutomaticReminderRule(BaseModel):
    enabled: bool = True
    days_before: int = Field(default=1, ge=0, le=30)
    repeat_days: int = Field(default=1, ge=1, le=30)


class AutomaticReminderSettings(BaseModel):
    appointments: AppointmentReminderRule = Field(default_factory=AppointmentReminderRule)
    payments: PaymentAutomaticReminderRule = Field(default_factory=PaymentAutomaticReminderRule)
    cnss: CNSSAutomaticReminderRule = Field(default_factory=CNSSAutomaticReminderRule)
    cheques: ChequeAutomaticReminderRule = Field(default_factory=ChequeAutomaticReminderRule)
