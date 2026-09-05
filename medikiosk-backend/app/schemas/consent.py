from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.models import ConsentTypeEnum, ConsentStatusEnum


class ConsentRequestCreate(BaseModel):
    patient_id: str
    visit_id: Optional[str] = None
    consent_type: ConsentTypeEnum = Field(default=ConsentTypeEnum.DOCTOR_ACCESS)
    purpose: str = Field(default="Clinical Examination & Historical Medical Records Review", examples=["Clinical Examination"])
    expiry_hours: Optional[int] = Field(default=None, ge=1, le=72)
    expiry_minutes: Optional[int] = Field(default=30, ge=5, le=4320)


class ConsentActionRequest(BaseModel):
    consent_id: str
    action: str = Field(..., examples=["APPROVE", "REJECT", "REVOKE"])
    digital_signature: Optional[str] = Field(None, examples=["DIGITAL_SIG_PATIENT_RajeshSharma_2026"])
    rejection_reason: Optional[str] = None


class ConsentDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: str
    doctor_id: Optional[str]
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    specialization: Optional[str] = None
    doctor_registration: Optional[str] = None
    purpose: Optional[str] = None
    permission_minutes: Optional[int] = None
    visit_id: Optional[str]
    consent_type: ConsentTypeEnum
    status: ConsentStatusEnum
    consent_version: str
    granted_language: str
    digital_signature_blob: str
    expires_at: datetime
    revoked_at: Optional[datetime]
    created_at: datetime


class AccessStatusResponse(BaseModel):
    patient_id: str
    doctor_id: str
    has_active_consent: bool
    status: Optional[ConsentStatusEnum] = None
    consent_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    purpose: Optional[str] = None
