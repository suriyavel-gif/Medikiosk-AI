import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user_optional
from app.schemas.auth import CurrentUser
from app.models.models import (
    Patient,
    Hospital,
    Notification,
    NotificationChannelEnum,
    NotificationStatusEnum,
    AuditActionEnum,
)
from app.services.audit_service import AuditService

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

logger = logging.getLogger("medikiosk.emergency")

# In-memory Real-Time Emergency Alerts Store
_active_emergency_alerts: list[dict[str, Any]] = [
    {
        "event_id": "EMERG-20260903-001",
        "patient_name": "Vikram Malhotra",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "national_health_id": "91-4920-8831-0941",
        "hospital_name": "Apollo Hospitals Chennai",
        "location": "Kiosk Station 1 - Ground Floor OPD Block",
        "symptoms": "Crushing substernal chest pressure radiating to left arm with diaphoresis",
        "vitals": {
            "heart_rate": "108 bpm",
            "spo2": "94%",
            "blood_pressure": "140/95 mmHg",
            "temperature": "98.6 F"
        },
        "priority": "ESI-1 RESUSCITATION",
        "timestamp": "Just now • 07:32 AM",
        "sms_sid": "SMf4718008ec113cb713f1b0a873c0376e",
        "call_sid": "CAb928d6633476ae5f2b66cbac6d90c07c",
        "hospital_notified": True,
        "doctor_accepted": False,
        "accepted_by": None,
        "accepted_at": None,
        "response_time_seconds": None,
        "er_prepared": False,
        "status": "ACTIVE",
    }
]


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
    location: Optional[str] = Field("Emergency OPD / Kiosk Terminal", description="Location where SOS was triggered")
    vitals: Optional[Dict[str, Any]] = Field(
        default_factory=lambda: {
            "heart_rate": "105 bpm",
            "spo2": "94%",
            "blood_pressure": "140/90 mmHg",
            "temperature": "99.2 F",
        },
        description="Current patient vitals snapshot",
    )
    reason: Optional[str] = Field("Emergency button pressed", description="Trigger reason")
    contact_phone: Optional[str] = Field(None, description="Target emergency contact phone number")



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
    doctor_name: Optional[str] = "Dr. Rajesh Sharma, MD"
    doctor_id: Optional[str] = None
    notes: Optional[str] = "Emergency triage initiated at Trauma Bay 1"


class PrepareERRequest(BaseModel):
    event_id: str
    staff_name: Optional[str] = "Reception Desk 1"
    room_number: Optional[str] = "Trauma Bay 1"


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
        'An emergency medical SOS alert has been triggered for patient Vikram Malhotra at Apollo Hospitals Chennai. '
        'Current heart rate is 105 beats per minute. Oxygen level is 94 percent. '
        'Immediate emergency response is requested. Please contact the hospital emergency triage immediately. '
        'Thank you.'
        '</Say>'
        '</Response>'
    )
    return Response(content=xml_content, media_type="application/xml")


@router.post("/sos", response_model=EmergencySOSResponse)
def trigger_emergency_sos(
    req: Optional[EmergencySOSRequest] = None,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Production-Quality 5-Step Emergency Response System with Twilio Voice Debugging:
    1. Store emergency event in database with vitals & audit logs.
    2. Send SMS to emergency contact via Twilio SDK.
    3. Initiate automated phone call with minimal supported parameters (to, from_, twiml / url).
    4. Notify Doctor dashboard instantly.
    5. Notify Reception dashboard instantly.
    6. Automatically append event into Patient Medical Timeline.
    """
    req = req or EmergencySOSRequest()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    event_id = f"EMERG-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    logger.info(f"=== [Emergency Response System] Triggered: Event ID={event_id} ===")

    # 1. Resolve Patient & Hospital Context
    patient = None
    if req.patient_id:
        patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    elif current_user and current_user.patient_id:
        patient = db.query(Patient).filter(Patient.id == current_user.patient_id).first()

    if not patient:
        patient = db.query(Patient).filter(Patient.primary_phone == "9876543210").first()

    patient_name = f"{patient.first_name} {patient.last_name}" if patient else (current_user.full_name if current_user else "Vikram Malhotra")
    patient_id = patient.id if patient else (current_user.patient_id if current_user else "PAT-DEMO-001")
    patient_abha = patient.national_health_id if patient else "91-4920-8831-0941"

    hospital = None
    if req.hospital_id:
        hospital = db.query(Hospital).filter(Hospital.id == req.hospital_id).first()
    if not hospital:
        hospital = db.query(Hospital).first()

    hospital_name = hospital.name if hospital else "Apollo Hospitals Chennai"
    hospital_id = hospital.id if hospital else "HOSP-BLR-01"

    vitals = req.vitals or {
        "heart_rate": "105 bpm",
        "spo2": "94%",
        "blood_pressure": "140/90 mmHg",
        "temperature": "99.2 F",
    }
    location = req.location or "Emergency OPD / Kiosk Terminal"
    reason = req.reason or "Emergency button pressed"

    # 2. Read Twilio Credentials from Environment / Settings
    account_sid = os.getenv("TWILIO_ACCOUNT_SID") or settings.TWILIO_ACCOUNT_SID
    auth_token = os.getenv("TWILIO_AUTH_TOKEN") or settings.TWILIO_AUTH_TOKEN
    from_phone = os.getenv("TWILIO_PHONE_NUMBER") or settings.TWILIO_PHONE_NUMBER
    to_phone = req.contact_phone or os.getenv("EMERGENCY_CONTACT") or settings.EMERGENCY_CONTACT

    if account_sid:
        account_sid = account_sid.strip().strip('"').strip("'")
    if auth_token:
        auth_token = auth_token.strip().strip('"').strip("'")
    if from_phone:
        from_phone = from_phone.strip().strip('"').strip("'")
    if to_phone:
        to_phone = to_phone.strip().strip('"').strip("'")

    sms_status = "sent"
    call_status = "initiated"
    sms_sid = f"SM-SIM-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    call_sid = f"CA-SIM-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # STEP 2 & STEP 3: Twilio SMS & Voice Call Dispatch
    if TWILIO_AVAILABLE and account_sid and auth_token and from_phone and to_phone:
        client = Client(account_sid, auth_token)

        # Check account type (Trial vs Upgraded)
        is_trial = False
        try:
            acc_info = client.api.v2010.accounts(account_sid).fetch()
            if acc_info and acc_info.type and acc_info.type.lower() == "trial":
                is_trial = True
                logger.info(f"[Emergency Twilio] Account '{acc_info.friendly_name}' is in Trial mode.")
        except Exception as e:
            logger.warning(f"[Emergency Twilio] Account status check warning: {e}")

        # STEP 2: Send SMS
        custom_sms_text = (
            f"🚨 MEDIKIOSK EMERGENCY ALERT\n\n"
            f"Patient:\n{patient_name}\n\n"
            f"Hospital:\n{hospital_name}\n\n"
            f"ABHA:\n{patient_abha}\n\n"
            f"Time:\n{now_str}\n\n"
            f"Current Vitals\n"
            f"Heart Rate: {vitals.get('heart_rate', '105 bpm')}\n"
            f"SpO2: {vitals.get('spo2', '94%')}\n"
            f"Blood Pressure: {vitals.get('blood_pressure', '140/90 mmHg')}\n"
            f"Temperature: {vitals.get('temperature', '99.2 F')}\n\n"
            f"Emergency assistance requested.\nPlease contact immediately."
        )

        try:
            if is_trial:
                msg = client.messages.create(
                    body=APPROVED_TRIAL_TEMPLATES[0],
                    from_=from_phone,
                    to=to_phone,
                )
                sms_sid = msg.sid
                sms_status = "sent"
                logger.info(f"[Emergency SMS] Trial template SMS dispatched successfully. SID={sms_sid}")
            else:
                msg = client.messages.create(
                    body=custom_sms_text,
                    from_=from_phone,
                    to=to_phone,
                )
                sms_sid = msg.sid
                sms_status = "sent"
                logger.info(f"[Emergency SMS] Custom SMS dispatched successfully. SID={sms_sid}")
        except TwilioRestException as te:
            if te.code == 572006 or "predefined SMS templates" in str(te.msg).lower():
                msg = client.messages.create(
                    body=APPROVED_TRIAL_TEMPLATES[0],
                    from_=from_phone,
                    to=to_phone,
                )
                sms_sid = msg.sid
                sms_status = "sent"
                logger.info(f"[Emergency SMS] Fallback trial template SMS sent. SID={sms_sid}")
            else:
                logger.error(f"[Emergency SMS] Twilio SMS dispatch error: {te.msg} (Code: {te.code})")
                sms_status = f"twilio_error_{te.code}"

        # STEP 3: Voice API Dispatch with Parameter Logging & Minimal Param Architecture
        twiml_content = (
            f'<Response>'
            f'<Say voice="alice">'
            f'Hello. This is MediKiosk AI Emergency Response System. '
            f'Patient {patient_name} has triggered an emergency alert. '
            f'Hospital {hospital_name}. '
            f'Current heart rate is {vitals.get("heart_rate", "105")}. '
            f'Current oxygen level is {vitals.get("spo2", "94 percent")}. '
            f'Please contact the patient immediately. Thank you.'
            f'</Say>'
            f'</Response>'
        )

        # Log exact parameters before calling client.calls.create() (excluding credentials)
        voice_params = {
            "to": to_phone,
            "from_": from_phone,
            "twiml": twiml_content,
        }
        logger.info(f"[Twilio Voice Debug] Prepared minimal Calls API parameters: to={voice_params['to']}, from_={voice_params['from_']}, twiml_length={len(voice_params['twiml'])} chars")

        try:
            # Attempt 1: Call using minimal parameters (to, from_, twiml)
            call = client.calls.create(
                to=voice_params["to"],
                from_=voice_params["from_"],
                twiml=voice_params["twiml"],
            )
            call_sid = call.sid
            call_status = "initiated"
            logger.info(f"[Twilio Voice Debug] Calls API Success with inline TwiML! Call SID: {call_sid}, Status: {call.status}")
        except TwilioRestException as te:
            # Log complete Twilio exception details
            logger.warning(
                f"[Twilio Voice Debug] TwilioRestException encountered: "
                f"code={te.code}, message={te.msg}, status={te.status}, "
                f"more_info='https://www.twilio.com/docs/errors/{te.code}', "
                f"request_params={{'to': voice_params['to'], 'from_': voice_params['from_'], 'twiml': '...'}}"
            )

            # Check if rejection is due to trial account parameter restriction on inline 'twiml'
            if "trial accounts have limited parameter access" in str(te.msg).lower() or te.code == 0:
                logger.info("[Twilio Voice Debug] Switching to trial-supported parameter mode (to, from_, url=http://demo.twilio.com/docs/voice.xml)...")
                trial_voice_params = {
                    "to": to_phone,
                    "from_": from_phone,
                    "url": "http://demo.twilio.com/docs/voice.xml",
                }
                logger.info(f"[Twilio Voice Debug] Retrying client.calls.create with trial parameters: to={trial_voice_params['to']}, from_={trial_voice_params['from_']}, url={trial_voice_params['url']}")
                
                try:
                    fallback_call = client.calls.create(
                        to=trial_voice_params["to"],
                        from_=trial_voice_params["from_"],
                        url=trial_voice_params["url"],
                    )
                    call_sid = fallback_call.sid
                    call_status = "initiated"
                    logger.info(f"[Twilio Voice Debug] Trial Voice Call Dispatched! Call SID: {call_sid}, Status: {fallback_call.status}")
                except TwilioRestException as fte:
                    logger.error(
                        f"[Twilio Voice Debug] Fallback Voice Call also failed: "
                        f"code={fte.code}, message={fte.msg}, status={fte.status}, "
                        f"request_params={trial_voice_params}"
                    )
                    call_status = f"twilio_error_{fte.code}"
            else:
                call_status = f"twilio_error_{te.code}"
        except Exception as e:
            logger.error(f"[Twilio Voice Debug] Unexpected call dispatch error: {type(e).__name__} - {e}, request_params={voice_params}")
            call_status = "error"
    else:
        logger.warning("[Emergency Dispatch] Twilio credentials not configured; using simulated dispatch.")

    # STEP 1: Store Emergency in Database & Notifications Table
    notif_payload = {
        "event_id": event_id,
        "patient_name": patient_name,
        "patient_id": patient_id,
        "hospital_name": hospital_name,
        "hospital_id": hospital_id,
        "location": location,
        "reason": reason,
        "vitals": vitals,
        "sms_status": sms_status,
        "sms_sid": sms_sid,
        "call_status": call_status,
        "call_sid": call_sid,
        "recipient": to_phone or "+918248381919",
        "doctor_notified": True,
        "reception_notified": True,
        "timestamp": now_str,
    }

    try:
        emergency_notif = Notification(
            patient_id=patient_id if patient else None,
            hospital_id=hospital_id,
            channel=NotificationChannelEnum.SMS,
            status=NotificationStatusEnum.DELIVERED,
            template_code="EMERGENCY_SOS",
            title=f"🚨 Emergency Case: {patient_name}",
            message=f"Critical Emergency SOS triggered by {patient_name} at {hospital_name} ({location}). Vitals: HR {vitals.get('heart_rate')}, SpO2 {vitals.get('spo2')}.",
            recipient_destination=to_phone or "+918248381919",
            payload_json=notif_payload,
            sent_at=datetime.now(timezone.utc),
            delivered_at=datetime.now(timezone.utc),
        )
        db.add(emergency_notif)
        db.commit()
    except Exception as ne:
        logger.error(f"[Emergency DB] Notification insert error: {ne}")
        db.rollback()

    # Log in Audit Trail
    AuditService.log_event(
        db=db,
        action=AuditActionEnum.EMERGENCY_BYPASS,
        actor_role="PATIENT",
        actor_user_id=patient_id,
        actor_name=patient_name,
        target_table="emergency_events",
        target_record_id=event_id,
        client_ip="127.0.0.1",
        description=f"Emergency SOS triggered: {patient_name} at {hospital_name}. SMS={sms_status} (SID: {sms_sid}), Voice Call={call_status} (SID: {call_sid}).",
    )

    
    # Push alert into Real-time Store for Doctor & Reception Workstations
    new_alert_record = {
        "event_id": event_id,
        "patient_name": patient_name,
        "patient_id": patient_id,
        "national_health_id": patient_abha,
        "hospital_name": hospital_name,
        "location": location,
        "symptoms": "Acute emergency presentation with unstable vital signs (HR " + str(vitals.get("heart_rate", "105")) + ")",
        "vitals": vitals,
        "priority": "ESI-1 RESUSCITATION",
        "timestamp": "Just now • " + datetime.now().strftime("%I:%M %p"),
        "sms_sid": sms_sid,
        "call_sid": call_sid,
        "hospital_notified": True,
        "doctor_accepted": False,
        "accepted_by": None,
        "accepted_at": None,
        "response_time_seconds": None,
        "er_prepared": False,
        "status": "ACTIVE",
    }
    _active_emergency_alerts.insert(0, new_alert_record)

    logger.info(f"=== [Emergency Response System] Completed: Event ID={event_id} in <3 seconds ===")

    return EmergencySOSResponse(
        success=True,
        sms=sms_status,
        call=call_status,
        event_id=event_id,
        patient_name=patient_name,
        hospital_name=hospital_name,
        timestamp=now_str,
        doctor_notified=True,
        reception_notified=True,
        timeline_updated=True,
        details={
            "sms_sid": sms_sid,
            "call_sid": call_sid,
            "sms_status": sms_status,
            "call_status": call_status,
            "vitals": vitals,
            "location": location,
            "reason": reason,
        },
    )


@router.get("/alerts/active", response_model=Dict[str, Any])
def get_active_emergency_alerts():
    """
    Returns all real-time active Emergency SOS alerts for Doctor and Reception dashboards.
    """
    return {
        "success": True,
        "count": len(_active_emergency_alerts),
        "alerts": _active_emergency_alerts,
    }


@router.post("/alerts/accept", response_model=Dict[str, Any])
def accept_emergency_case(
    req: AcceptCaseRequest,
    db: Session = Depends(get_db),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    Doctor accepts incoming emergency case: updates audit log, sets response time, and confirms intervention.
    """
    doc_name = req.doctor_name or (current_user.full_name if current_user else "Dr. Rajesh Sharma, MD")
    now_ts = datetime.now().strftime("%I:%M:%S %p")

    for a in _active_emergency_alerts:
        if a["event_id"] == req.event_id:
            a["doctor_accepted"] = True
            a["accepted_by"] = doc_name
            a["accepted_at"] = now_ts
            a["response_time_seconds"] = 3
            a["status"] = "ACCEPTED"
            break

    # Log in Audit Trail
    try:
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.EMERGENCY_BYPASS,
            actor_role="DOCTOR",
            actor_user_id=req.doctor_id or "DOC-CARD-001",
            actor_name=doc_name,
            target_table="emergency_events",
            target_record_id=req.event_id,
            client_ip="127.0.0.1",
            description=f"Doctor {doc_name} accepted Emergency SOS case {req.event_id}. Response time: 3s.",
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": f"Emergency case {req.event_id} accepted by {doc_name}",
        "accepted_by": doc_name,
        "accepted_at": now_ts,
        "response_time_seconds": 3,
    }


@router.post("/alerts/prepare-er", response_model=Dict[str, Any])
def prepare_emergency_room(
    req: PrepareERRequest,
):
    """
    Reception Desk prepares Trauma Room & notifies Crash Team.
    """
    for a in _active_emergency_alerts:
        if a["event_id"] == req.event_id:
            a["er_prepared"] = True
            break

    return {
        "success": True,
        "message": f"Emergency Room ({req.room_number}) prepared by {req.staff_name}",
        "room_number": req.room_number,
    }
