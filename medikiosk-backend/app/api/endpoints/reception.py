from typing import List, Optional
from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_any_role, get_client_ip
from app.models.models import UserRoleEnum
from app.schemas.auth import CurrentUser
from app.schemas.reception import (
    RegisterVisitRequest,
    AssignDoctorRequest,
    QueueTokenResponse,
    TodayQueueResponse,
)
from app.schemas.patient import PatientProfileResponse
from app.schemas.common import APIResponse
from app.services.reception_service import ReceptionService

router = APIRouter(prefix="/reception", tags=["Reception & OPD Queue Management"])


@router.get("/patients/search", response_model=APIResponse[List[PatientProfileResponse]])
def search_patients(
    q: str = Query(..., min_length=2, description="Search by phone, MRN, National ID, or Name"),
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.RECEPTIONIST, UserRoleEnum.HOSPITAL_ADMIN, UserRoleEnum.DOCTOR])),
    db: Session = Depends(get_db),
):
    """Search registered patients by phone, MRN, National ID, or Name."""
    results = ReceptionService.search_patient(db, q)
    return APIResponse(success=True, message=f"Found {len(results)} matching patient(s)", data=results)


@router.post("/visits/register", response_model=APIResponse[QueueTokenResponse], status_code=status.HTTP_201_CREATED)
def register_visit(
    req: RegisterVisitRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.RECEPTIONIST, UserRoleEnum.HOSPITAL_ADMIN])),
    db: Session = Depends(get_db),
):
    """Register patient visit and generate an automated priority queue token."""
    client_ip = get_client_ip(request)
    token = ReceptionService.register_todays_visit(db, req, actor_id=current_user.id, client_ip=client_ip)
    return APIResponse(success=True, message="Visit registered and queue token generated", data=token)


@router.post("/visits/assign-doctor", response_model=APIResponse[QueueTokenResponse])
def assign_doctor(
    req: AssignDoctorRequest,
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.RECEPTIONIST, UserRoleEnum.HOSPITAL_ADMIN])),
    db: Session = Depends(get_db),
):
    """Assign or reassign consulting physician for a visit."""
    token = ReceptionService.assign_doctor(db, req.visit_id, req.doctor_id, actor_id=current_user.id)
    return APIResponse(success=True, message="Doctor assigned successfully", data=token)


@router.get("/queue/today", response_model=APIResponse[TodayQueueResponse])
def get_today_queue(
    hospital_id: Optional[str] = None,
    department_id: Optional[str] = None,
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.RECEPTIONIST, UserRoleEnum.HOSPITAL_ADMIN, UserRoleEnum.DOCTOR])),
    db: Session = Depends(get_db),
):
    """View real-time OPD queue status for today."""
    h_id = hospital_id or current_user.hospital_id
    if not h_id:
        # Fallback to first hospital if user not assigned
        from app.models.models import Hospital
        h = db.query(Hospital).first()
        h_id = h.id if h else "HOSP-001"

    queue_data = ReceptionService.get_todays_queue(db, hospital_id=h_id, department_id=department_id)
    return APIResponse(success=True, message="Today's queue retrieved", data=queue_data)
