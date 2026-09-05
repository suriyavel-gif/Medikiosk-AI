from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.models import NotificationChannelEnum, NotificationStatusEnum


class NotificationBase(BaseModel):
    template_code: str = Field(..., examples=["CONSENT_REQUEST_SMS", "RX_READY_INAPP", "MED_REMINDER_PUSH"])
    title: str = Field(..., examples=["Doctor Access Consent Request"])
    message: str = Field(..., examples=["Dr. Rajesh Sharma MD requested access to your longitudinal medical record."])
    channel: NotificationChannelEnum = Field(default=NotificationChannelEnum.IN_APP)
    recipient_destination: str = Field(..., examples=["+919876543210", "patient@medikiosk.ai", "IN_APP_DEVICE"])
    payload_json: Optional[Dict[str, Any]] = None


class NotificationCreateRequest(NotificationBase):
    patient_id: Optional[str] = None
    user_id: Optional[str] = None
    hospital_id: Optional[str] = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    patient_id: Optional[str]
    user_id: Optional[str]
    hospital_id: str
    channel: NotificationChannelEnum
    status: NotificationStatusEnum
    template_code: str
    title: str
    message: str
    recipient_destination: str
    payload_json: Optional[Dict[str, Any]]
    retry_count: int
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    read_at: Optional[datetime]
    created_at: datetime


class NotificationListResponse(BaseModel):
    total_count: int
    unread_count: int
    notifications: List[NotificationResponse]


class UnreadCountResponse(BaseModel):
    unread_count: int
    urgent_count: int


class SimulateEventNotificationRequest(BaseModel):
    event_type: str = Field(
        ...,
        examples=[
            "PATIENT_CONSENT_REQUEST",
            "PATIENT_PRESCRIPTION_READY",
            "PATIENT_MEDICINE_REMINDER",
            "PATIENT_APPOINTMENT_REMINDER",
            "PATIENT_REPORT_UPLOADED",
            "DOCTOR_NEW_QUEUE",
            "DOCTOR_CONSENT_APPROVED",
            "DOCTOR_LAB_RESULTS_READY",
            "GOVT_HOSPITAL_ALERT",
            "GOVT_DISEASE_SPIKE",
            "SYSTEM_ALERT",
        ],
    )
    recipient_id: Optional[str] = None
    channel: NotificationChannelEnum = Field(default=NotificationChannelEnum.IN_APP)
    custom_params: Optional[Dict[str, Any]] = None
