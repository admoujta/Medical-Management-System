from datetime import date, time
from typing import Any, Literal
from pydantic import BaseModel, EmailStr, Field, model_validator
from app.core.phone import PhoneNumber


class DoctorReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=5, max_length=1500)


class PublicAppointmentCreate(BaseModel):
    doctor_id: str
    first_name: str = Field(min_length=2, max_length=120)
    last_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: PhoneNumber
    birth_date: date
    gender: Literal["M", "F"]
    whatsapp_opt_in: bool
    date: date
    start_time: time
    end_time: time | None = None
    reason: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="before")
    @classmethod
    def empty_end_time(cls, data: Any):
        if isinstance(data, dict) and not data.get("end_time"):
            data = {**data, "end_time": None}
        return data
