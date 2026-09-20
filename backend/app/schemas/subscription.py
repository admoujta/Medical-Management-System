from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field

PaymentMethod = Literal["card", "bank_transfer", "cash", "cheque", "other"]


class PlanSelection(BaseModel):
    plan_id: str


class SubscriptionPaymentCreate(BaseModel):
    plan_id: str
    payment_method: PaymentMethod
    transaction_reference: str | None = Field(default=None, max_length=180)
    proof_url: str | None = Field(default=None, max_length=500)


class SubscriptionPaymentDecision(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


class SubscriptionPaymentOut(BaseModel):
    id: str
    tenant_id: str
    subscription_id: str
    plan_id: str
    amount: Decimal
    currency: str
    payment_method: str
    transaction_reference: str | None
    status: str
    paid_at: datetime | None
    failure_reason: str | None
    period_start: datetime | None
    period_end: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}
