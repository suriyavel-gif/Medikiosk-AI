from typing import List
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, get_client_ip
from app.models.models import UserRoleEnum
from app.schemas.auth import CurrentUser
from app.schemas.patient import (
    PatientProfileResponse,
    PatientProfileUpdateRequest,
    PatientTimelineResponse,
    AIIntakeHistoryItem,
    MedicalHistoryCreateRequest,
    MedicalHistoryItemSchema,
)
from app.schemas.prescription import PrescriptionDetailResponse
from app.schemas.consent import ConsentDetailResponse
from app.schemas.audit import AuditLogResponse
from app.schemas.common import APIResponse
from app.services.patient_service import PatientService

router = APIRouter(prefix="/patients", tags=["Patient Portal & Records"])


@router.get("/profile", response_model=APIResponse[PatientProfileResponse])
def get_patient_profile(
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Retrieve logged-in patient's profile."""
    profile = PatientService.get_profile(db, current_user.id)
    return APIResponse(success=True, message="Patient profile retrieved", data=profile)


@router.put("/profile", response_model=APIResponse[PatientProfileResponse])
def update_patient_profile(
    req: PatientProfileUpdateRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Update logged-in patient's profile details."""
    client_ip = get_client_ip(request)
    profile = PatientService.update_profile(db, current_user.id, req, client_ip=client_ip)
    return APIResponse(success=True, message="Profile updated successfully", data=profile)


@router.post("/medical-history", response_model=APIResponse[MedicalHistoryItemSchema], status_code=status.HTTP_201_CREATED)
def add_medical_history(
    req: MedicalHistoryCreateRequest,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Add chronic illness, allergy, or past surgical medical history."""
    item = PatientService.add_medical_history(db, current_user.id, req)
    return APIResponse(success=True, message="Medical history entry recorded", data=item)


@router.get("/timeline", response_model=APIResponse[PatientTimelineResponse])
def get_patient_timeline(
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Retrieve patient's full longitudinal clinical timeline (visits, diagnoses, prescriptions, reports)."""
    timeline = PatientService.get_patient_timeline(db, current_user.id)
    return APIResponse(success=True, message="Timeline retrieved successfully", data=timeline)


@router.get("/prescriptions", response_model=APIResponse[List[PrescriptionDetailResponse]])
def get_patient_prescriptions(
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Retrieve all prescriptions and automated intake dosage schedules."""
    prescriptions = PatientService.get_prescriptions(db, current_user.id)
    return APIResponse(success=True, message="Prescriptions retrieved successfully", data=prescriptions)


@router.get("/ai-intake-history", response_model=APIResponse[List[AIIntakeHistoryItem]])
def get_ai_intake_history(
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Retrieve history of all MediKiosk autonomous AI intakes, triage scores, and generated SOAP notes."""
    history = PatientService.get_ai_intake_history(db, current_user.id)
    return APIResponse(success=True, message="AI intake history retrieved", data=history)


@router.get("/consent-history", response_model=APIResponse[List[ConsentDetailResponse]])
def get_consent_history(
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Retrieve history of all access consent grants, rejections, and revocations."""
    history = PatientService.get_consent_history(db, current_user.id)
    return APIResponse(success=True, message="Consent history retrieved", data=history)


@router.get("/doctor-access-logs", response_model=APIResponse[List[AuditLogResponse]])
def get_doctor_access_logs(
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Retrieve immutable audit logs tracking every physician access to this patient's medical records."""
    logs = PatientService.get_doctor_access_logs(db, current_user.id)
    return APIResponse(success=True, message="Doctor access audit logs retrieved", data=logs)
