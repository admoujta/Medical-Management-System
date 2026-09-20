import datetime as dt
from decimal import Decimal
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, model_validator
from app.core.phone import OptionalPhoneNumber

AccessLevel = Literal["none", "read", "write", "admin"]
AppointmentStatus = Literal["requested", "planned", "confirmed", "waiting", "in_progress", "present", "absent", "rejected", "cancelled", "completed"]
CNSSStatus = Literal["REQUESTED", "PROCESSING", "READY_FOR_PICKUP", "DELIVERED_TO_PATIENT", "SUBMITTED_TO_CNSS", "APPROVED", "REJECTED"]
DocumentType = Literal["Analyse", "Radio", "Ordonnance", "Compte rendu", "Courrier", "Certificat", "CNSS", "CNSS/CNOPS", "Assurance", "Identité", "Consentement", "Facture", "Reçu", "Autre"]
class FeeTypePrices(BaseModel):
    prices: dict[str, float]
    tax_rates: dict[str, float] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_prices(self):
        if not self.prices:
            raise ValueError("Ajoutez au moins un type d’honoraire.")
        if any(not key.strip() or len(key) > 50 for key in self.prices):
            raise ValueError("Chaque type d’honoraire doit contenir entre 1 et 50 caractères.")
        if any(price < 0 for price in self.prices.values()):
            raise ValueError("Le prix d’un type d’honoraire ne peut pas être négatif.")
        if any(rate < 0 or rate > 100 for rate in self.tax_rates.values()):
            raise ValueError("Le taux de TVA doit être compris entre 0 et 100 %.")
        return self


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=180)
    specialty: str | None = Field(default=None, min_length=2, max_length=120)
    logo_url: str | None = Field(default=None, max_length=500)
    primary_color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    city: str | None = Field(default=None, min_length=2, max_length=120)
    address: str | None = Field(default=None, min_length=5, max_length=1000)
    phone: OptionalPhoneNumber = None
    website: str | None = Field(default=None, max_length=255)
    seo_title: str | None = Field(default=None, max_length=70)
    seo_description: str | None = Field(default=None, max_length=320)
    seo_keywords: str | None = Field(default=None, max_length=500)
    seo_canonical_url: str | None = Field(default=None, max_length=500, pattern=r"^https?://.+")
    seo_social_image_url: str | None = Field(default=None, max_length=500, pattern=r"^https?://.+")
    seo_indexable: bool | None = None
    tax_identifier: str | None = Field(default=None, max_length=80)
    ice: str | None = Field(default=None, max_length=80)


class TenantStatusUpdate(BaseModel):
    status: Literal["trial", "active", "expired", "suspended"]


class UserCreate(BaseModel):
    first_name: str = Field(min_length=2, max_length=120)
    last_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: OptionalPhoneNumber = None
    role: Literal["SECRETAIRE", "PATIENT", "MEDECIN_ADMIN"] = "SECRETAIRE"
    permissions: dict[str, AccessLevel] | None = None
    staff_level: Literal["standard", "manager"] = "standard"


class UserUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=2, max_length=120)
    last_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: OptionalPhoneNumber = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: str
    tenant_id: str | None
    first_name: str
    last_name: str
    email: EmailStr
    phone: str | None
    role: str | None
    is_active: bool
    account_status: str
    staff_level: str | None
    created_at: dt.datetime


class PatientCreate(BaseModel):
    first_name: str = Field(min_length=2, max_length=120)
    last_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: OptionalPhoneNumber = None
    birth_date: dt.date
    gender: Literal["M", "F"]
    address: str | None = Field(default=None, max_length=1000)
    preferred_whatsapp_language: Literal["fr", "ar"] = "fr"
    cin: str | None = Field(default=None, max_length=40)
    cin_document_url: str | None = Field(default=None, max_length=500)


class PatientUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=2, max_length=120)
    last_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: OptionalPhoneNumber = None
    birth_date: dt.date | None = None
    gender: Literal["M", "F"] | None = None
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=1000)
    status: Literal["active", "pending", "disabled"] | None = None
    preferred_whatsapp_language: Literal["fr", "ar"] | None = None
    cin: str | None = Field(default=None, max_length=40)
    cin_document_url: str | None = Field(default=None, max_length=500)


class PatientOut(BaseModel):
    id: str
    user_id: str
    first_name: str
    last_name: str
    email: EmailStr | None
    phone: str | None
    birth_date: dt.date
    gender: str | None
    address: str | None
    status: str
    account_status: str
    whatsapp_opt_in: bool
    whatsapp_consent_status: str
    whatsapp_consent_at: dt.datetime | None
    whatsapp_opt_out_at: dt.datetime | None
    preferred_whatsapp_language: str
    created_at: dt.datetime
    cin: str | None = None
    cin_document_url: str | None = None
    appointment_count: int = 0


class PatientMedicalSummaryUpdate(BaseModel):
    primary_condition: str | None = Field(default=None, max_length=240)
    active_conditions: list[str] = Field(default_factory=list, max_length=20)
    allergies: list[str] = Field(default_factory=list, max_length=20)
    current_treatments: list[str] = Field(default_factory=list, max_length=30)
    next_step: str | None = Field(default=None, max_length=1000)


class PatientMedicalSummaryOut(PatientMedicalSummaryUpdate):
    patient_id: str
    updated_at: dt.datetime | None = None
    updated_by_user_id: str | None = None


class AppointmentPreparationUpdate(BaseModel):
    chief_complaint: str | None = Field(default=None, max_length=2000)
    reported_allergies: list[str] = Field(default_factory=list, max_length=20)
    reported_treatments: list[str] = Field(default_factory=list, max_length=30)
    blood_pressure: str | None = Field(default=None, max_length=40)
    temperature: str | None = Field(default=None, max_length=20)
    weight: str | None = Field(default=None, max_length=20)
    height: str | None = Field(default=None, max_length=20)
    reception_notes: str | None = Field(default=None, max_length=2000)
    status: Literal["draft", "ready"] = "draft"


class AppointmentPreparationValidate(BaseModel):
    chief_complaint: str | None = Field(default=None, max_length=2000)
    reported_allergies: list[str] = Field(default_factory=list, max_length=20)
    reported_treatments: list[str] = Field(default_factory=list, max_length=30)
    doctor_diagnosis: str = Field(min_length=2, max_length=240)
    next_step: str | None = Field(default=None, max_length=1000)
    update_medical_summary: bool = True


class AppointmentPreparationOut(BaseModel):
    appointment_id: str
    patient_id: str
    chief_complaint: str | None = None
    reported_allergies: list[str] = Field(default_factory=list)
    reported_treatments: list[str] = Field(default_factory=list)
    blood_pressure: str | None = None
    temperature: str | None = None
    weight: str | None = None
    height: str | None = None
    reception_notes: str | None = None
    doctor_diagnosis: str | None = None
    next_step: str | None = None
    status: str = "draft"
    recorded_by_user_id: str | None = None
    validated_by_user_id: str | None = None
    validated_at: dt.datetime | None = None
    updated_at: dt.datetime | None = None


class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str | None = None
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    reason: str | None = None
    notes: str | None = None
    status: AppointmentStatus = "planned"
    reminder_enabled: bool | None = None
    reminder_offset_minutes: int | None = Field(default=None, ge=60, le=43200)
    reminder_channels: list[Literal["WHATSAPP", "ESPACE_PATIENT"]] | None = None

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.end_time <= self.start_time:
            raise ValueError("L’heure de fin doit être après l’heure de début.")
        return self


class AppointmentUpdate(BaseModel):
    patient_id: str | None = None
    doctor_id: str | None = None
    date: dt.date | None = None
    start_time: dt.time | None = None
    end_time: dt.time | None = None
    reason: str | None = None
    notes: str | None = None
    status: AppointmentStatus | None = None
    reminder_enabled: bool | None = None
    reminder_offset_minutes: int | None = Field(default=None, ge=60, le=43200)
    reminder_channels: list[Literal["WHATSAPP", "ESPACE_PATIENT"]] | None = None

    @model_validator(mode="after")
    def validate_time_range(self):
        if self.start_time is not None and self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("L’heure de fin doit être après l’heure de début.")
        return self


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    patient_name: str
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    reason: str | None
    notes: str | None
    status: str
    origin: Literal['cabinet', 'online', 'patient_portal'] = 'cabinet'
    actual_start_time: dt.datetime | None = None
    actual_end_time: dt.datetime | None = None
    duration_seconds: int | None = None
    qr_scanned_at: dt.datetime | None = None
    reminder_enabled: bool | None = None
    reminder_offset_minutes: int | None = None
    reminder_channels: list[str] | None = None
    doctor_name: str | None = None
    doctor_specialty: str | None = None
    cabinet_name: str | None = None
    cabinet_address: str | None = None
    cabinet_city: str | None = None
    cabinet_phone: str | None = None


class AppointmentQrOut(BaseModel):
    appointment_id: str
    qr_payload: str
    qr_svg: str
    patient_name: str
    doctor_name: str | None = None
    date: dt.date
    start_time: dt.time
    end_time: dt.time
    status: str
    active: bool
    scanned_at: dt.datetime | None = None


class AppointmentQrScanRequest(BaseModel):
    code: str = Field(min_length=16, max_length=500)


class AppointmentQrScanOut(BaseModel):
    appointment: AppointmentOut
    scheduled_label: str
    scanned_at: dt.datetime | None = None
    already_confirmed: bool = False


class VisitCreate(BaseModel):
    patient_id: str
    doctor_id: str | None = None
    appointment_id: str | None = None
    visit_date: dt.date
    reason: str | None = None
    notes: str | None = None
    attendance_status: Literal["present", "absent"] = "present"


class VisitUpdate(BaseModel):
    visit_date: dt.date | None = None
    reason: str | None = None
    notes: str | None = None
    attendance_status: Literal["present", "absent"] | None = None


class VisitOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    appointment_id: str | None
    visit_date: dt.date
    status: str
    attendance_status: Literal["present", "absent"] = "present"
    reason: str | None
    notes: str | None
    actual_start_time: dt.datetime | None = None
    actual_end_time: dt.datetime | None = None
    duration_seconds: int | None = None
    patient_name: str | None = None
    doctor_name: str | None = None


class FeeCreate(BaseModel):
    patient_id: str
    amount: float | None = Field(default=None, gt=0)
    amount_ht: float | None = Field(default=None, gt=0)
    tax_rate: float = Field(default=0, ge=0, le=100)
    doctor_id: str | None = None
    title: str = Field(default="Consultation", min_length=2, max_length=180)
    description: str | None = None
    fee_type: str = Field(default="CONSULTATION", max_length=50)
    due_date: dt.date | None = None
    appointment_ids: list[str] = Field(default_factory=list)
    visit_ids: list[str] = Field(default_factory=list)


class FeeUpdate(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    amount_ht: float | None = Field(default=None, gt=0)
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    title: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = None
    fee_type: str | None = Field(default=None, max_length=50)
    due_date: dt.date | None = None
    status: Literal["draft", "in_progress", "partially_paid", "paid", "cancelled"] | None = None


class FeeOut(BaseModel):
    id: str
    patient_id: str
    amount: float
    amount_ht: float
    tax_rate: float
    tax_amount: float
    paid_amount: float
    remaining_amount: float
    status: str
    doctor_id: str | None = None
    title: str = "Consultation"
    description: str | None = None
    fee_type: str = "CONSULTATION"
    due_date: dt.date | None = None
    created_at: dt.datetime
    updated_at: dt.datetime
    appointment_ids: list[str] = Field(default_factory=list)
    visit_ids: list[str] = Field(default_factory=list)
    patient_name: str | None = None
    doctor_name: str | None = None


class PaymentCreate(BaseModel):
    patient_id: str
    fee_id: str
    amount: float = Field(gt=0)
    method: str = Field(default="cash", max_length=60)
    payment_type: Literal["immediate", "partial", "single_due", "installment"] = "immediate"
    due_date: dt.date | None = None
    installment_count: int | None = Field(default=None, ge=2, le=24)
    cheque_bank: str | None = Field(default=None, max_length=120)
    cheque_number: str | None = Field(default=None, max_length=80)
    cheque_owner_name: str | None = Field(default=None, min_length=2, max_length=180)
    cheque_owner_cin: str | None = Field(default=None, min_length=3, max_length=40)
    cheque_deposit_date: dt.date | None = None
    cheque_issue_date: dt.date | None = None
    cheque_cashing_date: dt.date | None = None
    cheque_status: Literal["RECU", "DEPOSE", "ENCAISSE", "REJETE", "ANNULE"] | None = None
    cheque_expected_cashing_date: dt.date | None = None
    cheque_collection_method: Literal["DEPOT_BANCAIRE", "ESPECES"] | None = None
    cheque_rejection_reason: str | None = Field(default=None, max_length=500)
    cheque_rejected_at: dt.date | None = None
    invoice_id: str | None = None
    note: str | None = None
    reference: str | None = Field(default=None, max_length=120)
    payment_method_id: str | None = None
    bank_account_id: str | None = None
    due_date_id: str | None = None

    @model_validator(mode="after")
    def validate_payment_details(self):
        if self.payment_type in {"single_due", "installment"} and self.due_date is None:
            raise ValueError("La date d’échéance est obligatoire pour ce type de règlement.")
        if self.payment_type == "installment" and self.installment_count is None:
            raise ValueError("Le nombre d’échéances est obligatoire.")
        if self.method == "cheque":
            if not self.cheque_bank or not self.cheque_bank.strip():
                raise ValueError("La banque du chèque est obligatoire.")
            if not self.cheque_number or not self.cheque_number.strip():
                raise ValueError("Le numéro du chèque est obligatoire.")
            if not self.cheque_owner_name or not self.cheque_owner_name.strip():
                raise ValueError("Le nom du propriétaire du chèque est obligatoire.")
            if not self.cheque_owner_cin or not self.cheque_owner_cin.strip():
                raise ValueError("La CIN du propriétaire du chèque est obligatoire.")
            self.cheque_issue_date = self.cheque_issue_date or self.cheque_deposit_date
            if self.cheque_issue_date is None:
                raise ValueError("La date d’émission du chèque est obligatoire.")
            self.cheque_expected_cashing_date = self.cheque_expected_cashing_date or self.cheque_cashing_date
            if self.cheque_expected_cashing_date and self.cheque_expected_cashing_date < self.cheque_issue_date:
                raise ValueError("La date d’encaissement prévue ne peut pas précéder la date d’émission.")
            self.cheque_cashing_date = None
            self.cheque_status = "RECU"
        else:
            self.cheque_bank = self.cheque_number = self.cheque_status = None
            self.cheque_deposit_date = self.cheque_issue_date = self.cheque_cashing_date = None
        return self


class PaymentUpdate(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    method: str | None = Field(default=None, max_length=60)
    payment_type: Literal["immediate", "partial", "single_due", "installment"] | None = None
    due_date: dt.date | None = None
    installment_count: int | None = Field(default=None, ge=2, le=24)
    cheque_bank: str | None = Field(default=None, max_length=120)
    cheque_number: str | None = Field(default=None, max_length=80)
    cheque_owner_name: str | None = Field(default=None, min_length=2, max_length=180)
    cheque_owner_cin: str | None = Field(default=None, min_length=3, max_length=40)
    cheque_deposit_date: dt.date | None = None
    cheque_issue_date: dt.date | None = None
    cheque_cashing_date: dt.date | None = None
    cheque_status: Literal["RECU", "DEPOSE", "ENCAISSE", "REJETE", "ANNULE"] | None = None
    cheque_expected_cashing_date: dt.date | None = None
    cheque_collection_method: Literal["DEPOT_BANCAIRE", "ESPECES"] | None = None
    cheque_rejection_reason: str | None = Field(default=None, max_length=500)
    cheque_rejected_at: dt.date | None = None
    note: str | None = None
    status: Literal["EN_ATTENTE", "PARTIELLEMENT_PAYE", "PAYE", "ANNULE", "REMBOURSE"] | None = None
    due_date_id: str | None = None
    bank_account_id: str | None = None


class PaymentOut(BaseModel):
    id: str
    patient_id: str
    fee_id: str
    amount: float
    method: str
    payment_type: str = "immediate"
    due_date: dt.date | None = None
    installment_count: int | None = None
    installment_schedule: list[dict] | None = None
    cheque_bank: str | None = None
    cheque_number: str | None = None
    cheque_owner_name: str | None = None
    cheque_owner_cin: str | None = None
    cheque_copy_filename: str | None = None
    cheque_owner_cin_filename: str | None = None
    cheque_documents_complete: bool = False
    cheque_deposit_date: dt.date | None = None
    cheque_issue_date: dt.date | None = None
    cheque_cashing_date: dt.date | None = None
    cheque_status: str | None = None
    cheque_expected_cashing_date: dt.date | None = None
    cheque_collection_method: str | None = None
    cheque_rejection_reason: str | None = None
    cheque_rejected_at: dt.date | None = None
    paid_at: dt.datetime
    invoice_id: str | None = None
    note: str | None = None
    reference: str | None = None
    payment_method_id: str | None = None
    bank_account_id: str | None = None
    bank_account_label: str | None = None
    bank_name: str | None = None
    doctor_id: str | None = None
    status: str = "PAYE"
    updated_at: dt.datetime | None = None
    due_date_id: str | None = None
    patient_name: str | None = None
    doctor_name: str | None = None
    fee_title: str | None = None


class PaginationOut(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int
    has_next: bool
    has_previous: bool


PageItem = TypeVar("PageItem")


class CollectionPageOut(BaseModel, Generic[PageItem]):
    items: list[PageItem]
    pagination: PaginationOut
    summary: dict[str, float | int] | None = None


class PaymentPageSummaryOut(BaseModel):
    collected_payments: float
    collected_count: int


class PaymentPageOut(CollectionPageOut[PaymentOut]):
    summary: PaymentPageSummaryOut


class PaymentDocumentCreate(BaseModel):
    document_type: Literal["recu", "facture"]


class PaymentDocumentOut(BaseModel):
    id: str
    tenant_id: str
    patient_id: str
    fee_id: str
    payment_id: str
    document_type: str
    document_number: str
    generated_at: dt.datetime
    generated_by_user_id: str | None
    created_at: dt.datetime
    updated_at: dt.datetime


class PaymentMethodCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: str = Field(min_length=2, max_length=60, pattern=r"^[a-z0-9_-]+$")
    main_type: Literal["ESPECE", "BANQUE"]
    subtype: Literal["CARTE", "CHEQUE", "VIREMENT"] | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def validate_subtype(self):
        if self.main_type == "ESPECE":
            self.subtype = None
        elif self.subtype is None:
            raise ValueError("Le sous-type bancaire est obligatoire.")
        return self


class PaymentMethodUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    main_type: Literal["ESPECE", "BANQUE"] | None = None
    subtype: Literal["CARTE", "CHEQUE", "VIREMENT"] | None = None
    is_active: bool | None = None


class PaymentMethodOut(BaseModel):
    id: str
    name: str
    code: str
    main_type: str
    subtype: str | None
    is_active: bool
    created_at: dt.datetime
    updated_at: dt.datetime


class BankAccountCreate(BaseModel):
    label: str = Field(min_length=2, max_length=120)
    bank_name: str = Field(min_length=2, max_length=120)
    account_holder: str = Field(min_length=2, max_length=180)
    rib: str = Field(min_length=16, max_length=32, pattern=r"^[A-Za-z0-9 ]+$")
    iban: str | None = Field(default=None, max_length=34, pattern=r"^[A-Za-z0-9 ]+$")
    is_default: bool = False
    is_active: bool = True


class BankAccountUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=2, max_length=120)
    bank_name: str | None = Field(default=None, min_length=2, max_length=120)
    account_holder: str | None = Field(default=None, min_length=2, max_length=180)
    rib: str | None = Field(default=None, min_length=16, max_length=32, pattern=r"^[A-Za-z0-9 ]+$")
    iban: str | None = Field(default=None, max_length=34, pattern=r"^[A-Za-z0-9 ]+$")
    is_default: bool | None = None
    is_active: bool | None = None


class BankAccountOut(BankAccountCreate):
    id: str
    tenant_id: str
    created_at: dt.datetime
    updated_at: dt.datetime


class DueDateCreate(BaseModel):
    amount: Decimal = Field(gt=0, decimal_places=2, max_digits=12, description="Montant attendu en MAD. La somme des échéances actives ne peut pas dépasser le total de la facture.")
    due_date: dt.date = Field(description="Date calendaire d’exigibilité au format ISO 8601 (YYYY-MM-DD).")
    comment: str | None = Field(default=None, max_length=1000, description="Note interne facultative liée à l’échéance.")
    guarantee_type: Literal["NORMAL", "GUARANTOR", "CHEQUE"] = Field(default="NORMAL", description="Type de garantie : aucune, garant physique, ou chèque de garantie.")
    guarantor_name: str | None = Field(default=None, max_length=180, description="Obligatoire lorsque guarantee_type vaut GUARANTOR.")
    guarantor_cin: str | None = Field(default=None, max_length=40, description="CIN obligatoire lorsque guarantee_type vaut GUARANTOR.")
    guarantee_cheque_bank: str | None = Field(default=None, max_length=120, description="Banque obligatoire lorsque guarantee_type vaut CHEQUE.")
    guarantee_cheque_number: str | None = Field(default=None, max_length=80, description="Numéro obligatoire lorsque guarantee_type vaut CHEQUE.")
    guarantee_cheque_issue_date: dt.date | None = Field(default=None, description="Date d’émission obligatoire pour un chèque de garantie.")
    guarantee_cheque_due_date: dt.date | None = Field(default=None, description="Date d’échéance du chèque, postérieure ou égale à sa date d’émission.")

    model_config = ConfigDict(json_schema_extra={"examples": [
        {"amount": "500.00", "due_date": "2026-09-30", "comment": "Deuxième tranche", "guarantee_type": "NORMAL"},
        {"amount": "1200.00", "due_date": "2026-10-15", "guarantee_type": "GUARANTOR", "guarantor_name": "Ahmed Exemple", "guarantor_cin": "AB123456"},
        {"amount": "800.00", "due_date": "2026-11-01", "guarantee_type": "CHEQUE", "guarantee_cheque_bank": "Banque Exemple", "guarantee_cheque_number": "CHQ-00125", "guarantee_cheque_issue_date": "2026-08-01", "guarantee_cheque_due_date": "2026-11-01"},
    ]})

    @model_validator(mode="after")
    def validate_guarantee(self):
        if self.guarantee_type == "GUARANTOR":
            if not (self.guarantor_name or "").strip() or not (self.guarantor_cin or "").strip():
                raise ValueError("Le nom et la CIN du garant sont obligatoires.")
            self.guarantee_cheque_bank = self.guarantee_cheque_number = None
            self.guarantee_cheque_issue_date = self.guarantee_cheque_due_date = None
        elif self.guarantee_type == "CHEQUE":
            if not (self.guarantee_cheque_bank or "").strip() or not (self.guarantee_cheque_number or "").strip():
                raise ValueError("La banque et le numéro du chèque de garantie sont obligatoires.")
            if self.guarantee_cheque_issue_date is None or self.guarantee_cheque_due_date is None:
                raise ValueError("Les dates d’émission et d’échéance du chèque sont obligatoires.")
            if self.guarantee_cheque_due_date < self.guarantee_cheque_issue_date:
                raise ValueError("La date d’échéance du chèque ne peut pas précéder sa date d’émission.")
            self.guarantor_name = self.guarantor_cin = None
        else:
            self.guarantor_name = self.guarantor_cin = None
            self.guarantee_cheque_bank = self.guarantee_cheque_number = None
            self.guarantee_cheque_issue_date = self.guarantee_cheque_due_date = None
        return self


class DueDateUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2, max_digits=12)
    due_date: dt.date | None = None
    comment: str | None = Field(default=None, max_length=1000)
    status: Literal["A_VENIR", "EN_ATTENTE", "PARTIELLEMENT_PAYEE", "PAYEE", "EN_RETARD", "ANNULEE"] | None = None


class DueDateOut(BaseModel):
    id: str
    invoice_id: str
    tenant_id: str
    patient_id: str
    fee_id: str | None
    amount: Decimal
    due_date: dt.date
    paid_amount: Decimal
    remaining_amount: Decimal
    status: str
    comment: str | None
    guarantee_type: str = "NORMAL"
    guarantor_name: str | None = None
    guarantor_cin: str | None = None
    guarantee_cheque_bank: str | None = None
    guarantee_cheque_number: str | None = None
    guarantee_cheque_issue_date: dt.date | None = None
    guarantee_cheque_due_date: dt.date | None = None
    created_by_user_id: str | None
    updated_by_user_id: str | None
    created_at: dt.datetime
    updated_at: dt.datetime


class DueDateDocumentOut(BaseModel):
    id: str
    due_date_id: str
    patient_id: str
    document_type: str
    title: str
    original_filename: str
    mime_type: str
    file_size: int
    uploaded_by_user_id: str | None
    uploaded_by_name: str
    created_at: dt.datetime


class ExpenseSupplierCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    supplier_type: str = Field(min_length=2, max_length=80)
    tax_id: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=180)
    address: str | None = Field(default=None, max_length=1000)
    is_active: bool = True

class ExpenseSupplierOut(ExpenseSupplierCreate):
    id: str
    created_at: dt.datetime

class SupplierProductCreate(BaseModel):
    supplier_id: str
    name: str = Field(min_length=2, max_length=180)
    category: str = Field(min_length=2, max_length=80)
    unit: str = Field(default="unité", min_length=1, max_length=40)
    default_unit_price_ht: Decimal = Field(ge=0, decimal_places=2, max_digits=12)
    tax_rate: Decimal = Field(default=0, ge=0, le=100, decimal_places=2, max_digits=5)
    is_active: bool = True

class SupplierProductOut(SupplierProductCreate):
    id: str
    created_at: dt.datetime


class ExpenseLineCreate(BaseModel):
    product_id: str
    description: str = Field(min_length=2, max_length=500)
    quantity: Decimal = Field(gt=0, decimal_places=3, max_digits=12)
    unit: str = Field(min_length=1, max_length=40)
    unit_price_ht: Decimal = Field(ge=0, decimal_places=2, max_digits=12)
    tax_rate: Decimal = Field(ge=0, le=100, decimal_places=2, max_digits=5)


class ExpenseCreate(BaseModel):
    label: str = Field(min_length=2, max_length=180)
    category: str = Field(min_length=2, max_length=32)
    expense_type: Literal["FIXE", "VARIABLE"]
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2, max_digits=12)
    expense_date: dt.date
    supplier_id: str | None = None
    supplier: str | None = Field(default=None, max_length=180)
    description: str | None = Field(default=None, max_length=4000)
    items: list[ExpenseLineCreate] | None = Field(default=None, max_length=100)
    amount_ht: Decimal | None = None
    tax_amount: Decimal | None = None
    amount_ttc: Decimal | None = None
    payment_method: str | None = Field(default=None, max_length=60)
    bank_account_id: str | None = None
    reference: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def calculate_totals(self):
        if self.items:
            total_ht = sum((line.quantity * line.unit_price_ht for line in self.items), Decimal("0"))
            total_tax = sum((line.quantity * line.unit_price_ht * line.tax_rate / Decimal("100") for line in self.items), Decimal("0"))
            self.amount_ht = total_ht.quantize(Decimal("0.01"))
            self.tax_amount = total_tax.quantize(Decimal("0.01"))
            self.amount_ttc = (self.amount_ht + self.tax_amount).quantize(Decimal("0.01"))
            self.amount = self.amount_ttc
        elif self.amount is not None:
            self.amount_ht = self.amount_ht or self.amount
            self.tax_amount = self.tax_amount or Decimal("0")
            self.amount_ttc = self.amount
        else:
            raise ValueError("Ajoutez au moins une ligne de dépense.")
        method=(self.payment_method or "").strip().lower()
        if method=="cash":
            self.bank_account_id=None
        elif method in {"card","transfer"} and not self.bank_account_id:
            raise ValueError("Choisissez le compte bancaire du cabinet concerné.")
        return self


class ExpenseOut(ExpenseCreate):
    id: str
    bank_account_label: str | None = None
    bank_name: str | None = None
    created_by_user_id: str | None
    created_at: dt.datetime
    updated_at: dt.datetime


class PurchaseOrderCreate(BaseModel):
    supplier: str = Field(min_length=2, max_length=180)
    description: str = Field(min_length=2, max_length=4000)
    amount: Decimal = Field(gt=0, decimal_places=2, max_digits=12)
    order_date: dt.date
    expected_date: dt.date | None = None
    status: Literal["BROUILLON", "ENVOYE", "CONFIRME", "RECU", "ANNULE"] = "BROUILLON"
    note: str | None = Field(default=None, max_length=2000)


class PurchaseOrderOut(PurchaseOrderCreate):
    id: str
    order_number: str
    created_by_user_id: str | None
    created_at: dt.datetime
    updated_at: dt.datetime


class HonorairePaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    method: str = Field(default="cash", max_length=60)
    payment_type: Literal["immediate", "partial", "single_due", "installment"] = "immediate"
    due_date: dt.date | None = None
    installment_count: int | None = Field(default=None, ge=2, le=24)
    cheque_bank: str | None = Field(default=None, max_length=120)
    cheque_number: str | None = Field(default=None, max_length=80)
    cheque_owner_name: str | None = Field(default=None, min_length=2, max_length=180)
    cheque_owner_cin: str | None = Field(default=None, min_length=3, max_length=40)
    cheque_deposit_date: dt.date | None = None
    cheque_issue_date: dt.date | None = None
    cheque_cashing_date: dt.date | None = None
    cheque_status: Literal["RECU", "DEPOSE", "ENCAISSE", "REJETE", "ANNULE"] | None = None
    cheque_expected_cashing_date: dt.date | None = None
    cheque_collection_method: Literal["DEPOT_BANCAIRE", "ESPECES"] | None = None
    cheque_rejection_reason: str | None = Field(default=None, max_length=500)
    cheque_rejected_at: dt.date | None = None
    note: str | None = None
    reference: str | None = Field(default=None, max_length=120)
    due_date_id: str | None = None
    bank_account_id: str | None = None

    @model_validator(mode="after")
    def validate_payment_details(self):
        if self.payment_type in {"single_due", "installment"} and self.due_date is None:
            raise ValueError("La date d’échéance est obligatoire pour ce type de règlement.")
        if self.payment_type == "installment" and self.installment_count is None:
            raise ValueError("Le nombre d’échéances est obligatoire.")
        if self.method == "cheque":
            if not self.cheque_bank or not self.cheque_bank.strip() or not self.cheque_number or not self.cheque_number.strip():
                raise ValueError("La banque et le numéro du chèque sont obligatoires.")
            self.cheque_issue_date = self.cheque_issue_date or self.cheque_deposit_date
            if self.cheque_issue_date is None:
                raise ValueError("La date d’émission du chèque est obligatoire.")
            self.cheque_expected_cashing_date = self.cheque_expected_cashing_date or self.cheque_cashing_date
            if self.cheque_expected_cashing_date and self.cheque_expected_cashing_date < self.cheque_issue_date:
                raise ValueError("La date d’encaissement prévue ne peut pas précéder la date d’émission.")
            self.cheque_cashing_date = None
            self.cheque_status = "RECU"
        else:
            self.cheque_bank = self.cheque_number = self.cheque_status = None
            self.cheque_deposit_date = self.cheque_issue_date = self.cheque_cashing_date = None
        return self


class PaymentSettings(BaseModel):
    methods: list[Literal["cash", "card", "transfer", "cheque", "other"]]
    settlement_types: list[Literal["immediate", "partial", "single_due", "installment"]]
    default_method: Literal["cash", "card", "transfer", "cheque", "other"] = "cash"
    default_settlement_type: Literal["immediate", "partial", "single_due", "installment"] = "immediate"
    default_due_days: int = Field(default=30, ge=0, le=365)
    default_installments: int = Field(default=3, ge=2, le=24)
    grace_days: int = Field(default=0, ge=0, le=90)


class InvoiceCreate(BaseModel):
    fee_id: str


class InvoiceOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str | None = None
    fee_id: str
    invoice_number: str
    amount_total: float
    amount_paid: float
    amount_due: float
    status: str
    issued_at: dt.datetime
    doctor_id: str | None = None
    doctor_name: str | None = None
    due_date: dt.date | None = None
    comment: str | None = None
    updated_at: dt.datetime | None = None


class OperationHistoryOut(BaseModel):
    id: str
    user_id: str | None
    patient_id: str | None
    doctor_id: str | None = None
    appointment_id: str | None
    visit_id: str | None
    fee_id: str | None
    invoice_id: str | None
    payment_id: str | None
    document_id: str | None = None
    action_type: str
    old_status: str | None = None
    new_status: str | None = None
    description: str | None = None
    performed_by_role: str | None = None
    performed_by_name: str | None = None
    old_value: dict | None
    new_value: dict | None
    created_at: dt.datetime


class CNSSCreate(BaseModel):
    patient_id: str
    fee_id: str | None = None
    visit_id: str | None = None
    appointment_id: str | None = None
    reference: str | None = Field(default=None, max_length=120)
    label: str = Field(default="Dossier CNSS/CNOPS", min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=3000)
    internal_notes: str | None = Field(default=None, max_length=3000)
    requested_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_amount: Decimal | None = Field(default=None, ge=0)
    estimated_reimbursable_amount: Decimal | None = Field(default=None, ge=0)
    reimbursed_amount: Decimal | None = Field(default=None, ge=0)
    status: CNSSStatus = "REQUESTED"
    delivery_confirmed_at: dt.datetime | None = None
    deposit_date: dt.date | None = None
    deposit_deadline: dt.date | None = None
    deposit_reference: str | None = Field(default=None, max_length=160)
    decision_date: dt.date | None = None
    rejection_code: str | None = Field(default=None, max_length=64)
    reimbursement_date: dt.date | None = None
    rejection_reason: str | None = Field(default=None, max_length=2000)
    file_url: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_cnss_creation(self):
        if self.status == "REJECTED" and not (self.rejection_reason or "").strip():
            raise ValueError("Le motif du rejet est obligatoire.")
        if self.deposit_deadline and self.deposit_deadline < dt.date.today():
            raise ValueError("La date limite de dépôt ne peut pas être dans le passé.")
        total = self.total_amount if self.total_amount is not None else self.requested_amount
        if self.reimbursed_amount is not None and self.reimbursed_amount > total:
            raise ValueError("Le montant remboursé ne peut pas dépasser le montant total du dossier.")
        return self


class CNSSUpdate(BaseModel):
    fee_id: str | None = None
    visit_id: str | None = None
    appointment_id: str | None = None
    reference: str | None = Field(default=None, max_length=120)
    label: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = Field(default=None, max_length=3000)
    internal_notes: str | None = Field(default=None, max_length=3000)
    requested_amount: Decimal | None = Field(default=None, ge=0)
    total_amount: Decimal | None = Field(default=None, ge=0)
    estimated_reimbursable_amount: Decimal | None = Field(default=None, ge=0)
    reimbursed_amount: Decimal | None = Field(default=None, ge=0)
    status: CNSSStatus | None = None
    delivery_confirmed_at: dt.datetime | None = None
    deposit_date: dt.date | None = None
    deposit_deadline: dt.date | None = None
    deposit_reference: str | None = Field(default=None, max_length=160)
    decision_date: dt.date | None = None
    rejection_code: str | None = Field(default=None, max_length=64)
    reimbursement_date: dt.date | None = None
    rejection_reason: str | None = Field(default=None, max_length=2000)
    status_comment: str | None = Field(default=None, max_length=2000)
    correction_reason: str | None = Field(default=None, max_length=2000)
    file_url: str | None = Field(default=None, max_length=500)


class CNSSOut(BaseModel):
    id: str
    patient_id: str
    tenant_id: str
    reference: str | None
    fee_id: str | None = None
    visit_id: str | None = None
    appointment_id: str | None = None
    label: str
    description: str | None
    internal_notes: str | None = None
    requested_amount: Decimal
    total_amount: Decimal
    estimated_reimbursable_amount: Decimal
    reimbursed_amount: Decimal | None
    status: str
    delivery_confirmed_at: dt.datetime | None = None
    delivery_confirmed_by_user_id: str | None = None
    deposit_date: dt.date | None
    deposit_deadline: dt.date | None = None
    deposit_reference: str | None = None
    decision_date: dt.date | None = None
    rejection_code: str | None = None
    reimbursement_date: dt.date | None
    rejection_reason: str | None
    file_url: str | None
    created_at: dt.datetime
    updated_at: dt.datetime | None = None
    patient_name: str | None = None
    cabinet_name: str | None = None
    doctor_id: str | None = None
    doctor_name: str | None = None
    linked_item_label: str | None = None
    document_count: int = 0

    @computed_field
    @property
    def remaining_patient_amount(self) -> Decimal:
        return max(Decimal("0.00"), self.total_amount - (self.reimbursed_amount or Decimal("0.00")))


class PrescriptionItem(BaseModel):
    catalog_medication_id: str | None = None
    medication_source: Literal["catalog", "custom"] = "custom"
    medication: str = Field(min_length=1, max_length=180)
    dosage: str | None = Field(default=None, max_length=120)
    form: str | None = Field(default=None, max_length=120)
    route: str | None = Field(default=None, max_length=120)
    quantity: str | None = Field(default=None, max_length=80)
    frequency: str | None = Field(default=None, max_length=180)
    duration: str | None = Field(default=None, max_length=120)
    instructions: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=500)
    catalog_snapshot: dict | None = None

    @model_validator(mode="after")
    def validate_medication_source(self):
        if self.medication_source == "catalog" and not self.catalog_medication_id:
            raise ValueError("Sélectionnez un médicament du catalogue.")
        if not self.catalog_medication_id:
            self.medication_source = "custom"
            self.catalog_snapshot = None
        return self


class MedicationCatalogOut(BaseModel):
    id: str
    source: str
    external_code: str | None
    name: str
    generic_name: str | None
    strength: str | None
    form: str | None
    route: str | None
    specialties: list[str] | None
    default_dosage: str | None
    default_frequency: str | None
    default_duration: str | None
    default_instructions: str | None

    model_config = {"from_attributes": True}


class PrescriptionCreate(BaseModel):
    patient_id: str
    doctor_id: str | None = None
    content: str = Field(min_length=1)
    appointment_id: str | None = None
    visit_id: str | None = None
    consultation_date: dt.date | None = None
    location: str | None = Field(default=None, max_length=120)
    items: list[PrescriptionItem] | None = None


class PrescriptionUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1)
    consultation_date: dt.date | None = None
    location: str | None = Field(default=None, max_length=120)
    items: list[PrescriptionItem] | None = None


class PrescriptionOut(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    appointment_id: str | None = None
    visit_id: str | None = None
    prescription_number: str
    content: str
    items: list[dict] | None = None
    consultation_date: dt.date | None = None
    location: str | None = None
    pdf_document_id: str | None = None
    created_at: dt.datetime
    updated_at: dt.datetime
    patient_name: str | None = None
    doctor_name: str | None = None


class DocumentCreate(BaseModel):
    patient_id: str
    title: str = Field(min_length=2, max_length=180)
    document_type: DocumentType
    file_url: str | None = Field(default=None, max_length=500)
    shared_with_patient: bool = False
    visit_id: str | None = None
    doctor_id: str | None = None
    appointment_id: str | None = None
    fee_id: str | None = None
    invoice_id: str | None = None
    cnss_case_id: str | None = None
    category_id: str | None = None
    description: str | None = Field(default=None, max_length=3000)
    original_filename: str | None = Field(default=None, max_length=255)
    stored_filename: str | None = Field(default=None, max_length=255)
    extension: str | None = Field(default=None, max_length=16)
    mime_type: str | None = None
    file_size: int | None = Field(default=None, ge=0)
    source: Literal["upload_manuel", "scanner"] = "upload_manuel"
    status: Literal["ACTIF", "ARCHIVE"] = "ACTIF"
    confidential: bool = False
    document_date: dt.date | None = None
    version: int = Field(default=1, ge=1)
    parent_document_id: str | None = None
    scanned_at: dt.datetime | None = None


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=180)
    document_type: DocumentType | None = None
    shared_with_patient: bool | None = None
    category_id: str | None = None
    description: str | None = Field(default=None, max_length=3000)
    doctor_id: str | None = None
    appointment_id: str | None = None
    visit_id: str | None = None
    fee_id: str | None = None
    invoice_id: str | None = None
    document_date: dt.date | None = None
    confidential: bool | None = None


class DocumentOut(BaseModel):
    id: str
    patient_id: str
    patient_name: str | None = None
    title: str
    document_type: str
    file_url: str | None
    shared_with_patient: bool
    visit_id: str | None = None
    doctor_id: str | None = None
    doctor_name: str | None = None
    appointment_id: str | None = None
    fee_id: str | None = None
    invoice_id: str | None = None
    cnss_case_id: str | None = None
    category_id: str | None = None
    description: str | None = None
    original_filename: str | None = None
    stored_filename: str | None = None
    extension: str | None = None
    mime_type: str | None = None
    file_size: int | None = None
    source: str = "upload_manuel"
    status: str = "ACTIF"
    confidential: bool = False
    document_date: dt.date | None = None
    version: int = 1
    parent_document_id: str | None = None
    scanned_at: dt.datetime | None = None
    created_by_user_id: str | None = None
    updated_by_user_id: str | None = None
    created_at: dt.datetime
    updated_at: dt.datetime | None = None
    archived_at: dt.datetime | None = None


class DocumentCategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: str = Field(min_length=2, max_length=60, pattern=r"^[A-Z0-9_]+$")
    description: str | None = Field(default=None, max_length=1000)
    category_type: Literal["MEDICAL", "ADMINISTRATIF"]
    is_active: bool = True
    display_order: int = Field(default=0, ge=0)


class DocumentCategoryOut(DocumentCategoryCreate):
    id: str
    tenant_id: str | None
    created_at: dt.datetime
    updated_at: dt.datetime
    created_by_name: str | None = None


class PermissionMatrix(BaseModel):
    permissions: dict[str, AccessLevel]
