import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_any_role, require_role
from app.schemas.auth import CurrentUser
from app.models.models import (
    Patient,
    Visit,
    Hospital,
    Notification,
    NotificationChannelEnum,
    NotificationStatusEnum,
    AuditActionEnum,
    UserRoleEnum,
)
from app.services.audit_service import AuditService

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

logger = logging.getLogger("medikiosk.emergency")

router = APIRouter(prefix="/emergency", tags=["Emergency SOS"])

APPROVED_TRIAL_TEMPLATES = [
    "sms_internal_alerts",
    "sms_account_alerts",
    "sms_appointment_reminders",
    "sms_event_notifications",
    "sms_2fa",
]


class EmergencySOSRequest(BaseModel):
    patient_id: Optional[str] = Field(None, description="Patient UUID")
    hospital_id: Optional[str] = Field(None, description="Hospital UUID")
    location: Optional[str] = Field(None, description="Patient-reported location")
    vitals: Optional[Dict[str, Any]] = Field(None, description="Explicitly supplied current readings")
    reason: Optional[str] = Field(None, description="Patient-reported reason")
    contact_phone: Optional[str] = None



class EmergencyAlertItem(BaseModel):
    event_id: str
    patient_name: str
    patient_id: str
    national_health_id: str
    hospital_name: str
    location: str
    symptoms: str
    vitals: Dict[str, Any]
    priority: str
    timestamp: str
    sms_sid: str
    call_sid: str
    hospital_notified: bool
    doctor_accepted: bool
    accepted_by: Optional[str] = None
    accepted_at: Optional[str] = None
    response_time_seconds: Optional[int] = None
    er_prepared: Optional[bool] = False
    status: str  # ACTIVE | ACCEPTED | RESOLVED


class AcceptCaseRequest(BaseModel):
    event_id: str
    doctor_name: Optional[str] = None
    doctor_id: Optional[str] = None
    notes: Optional[str] = None


class PrepareERRequest(BaseModel):
    event_id: str
    staff_name: Optional[str] = None
    room_number: Optional[str] = None


class EmergencySOSResponse(BaseModel):
    success: bool
    sms: str
    call: str
    event_id: str
    patient_name: str
    hospital_name: str
    timestamp: str
    doctor_notified: bool
    reception_notified: bool
    timeline_updated: bool
    details: Dict[str, Any]


@router.api_route("/voice/twiml", methods=["GET", "POST"])
def get_emergency_twiml():
    """Dynamically generated TwiML voice response for emergency automated calls."""
    xml_content = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Response>'
        '<Say voice="alice">'
        'Hello. This is the MediKiosk AI Emergency Response System. '
        'An emergency alert was received. Patient and clinical details are available only through the authorized MediKiosk system. '
        'Immediate emergency response is requested. Please contact the hospital emergency triage immediately. '
        'Thank you.'
        '</Say>'
        '</Response>'
    )
    return Response(content=xml_content, media_type="application/xml")


@router.post("/sos", response_model=EmergencySOSResponse)
def trigger_emergency_sos(
    req: Optional[EmergencySOSRequest] = None,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    req = req or EmergencySOSRequest()
    patient_id = current_user.patient_id or current_user.id
    if req.patient_id and req.patient_id != patient_id:
        raise HTTPException(status_code=403, detail="Cannot create an alert for another patient")
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    visit = db.query(Visit).filter(Visit.patient_id == patient_id).order_by(Visit.created_at.desc()).first()
    if not visit:
        raise HTTPException(status_code=409, detail="A hospital visit is required to route an SOS alert")
    hospital = db.query(Hospital).filter(Hospital.id == visit.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=409, detail="The visit hospital could not be resolved")
    patient_name = f"{patient.first_name} {patient.last_name}"
    timestamp = datetime.now(timezone.utc)
    message = "Emergency SOS requested by patient."
    if req.reason: message += f" Reason: {req.reason}."
    if req.location: message += f" Reported location: {req.location}."
    alert_payload = {
        "event_id": None, "patient_name": patient_name, "patient_id": patient.id,
        "hospital_name": hospital.name, "hospital_id": hospital.id,
        "location": req.location, "reason": req.reason, "vitals": req.vitals or {},
        "sms_status": "NOT_CONFIGURED", "call_status": "NOT_CONFIGURED",
        "doctor_accepted": False, "accepted_by": None, "accepted_at": None,
        "er_prepared": False, "status": "ACTIVE", "timestamp": timestamp.isoformat(),
    }
    notification = Notification(
        patient_id=patient.id, hospital_id=hospital.id, channel=NotificationChannelEnum.IN_APP,
        status=NotificationStatusEnum.DELIVERED, template_code="EMERGENCY_SOS",
        title=f"Emergency SOS: {patient_name}", message=message,
        recipient_destination="HOSPITAL_EMERGENCY_INBOX", payload_json=alert_payload,
        sent_at=timestamp, delivered_at=timestamp,
    )
    try:
        db.add(notification)
        db.flush()
        alert_payload["event_id"] = notification.id
        notification.payload_json = alert_payload
        db.commit()
        db.refresh(notification)
    except Exception:
        db.rollback()
        raise
    AuditService.log_event(
        db=db, action=AuditActionEnum.EMERGENCY_BYPASS, actor_role="PATIENT",
        actor_user_id=patient.id, actor_name=patient_name, target_table="notifications",
        target_record_id=notification.id, client_ip="127.0.0.1",
        description="Patient emergency SOS persisted to the hospital inbox; external SMS and voice dispatch are not configured.",
    )
    return EmergencySOSResponse(
        success=True, sms="NOT_CONFIGURED", call="NOT_CONFIGURED", event_id=notification.id,
        patient_name=patient_name, hospital_name=hospital.name, timestamp=timestamp.isoformat(),
        doctor_notified=True, reception_notified=True, timeline_updated=True,
        details={"sms_status": "NOT_CONFIGURED", "call_status": "NOT_CONFIGURED", "vitals": req.vitals or {}, "location": req.location, "reason": req.reason},
    )
def _alert_item(db: Session, notification: Notification) -> dict[str, Any]:
    payload = notification.payload_json or {}
    patient = db.query(Patient).filter(Patient.id == notification.patient_id).first() if notification.patient_id else None
    hospital = db.query(Hospital).filter(Hospital.id == notification.hospital_id).first()
    return {
        "event_id": notification.id, "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "",
        "patient_id": notification.patient_id or "", "national_health_id": patient.national_health_id if patient and patient.national_health_id else "",
        "hospital_name": hospital.name if hospital else "", "location": payload.get("location") or "",
        "symptoms": payload.get("reason") or "", "vitals": payload.get("vitals") or {},
        "priority": "NOT_ASSESSED", "timestamp": notification.created_at.isoformat() if notification.created_at else "",
        "sms_sid": "", "call_sid": "", "hospital_notified": True,
        "doctor_accepted": bool(payload.get("doctor_accepted")), "accepted_by": payload.get("accepted_by"),
        "accepted_at": payload.get("accepted_at"), "response_time_seconds": None,
        "er_prepared": bool(payload.get("er_prepared")), "status": payload.get("status", "ACTIVE"),
    }


@router.get("/alerts/active", response_model=Dict[str, Any])
def get_active_emergency_alerts(
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.DOCTOR, UserRoleEnum.RECEPTIONIST, UserRoleEnum.HOSPITAL_ADMIN])),
    db: Session = Depends(get_db),
):
    if not current_user.hospital_id:
        raise HTTPException(status_code=403, detail="Hospital assignment is required")
    rows = db.query(Notification).filter(
        Notification.hospital_id == current_user.hospital_id,
        Notification.template_code == "EMERGENCY_SOS",
    ).order_by(Notification.created_at.desc()).all()
    alerts = [_alert_item(db, row) for row in rows if (row.payload_json or {}).get("status") in ("ACTIVE", "ACCEPTED")]
    return {"success": True, "count": len(alerts), "alerts": alerts}


@router.post("/alerts/accept", response_model=Dict[str, Any])
def accept_emergency_case(
    req: AcceptCaseRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
):
    row = db.query(Notification).filter(
        Notification.id == req.event_id, Notification.template_code == "EMERGENCY_SOS",
        Notification.hospital_id == current_user.hospital_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Emergency alert not found")
    payload = dict(row.payload_json or {})
    if payload.get("status") != "ACTIVE":
        raise HTTPException(status_code=409, detail="Emergency alert is no longer active")
    accepted_at = datetime.now(timezone.utc).isoformat()
    payload.update({"doctor_accepted": True, "accepted_by": current_user.full_name, "accepted_at": accepted_at, "status": "ACCEPTED"})
    row.payload_json = payload
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    AuditService.log_event(db=db, action=AuditActionEnum.EMERGENCY_BYPASS, actor_role="DOCTOR", actor_user_id=current_user.id, actor_name=current_user.full_name, target_table="notifications", target_record_id=row.id, client_ip="127.0.0.1", description="Doctor acknowledged persisted emergency alert.")
    return {"success": True, "message": "Emergency alert acknowledged", "accepted_by": current_user.full_name, "accepted_at": accepted_at}


@router.post("/alerts/prepare-er", response_model=Dict[str, Any])
def prepare_emergency_room(
    req: PrepareERRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.RECEPTIONIST, UserRoleEnum.HOSPITAL_ADMIN])),
):
    row = db.query(Notification).filter(
        Notification.id == req.event_id, Notification.template_code == "EMERGENCY_SOS",
        Notification.hospital_id == current_user.hospital_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Emergency alert not found")
    payload = dict(row.payload_json or {})
    payload.update({"er_prepared": True, "prepared_by": current_user.full_name, "prepared_at": datetime.now(timezone.utc).isoformat(), "room_number": req.room_number})
    row.payload_json = payload
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"success": True, "message": "Emergency room preparation recorded", "event_id": row.id, "er_prepared": True}
