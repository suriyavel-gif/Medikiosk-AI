from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, get_client_ip
from app.models.models import UserRoleEnum, MedicineIntakeSchedule
from app.schemas.auth import CurrentUser
from app.schemas.prescription import (
    PrescriptionCreateRequest,
    PrescriptionDetailResponse,
    MedicineCreateRequest,
    MedicineResponse,
)
from app.schemas.common import APIResponse
from app.services.prescription_service import PrescriptionService

router = APIRouter(prefix="/prescriptions", tags=["Pharmacy & E-Prescriptions"])


@router.post("", response_model=APIResponse[PrescriptionDetailResponse], status_code=status.HTTP_201_CREATED)
def create_prescription(
    req: PrescriptionCreateRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.DOCTOR)),
    db: Session = Depends(get_db),
):
    """Doctor creates an electronic prescription with dosage instructions and automated timing schedules."""
    client_ip = get_client_ip(request)
    doctor_id = current_user.doctor_id or current_user.id
    rx = PrescriptionService.create_prescription(db, doctor_id=doctor_id, req=req, client_ip=client_ip)
    return APIResponse(success=True, message="Prescription created successfully", data=rx)


@router.get("/{prescription_id}", response_model=APIResponse[PrescriptionDetailResponse])
def get_prescription(
    prescription_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full prescription details, medication items, and patient intake schedules."""
    rx = PrescriptionService.get_prescription_by_id(db, prescription_id)
    return APIResponse(success=True, message="Prescription retrieved", data=rx)


@router.get("/medicines/search", response_model=APIResponse[List[MedicineResponse]])
def search_medicines(
    q: str = Query(..., min_length=1, description="Search by brand or generic drug name"),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search master formulary drug database."""
    results = PrescriptionService.search_medicines(db, q)
    return APIResponse(success=True, message=f"Found {len(results)} medicine(s)", data=results)


@router.post("/medicines", response_model=APIResponse[MedicineResponse], status_code=status.HTTP_201_CREATED)
def add_medicine_to_master(
    req: MedicineCreateRequest,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.HOSPITAL_ADMIN)),
    db: Session = Depends(get_db),
):
    """Add a new drug to the hospital master medicine formulary."""
    med = PrescriptionService.create_medicine(db, req)
    return APIResponse(success=True, message="Medicine added to formulary", data=med)


@router.put("/schedules/{schedule_id}/adherence", response_model=APIResponse)
def log_medicine_adherence(
    schedule_id: str,
    is_taken: bool = True,
    notes: Optional[str] = None,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Patient logs adherence: marks scheduled dosage slot as taken."""
    sch = db.query(MedicineIntakeSchedule).filter(
        MedicineIntakeSchedule.id == schedule_id,
        MedicineIntakeSchedule.patient_id == current_user.id,
    ).first()

    if not sch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intake schedule slot not found")

    sch.is_taken = is_taken
    sch.actual_taken_timestamp = datetime.now(timezone.utc) if is_taken else None
    if notes:
        sch.patient_adherence_notes = notes

    db.commit()
    return APIResponse(success=True, message="Medication intake logged successfully", data={"is_taken": is_taken})
