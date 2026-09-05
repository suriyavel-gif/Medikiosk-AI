from datetime import datetime, timezone, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.models import (
    Doctor,
    QueueItem,
    Visit,
    Patient,
    Diagnosis,
    Consent,
    QueueStatusEnum,
    VisitStatusEnum,
    AuditActionEnum,
)
from app.schemas.doctor import (
    DoctorQueuePatientItem,
    AddDiagnosisRequest,
    DiagnosisResponse,
    CloseConsultationRequest,
)
from app.schemas.patient import PatientTimelineResponse
from app.services.consent_service import ConsentService
from app.services.patient_service import PatientService
from app.services.audit_service import AuditService


class DoctorService:
    @staticmethod
    def get_doctor_queue(db: Session, doctor_id: str) -> List[DoctorQueuePatientItem]:
        """Fetch today's active patient queue assigned to doctor, ordered by clinical urgency."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")

        queue_items = db.query(QueueItem).filter(
            QueueItem.hospital_id == doctor.hospital_id,
            (QueueItem.doctor_id == doctor_id) | (QueueItem.doctor_id.is_(None)),
            QueueItem.queue_status.in_([QueueStatusEnum.WAITING, QueueStatusEnum.CALLED, QueueStatusEnum.IN_ROOM]),
            func.date(QueueItem.created_at) == date.today(),
        ).order_by(QueueItem.priority_order_score.asc(), QueueItem.created_at.asc()).all()

        result = []
        for q in queue_items:
            p = q.visit.patient if q.visit else None
            v = q.visit
            if not p or not v:
                continue

            age = (date.today() - p.date_of_birth).days // 365 if p.date_of_birth else 0
            has_consent = ConsentService.check_active_consent(db, p.id, doctor_id)

            latest_vitals = None
            if v.vitals:
                vit = v.vitals[0]
                latest_vitals = {
                    "bp": f"{vit.systolic_bp}/{vit.diastolic_bp} mmHg",
                    "hr": f"{vit.heart_rate_bpm} bpm",
                    "spo2": f"{vit.oxygen_saturation_spo2}%",
                    "temp": f"{vit.body_temperature_celsius} °C",
                    "bmi": vit.calculated_bmi,
                }

            ai_soap = None
            if v.ai_soap_assessment or v.ai_soap_subjective:
                ai_soap = {
                    "subjective": v.ai_soap_subjective,
                    "objective": v.ai_soap_objective,
                    "assessment": v.ai_soap_assessment,
                    "plan": v.ai_soap_plan,
                }

            result.append(
                DoctorQueuePatientItem(
                    queue_id=q.id,
                    token_number=q.token_display_number,
                    visit_id=v.id,
                    visit_number=v.visit_number,
                    patient_id=p.id,
                    patient_name=f"{p.first_name} {p.last_name}",
                    patient_age=age,
                    patient_gender=p.gender.value,
                    hospital_mrn=p.hospital_mrn,
                    chief_complaint=v.chief_complaint_raw,
                    triage_level=v.triage_level,
                    triage_reasoning=v.triage_score_reasoning,
                    priority_order_score=q.priority_order_score,
                    queue_status=q.queue_status,
                    has_active_consent=has_consent,
                    kiosk_vitals=latest_vitals,
                    ai_soap_summary=ai_soap,
                    waiting_since=q.created_at,
                )
            )
        return result

    @staticmethod
    def view_patient_timeline_with_audit(
        db: Session, doctor_id: str, patient_id: str, client_ip: str = "127.0.0.1", user_agent: Optional[str] = None
    ) -> PatientTimelineResponse:
        """Doctor views full patient timeline. Automatically logs DOCTOR_VIEW_RECORD audit event."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

        # Compile timeline
        timeline = PatientService.get_patient_timeline(db, patient_id)

        # Automatic Audit Log Event Requirement
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.DOCTOR_VIEW_RECORD,
            target_table="patients",
            target_record_id=patient_id,
            actor_user_id=doctor.user_id,
            actor_role="DOCTOR",
            actor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            hospital_id=doctor.hospital_id,
            client_ip=client_ip,
            user_agent=user_agent,
            description=f"Doctor viewed patient longitudinal timeline and clinical records for Patient ID: {patient_id}",
        )

        return timeline

    @staticmethod
    def add_diagnosis(
        db: Session, doctor_id: str, req: AddDiagnosisRequest, client_ip: str = "127.0.0.1"
    ) -> DiagnosisResponse:
        """Add clinical diagnosis to patient encounter with automatic DOCTOR_UPDATE_RECORD audit log."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

        visit = db.query(Visit).filter(Visit.id == req.visit_id).first()
        if not visit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

        diagnosis = Diagnosis(
            visit_id=req.visit_id,
            patient_id=req.patient_id,
            doctor_id=doctor_id,
            diagnosis_type=req.diagnosis_type,
            icd10_code=req.icd10_code.strip(),
            snomed_ct_code=req.snomed_ct_code.strip() if req.snomed_ct_code else None,
            diagnosis_name=req.diagnosis_name.strip(),
            clinical_description=req.clinical_description,
            is_primary=req.is_primary,
            confidence_percentage=req.confidence_percentage,
        )
        db.add(diagnosis)
        db.commit()
        db.refresh(diagnosis)

        # Automatic Audit Log Event Requirement
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.DOCTOR_UPDATE_RECORD,
            target_table="diagnoses",
            target_record_id=diagnosis.id,
            actor_user_id=doctor.user_id,
            actor_role="DOCTOR",
            actor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            hospital_id=doctor.hospital_id,
            client_ip=client_ip,
            description=f"Doctor established diagnosis: {diagnosis.diagnosis_name} (ICD-10: {diagnosis.icd10_code}) for Visit #{visit.visit_number}",
        )

        return DiagnosisResponse.model_validate(diagnosis)

    @staticmethod
    def close_consultation(
        db: Session, doctor_id: str, req: CloseConsultationRequest, client_ip: str = "127.0.0.1"
    ) -> Dict[str, Any]:
        """Complete clinical consultation, update queue status, and auto-expire patient access consent."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

        visit = db.query(Visit).filter(Visit.id == req.visit_id).first()
        if not visit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

        # Update Visit
        visit.status = VisitStatusEnum.DISCHARGED
        visit.discharged_at = datetime.now(timezone.utc)
        if req.clinical_summary:
            visit.ai_soap_plan = (visit.ai_soap_plan or "") + f"\nPhysician Note: {req.clinical_summary}"

        # Update Queue
        if visit.queue_item:
            visit.queue_item.queue_status = QueueStatusEnum.COMPLETED
            visit.queue_item.completed_at = datetime.now(timezone.utc)

        db.commit()

        # Requirement: Auto-expire consent after consultation
        expired_count = ConsentService.auto_expire_visit_consents(db, visit.id, client_ip=client_ip)

        # Audit log
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.UPDATE,
            target_table="visits",
            target_record_id=visit.id,
            actor_user_id=doctor.user_id,
            actor_role="DOCTOR",
            actor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            hospital_id=doctor.hospital_id,
            client_ip=client_ip,
            description=f"Consultation completed and closed for Visit #{visit.visit_number}. Consents expired: {expired_count}",
        )

        return {
            "visit_id": visit.id,
            "visit_number": visit.visit_number,
            "status": visit.status.value,
            "consents_auto_expired": expired_count,
            "message": "Consultation successfully completed and encounter closed.",
        }

    @staticmethod
    def order_lab_tests(
        db: Session, doctor_id: str, req: Any, client_ip: str = "127.0.0.1"
    ) -> Dict[str, Any]:
        """Doctor orders diagnostic lab tests and imaging during consultation with audit logging."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

        visit = db.query(Visit).filter(Visit.id == req.visit_id).first()
        if not visit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

        import uuid
        from app.models.models import MedicalReport, ReportTypeEnum

        created_orders = []
        for t in req.lab_tests:
            rep_type_val = t.test_category if hasattr(ReportTypeEnum, str(t.test_category)) else ReportTypeEnum.LAB_BIOCHEMISTRY
            rep_obj = MedicalReport(
                visit_id=visit.id,
                patient_id=req.patient_id,
                uploaded_by_user_id=doctor.user_id,
                report_type=rep_type_val,
                title=t.test_name,
                file_storage_uri="internal://lab-orders/pending",
                file_mime_type="application/pdf",
                file_size_bytes=0,
                file_sha256_checksum="ORDER_PENDING_" + uuid.uuid4().hex[:16],
                ai_summary=f"Diagnostic test ordered by Dr. {doctor.first_name} {doctor.last_name}. Indication: {t.clinical_indication or 'Clinical Evaluation'}",
            )
            db.add(rep_obj)
            created_orders.append({
                "test_name": t.test_name,
                "test_category": str(rep_type_val),
                "is_urgent": t.is_urgent,
            })

        db.commit()

        # Audit Log for Lab Order
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.CREATE,
            target_table="medical_reports",
            target_record_id=visit.id,
            actor_user_id=doctor.user_id,
            actor_role="DOCTOR",
            actor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            hospital_id=doctor.hospital_id,
            client_ip=client_ip,
            description=f"Doctor ordered {len(req.lab_tests)} diagnostic lab/imaging tests for Visit #{visit.visit_number}",
        )

        # Trigger Patient Notification: Diagnostic Investigations Ordered
        from app.services.notification_service import NotificationService
        if created_orders:
            first_test = created_orders[0]["test_name"]
            NotificationService.trigger_report_uploaded(
                db=db,
                patient_id=req.patient_id,
                report_title=f"{first_test} (+{len(created_orders)-1} more)" if len(created_orders) > 1 else first_test,
                report_type="DIAGNOSTIC_ORDER",
            )

        return {
            "order_id": str(uuid.uuid4()),
            "visit_id": visit.id,
            "patient_id": req.patient_id,
            "ordered_tests_count": len(created_orders),
            "ordered_tests": created_orders,
            "status": "ORDER_PLACED",
            "created_at": datetime.now(timezone.utc),
        }


