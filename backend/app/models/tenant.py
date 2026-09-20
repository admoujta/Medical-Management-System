from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    slug: Mapped[str] = mapped_column(String(180), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="trial")
    specialty: Mapped[str] = mapped_column(String(120), nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    primary_color: Mapped[str] = mapped_column(String(20), nullable=False, default="#0f766e")
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    seo_title: Mapped[str | None] = mapped_column(String(70), nullable=True)
    seo_description: Mapped[str | None] = mapped_column(String(320), nullable=True)
    seo_keywords: Mapped[str | None] = mapped_column(String(500), nullable=True)
    seo_canonical_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    seo_social_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    seo_indexable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    tax_identifier: Mapped[str | None] = mapped_column(String(80), nullable=True)
    ice: Mapped[str | None] = mapped_column(String(80), nullable=True)
    trial_started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    trial_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    grace_period_days: Mapped[int] = mapped_column(Integer, nullable=False, default=7)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="tenant")
    roles = relationship("Role", back_populates="tenant")
    settings = relationship("TenantSettings", back_populates="tenant", uselist=False)
    patient_profiles = relationship("PatientProfile", back_populates="tenant")
    doctor_profiles = relationship("DoctorProfile", back_populates="tenant")
    appointments = relationship("Appointment", back_populates="tenant")
