from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models.models import GenderEnum, BloodGroupEnum, TriageLevelEnum, VisitStatusEnum


class PatientProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    national_health_id: Optional[str]
    hospital_mrn: str
    first_name: str
    middle_name: Optional[str]
    last_name: str
    date_of_birth: date
    gender: GenderEnum
    blood_group: BloodGroupEnum
    primary_phone: str
    secondary_phone: Optional[str]
    email: Optional[str]
    address_line1: str
    address_line2: Optional[str]
    city: str
    state_province: str
    postal_code: str
    country_iso: str
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    emergency_contact_relation: Optional[str]
    preferred_language: str
    is_active: bool
    created_at: datetime


class PatientProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    secondary_phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    preferred_language: Optional[str] = None


class MedicalHistoryItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    history_type: str
    condition_name: str
    concept_snomed_code: Optional[str] = None
    concept_icd10_code: Optional[str] = None
    severity: Optional[str] = None
    diagnosed_date: Optional[date] = None
    notes: Optional[str] = None
    is_active: bool


class MedicalHistoryCreateRequest(BaseModel):
    history_type: str = Field(..., examples=["CHRONIC_CONDITION"])  # ALLERGY, SURGICAL, FAMILY
    condition_name: str = Field(..., examples=["Type 2 Diabetes Mellitus"])
    concept_snomed_code: Optional[str] = Field(None, examples=["44054006"])
    concept_icd10_code: Optional[str] = Field(None, examples=["E11.9"])
    severity: Optional[str] = Field(None, examples=["Moderate"])
    diagnosed_date: Optional[date] = None
    notes: Optional[str] = None


class VitalsSummarySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    systolic_bp: Optional[float]
    diastolic_bp: Optional[float]
    heart_rate_bpm: Optional[float]
    oxygen_saturation_spo2: Optional[float]
    body_temperature_celsius: Optional[float]
    body_weight_kg: Optional[float]
    body_height_cm: Optional[float]
    calculated_bmi: Optional[float]
    created_at: datetime


class TimelineEventSchema(BaseModel):
    event_type: str  # "VISIT", "DIAGNOSIS", "PRESCRIPTION", "REPORT"
    event_id: str
    timestamp: datetime
    title: str
    description: Optional[str]
    doctor_name: Optional[str]
    hospital_name: Optional[str]
    metadata: Dict[str, Any] = {}


class PatientTimelineResponse(BaseModel):
    patient_id: str
    patient_name: str
    hospital_mrn: str
    events_count: int
    timeline: List[TimelineEventSchema]
    allergies: Optional[List[Dict[str, Any]]] = None
    chronic_conditions: Optional[List[Dict[str, Any]]] = None
    surgeries: Optional[List[Dict[str, Any]]] = None
    vaccinations: Optional[List[Dict[str, Any]]] = None
    current_medicines: Optional[List[Dict[str, Any]]] = None
    vital_trends: Optional[List[Dict[str, Any]]] = None
    past_hospitals: Optional[List[str]] = None
    ai_summary: Optional[str] = None
    national_record: Optional[Dict[str, Any]] = None


class AIIntakeHistoryItem(BaseModel):
    visit_id: str
    visit_number: str
    timestamp: datetime
    chief_complaint_raw: Optional[str]
    triage_level: Optional[TriageLevelEnum]
    triage_score_reasoning: Optional[str]
    ai_soap_subjective: Optional[str]
    ai_soap_objective: Optional[str]
    ai_soap_assessment: Optional[str]
    ai_soap_plan: Optional[str]
    ai_confidence_score: Optional[float]
