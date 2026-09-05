from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from app.models.models import UserRoleEnum, GenderEnum, BloodGroupEnum


class PatientOTPRequest(BaseModel):
    phone: str = Field(..., description="10-digit primary mobile phone number", examples=["9876543210"])


class PatientOTPVerify(BaseModel):
    phone: str = Field(..., examples=["9876543210"])
    otp: str = Field(..., examples=["123456"])


class PatientRegisterRequest(BaseModel):
    national_health_id: Optional[str] = Field(None, examples=["ABHA-9821-3341-9901"])
    first_name: str = Field(..., examples=["Rajesh"])
    middle_name: Optional[str] = Field(None, examples=["Kumar"])
    last_name: str = Field(..., examples=["Sharma"])
    date_of_birth: str = Field(..., description="YYYY-MM-DD", examples=["1988-05-14"])
    gender: GenderEnum = Field(..., examples=[GenderEnum.MALE])
    blood_group: BloodGroupEnum = Field(default=BloodGroupEnum.UNKNOWN, examples=[BloodGroupEnum.O_POS])
    primary_phone: str = Field(..., examples=["9876543210"])
    secondary_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address_line1: str = Field(..., examples=["Flat 402, Green Valley Apartments"])
    address_line2: Optional[str] = None
    city: str = Field(..., examples=["Bengaluru"])
    state_province: str = Field(..., examples=["Karnataka"])
    postal_code: str = Field(..., examples=["560001"])
    preferred_language: str = Field(default="en-US", examples=["en-US"])
    emergency_contact_name: Optional[str] = Field(None, examples=["Pooja Sharma"])
    emergency_contact_phone: Optional[str] = Field(None, examples=["9876543211"])
    emergency_contact_relation: Optional[str] = Field(None, examples=["Spouse"])


class StaffLoginRequest(BaseModel):
    username_or_email: str = Field(..., examples=["dr.sharma@medikiosk.ai"])
    password: str = Field(..., examples=["Doctor@123"])


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user_id: str
    role: str
    name: str
    hospital_id: Optional[str] = None
    additional_info: Optional[Dict[str, Any]] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class CurrentUser(BaseModel):
    id: str
    role: str
    username: str
    email: Optional[str] = None
    full_name: str
    hospital_id: Optional[str] = None
    patient_id: Optional[str] = None
    doctor_id: Optional[str] = None
