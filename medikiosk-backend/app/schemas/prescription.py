from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.models import IntakeFrequencyEnum, MedicineFormEnum


class PrescriptionItemCreate(BaseModel):
    medicine_id: Optional[str] = None
    medicine_name: Optional[str] = None
    generic_name: Optional[str] = None
    dosage_instruction: str = Field(..., examples=["1 Tablet after food"])
    frequency: IntakeFrequencyEnum = Field(default=IntakeFrequencyEnum.TWICE_DAILY, examples=[IntakeFrequencyEnum.TWICE_DAILY])
    duration_days: int = Field(..., ge=1, le=365, examples=[5])
    total_quantity_prescribed: float = Field(..., gt=0, examples=[10.0])
    special_intake_conditions: Optional[str] = Field(None, examples=["Drink with warm water"])


class PrescriptionCreateRequest(BaseModel):
    visit_id: str
    patient_id: str
    clinical_notes: Optional[str] = Field(None, examples=["Complete the full antibiotic course. Avoid cold drinks."])
    items: List[PrescriptionItemCreate] = Field(..., min_length=1)


class MedicineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rxnorm_cui: Optional[str]
    brand_name: str
    generic_name: str
    form: MedicineFormEnum
    strength: str
    manufacturer: Optional[str]
    is_antibiotic: bool
    is_narcotic_controlled: bool


class PrescriptionItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    medicine_id: str
    medicine_name: str
    generic_name: str
    form: str
    strength: str
    dosage_instruction: str
    frequency: IntakeFrequencyEnum
    duration_days: int
    total_quantity_prescribed: float
    special_intake_conditions: Optional[str]


class MedicineScheduleSlotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    medicine_name: str
    dosage_amount: str
    scheduled_intake_timestamp: datetime
    is_taken: bool
    actual_taken_timestamp: Optional[datetime]


class PrescriptionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    prescription_number: str
    visit_id: str
    patient_id: str
    doctor_id: str
    doctor_name: str
    doctor_specialty: str
    clinical_notes: Optional[str]
    digital_signature_hash: str
    items: List[PrescriptionItemResponse]
    intake_schedules: List[MedicineScheduleSlotResponse]
    created_at: datetime


class MedicineCreateRequest(BaseModel):
    brand_name: str = Field(..., examples=["Augmentin 625 Duo"])
    generic_name: str = Field(..., examples=["Amoxicillin and Clavulanate Potassium"])
    form: MedicineFormEnum = Field(default=MedicineFormEnum.TABLET)
    strength: str = Field(..., examples=["625 mg"])
    manufacturer: Optional[str] = Field(None, examples=["GSK Pharmaceuticals"])
    rxnorm_cui: Optional[str] = None
    is_antibiotic: bool = False
    is_narcotic_controlled: bool = False
