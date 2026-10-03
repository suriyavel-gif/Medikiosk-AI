from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.models import AppointmentStatusEnum


class AppointmentHospitalOption(BaseModel):
    id: str
    name: str


class AppointmentDepartmentOption(BaseModel):
    id: str
    hospital_id: str
    name: str
    specialty_type: str


class AppointmentDoctorOption(BaseModel):
    id: str
    hospital_id: str
    department_id: str
    name: str
    specialty: str


class AppointmentBookingOptions(BaseModel):
    hospitals: List[AppointmentHospitalOption]
    departments: List[AppointmentDepartmentOption]
    doctors: List[AppointmentDoctorOption]


class AppointmentCreateRequest(BaseModel):
    hospital_id: str = Field(..., min_length=1)
    department_id: str = Field(..., min_length=1)
    doctor_id: str = Field(..., min_length=1)
    scheduled_start_time: datetime
    chief_complaint_summary: str | None = Field(None, max_length=4000)

    @field_validator("scheduled_start_time")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("scheduled_start_time must include a timezone")
        return value


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    appointment_number: str
    patient_id: str
    hospital_id: str
    department_id: str
    doctor_id: str
    scheduled_start_time: datetime
    scheduled_end_time: datetime
    status: AppointmentStatusEnum
