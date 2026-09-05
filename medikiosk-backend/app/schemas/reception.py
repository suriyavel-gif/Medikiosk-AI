from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.models import QueueStatusEnum, TriageLevelEnum, VisitStatusEnum


class PatientSearchQuery(BaseModel):
    query: str = Field(..., description="Phone number, Hospital MRN, National Health ID, or Name", examples=["9876543210"])


class RegisterVisitRequest(BaseModel):
    patient_id: str
    hospital_id: str
    department_id: str
    doctor_id: Optional[str] = None
    visit_type: str = Field(default="OPD_WALKIN", examples=["OPD_WALKIN", "EMERGENCY", "FOLLOW_UP"])
    chief_complaint: Optional[str] = Field(None, examples=["Fever and severe cough for 3 days"])
    kiosk_id: Optional[str] = None


class GenerateTokenRequest(BaseModel):
    visit_id: str
    department_id: str
    doctor_id: Optional[str] = None
    priority_override: Optional[int] = None


class AssignDoctorRequest(BaseModel):
    visit_id: str
    doctor_id: str


class QueueTokenResponse(BaseModel):
    queue_id: str
    token_display_number: str
    visit_id: str
    visit_number: str
    patient_id: str
    patient_name: str
    hospital_mrn: str
    department_name: str
    doctor_name: Optional[str]
    triage_level: Optional[TriageLevelEnum]
    priority_order_score: int
    queue_status: QueueStatusEnum
    estimated_wait_minutes: int
    created_at: datetime


class QueueItemDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    queue_id: str
    token_number: str
    visit_id: str
    visit_number: str
    patient_id: str
    patient_name: str
    patient_age: int
    patient_gender: str
    department_name: str
    doctor_name: Optional[str]
    triage_level: Optional[TriageLevelEnum]
    priority_order_score: int
    queue_status: QueueStatusEnum
    called_at: Optional[datetime]
    created_at: datetime


class TodayQueueResponse(BaseModel):
    hospital_id: str
    department_id: Optional[str]
    total_waiting: int
    total_in_room: int
    total_completed: int
    queue: List[QueueItemDetail]
