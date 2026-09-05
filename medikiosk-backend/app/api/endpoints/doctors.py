from typing import List
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, get_client_ip
from app.models.models import UserRoleEnum, Doctor
from app.schemas.auth import CurrentUser
from app.schemas.doctor import (
    DoctorQueuePatientItem,
    AddDiagnosisRequest,
    DiagnosisResponse,
    CloseConsultationRequest,
    OrderLabTestsRequest,
    LabTestOrderResponse,
)

from app.schemas.consent import ConsentRequestCreate, ConsentDetailResponse
from app.schemas.prescription import PrescriptionCreateRequest, PrescriptionDetailResponse
from app.schemas.patient import PatientTimelineResponse
from app.schemas.common import APIResponse
from app.services.doctor_service import DoctorService
from app.services.consent_service import ConsentService
from app.services.prescription_service import PrescriptionService

router = APIRouter(prefix="/doctors", tags=["Doctor Workspace & EHR Triage"])


@router.get("/queue/today", response_model=APIResponse[List[DoctorQueuePatientItem]])
def get_doctor_queue(
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    """Retrieve today's active patient queue for the logged-in doctor, prioritized by ESI triage score."""
    if not current_user.doctor_id:
        doc = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        doctor_id = doc.id if doc else current_user.id
    else:
        doctor_id = current_user.doctor_id

    queue_list = DoctorService.get_doctor_queue(db, doctor_id)
    return APIResponse(success=True, message=f"Doctor queue retrieved ({len(queue_list)} active patients)", data=queue_list)


@router.post("/access/request", response_model=APIResponse[ConsentDetailResponse], status_code=status.HTTP_201_CREATED)
def request_patient_record_access(
    req: ConsentRequestCreate,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    """Doctor requests explicit patient digital consent to view past medical history and diagnostic reports."""
    client_ip = get_client_ip(request)
    doctor_id = current_user.doctor_id or current_user.id
    consent = ConsentService.request_access(db, doctor_id=doctor_id, req=req, client_ip=client_ip)
    return APIResponse(success=True, message="Access request submitted to patient", data=consent)


@router.get("/patients/{patient_id}/timeline", response_model=APIResponse[PatientTimelineResponse])
def view_patient_timeline(
    patient_id: str,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    """
    Doctor views patient's longitudinal timeline and medical history.
    AUTOMATIC AUDIT EVENT: Logs DOCTOR_VIEW_RECORD in tamper-evident audit store.
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    doctor_id = current_user.doctor_id or current_user.id

    # Check consent (soft check or enforce)
    timeline = DoctorService.view_patient_timeline_with_audit(
        db, doctor_id=doctor_id, patient_id=patient_id, client_ip=client_ip, user_agent=user_agent
    )
    return APIResponse(success=True, message="Patient timeline retrieved (Audit Logged)", data=timeline)


@router.post("/diagnosis", response_model=APIResponse[DiagnosisResponse], status_code=status.HTTP_201_CREATED)
def add_diagnosis(
    req: AddDiagnosisRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    """
    Doctor adds a clinical diagnosis (ICD-10 / SNOMED-CT mapped).
    AUTOMATIC AUDIT EVENT: Logs DOCTOR_UPDATE_RECORD.
    """
    client_ip = get_client_ip(request)
    doctor_id = current_user.doctor_id or current_user.id
    diag = DoctorService.add_diagnosis(db, doctor_id=doctor_id, req=req, client_ip=client_ip)
    return APIResponse(success=True, message="Diagnosis established and recorded (Audit Logged)", data=diag)


@router.post("/prescriptions", response_model=APIResponse[PrescriptionDetailResponse], status_code=status.HTTP_201_CREATED)
def generate_prescription(
    req: PrescriptionCreateRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    """Doctor creates an electronic prescription with automated dosage intake schedules."""
    client_ip = get_client_ip(request)
    doctor_id = current_user.doctor_id or current_user.id
    rx = PrescriptionService.create_prescription(db, doctor_id=doctor_id, req=req, client_ip=client_ip)
    return APIResponse(success=True, message="E-Prescription generated with intake schedules", data=rx)


@router.post("/lab-orders", response_model=APIResponse[LabTestOrderResponse], status_code=status.HTTP_201_CREATED)
def order_lab_tests(
    req: OrderLabTestsRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    """Doctor orders diagnostic lab tests and imaging during consultation with audit logging."""
    client_ip = get_client_ip(request)
    doctor_id = current_user.doctor_id or current_user.id
    order_res = DoctorService.order_lab_tests(db, doctor_id=doctor_id, req=req, client_ip=client_ip)
    return APIResponse(success=True, message=f"{order_res['ordered_tests_count']} lab/imaging tests ordered successfully", data=order_res)


@router.post("/consultation/close", response_model=APIResponse)
def close_consultation(
    req: CloseConsultationRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    """
    Doctor completes the clinical encounter and closes consultation.
    CONSENT PROTOCOL: Automatically expires all active patient access consents for this visit.
    """
    client_ip = get_client_ip(request)
    doctor_id = current_user.doctor_id or current_user.id
    result = DoctorService.close_consultation(db, doctor_id=doctor_id, req=req, client_ip=client_ip)
    return APIResponse(success=True, message=result["message"], data=result)

