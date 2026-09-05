from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.models import TriageLevelEnum, QueueStatusEnum


class DoctorQueuePatientItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    queue_id: str
    token_number: str
    visit_id: str
    visit_number: str
    patient_id: str
    patient_name: str
    patient_age: int
    patient_gender: str
    hospital_mrn: str
    chief_complaint: Optional[str]
    triage_level: Optional[TriageLevelEnum]
    triage_reasoning: Optional[str]
    priority_order_score: int
    queue_status: QueueStatusEnum
    has_active_consent: bool
    kiosk_vitals: Optional[Dict[str, Any]]
    ai_soap_summary: Optional[Dict[str, Optional[str]]]
    waiting_since: datetime


class AddDiagnosisRequest(BaseModel):
    visit_id: str
    patient_id: str
    icd10_code: str = Field(..., examples=["J06.9"])
    snomed_ct_code: Optional[str] = Field(None, examples=["195662009"])
    diagnosis_name: str = Field(..., examples=["Acute upper respiratory tract infection"])
    diagnosis_type: str = Field(default="FINAL", examples=["PROVISIONAL", "FINAL", "DIFFERENTIAL"])
    clinical_description: Optional[str] = Field(None, examples=["Patient presents with rhinorrhea, pharyngitis, and low-grade pyrexia."])
    is_primary: bool = True
    confidence_percentage: Optional[float] = 95.0


class DiagnosisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    visit_id: str
    patient_id: str
    doctor_id: str
    icd10_code: str
    snomed_ct_code: Optional[str]
    diagnosis_name: str
    diagnosis_type: str
    clinical_description: Optional[str]
    is_primary: bool
    created_at: datetime


class CloseConsultationRequest(BaseModel):
    visit_id: str
    clinical_summary: Optional[str] = None
    follow_up_advice: Optional[str] = None
    discharge_status: str = Field(default="DISCHARGED", examples=["DISCHARGED", "ADMITTED_INPATIENT", "REFERRED_SPECIALIST"])


class LabTestItem(BaseModel):
    test_name: str = Field(..., examples=["Complete Blood Count (CBC)", "Fasting Lipid Profile", "Chest X-Ray PA View"])
    test_category: str = Field(default="LAB_BIOCHEMISTRY", examples=["LAB_BIOCHEMISTRY", "LAB_HEMATOLOGY", "RADIOLOGY_XRAY", "ECG_TRACE"])
    clinical_indication: Optional[str] = None
    is_urgent: bool = False


class OrderLabTestsRequest(BaseModel):
    visit_id: str
    patient_id: str
    lab_tests: List[LabTestItem]
    clinical_notes: Optional[str] = None


class LabTestOrderResponse(BaseModel):
    order_id: str
    visit_id: str
    patient_id: str
    ordered_tests_count: int
    ordered_tests: List[Dict[str, Any]]
    status: str
    created_at: datetime

