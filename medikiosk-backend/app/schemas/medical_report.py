from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.models import ReportTypeEnum, OCRStatusEnum


class MedicalReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    visit_id: Optional[str] = None
    patient_id: str
    report_type: ReportTypeEnum
    title: str
    file_storage_uri: str
    file_mime_type: str
    file_size_bytes: int
    ai_summary: Optional[str]
    is_confidential: bool
    ocr_status: Optional[OCRStatusEnum] = None
    created_at: datetime


class OCRResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    medical_report_id: str
    ocr_engine_version: str
    status: OCRStatusEnum
    raw_extracted_text: Optional[str]
    confidence_score: Optional[float]
    extracted_entities: List[Dict[str, Any]]
    processing_duration_ms: Optional[int]
    created_at: datetime


class TriggerOCRRequest(BaseModel):
    medical_report_id: str
    ocr_engine: str = Field(default="Gemini-Vision-1.5", examples=["Gemini-Vision-1.5"])


class TriggerAISummaryRequest(BaseModel):
    medical_report_id: str
    focus_areas: Optional[List[str]] = Field(default=["Key Findings", "Abnormal Values", "Clinical Recommendations"])
