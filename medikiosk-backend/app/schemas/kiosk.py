from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.models import TriageLevelEnum


class KioskVitalsPayload(BaseModel):
    systolic_bp: Optional[float] = Field(None, examples=[128.0])
    diastolic_bp: Optional[float] = Field(None, examples=[84.0])
    heart_rate_bpm: Optional[float] = Field(None, examples=[78.0])
    respiratory_rate_bpm: Optional[float] = Field(None, examples=[18.0])
    oxygen_saturation_spo2: Optional[float] = Field(None, examples=[98.5])
    body_temperature_celsius: Optional[float] = Field(None, examples=[37.1])
    body_weight_kg: Optional[float] = Field(None, examples=[72.5])
    body_height_cm: Optional[float] = Field(None, examples=[174.0])
    raw_sensor_waveforms: Optional[Dict[str, Any]] = None


class KioskIntakeSessionRequest(BaseModel):
    kiosk_device_id: str
    hospital_id: str
    department_id: Optional[str] = None
    patient_id: str
    chief_complaint_raw: str = Field(..., examples=["Severe headache and nausea for past 2 days"])
    spoken_language: str = Field(default="en-US")
    vitals: KioskVitalsPayload


class KioskTriageResultResponse(BaseModel):
    visit_id: str
    visit_number: str
    patient_id: str
    triage_level: TriageLevelEnum
    triage_score_reasoning: str
    is_emergency: bool
    ai_soap_note: Dict[str, Optional[str]]
    queue_token_number: str
    assigned_department_id: str
    assigned_department_name: str
    estimated_wait_minutes: int
