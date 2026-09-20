from datetime import date, datetime, time
from decimal import Decimal
import secrets
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, Time, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[str | None] = mapped_column(String(40), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    cin: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    cin_document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    whatsapp_opt_in: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    whatsapp_consent_status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    whatsapp_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    whatsapp_opt_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    whatsapp_consent_source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    whatsapp_consent_collected_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    whatsapp_phone_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    preferred_whatsapp_language: Mapped[str] = mapped_column(String(8), nullable=False, default="fr")
    whatsapp_consent_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    cnss_deposit_reminder_days: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="patient_profile", foreign_keys=[user_id])
    tenant = relationship("Tenant", back_populates="patient_profiles")
    appointments = relationship("Appointment", back_populates="patient")


class PatientCabinetMembership(Base):
    __tablename__ = "patient_cabinet_memberships"
    __table_args__ = (UniqueConstraint("patient_id", "tenant_id", name="uq_patient_cabinet_membership"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PatientMedicalSummary(Base):
    __tablename__ = "patient_medical_summaries"
    __table_args__ = (UniqueConstraint("tenant_id", "patient_id", name="uq_patient_medical_summary_tenant_patient"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    primary_condition: Mapped[str | None] = mapped_column(String(240), nullable=True)
    active_conditions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    allergies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    current_treatments: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AppointmentPreparation(Base):
    __tablename__ = "appointment_preparations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id: Mapped[str] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    chief_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)
    reported_allergies: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    reported_treatments: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    blood_pressure: Mapped[str | None] = mapped_column(String(40), nullable=True)
    temperature: Mapped[str | None] = mapped_column(String(20), nullable=True)
    weight: Mapped[str | None] = mapped_column(String(20), nullable=True)
    height: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reception_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    doctor_diagnosis: Mapped[str | None] = mapped_column(String(240), nullable=True)
    next_step: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="draft")
    recorded_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    validated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    specialty: Mapped[str] = mapped_column(String(120), nullable=False)
    professional_email: Mapped[str] = mapped_column(String(255), nullable=False)
    professional_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    professional_number: Mapped[str | None] = mapped_column(String(80), nullable=True)
    signature_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="doctor_profile")
    tenant = relationship("Tenant", back_populates="doctor_profiles")
    appointments = relationship("Appointment", back_populates="doctor")


class DoctorReview(Base):
    __tablename__ = "doctor_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="planned")
    origin: Mapped[str] = mapped_column(String(32), nullable=False, default='cabinet', server_default='cabinet')
    actual_start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reminder_enabled: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    reminder_offset_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reminder_channels: Mapped[list | None] = mapped_column(JSON, nullable=True)
    qr_token: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True,
        default=lambda: secrets.token_urlsafe(32),
    )
    qr_scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    qr_scanned_by_user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    started_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    ended_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="appointments")
    patient = relationship("PatientProfile", back_populates="appointments")
    doctor = relationship("DoctorProfile", back_populates="appointments")


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id: Mapped[str | None] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, unique=True, index=True)
    visit_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="completed")
    attendance_status: Mapped[str] = mapped_column(String(16), nullable=False, default="present")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    actual_start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Fee(Base):
    __tablename__ = "fees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[str | None] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False, default="Consultation")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fee_type: Mapped[str] = mapped_column(String(50), nullable=False, default="CONSULTATION")
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    amount_ht: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    paid_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="in_progress")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_id: Mapped[str] = mapped_column(ForeignKey("fees.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id: Mapped[str | None] = mapped_column(ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    due_date_id: Mapped[str | None] = mapped_column(ForeignKey("payment_due_dates.id", ondelete="SET NULL"), nullable=True, index=True)
    doctor_id: Mapped[str | None] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_method_id: Mapped[str | None] = mapped_column(ForeignKey("payment_methods.id", ondelete="RESTRICT"), nullable=True, index=True)
    bank_account_id: Mapped[str | None] = mapped_column(ForeignKey("cabinet_bank_accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(60), nullable=False, default="cash")
    payment_type: Mapped[str] = mapped_column(String(32), nullable=False, default="immediate")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    installment_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    installment_schedule: Mapped[list | None] = mapped_column(JSON, nullable=True)
    cheque_bank: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cheque_number: Mapped[str | None] = mapped_column(String(80), nullable=True)
    cheque_owner_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    cheque_owner_cin: Mapped[str | None] = mapped_column(String(40), nullable=True)
    cheque_copy_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cheque_copy_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cheque_copy_mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cheque_owner_cin_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cheque_owner_cin_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cheque_owner_cin_mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cheque_deposit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    cheque_issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    cheque_cashing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    cheque_expected_cashing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    cheque_collection_method: Mapped[str | None] = mapped_column(String(24), nullable=True)
    cheque_rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cheque_rejected_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    cheque_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PAYE")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    patient = relationship("PatientProfile")


class HonoraireVisit(Base):
    __tablename__ = "honoraire_visits"
    __table_args__ = (UniqueConstraint("fee_id", "visit_id", name="uq_honoraire_visit"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_id: Mapped[str] = mapped_column(ForeignKey("fees.id", ondelete="CASCADE"), nullable=False, index=True)
    visit_id: Mapped[str] = mapped_column(ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, index=True)


class HonoraireAppointment(Base):
    __tablename__ = "honoraire_appointments"
    __table_args__ = (UniqueConstraint("fee_id", "appointment_id", name="uq_honoraire_appointment"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_id: Mapped[str] = mapped_column(ForeignKey("fees.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id: Mapped[str] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True)


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (UniqueConstraint("tenant_id", "invoice_number", name="uq_invoice_tenant_number"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[str | None] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    fee_id: Mapped[str] = mapped_column(ForeignKey("fees.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_number: Mapped[str] = mapped_column(String(60), nullable=False)
    amount_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    amount_paid: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    amount_due: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="UNPAID")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class OperationHistory(Base):
    __tablename__ = "operation_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    patient_id: Mapped[str | None] = mapped_column(ForeignKey("patient_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    doctor_id: Mapped[str | None] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    appointment_id: Mapped[str | None] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True)
    visit_id: Mapped[str | None] = mapped_column(ForeignKey("visits.id", ondelete="SET NULL"), nullable=True, index=True)
    fee_id: Mapped[str | None] = mapped_column(ForeignKey("fees.id", ondelete="SET NULL"), nullable=True, index=True)
    invoice_id: Mapped[str | None] = mapped_column(ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    payment_id: Mapped[str | None] = mapped_column(ForeignKey("payments.id", ondelete="SET NULL"), nullable=True, index=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("medical_documents.id", ondelete="SET NULL"), nullable=True, index=True)
    prescription_id: Mapped[str | None] = mapped_column(ForeignKey("prescriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    action_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    old_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    new_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    old_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


# Nom métier conservant la table d'audit existante et ses données historiques.
AppointmentHistory = OperationHistory


class CNSSCase(Base):
    __tablename__ = "cnss_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    fee_id: Mapped[str | None] = mapped_column(ForeignKey("fees.id", ondelete="SET NULL"), nullable=True, index=True)
    visit_id: Mapped[str | None] = mapped_column(ForeignKey("visits.id", ondelete="SET NULL"), nullable=True, index=True)
    appointment_id: Mapped[str | None] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True)
    reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    label: Mapped[str] = mapped_column(String(180), nullable=False, default="Dossier CNSS/CNOPS")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    estimated_reimbursable_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    reimbursed_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="REQUESTED")
    delivery_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_confirmed_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    deposit_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    deposit_deadline: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    deposit_reference: Mapped[str | None] = mapped_column(String(160), nullable=True)
    decision_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    rejection_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reimbursement_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CNSSStatusHistory(Base):
    __tablename__ = "cnss_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    cnss_case_id: Mapped[str] = mapped_column(ForeignKey("cnss_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    old_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    new_status: Mapped[str] = mapped_column(String(32), nullable=False)
    changed_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by_role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    event_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class PatientNotification(Base):
    __tablename__ = "patient_notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[str] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_id: Mapped[str | None] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True)
    visit_id: Mapped[str | None] = mapped_column(ForeignKey("visits.id", ondelete="SET NULL"), nullable=True, index=True)
    prescription_number: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    items: Mapped[list | None] = mapped_column(JSON, nullable=True)
    consultation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    pdf_document_id: Mapped[str | None] = mapped_column(ForeignKey("medical_documents.id", ondelete="SET NULL"), nullable=True, index=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MedicationCatalog(Base):
    __tablename__ = "medication_catalog"
    __table_args__ = (
        UniqueConstraint("source", "external_code", name="uq_medication_catalog_source_code"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(80), nullable=False, default="FADAA")
    external_code: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    generic_name: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    strength: Mapped[str | None] = mapped_column(String(120), nullable=True)
    form: Mapped[str | None] = mapped_column(String(120), nullable=True)
    route: Mapped[str | None] = mapped_column(String(120), nullable=True)
    specialties: Mapped[list | None] = mapped_column(JSON, nullable=True)
    default_dosage: Mapped[str | None] = mapped_column(String(120), nullable=True)
    default_frequency: Mapped[str | None] = mapped_column(String(180), nullable=True)
    default_duration: Mapped[str | None] = mapped_column(String(120), nullable=True)
    default_instructions: Mapped[str | None] = mapped_column(String(500), nullable=True)
    metadata_payload: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DocumentCategory(Base):
    __tablename__ = "document_categories"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_document_category_tenant_code"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str | None] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category_type: Mapped[str] = mapped_column(String(24), nullable=False, default="MEDICAL")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MedicalDocument(Base):
    __tablename__ = "medical_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id: Mapped[str | None] = mapped_column(ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    appointment_id: Mapped[str | None] = mapped_column(ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True)
    visit_id: Mapped[str | None] = mapped_column(ForeignKey("visits.id", ondelete="SET NULL"), nullable=True, index=True)
    fee_id: Mapped[str | None] = mapped_column(ForeignKey("fees.id", ondelete="SET NULL"), nullable=True, index=True)
    invoice_id: Mapped[str | None] = mapped_column(ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True, index=True)
    cnss_case_id: Mapped[str | None] = mapped_column(ForeignKey("cnss_cases.id", ondelete="SET NULL"), nullable=True, index=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("document_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_type: Mapped[str] = mapped_column(String(80), nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stored_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extension: Mapped[str | None] = mapped_column(String(16), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="upload_manuel")
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="ACTIF")
    confidential: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    shared_with_patient: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    document_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    parent_document_id: Mapped[str | None] = mapped_column(ForeignKey("medical_documents.id", ondelete="SET NULL"), nullable=True, index=True)
    scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
