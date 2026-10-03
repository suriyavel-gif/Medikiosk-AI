import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import (
    Appointment,
    AppointmentStatusEnum,
    Department,
    Doctor,
    DoctorDepartment,
    Hospital,
)
from app.schemas.appointment import (
    AppointmentBookingOptions,
    AppointmentCreateRequest,
    AppointmentDepartmentOption,
    AppointmentDoctorOption,
    AppointmentHospitalOption,
    AppointmentResponse,
)


APPOINTMENT_DURATION = timedelta(minutes=30)


class AppointmentService:
    @staticmethod
    def get_booking_options(db: Session) -> AppointmentBookingOptions:
        hospitals = (
            db.query(Hospital)
            .filter(Hospital.is_active.is_(True))
            .order_by(Hospital.name)
            .all()
        )
        departments = (
            db.query(Department)
            .join(Hospital, Department.hospital_id == Hospital.id)
            .filter(Department.is_active.is_(True), Hospital.is_active.is_(True))
            .order_by(Hospital.name, Department.name)
            .all()
        )
        doctor_assignments = (
            db.query(Doctor, DoctorDepartment.department_id)
            .join(DoctorDepartment, Doctor.id == DoctorDepartment.doctor_id)
            .join(Department, Department.id == DoctorDepartment.department_id)
            .join(Hospital, Hospital.id == Doctor.hospital_id)
            .filter(
                Doctor.is_active.is_(True),
                Doctor.is_available.is_(True),
                Department.is_active.is_(True),
                Hospital.is_active.is_(True),
                Department.hospital_id == Doctor.hospital_id,
            )
            .order_by(Doctor.last_name, Doctor.first_name)
            .all()
        )
        bookable_department_ids = {department_id for _, department_id in doctor_assignments}
        departments = [d for d in departments if d.id in bookable_department_ids]
        bookable_hospital_ids = {d.hospital_id for d in departments}
        hospitals = [h for h in hospitals if h.id in bookable_hospital_ids]

        return AppointmentBookingOptions(
            hospitals=[AppointmentHospitalOption(id=h.id, name=h.name) for h in hospitals],
            departments=[
                AppointmentDepartmentOption(
                    id=d.id,
                    hospital_id=d.hospital_id,
                    name=d.name,
                    specialty_type=d.specialty_type,
                )
                for d in departments
            ],
            doctors=[
                AppointmentDoctorOption(
                    id=doctor.id,
                    hospital_id=doctor.hospital_id,
                    department_id=department_id,
                    name=f"Dr. {doctor.first_name} {doctor.last_name}",
                    specialty=doctor.primary_specialty,
                )
                for doctor, department_id in doctor_assignments
            ],
        )

    @staticmethod
    def create_appointment(
        db: Session, patient_id: str, req: AppointmentCreateRequest
    ) -> AppointmentResponse:
        now = datetime.now(timezone.utc)
        start_time = req.scheduled_start_time.astimezone(timezone.utc)
        if start_time <= now:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Appointment time must be in the future",
            )

        hospital = (
            db.query(Hospital)
            .filter(Hospital.id == req.hospital_id, Hospital.is_active.is_(True))
            .first()
        )
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found or inactive")

        department = (
            db.query(Department)
            .filter(
                Department.id == req.department_id,
                Department.hospital_id == hospital.id,
                Department.is_active.is_(True),
            )
            .first()
        )
        if not department:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Department is not active at the selected hospital",
            )

        doctor = (
            db.query(Doctor)
            .join(DoctorDepartment, DoctorDepartment.doctor_id == Doctor.id)
            .filter(
                Doctor.id == req.doctor_id,
                Doctor.hospital_id == hospital.id,
                DoctorDepartment.department_id == department.id,
                Doctor.is_active.is_(True),
                Doctor.is_available.is_(True),
            )
            .first()
        )
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Doctor is not active, available, and assigned to the selected department and hospital",
            )

        end_time = start_time + APPOINTMENT_DURATION
        active_statuses = [
            AppointmentStatusEnum.SCHEDULED,
            AppointmentStatusEnum.CONFIRMED,
            AppointmentStatusEnum.CHECKED_IN,
            AppointmentStatusEnum.IN_CONSULTATION,
        ]
        overlapping = (
            db.query(Appointment.id)
            .filter(
                Appointment.doctor_id == doctor.id,
                Appointment.status.in_(active_statuses),
                Appointment.scheduled_start_time < end_time,
                Appointment.scheduled_end_time > start_time,
            )
            .first()
        )
        if overlapping:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The selected doctor already has an appointment during this time",
            )

        appointment = Appointment(
            hospital_id=hospital.id,
            department_id=department.id,
            doctor_id=doctor.id,
            patient_id=patient_id,
            appointment_number=f"APT-{uuid.uuid4().hex[:12].upper()}",
            scheduled_start_time=start_time,
            scheduled_end_time=end_time,
            status=AppointmentStatusEnum.SCHEDULED,
            chief_complaint_summary=req.chief_complaint_summary,
        )
        db.add(appointment)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        db.refresh(appointment)
        return AppointmentResponse.model_validate(appointment)
