from uuid import uuid4

from sqlalchemy import Boolean, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TenantSettings(Base):
    __tablename__ = "tenant_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True)
    locale: Mapped[str] = mapped_column(String(10), nullable=False, default="fr")
    timezone: Mapped[str] = mapped_column(String(80), nullable=False, default="Africa/Casablanca")
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    patient_portal_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    patient_can_request_appointment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    patient_can_confirm_appointment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    patient_can_cancel_appointment: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    patient_can_view_payments: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    patient_can_download_documents: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    patient_requires_validation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    patient_cin_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    patient_cin_document_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fee_type_prices: Mapped[dict] = mapped_column(JSON, nullable=False, default=lambda: {
        "CONSULTATION": 300, "ACTE": 0, "SOIN": 0, "TRAITEMENT": 0, "AUTRE": 0,
    })
    payment_settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=lambda: {
        "methods": ["cash", "card", "transfer", "cheque", "other"],
        "settlement_types": ["immediate", "partial", "single_due", "installment"],
        "default_method": "cash", "default_settlement_type": "immediate",
        "default_due_days": 30, "default_installments": 3, "grace_days": 0,
    })
    reminder_settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=lambda: {
        "appointments": {"enabled": True, "offset_minutes": 1440, "channels": ["ESPACE_PATIENT"]},
        "payments": {"enabled": False, "overdue_days": 1, "repeat_days": 7, "channels": ["ESPACE_PATIENT"]},
        "cnss": {"enabled": False, "pending_days": 7, "repeat_days": 7, "channels": ["ESPACE_PATIENT"]},
    })

    tenant = relationship("Tenant", back_populates="settings")
