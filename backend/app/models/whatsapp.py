from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WhatsAppConfiguration(Base):
    __tablename__ = "whatsapp_configurations"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_whatsapp_configuration_tenant"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    business_account_name: Mapped[str] = mapped_column(String(180), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(40), nullable=False)
    phone_number_id: Mapped[str] = mapped_column(String(120), nullable=False)
    whatsapp_business_account_id: Mapped[str] = mapped_column(String(120), nullable=False)
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    webhook_verify_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    webhook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="non_configure")
    last_test_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PlatformWhatsAppConfiguration(Base):
    """Identifiants Meta uniques de la plateforme, inaccessibles aux cabinets."""
    __tablename__ = "platform_whatsapp_configuration"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="global")
    business_account_name: Mapped[str] = mapped_column(String(180), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(40), nullable=False)
    phone_number_id: Mapped[str] = mapped_column(String(120), nullable=False)
    whatsapp_business_account_id: Mapped[str] = mapped_column(String(120), nullable=False)
    access_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    webhook_verify_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    webhook_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="en_attente")
    last_test_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WhatsAppMessageTemplate(Base):
    __tablename__ = "whatsapp_message_templates"
    __table_args__ = (UniqueConstraint("tenant_id", "name", "language", name="uq_whatsapp_template_tenant_name_language"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    type: Mapped[str] = mapped_column(String(40), nullable=False)
    language: Mapped[str] = mapped_column(String(8), nullable=False, default="fr")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    meta_template_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    meta_template_id: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="UTILITY")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="brouillon")
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WhatsAppConversation(Base):
    __tablename__ = "whatsapp_conversations"
    __table_args__ = (
        UniqueConstraint("tenant_id", "patient_id", name="uq_whatsapp_conversation_tenant_patient"),
        Index("ix_whatsapp_conversation_tenant_last", "tenant_id", "last_message_at"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_phone_number: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="ouverte")
    assigned_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_message_preview: Mapped[str | None] = mapped_column(String(280), nullable=True)
    unread_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WhatsAppMessageLog(Base):
    __tablename__ = "whatsapp_message_logs"
    __table_args__ = (
        Index("ix_whatsapp_message_tenant_patient_created", "tenant_id", "patient_id", "created_at"),
        Index("ix_whatsapp_message_tenant_status", "tenant_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    conversation_id: Mapped[str | None] = mapped_column(ForeignKey("whatsapp_conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str | None] = mapped_column(ForeignKey("patient_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    appointment_id: Mapped[str | None] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True)
    fee_id: Mapped[str | None] = mapped_column(ForeignKey("fees.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_id: Mapped[str | None] = mapped_column(ForeignKey("payments.id", ondelete="SET NULL"), nullable=True, index=True)
    template_id: Mapped[str | None] = mapped_column(ForeignKey("whatsapp_message_templates.id", ondelete="SET NULL"), nullable=True)
    phone_number: Mapped[str] = mapped_column(String(40), nullable=False)
    message_content: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(String(40), nullable=False)
    sender_type: Mapped[str] = mapped_column(String(16), nullable=False, default="cabinet")
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    media_mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    reply_to_message_id: Mapped[str | None] = mapped_column(ForeignKey("whatsapp_message_logs.id", ondelete="SET NULL"), nullable=True)
    direction: Mapped[str] = mapped_column(String(16), nullable=False, default="sortant")
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="en_attente")
    meta_message_id: Mapped[str | None] = mapped_column(String(180), nullable=True, unique=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    internal_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    consent_withdrawal_requested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WhatsAppUnknownMessage(Base):
    __tablename__ = "whatsapp_unknown_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    phone_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    meta_message_id: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    message_type: Mapped[str] = mapped_column(String(40), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_id: Mapped[str | None] = mapped_column(String(180), nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    linked_patient_id: Mapped[str | None] = mapped_column(ForeignKey("patient_profiles.id", ondelete="SET NULL"), nullable=True)
    linked_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    linked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WhatsAppConsentLog(Base):
    __tablename__ = "whatsapp_consent_logs"
    __table_args__ = (Index("ix_whatsapp_consent_tenant_patient_created", "tenant_id", "patient_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    new_status: Mapped[str] = mapped_column(String(16), nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    performed_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
