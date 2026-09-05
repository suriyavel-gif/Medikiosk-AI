from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.models.models import TriageLevelEnum


# ---------------------------------------------------------
# 1. AI Clinical Intake Schemas
# ---------------------------------------------------------
class IntakeChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'model' / 'assistant'")
    content: str = Field(..., description="Message text")


class IntakeChatRequest(BaseModel):
    messages: List[IntakeChatMessage]
    spoken_language: Optional[str] = "en-US"
    patient_age: Optional[int] = 35
    patient_gender: Optional[str] = "MALE"
    vitals: Optional[Dict[str, Any]] = None


class IntakeChatResponse(BaseModel):
    reply: str
    is_complete: bool
    suggested_questions: Optional[List[str]] = None


class IntakeSynthesizeRequest(BaseModel):
    messages: List[IntakeChatMessage]
    vitals: Dict[str, Any]
    patient_id: Optional[str] = None
    hospital_id: Optional[str] = None
    spoken_language: Optional[str] = "en-US"
    patient_age: Optional[int] = 35
    patient_gender: Optional[str] = "MALE"


class IntakeSynthesizeResponse(BaseModel):
    chief_complaint: str
    symptoms: List[str]
    duration: str
    possible_severity: str  # "Mild", "Moderate", "Severe", "Critical"
    suggested_department: str
    triage_level: TriageLevelEnum
    triage_reasoning: str
    is_emergency: bool
    confidence_score: float
    medical_summary: Dict[str, str]  # subjective, objective, assessment, plan


# ---------------------------------------------------------
# 2. OCR Analysis Schemas
# ---------------------------------------------------------
class OCRAnalysisRequest(BaseModel):
    extracted_text: str
    document_type: str = Field(
        "BLOOD_REPORT",
        description="PRESCRIPTION | BLOOD_REPORT | MRI_SCAN | CT_SCAN | DISCHARGE_SUMMARY | OTHER"
    )
    focus_areas: Optional[List[str]] = None


class DetectedEntity(BaseModel):
    entity: str
    value: str
    unit: Optional[str] = None
    flag: Optional[str] = "NORMAL"  # "HIGH" | "LOW" | "NORMAL" | "CRITICAL"
    reference_range: Optional[str] = None
    loinc: Optional[str] = None


class OCRAnalysisResponse(BaseModel):
    summary: str
    document_type: str
    detected_diseases: List[str]
    detected_medicines: List[Dict[str, str]]
    important_findings: List[DetectedEntity]
    recommendations: List[str]
    confidence_score: float


# ---------------------------------------------------------
# 3. Doctor AI Copilot Schemas
# ---------------------------------------------------------
class DoctorCopilotSummarizeRequest(BaseModel):
    patient_id: str
    include_timeline: Optional[bool] = True
    include_lab_trends: Optional[bool] = True


class DoctorCopilotSummaryResponse(BaseModel):
    patient_id: str
    patient_name: str
    clinical_history_summary: str
    active_chronic_conditions: List[str]
    known_allergies: List[str]
    current_active_medications: List[str]
    historical_diagnoses: List[str]
    recent_lab_findings_summary: str
    clinical_red_flags: List[str]
    differential_considerations: List[str]


# ---------------------------------------------------------
# 4. Patient Health Assistant Schemas
# ---------------------------------------------------------
class PatientAssistantChatRequest(BaseModel):
    query: str
    conversation_history: Optional[List[IntakeChatMessage]] = None


class PatientAssistantChatResponse(BaseModel):
    answer: str
    referenced_topics: List[str]
    suggested_followups: List[str]
    disclaimer: str


# ---------------------------------------------------------
# 5. Prescription Explanation Schemas
# ---------------------------------------------------------
class PrescriptionExplainItem(BaseModel):
    medicine_name: str
    dosage_instruction: str
    frequency: str
    duration_days: int
    special_intake_conditions: Optional[str] = None


class PrescriptionExplainRequest(BaseModel):
    prescription_id: Optional[str] = None
    items: Optional[List[PrescriptionExplainItem]] = None
    clinical_notes: Optional[str] = None
    target_language: Optional[str] = "English"


class MedicineExplanation(BaseModel):
    medicine_name: str
    purpose: str
    morning_dose: str
    afternoon_dose: str
    night_dose: str
    food_instruction: str  # "Before Food" | "After Food" | "With Food"
    precautions: str


class PrescriptionExplainResponse(BaseModel):
    simple_summary: str
    medicines: List[MedicineExplanation]
    general_advice: List[str]
    warning_signs: List[str]


# ---------------------------------------------------------
# 6. Drug Interaction Checker Schemas
# ---------------------------------------------------------
class DrugInteractionCheckItem(BaseModel):
    medicine_name: str
    generic_name: Optional[str] = None
    strength: Optional[str] = None


class DrugInteractionCheckRequest(BaseModel):
    patient_id: Optional[str] = None
    new_medicines: List[DrugInteractionCheckItem]
    current_medicines: Optional[List[str]] = None
    known_allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None


class DrugInteractionDetail(BaseModel):
    drug1: str
    drug2: str
    severity: str  # "MAJOR" | "MODERATE" | "MINOR"
    mechanism: str
    clinical_recommendation: str


class AllergyRiskDetail(BaseModel):
    drug: str
    allergy: str
    risk_level: str  # "HIGH" | "MODERATE"
    description: str


class DrugInteractionCheckResponse(BaseModel):
    has_critical_interactions: bool
    overall_safety_status: str  # "SAFE" | "WARNING" | "CONTRAINDICATED"
    drug_interactions: List[DrugInteractionDetail]
    duplicate_therapies: List[str]
    allergy_risks: List[AllergyRiskDetail]
    special_warnings: List[str]
    recommendation: str


# -----------------------------------------------------------------------------
# AI SMART APPOINTMENT ROUTING
# -----------------------------------------------------------------------------
class AIAppointmentRouteRequest(BaseModel):
    symptoms: str = Field(..., description="Patient symptoms or health complaint description")
    selected_hospital: Optional[str] = Field(None, description="Explicitly selected hospital by patient")
    preferred_doctor: Optional[str] = Field(None, description="Preferred physician name if chosen")
    user_location: Optional[str] = Field("Chennai Central", description="Patient current geo-location or coordinates")
    language: Optional[str] = Field("en", description="Language code for output reasoning (en, ta, hi, te, kn, ml)")


class AIAppointmentRouteResponse(BaseModel):
    hospital: str
    department: str
    doctor: str
    priority: str
    estimated_wait: str
    distance: str
    reason: str
    confidence: int
    recommended_slots: List[str]


# -----------------------------------------------------------------------------
# AI CASE SUMMARY (For Doctor Workstation)
# -----------------------------------------------------------------------------
class AICaseSummaryRequest(BaseModel):
    patient_id: str = Field(..., description="Patient UUID")
    language: Optional[str] = Field("en", description="Language code")


class AICaseSummaryResponse(BaseModel):
    patient_name: str
    age: int
    gender: str
    blood_group: str
    mrn: str
    national_health_id: str
    major_diseases: List[str]
    current_complaint: str
    vitals_summary: Dict[str, Any]
    current_medicines: List[str]
    allergies: List[str]
    recent_lab_findings: List[str]
    possible_diagnosis: str
    recommended_tests: List[str]
    risk_level: str
    clinical_notes: str


# -----------------------------------------------------------------------------
# AI CLINICAL INTAKE TRIAGE REPORT PERSISTENCE
# -----------------------------------------------------------------------------
class SaveIntakeReportRequest(BaseModel):
    patient_id: Optional[str] = Field(None, description="Patient UUID")
    hospital_name: Optional[str] = Field("Apollo Hospitals Chennai", description="Hospital name")
    chief_complaint: str
    symptoms: List[str]
    duration: str
    severity: str
    risk: str = Field(..., description="LOW | MEDIUM | HIGH | CRITICAL")
    medical_history: Optional[List[str]] = None
    current_medications: Optional[List[str]] = None
    allergies: Optional[List[str]] = None
    vitals: Optional[Dict[str, Any]] = None
    preliminary_assessment: str
    suggested_otc_medicines: Optional[List[str]] = None
    recommended_department: str
    recommended_action: str
    warning_signs: Optional[List[str]] = None
    follow_up: str
    disclaimer: str = "This is an AI-assisted preliminary assessment and not a confirmed medical diagnosis."


class SaveIntakeReportResponse(BaseModel):
    report_id: str
    patient_id: str
    saved_at: str
    status: str
    message: str


class IntakeReportItem(BaseModel):
    id: str
    patient_id: str
    created_at: str
    hospital_name: str
    chief_complaint: str
    symptoms: List[str]
    duration: str
    severity: str
    risk: str
    preliminary_assessment: str
    suggested_otc_medicines: List[str]
    recommended_department: str
    recommended_action: str
    warning_signs: List[str]
    follow_up: str
    disclaimer: str


# -----------------------------------------------------------------------------
# AI MEDICATION CHAT & ADHERENCE
# -----------------------------------------------------------------------------
class AIMedicationChatRequest(BaseModel):
    query: str = Field(..., description="Patient query about prescribed medication")
    medicine_name: Optional[str] = Field(None, description="Specific medicine in question")
    active_prescriptions: Optional[List[str]] = Field(None, description="Current active prescription list")
    patient_allergies: Optional[List[str]] = Field(None, description="Known allergies")
    chronic_conditions: Optional[List[str]] = Field(None, description="Known chronic conditions")
    language: Optional[str] = Field("en", description="Language code")


class AIMedicationChatResponse(BaseModel):
    reply: str
    key_advice: List[str]
    food_instructions: str
    missed_dose_guidance: str
    warning_signs: List[str]
    consult_doctor_recommended: bool
    disclaimer: str = "Always follow your prescribing doctor's exact instructions. Never stop prescription medicines without consulting your physician."


# -----------------------------------------------------------------------------
# AI MEDICAL REPORT INTELLIGENCE & PATIENT EXPLAINER
# -----------------------------------------------------------------------------
class ParameterCard(BaseModel):
    name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: str = "NORMAL"  # NORMAL | BORDERLINE | CRITICAL | LOW | HIGH
    meaning: str
    recommendation: str
    category: Optional[str] = "Hematology"


class MedicalReportExplainRequest(BaseModel):
    extracted_text: str = Field(..., description="OCR Extracted medical text")
    document_type: str = Field("BLOOD_TEST", description="BLOOD_TEST | CBC | MRI | CT_SCAN | XRAY | ECG | PRESCRIPTION | DISCHARGE_SUMMARY | OTHER")
    patient_id: Optional[str] = Field(None, description="Patient UUID")
    hospital_name: Optional[str] = Field("Apollo Hospitals Chennai", description="Hospital name")
    language: Optional[str] = Field("en", description="Language code: en, ta, hi, te, ml, kn")
    image_quality: Optional[str] = Field("GOOD", description="GOOD | POOR | BLURRY")


class MedicalReportExplainResponse(BaseModel):
    report_title: str
    test_type: str
    test_purpose: str
    overall_status: str  # NORMAL | MILD_CONCERN | CRITICAL
    status_badge: str
    summary_plain_english: str
    parameters: List[ParameterCard]
    organ_system_status: Dict[str, str]
    possible_health_concerns: List[str]
    severity: str
    recommended_specialist: str
    urgency: str
    lifestyle_advice: List[str]
    diet_advice: List[str]
    medicines_mentioned: List[str]
    follow_up_tests: List[str]
    confidence_score: float
    language: str
    saved_to_case_history: bool
    disclaimer: str = "This is an AI-generated medical summary for patient understanding. Please consult your physician for official diagnosis and treatment."
