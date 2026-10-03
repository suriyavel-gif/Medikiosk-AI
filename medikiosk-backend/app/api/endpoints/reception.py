from typing import List, Optional
from fastapi import APIRouter, Depends, Request, Query, status, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_any_role, get_client_ip
from app.models.models import UserRoleEnum, Doctor, Hospital, Department
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


@router.get("/options", response_model=APIResponse[dict])
def get_registration_options(
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.RECEPTIONIST, UserRoleEnum.HOSPITAL_ADMIN])),
    db: Session = Depends(get_db),
):
    hospitals_query = db.query(Hospital).filter(Hospital.is_active.is_(True))
    if current_user.hospital_id:
        hospitals_query = hospitals_query.filter(Hospital.id == current_user.hospital_id)
    hospitals = hospitals_query.order_by(Hospital.name).all()
    hospital_ids = [hospital.id for hospital in hospitals]
    departments = db.query(Department).filter(
        Department.hospital_id.in_(hospital_ids), Department.is_active.is_(True)
    ).order_by(Department.name).all() if hospital_ids else []
    return APIResponse(success=True, message="Reception options retrieved", data={
        "hospitals": [{"id": hospital.id, "name": hospital.name} for hospital in hospitals],
        "departments": [{"id": dept.id, "hospital_id": dept.hospital_id, "name": dept.name} for dept in departments],
    })


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
    if not current_user.hospital_id or current_user.hospital_id != req.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Visit is outside your assigned hospital")
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hospital selection is required")
    if not current_user.hospital_id or h_id != current_user.hospital_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Queue is outside your assigned hospital")

    queue_data = ReceptionService.get_todays_queue(db, hospital_id=h_id, department_id=department_id)
    return APIResponse(success=True, message="Today's queue retrieved", data=queue_data)


@router.post("/queue/{queue_id}/call", response_model=APIResponse[dict])
def call_queue_item(
    queue_id: str,
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.RECEPTIONIST, UserRoleEnum.HOSPITAL_ADMIN, UserRoleEnum.DOCTOR])),
    db: Session = Depends(get_db),
):
    doctor_id = current_user.doctor_id if current_user.role == UserRoleEnum.DOCTOR.value else None
    if current_user.role == UserRoleEnum.DOCTOR.value and not doctor_id:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        doctor_id = doctor.id if doctor else None
    if current_user.role == UserRoleEnum.DOCTOR.value and not doctor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Doctor profile is unavailable")
    hospital_id = current_user.hospital_id
    if not hospital_id and doctor_id:
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        hospital_id = doctor.hospital_id if doctor else None
    if not hospital_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hospital assignment is required")
    result = ReceptionService.call_queue_item(db, queue_id, hospital_id, doctor_id=doctor_id, actor_id=current_user.id)
    return APIResponse(success=True, message="Patient called into consultation", data=result)
