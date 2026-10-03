from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.models import UserRoleEnum
from app.schemas.appointment import AppointmentBookingOptions, AppointmentCreateRequest, AppointmentResponse
from app.schemas.auth import CurrentUser
from app.schemas.common import APIResponse
from app.services.appointment_service import AppointmentService


router = APIRouter(prefix="/appointments", tags=["Patient Appointments"])


@router.get("/options", response_model=APIResponse[AppointmentBookingOptions])
def get_appointment_booking_options(
    _: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    options = AppointmentService.get_booking_options(db)
    return APIResponse(success=True, message="Appointment booking options retrieved", data=options)


@router.post("", response_model=APIResponse[AppointmentResponse], status_code=status.HTTP_201_CREATED)
def create_appointment(
    req: AppointmentCreateRequest,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    appointment = AppointmentService.create_appointment(db, patient_id=current_user.id, req=req)
    return APIResponse(success=True, message="Appointment booked successfully", data=appointment)
