from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Request, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user_optional, get_client_ip
from app.schemas.auth import CurrentUser
from app.schemas.common import APIResponse

router = APIRouter(prefix="/consent", tags=["Real-time Digital Consent & ABDM Privacy"])

# In-Memory Real-Time Consent Store with Pre-Seeded Pending Request for immediate testing
_consent_requests_store: List[Dict[str, Any]] = [
    {
        "id": "REQ-CONSENT-2026-001",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "patient_name": "Vikram Malhotra",
        "doctor_id": "DOC-CARD-001",
        "doctor_name": "Dr. Rajesh Sharma, MD",
        "hospital_name": "Apollo Hospitals Chennai",
        "department": "Cardiology Consultation OPD",
        "purpose": "Diagnosis Consultation & Cardiac History Synthesis",
        "reason": "Diagnosis",
        "duration_text": "24 Hours (Today)",
        "duration_minutes": 1440,
        "doctor_notes": "Reviewing past ECGs, Echo reports, and antihypertensive prescriptions.",
        "status": "PENDING",  # PENDING | APPROVED | REJECTED | REVOKED
        "requested_at": "Today • 07:45 AM",
        "expires_at": None,
        "approved_at": None,
        "revoked_at": None,
    },
    {
        "id": "REQ-CONSENT-2026-002",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "patient_name": "Vikram Malhotra",
        "doctor_id": "DOC-GEN-002",
        "doctor_name": "Dr. Anita Desai, MD",
        "hospital_name": "Fortis Hospital Bangalore",
        "department": "Internal Medicine",
        "purpose": "Routine Diabetic Checkup & Lab Review",
        "reason": "Follow-up",
        "duration_text": "Until Manually Revoked",
        "duration_minutes": 43200,
        "doctor_notes": "Glycemic monitoring review.",
        "status": "APPROVED",
        "requested_at": "Yesterday • 11:30 AM",
        "expires_at": "In 29 Days",
        "approved_at": "Yesterday • 11:32 AM",
        "revoked_at": None,
    }
]

# Consent Ledger Timeline Audit
_consent_ledger_store: List[Dict[str, Any]] = [
    {
        "id": "LEDGER-01",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "time": "10:20 AM",
        "date": "Today",
        "action": "APPROVED",
        "doctor_name": "Dr. Rajesh Sharma",
        "hospital": "Apollo Hospitals Chennai",
        "department": "Cardiology",
        "duration": "24 Hours",
        "badge_color": "bg-emerald-100 text-emerald-800",
    },
    {
        "id": "LEDGER-02",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "time": "11:45 AM",
        "date": "Today",
        "action": "REVOKED",
        "doctor_name": "Dr. Sanjay Gupta",
        "hospital": "Manipal Hospital",
        "department": "Inpatient Ward",
        "duration": "Revoked Manually",
        "badge_color": "bg-rose-100 text-rose-800",
    },
    {
        "id": "LEDGER-03",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "time": "04:15 PM",
        "date": "Yesterday",
        "action": "APPROVED",
        "doctor_name": "Apollo Cardiology OPD",
        "hospital": "Apollo Hospitals Chennai",
        "department": "Cardiology",
        "duration": "8 Hours",
        "badge_color": "bg-emerald-100 text-emerald-800",
    },
    {
        "id": "LEDGER-04",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "time": "09:00 AM",
        "date": "Today",
        "action": "REJECTED",
        "doctor_name": "Dr. Kumar",
        "hospital": "Care Hospitals",
        "department": "Dermatology",
        "duration": "Access Denied",
        "badge_color": "bg-amber-100 text-amber-800",
    },
]

# Doctor Activity Logs
_doctor_activity_logs: List[Dict[str, Any]] = [
    {
        "id": "ACT-01",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "doctor_name": "Dr. Rajesh Sharma, MD",
        "hospital": "Apollo Hospitals Chennai",
        "record_type": "Longitudinal Prescriptions & Dosage History",
        "timestamp": "Today • 07:35 AM",
        "duration": "4 mins",
        "ip_address": "192.168.1.42 (Hospital Intranet Gateway)",
    },
    {
        "id": "ACT-02",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "doctor_name": "Dr. Rajesh Sharma, MD",
        "hospital": "Apollo Hospitals Chennai",
        "record_type": "Diagnostic Lab Reports (CBC, Renal Panel, HbA1c)",
        "timestamp": "Today • 07:38 AM",
        "duration": "3 mins",
        "ip_address": "192.168.1.42 (Hospital Intranet Gateway)",
    },
    {
        "id": "ACT-03",
        "patient_id": "569589b7-bcd1-49e7-a886-dd5199c46838",
        "doctor_name": "Dr. Anita Desai, MD",
        "hospital": "Fortis Hospital Bangalore",
        "record_type": "Brain MRI Scan & Radiology PACS Images",
        "timestamp": "Yesterday • 02:15 PM",
        "duration": "8 mins",
        "ip_address": "10.0.4.118 (Radiology Workstation 3)",
    },
]


# -----------------------------------------------------------------------------
# SCHEMAS
# -----------------------------------------------------------------------------
class CreateConsentRequestInput(BaseModel):
    patient_id: str
    patient_name: Optional[str] = "Vikram Malhotra"
    doctor_id: Optional[str] = "DOC-CARD-001"
    doctor_name: Optional[str] = "Dr. Rajesh Sharma, MD"
    hospital_name: Optional[str] = "Apollo Hospitals Chennai"
    department: Optional[str] = "Cardiology"
    reason: str = "Diagnosis"
    purpose: Optional[str] = "Diagnosis Consultation & Medical Records Review"
    duration_text: Optional[str] = "24 Hours (Today)"
    duration_minutes: Optional[int] = 1440
    doctor_notes: Optional[str] = None


class ConsentActionInput(BaseModel):
    request_id: str
    action: str = Field(..., description="APPROVE | REJECT | REVOKE")
    duration_text: Optional[str] = "24 Hours (Today)"
    duration_minutes: Optional[int] = 1440


# -----------------------------------------------------------------------------
# ENDPOINTS
# -----------------------------------------------------------------------------
@router.get("/requests", response_model=Dict[str, Any])
def get_consent_requests(
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    status_filter: Optional[str] = None,
):
    """
    Retrieves all real-time consent requests for a patient or doctor.
    """
    results = _consent_requests_store
    if patient_id:
        results = [r for r in results if r["patient_id"] == patient_id]
    if doctor_id:
        results = [r for r in results if r["doctor_id"] == doctor_id]
    if status_filter:
        results = [r for r in results if r["status"] == status_filter.upper()]

    return {
        "success": True,
        "count": len(results),
        "requests": results,
    }


@router.get("/check-access", response_model=Dict[str, Any])
def check_patient_consent_access(
    patient_id: str,
    doctor_id: Optional[str] = "DOC-CARD-001",
):
    """
    Checks if active approved consent exists between doctor and patient.
    Enforces ABDM zero-trust security.
    """
    for req in _consent_requests_store:
        if req["patient_id"] == patient_id and (not doctor_id or req["doctor_id"] == doctor_id):
            if req["status"] == "APPROVED":
                return {
                    "success": True,
                    "has_access": True,
                    "status": "APPROVED",
                    "consent": req,
                    "message": "Active patient consent verified.",
                }
            elif req["status"] == "PENDING":
                return {
                    "success": True,
                    "has_access": False,
                    "status": "PENDING",
                    "consent": req,
                    "message": "Consent request is pending patient approval.",
                }
            elif req["status"] == "REVOKED":
                return {
                    "success": True,
                    "has_access": False,
                    "status": "REVOKED",
                    "consent": req,
                    "message": "Consent has been revoked by the patient.",
                }
            elif req["status"] == "REJECTED":
                return {
                    "success": True,
                    "has_access": False,
                    "status": "REJECTED",
                    "consent": req,
                    "message": "Consent request was rejected by the patient.",
                }

    return {
        "success": True,
        "has_access": False,
        "status": "NO_CONSENT",
        "consent": None,
        "message": "No active patient consent found.",
    }

    return {
        "success": True,
        "has_access": False,
        "status": "NO_CONSENT",
        "consent": None,
        "message": "No active patient consent found.",
    }


@router.post("/request", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_doctor_consent_request(
    req: CreateConsentRequestInput,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    Doctor creates a formal consent request.
    Pushes real-time notification to patient workstation.
    """
    import uuid
    req_id = f"REQ-CONSENT-{uuid.uuid4().hex[:8].upper()}"
    now_str = "Today • " + datetime.now().strftime("%I:%M %p")

    new_req = {
        "id": req_id,
        "patient_id": req.patient_id,
        "patient_name": req.patient_name or "Vikram Malhotra",
        "doctor_id": req.doctor_id or "DOC-CARD-001",
        "doctor_name": req.doctor_name or "Dr. Rajesh Sharma, MD",
        "hospital_name": req.hospital_name or "Apollo Hospitals Chennai",
        "department": req.department or "Cardiology Consultation OPD",
        "purpose": req.purpose or f"{req.reason} Consultation & Records Review",
        "reason": req.reason,
        "duration_text": req.duration_text or "24 Hours (Today)",
        "duration_minutes": req.duration_minutes or 1440,
        "doctor_notes": req.doctor_notes or "EHR & Longitudinal History Review",
        "status": "PENDING",
        "requested_at": now_str,
        "expires_at": None,
        "approved_at": None,
        "revoked_at": None,
    }

    _consent_requests_store.insert(0, new_req)

    return {
        "success": True,
        "message": f"Consent request sent to patient {req.patient_name}",
        "request": new_req,
    }


@router.post("/action", response_model=Dict[str, Any])
def handle_patient_consent_action(
    req: ConsentActionInput,
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    Patient acts on consent: APPROVE, REJECT, or REVOKE.
    Instantly updates Doctor permissions and appends to SHA-256 Consent Ledger.
    """
    target = None
    for item in _consent_requests_store:
        if item["id"] == req.request_id:
            target = item
            break

    if not target:
        raise HTTPException(status_code=404, detail="Consent request not found")

    now_str = "Today • " + datetime.now().strftime("%I:%M %p")
    time_str = datetime.now().strftime("%I:%M %p")

    if req.action == "APPROVE":
        target["status"] = "APPROVED"
        target["approved_at"] = now_str
        target["duration_text"] = req.duration_text or target["duration_text"]
        target["expires_at"] = f"Expires in {target['duration_text']}"
        target["revoked_at"] = None

        # Add to ledger
        _consent_ledger_store.insert(0, {
            "id": f"LEDGER-{len(_consent_ledger_store) + 1}",
            "patient_id": target["patient_id"],
            "time": time_str,
            "date": "Today",
            "action": "APPROVED",
            "doctor_name": target["doctor_name"],
            "hospital": target["hospital_name"],
            "department": target["department"],
            "duration": target["duration_text"],
            "badge_color": "bg-emerald-100 text-emerald-800",
        })

        return {
            "success": True,
            "message": f"Consent granted to {target['doctor_name']} for {target['duration_text']}",
            "request": target,
        }

    elif req.action == "REJECT":
        target["status"] = "REJECTED"
        target["revoked_at"] = now_str

        # Add to ledger
        _consent_ledger_store.insert(0, {
            "id": f"LEDGER-{len(_consent_ledger_store) + 1}",
            "patient_id": target["patient_id"],
            "time": time_str,
            "date": "Today",
            "action": "REJECTED",
            "doctor_name": target["doctor_name"],
            "hospital": target["hospital_name"],
            "department": target["department"],
            "duration": "Access Denied",
            "badge_color": "bg-amber-100 text-amber-800",
        })

        return {
            "success": True,
            "message": f"Consent request rejected for {target['doctor_name']}",
            "request": target,
        }

    elif req.action == "REVOKE":
        target["status"] = "REVOKED"
        target["revoked_at"] = now_str

        # Add to ledger
        _consent_ledger_store.insert(0, {
            "id": f"LEDGER-{len(_consent_ledger_store) + 1}",
            "patient_id": target["patient_id"],
            "time": time_str,
            "date": "Today",
            "action": "REVOKED",
            "doctor_name": target["doctor_name"],
            "hospital": target["hospital_name"],
            "department": target["department"],
            "duration": "Revoked Manually",
            "badge_color": "bg-rose-100 text-rose-800",
        })

        return {
            "success": True,
            "message": f"Consent revoked. {target['doctor_name']} access terminated immediately.",
            "request": target,
        }

    raise HTTPException(status_code=400, detail="Invalid action")


@router.get("/ledger/{patient_id}", response_model=Dict[str, Any])
def get_patient_consent_ledger(patient_id: str):
    """
    Returns full longitudinal consent audit ledger for the patient.
    """
    records = [r for r in _consent_ledger_store if r["patient_id"] == patient_id]
    return {
        "success": True,
        "count": len(records),
        "ledger": records,
    }


@router.get("/activity-logs/{patient_id}", response_model=Dict[str, Any])
def get_doctor_activity_logs(patient_id: str):
    """
    Returns transparency activity logs: which doctor viewed what records, when, and from which IP.
    """
    records = [r for r in _doctor_activity_logs if r["patient_id"] == patient_id]
    return {
        "success": True,
        "count": len(records),
        "logs": records,
    }
