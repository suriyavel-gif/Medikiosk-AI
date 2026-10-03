from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_client_ip, get_current_user, require_any_role, require_role
from app.models.models import Consent, ConsentStatusEnum, Doctor, Patient, UserRoleEnum, Visit
from app.schemas.auth import CurrentUser
from app.schemas.consent import ConsentActionRequest, ConsentRequestCreate
from app.services.consent_service import ConsentService

router = APIRouter(prefix="/consent", tags=["Digital Consent & Access Control"])


class CreateConsentRequestInput(BaseModel):
    patient_id: str
    reason: str = "Clinical record review"
    purpose: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=1440, ge=5, le=4320)
    doctor_notes: Optional[str] = None


class ConsentActionInput(BaseModel):
    request_id: str
    action: str = Field(..., description="APPROVE | REJECT | REVOKE")
    duration_minutes: Optional[int] = Field(default=None, ge=5, le=4320)
    duration_text: Optional[str] = None


def _consent_item(db: Session, consent: Consent) -> Dict[str, Any]:
    patient = db.query(Patient).filter(Patient.id == consent.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == consent.doctor_id).first() if consent.doctor_id else None
    visit = db.query(Visit).filter(Visit.id == consent.visit_id).first() if consent.visit_id else None
    duration = consent.permission_minutes
    return {
        "id": consent.id,
        "patient_id": consent.patient_id,
        "patient_name": f"{patient.first_name} {patient.last_name}" if patient else "",
        "doctor_id": consent.doctor_id,
        "doctor_name": f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else "Doctor",
        "hospital_name": visit.hospital.name if visit and visit.hospital else "",
        "department": visit.department.name if visit and visit.department else "",
        "purpose": consent.purpose or consent.consent_type.value,
        "reason": consent.purpose or consent.consent_type.value,
        "duration_minutes": duration,
        "duration_text": f"{duration} minutes" if duration else "Until expiry",
        "status": "APPROVED" if consent.status == ConsentStatusEnum.GRANTED else consent.status.value,
        "requested_at": consent.created_at.isoformat() if consent.created_at else None,
        "expires_at": consent.expires_at.isoformat() if consent.expires_at else None,
        "revoked_at": consent.revoked_at.isoformat() if consent.revoked_at else None,
    }


@router.get("/requests", response_model=Dict[str, Any])
def get_consent_requests(
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.PATIENT, UserRoleEnum.DOCTOR, UserRoleEnum.HOSPITAL_ADMIN])),
    db: Session = Depends(get_db),
):
    query = db.query(Consent)
    if current_user.role == UserRoleEnum.PATIENT.value:
        owned_patient_id = current_user.patient_id or current_user.id
        if patient_id and patient_id != owned_patient_id:
            raise HTTPException(status_code=404, detail="Consent requests not found")
        query = query.filter(Consent.patient_id == owned_patient_id)
    elif current_user.role == UserRoleEnum.DOCTOR.value:
        actual_doctor_id = current_user.doctor_id
        if not actual_doctor_id:
            doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
            actual_doctor_id = doctor.id if doctor else None
        if not actual_doctor_id:
            return {"success": True, "count": 0, "requests": []}
        if doctor_id and doctor_id != actual_doctor_id:
            raise HTTPException(status_code=404, detail="Consent requests not found")
        query = query.filter(Consent.doctor_id == actual_doctor_id)
    else:
        if patient_id:
            query = query.filter(Consent.patient_id == patient_id)
        if doctor_id:
            query = query.filter(Consent.doctor_id == doctor_id)

    if status_filter:
        try:
            query = query.filter(Consent.status == ConsentStatusEnum(status_filter.upper()))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid consent status") from exc
    rows = query.order_by(Consent.created_at.desc()).all()
    results = [_consent_item(db, row) for row in rows]
    return {"success": True, "count": len(results), "requests": results}


@router.get("/check-access", response_model=Dict[str, Any])
def check_patient_consent_access(
    patient_id: str,
    doctor_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    actual_doctor_id = current_user.doctor_id
    if not actual_doctor_id:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        actual_doctor_id = doctor.id if doctor else None
    if not actual_doctor_id or (doctor_id and doctor_id != actual_doctor_id):
        raise HTTPException(status_code=403, detail="Doctor identity mismatch")
    active = ConsentService.check_active_consent(db, patient_id, actual_doctor_id)
    return {
        "success": True,
        "has_access": active,
        "status": "APPROVED" if active else "NO_CONSENT",
        "consent": None,
        "message": "Active patient consent verified." if active else "No active patient consent found.",
    }


@router.post("/request", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def create_doctor_consent_request(
    req: CreateConsentRequestInput,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    doctor_id = current_user.doctor_id
    if not doctor_id:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        doctor_id = doctor.id if doctor else None
    if not doctor_id:
        raise HTTPException(status_code=403, detail="Doctor profile is unavailable")
    create_request = ConsentRequestCreate(
        patient_id=req.patient_id,
        purpose=req.purpose or req.reason,
        expiry_minutes=req.duration_minutes or 1440,
        expiry_hours=max(1, (req.duration_minutes or 1440) // 60),
    )
    record = ConsentService.request_access(db, doctor_id, create_request, get_client_ip(request))
    return {"success": True, "message": "Consent request sent", "request": _consent_item(db, db.query(Consent).filter(Consent.id == record.id).one())}


@router.post("/action", response_model=Dict[str, Any])
def handle_patient_consent_action(
    req: ConsentActionInput,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    action_request = ConsentActionRequest(
        consent_id=req.request_id,
        action=req.action,
        duration_minutes=req.duration_minutes,
    )
    record = ConsentService.process_consent_action(
        db,
        patient_id=current_user.patient_id or current_user.id,
        req=action_request,
        client_ip=get_client_ip(request),
    )
    item = db.query(Consent).filter(Consent.id == record.id).one()
    message = {"APPROVE": "Consent approved", "REJECT": "Consent rejected", "REVOKE": "Consent revoked"}.get(req.action.upper(), "Consent updated")
    return {"success": True, "message": message, "request": _consent_item(db, item)}


@router.get("/ledger/{patient_id}", response_model=Dict[str, Any])
def get_patient_consent_ledger(
    patient_id: str,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    if patient_id != (current_user.patient_id or current_user.id):
        raise HTTPException(status_code=404, detail="Consent history not found")
    records = db.query(Consent).filter(Consent.patient_id == patient_id).order_by(Consent.created_at.desc()).all()
    ledger = [{**_consent_item(db, c), "action": c.status.value, "date": c.created_at.date().isoformat(), "time": c.created_at.time().isoformat()} for c in records]
    return {"success": True, "count": len(ledger), "ledger": ledger}


@router.get("/activity-logs/{patient_id}", response_model=Dict[str, Any])
def get_doctor_activity_logs(
    patient_id: str,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    if patient_id != (current_user.patient_id or current_user.id):
        raise HTTPException(status_code=404, detail="Activity logs not found")
    from app.models.models import AuditActionEnum, AuditLog
    logs = db.query(AuditLog).filter(
        AuditLog.target_record_id == patient_id,
        AuditLog.action == AuditActionEnum.DOCTOR_VIEW_RECORD,
    ).order_by(AuditLog.created_at.desc()).all()
    data = [{"id": row.id, "doctor_name": row.actor_name, "hospital": "", "record_type": row.target_table,
             "timestamp": row.created_at.isoformat(), "duration": "", "ip_address": row.client_ip} for row in logs]
    return {"success": True, "count": len(data), "logs": data}
