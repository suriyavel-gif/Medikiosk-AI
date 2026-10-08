from datetime import datetime, timezone, date
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from fastapi import HTTPException, status
from app.models.models import (
    Patient,
    Visit,
    QueueItem,
    Hospital,
    Department,
    Doctor,
    QueueStatusEnum,
    VisitStatusEnum,
    TriageLevelEnum,
    AuditActionEnum,
)
from app.schemas.reception import (
    RegisterVisitRequest,
    QueueTokenResponse,
    TodayQueueResponse,
    QueueItemDetail,
)
from app.schemas.patient import PatientProfileResponse
from app.services.audit_service import AuditService


class ReceptionService:
    @staticmethod
    def call_queue_item(db: Session, queue_id: str, hospital_id: str, doctor_id: Optional[str] = None, actor_id: Optional[str] = None) -> dict:
        item = db.query(QueueItem).filter(QueueItem.id == queue_id, QueueItem.hospital_id == hospital_id).first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue item not found")
        if item.queue_status != QueueStatusEnum.WAITING:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Queue item is no longer waiting")
        if doctor_id:
            doctor = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.is_active.is_(True)).first()
            if not doctor or doctor.hospital_id != item.hospital_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Queue item is outside your doctor profile")
            if item.doctor_id and item.doctor_id != doctor_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Queue item is assigned to another doctor")
            item.doctor_id = doctor_id
            item.visit.doctor_id = doctor_id
        now = datetime.now(timezone.utc)
        item.queue_status = QueueStatusEnum.IN_ROOM
        item.called_at = now
        item.room_entered_at = now
        item.visit.status = VisitStatusEnum.DOCTOR_REVIEW
        try:
            db.commit()
            db.refresh(item)
        except Exception:
            db.rollback()
            raise
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.UPDATE,
            target_table="queue",
            target_record_id=item.id,
            actor_user_id=actor_id,
            actor_role="DOCTOR" if doctor_id else "RECEPTIONIST",
            hospital_id=hospital_id,
            description=f"Queue token {item.token_display_number} called into consultation",
        )
        return {"queue_id": item.id, "visit_id": item.visit_id, "token_number": item.token_display_number, "queue_status": item.queue_status.value, "called_at": item.called_at}

    @staticmethod
    def search_patient(db: Session, query_str: str) -> List[PatientProfileResponse]:
        """Search patient by phone number, MRN, National ID, or full name."""
        q = query_str.strip()
        patients = db.query(Patient).filter(
            or_(
                Patient.primary_phone.ilike(f"%{q}%"),
                Patient.hospital_mrn.ilike(f"%{q}%"),
                Patient.national_health_id.ilike(f"%{q}%"),
                Patient.first_name.ilike(f"%{q}%"),
                Patient.last_name.ilike(f"%{q}%"),
            )
        ).limit(20).all()
        return [PatientProfileResponse.model_validate(p) for p in patients]

    @staticmethod
    def register_todays_visit(
        db: Session, req: RegisterVisitRequest, actor_id: Optional[str] = None, client_ip: str = "127.0.0.1"
    ) -> QueueTokenResponse:
        """Register patient visit at reception and issue automated queue token."""
        patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

        hospital = db.query(Hospital).filter(Hospital.id == req.hospital_id).first()
        if not hospital:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")

        dept = db.query(Department).filter(Department.id == req.department_id).first()
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        if dept.hospital_id != hospital.id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Department is outside the selected hospital")
        doctor = None
        if req.doctor_id:
            doctor = db.query(Doctor).filter(Doctor.id == req.doctor_id, Doctor.is_active.is_(True)).first()
            if not doctor or doctor.hospital_id != hospital.id or not any(link.department_id == dept.id for link in doctor.departments):
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Doctor is not assigned to the selected hospital and department")

        # Generate unique visit number
        daily_count = db.query(Visit).filter(
            Visit.hospital_id == req.hospital_id,
            func.date(Visit.created_at) == date.today()
        ).count() + 1
        visit_number = f"VIS-{date.today().strftime('%Y%m%d')}-{daily_count:04d}"

        # Create Visit
        visit = Visit(
            visit_number=visit_number,
            hospital_id=req.hospital_id,
            department_id=req.department_id,
            patient_id=req.patient_id,
            doctor_id=req.doctor_id,
            kiosk_id=req.kiosk_id,
            visit_type=req.visit_type,
            status=VisitStatusEnum.IN_QUEUE,
            triage_level=TriageLevelEnum.ESI_4_LESS_URGENT,
            chief_complaint_raw=req.chief_complaint,
            admitted_at=datetime.now(timezone.utc),
        )
        db.add(visit)
        db.flush()

        # Generate Queue Token
        token_prefix = dept.code[:2].upper() if dept.code else "OP"
        dept_queue_count = db.query(QueueItem).filter(
            QueueItem.hospital_id == req.hospital_id,
            QueueItem.department_id == req.department_id,
            func.date(QueueItem.created_at) == date.today()
        ).count() + 1
        token_display_number = f"{token_prefix}-{dept_queue_count:03d}"

        # Base priority score: ESI_4 = 400
        priority_score = 400

        queue_item = QueueItem(
            hospital_id=req.hospital_id,
            department_id=req.department_id,
            doctor_id=req.doctor_id,
            visit_id=visit.id,
            patient_id=req.patient_id,
            token_display_number=token_display_number,
            priority_order_score=priority_score,
            queue_status=QueueStatusEnum.WAITING,
        )
        db.add(queue_item)
        try:
            db.commit()
            db.refresh(visit)
            db.refresh(queue_item)
        except Exception:
            db.rollback()
            raise

        # Audit log
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.CREATE,
            target_table="visits",
            target_record_id=visit.id,
            actor_user_id=actor_id,
            actor_role="RECEPTIONIST",
            hospital_id=req.hospital_id,
            client_ip=client_ip,
            description=f"Visit #{visit_number} registered, Token {token_display_number} issued",
        )

        doc_name = f"Dr. {doctor.first_name} {doctor.last_name}" if doctor else None

        return QueueTokenResponse(
            queue_id=queue_item.id,
            token_display_number=token_display_number,
            visit_id=visit.id,
            visit_number=visit.visit_number,
            patient_id=patient.id,
            patient_name=f"{patient.first_name} {patient.last_name}",
            hospital_mrn=patient.hospital_mrn,
            department_name=dept.name,
            doctor_name=doc_name,
            triage_level=visit.triage_level,
            priority_order_score=priority_score,
            queue_status=QueueStatusEnum.WAITING,
            estimated_wait_minutes=max(10, dept_queue_count * 8),
            created_at=queue_item.created_at,
        )

    @staticmethod
    def assign_doctor(db: Session, visit_id: str, doctor_id: str, actor_id: Optional[str] = None) -> QueueTokenResponse:
        """Assign or reassign consulting doctor for a visit."""
        visit = db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

        visit.doctor_id = doctor_id
        if visit.queue_item:
            visit.queue_item.doctor_id = doctor_id

        db.commit()
        db.refresh(visit)

        dept_name = visit.department.name if visit.department else "General OPD"

        return QueueTokenResponse(
            queue_id=visit.queue_item.id if visit.queue_item else "N/A",
            token_display_number=visit.queue_item.token_display_number if visit.queue_item else "N/A",
            visit_id=visit.id,
            visit_number=visit.visit_number,
            patient_id=visit.patient.id,
            patient_name=f"{visit.patient.first_name} {visit.patient.last_name}",
            hospital_mrn=visit.patient.hospital_mrn,
            department_name=dept_name,
            doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            triage_level=visit.triage_level,
            priority_order_score=visit.queue_item.priority_order_score if visit.queue_item else 100,
            queue_status=visit.queue_item.queue_status if visit.queue_item else QueueStatusEnum.WAITING,
            estimated_wait_minutes=15,
            created_at=visit.created_at,
        )

    @staticmethod
    def get_todays_queue(
        db: Session, hospital_id: str, department_id: Optional[str] = None
    ) -> TodayQueueResponse:
        """Fetch real-time today's queue prioritizing urgent cases."""
        query = db.query(QueueItem).filter(
            QueueItem.hospital_id == hospital_id,
            func.date(QueueItem.created_at) == date.today()
        )
        if department_id:
            query = query.filter(QueueItem.department_id == department_id)

        items = query.order_by(QueueItem.priority_order_score.asc(), QueueItem.created_at.asc()).all()

        total_waiting = sum(1 for i in items if i.queue_status == QueueStatusEnum.WAITING)
        total_in_room = sum(1 for i in items if i.queue_status == QueueStatusEnum.IN_ROOM)
        total_completed = sum(1 for i in items if i.queue_status == QueueStatusEnum.COMPLETED)

        details = []
        for i in items:
            p = i.visit.patient if i.visit else None
            v = i.visit
            dept = i.visit.department if i.visit else None
            doc = i.visit.doctor if i.visit else None

            age = 0
            if p and p.date_of_birth:
                age = (date.today() - p.date_of_birth).days // 365

            details.append(
                QueueItemDetail(
                    queue_id=i.id,
                    token_number=i.token_display_number,
                    visit_id=v.id if v else "",
                    visit_number=v.visit_number if v else "",
                    patient_id=p.id if p else "",
                    patient_name=f"{p.first_name} {p.last_name}" if p else "Patient",
                    patient_age=age,
                    patient_gender=p.gender.value if p else "UNKNOWN",
                    department_name=dept.name if dept else "General OPD",
                    doctor_name=f"Dr. {doc.first_name} {doc.last_name}" if doc else None,
                    triage_level=v.triage_level if v else None,
                    priority_order_score=i.priority_order_score,
                    queue_status=i.queue_status,
                    called_at=i.called_at,
                    created_at=i.created_at,
                )
            )

        return TodayQueueResponse(
            hospital_id=hospital_id,
            department_id=department_id,
            total_waiting=total_waiting,
            total_in_room=total_in_room,
            total_completed=total_completed,
            queue=details,
        )
