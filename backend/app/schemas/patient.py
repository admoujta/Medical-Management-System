from datetime import date, datetime, time, timedelta
from typing import Any, Literal
from pydantic import BaseModel, EmailStr, Field, model_validator
from app.core.phone import OptionalPhoneNumber

class PatientPortalSettings(BaseModel):
    patient_can_request_appointment:bool=True;patient_can_confirm_appointment:bool=False;patient_can_cancel_appointment:bool=True;patient_can_view_payments:bool=True;patient_can_download_documents:bool=True;patient_requires_validation:bool=True;patient_cin_required:bool=False;patient_cin_document_required:bool=False

class PatientProfileUpdate(BaseModel):
    email:EmailStr|None=None;phone:OptionalPhoneNumber=None;address:str|None=Field(default=None,max_length=1000);cnss_deposit_reminder_days:int|None=Field(default=None,ge=0,le=30)

class PasswordChange(BaseModel):
    current_password:str;new_password:str=Field(min_length=10,max_length=128)

class AppointmentRequest(BaseModel):
    doctor_id:str|None=None;date:date;start_time:time;end_time:time|None=None;reason:str|None=Field(default=None,max_length=1000)

    @model_validator(mode="before")
    @classmethod
    def empty_end_time(cls,data:Any):
        if isinstance(data,dict) and not data.get("end_time"):
            data={**data,"end_time":None}
        return data

    @model_validator(mode="after")
    def default_duration(self):
        if self.end_time is None or self.end_time<=self.start_time:
            start=datetime.combine(self.date,self.start_time)
            self.end_time=(start+timedelta(minutes=30)).time()
        return self


class PatientCNSSAction(BaseModel):
    action: Literal["confirm_pickup", "confirm_deposit", "declare_approved", "declare_rejected"]
    deposit_date: date | None = None
    deposit_reference: str | None = Field(default=None, max_length=160)
    decision_date: date | None = None
    reimbursed_amount: float | None = Field(default=None, ge=0)
    rejection_code: Literal["INCOMPLETE", "MISSING_DOCUMENT", "INCORRECT_INFORMATION", "DEADLINE_EXCEEDED", "NOT_COVERED", "OTHER"] | None = None
    comment: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_action(self):
        if self.action == "confirm_deposit" and self.deposit_date is None:
            raise ValueError("La date de dépôt est obligatoire.")
        if self.action == "declare_rejected" and self.decision_date is None:
            raise ValueError("La date de décision est obligatoire.")
        if self.action == "declare_rejected" and self.rejection_code is None:
            raise ValueError("Le motif du rejet est obligatoire.")
        if self.action == "declare_rejected" and self.rejection_code == "OTHER" and not (self.comment or "").strip():
            raise ValueError("Précisez le motif du rejet.")
        if self.deposit_date and self.deposit_date > date.today():
            raise ValueError("La date de dépôt ne peut pas être dans le futur.")
        if self.decision_date and self.decision_date > date.today():
            raise ValueError("La date de décision ne peut pas être dans le futur.")
        return self


class PatientCNSSCreate(BaseModel):
    appointment_id: str | None = None
    visit_id: str | None = None
    fee_id: str | None = None
    comment: str | None = Field(default=None, max_length=2000)
    deposit_deadline: date | None = None

    @model_validator(mode="after")
    def validate_medical_link(self):
        if not any((self.appointment_id, self.visit_id, self.fee_id)):
            raise ValueError("Sélectionnez un rendez-vous, une visite ou un acte médical.")
        if self.deposit_deadline and self.deposit_deadline < date.today():
            raise ValueError("La date limite de dépôt ne peut pas être dans le passé.")
        return self
