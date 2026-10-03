from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import (
    Patient,
    Visit,
    Diagnosis,
    Prescription,
    MedicalReport,
    Consent,
    Notification,
    AuditLog,
    MedicalHistory,
    AuditActionEnum,
)
from app.schemas.patient import (
    PatientProfileResponse,
    PatientProfileUpdateRequest,
    PatientTimelineResponse,
    TimelineEventSchema,
    AIIntakeHistoryItem,
    MedicalHistoryCreateRequest,
    MedicalHistoryItemSchema,
)
from app.schemas.prescription import PrescriptionDetailResponse, PrescriptionItemResponse, MedicineScheduleSlotResponse
from app.schemas.consent import ConsentDetailResponse
from app.schemas.audit import AuditLogResponse
from app.services.audit_service import AuditService


class PatientService:
    @staticmethod
    def get_medical_history(db: Session, patient_id: str) -> List[MedicalHistoryItemSchema]:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")
        rows = db.query(MedicalHistory).filter(MedicalHistory.patient_id == patient_id).order_by(MedicalHistory.created_at.desc()).all()
        return [MedicalHistoryItemSchema.model_validate(row) for row in rows]

    @staticmethod
    def get_profile(db: Session, patient_id: str) -> PatientProfileResponse:
        """Fetch patient profile details."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")
        return PatientProfileResponse.model_validate(patient)

    @staticmethod
    def update_profile(
        db: Session, patient_id: str, req: PatientProfileUpdateRequest, client_ip: str = "127.0.0.1"
    ) -> PatientProfileResponse:
        """Update patient profile fields."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

        update_data = req.model_dump(exclude_unset=True)
        prev_state = {k: getattr(patient, k) for k in update_data.keys() if hasattr(patient, k)}

        for key, value in update_data.items():
            if value is not None:
                setattr(patient, key, value)

        db.commit()
        db.refresh(patient)

        AuditService.log_event(
            db=db,
            action=AuditActionEnum.UPDATE,
            target_table="patients",
            target_record_id=patient.id,
            actor_user_id=patient.id,
            actor_role="PATIENT",
            actor_name=f"{patient.first_name} {patient.last_name}",
            client_ip=client_ip,
            description="Patient profile updated",
            previous_state=prev_state,
            new_state=update_data,
        )

        return PatientProfileResponse.model_validate(patient)

    @staticmethod
    def get_patient_timeline(db: Session, patient_id: str) -> PatientTimelineResponse:
        """Compile a chronologically ordered longitudinal clinical timeline."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

        events: List[TimelineEventSchema] = []

        # 1. Visits / Kiosk Intakes
        visits = db.query(Visit).filter(Visit.patient_id == patient_id).all()
        for v in visits:
            events.append(
                TimelineEventSchema(
                    event_type="VISIT",
                    event_id=v.id,
                    timestamp=v.admitted_at or v.created_at,
                    title=f"Encounter #{v.visit_number} ({v.visit_type})",
                    description=v.chief_complaint_raw or "Clinical encounter registered",
                    doctor_name=f"Dr. {v.doctor.first_name} {v.doctor.last_name}" if v.doctor else "Triage Desk",
                    hospital_name=v.hospital.name if v.hospital else "MediKiosk Hospital",
                    metadata={
                        "triage_level": v.triage_level.value if v.triage_level else None,
                        "status": v.status.value,
                        "ai_summary": v.ai_soap_assessment,
                    },
                )
            )

        # 2. Diagnoses
        diagnoses = db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).all()
        for d in diagnoses:
            events.append(
                TimelineEventSchema(
                    event_type="DIAGNOSIS",
                    event_id=d.id,
                    timestamp=d.created_at,
                    title=f"Diagnosis: {d.diagnosis_name} (ICD-10: {d.icd10_code})",
                    description=d.clinical_description or f"Type: {d.diagnosis_type}",
                    doctor_name=f"Dr. {d.doctor.first_name} {d.doctor.last_name}" if d.doctor else "Attending Physician",
                    hospital_name=d.visit.hospital.name if d.visit and d.visit.hospital else None,
                    metadata={"icd10": d.icd10_code, "snomed": d.snomed_ct_code, "is_primary": d.is_primary},
                )
            )

        # 3. Prescriptions
        prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).all()
        for p in prescriptions:
            med_count = len(p.items)
            events.append(
                TimelineEventSchema(
                    event_type="PRESCRIPTION",
                    event_id=p.id,
                    timestamp=p.created_at,
                    title=f"Prescription #{p.prescription_number} ({med_count} Medicines)",
                    description=p.clinical_notes or "E-Prescription issued",
                    doctor_name=f"Dr. {p.doctor.first_name} {p.doctor.last_name}" if p.doctor else "Attending Physician",
                    hospital_name=p.visit.hospital.name if p.visit and p.visit.hospital else None,
                    metadata={"medications_count": med_count, "is_dispensed": p.is_dispensed},
                )
            )

        # 4. Medical Reports
        reports = db.query(MedicalReport).filter(MedicalReport.patient_id == patient_id).all()
        for r in reports:
            events.append(
                TimelineEventSchema(
                    event_type="REPORT",
                    event_id=r.id,
                    timestamp=r.created_at,
                    title=f"Diagnostic Report: {r.title} ({r.report_type.value})",
                    description=r.ai_summary or "Medical report uploaded",
                    doctor_name=None,
                    hospital_name=r.visit.hospital.name if r.visit and r.visit.hospital else None,
                    metadata={"mime_type": r.file_mime_type, "ocr_available": r.ocr_result is not None},
                )
            )

                # 5. Emergency SOS Alerts
        emergency_notifs = db.query(Notification).filter(
            Notification.patient_id == patient_id,
            Notification.template_code == "EMERGENCY_SOS"
        ).all()
        for n in emergency_notifs:
            payload = n.payload_json or {}
            events.append(
                TimelineEventSchema(
                    event_type="EMERGENCY_SOS",
                    event_id=n.id,
                    timestamp=n.created_at,
                    title="🚨 Emergency SOS Alert Triggered",
                    description=n.message or "Patient triggered critical emergency response.",
                    doctor_name=payload.get("attending_doctor"),
                    hospital_name=payload.get("hospital_name"),
                    metadata={
                        "sms_status": payload.get("sms_status", "NOT_CONFIGURED"),
                        "call_status": payload.get("call_status", "NOT_CONFIGURED"),
                        "vitals": payload.get("vitals", {}),
                        "location": payload.get("location"),
                        "doctor_notified": payload.get("doctor_notified", False),
                        "reception_notified": payload.get("reception_notified", False),
                        "event_id": payload.get("event_id", n.id),
                    },
                )
            )

        # Sort descending by timestamp
        events.sort(key=lambda x: x.timestamp, reverse=True)

        return PatientTimelineResponse(
            patient_id=patient.id,
            patient_name=f"{patient.first_name} {patient.last_name}",
            hospital_mrn=patient.hospital_mrn,
            events_count=len(events),
            timeline=events,
        )

    @staticmethod
    def get_prescriptions(db: Session, patient_id: str) -> List[PrescriptionDetailResponse]:
        """Fetch all electronic prescriptions for a patient."""
        prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc()).all()
        result = []
        for p in prescriptions:
            items_resp = []
            for item in p.items:
                items_resp.append(
                    PrescriptionItemResponse(
                        id=item.id,
                        medicine_id=item.medicine_id,
                        medicine_name=item.medicine.brand_name if item.medicine else "Unknown",
                        generic_name=item.medicine.generic_name if item.medicine else "",
                        form=item.medicine.form.value if item.medicine else "TABLET",
                        strength=item.medicine.strength if item.medicine else "",
                        dosage_instruction=item.dosage_instruction,
                        frequency=item.frequency,
                        duration_days=item.duration_days,
                        total_quantity_prescribed=float(item.total_quantity_prescribed),
                        special_intake_conditions=item.special_intake_conditions,
                    )
                )

            schedules_resp = []
            for item in p.items:
                for sch in item.schedules:
                    schedules_resp.append(
                        MedicineScheduleSlotResponse(
                            id=sch.id,
                            medicine_name=item.medicine.brand_name if item.medicine else "Medicine",
                            dosage_amount=sch.dosage_amount,
                            scheduled_intake_timestamp=sch.scheduled_intake_timestamp,
                            is_taken=sch.is_taken,
                            actual_taken_timestamp=sch.actual_taken_timestamp,
                        )
                    )

            result.append(
                PrescriptionDetailResponse(
                    id=p.id,
                    prescription_number=p.prescription_number,
                    visit_id=p.visit_id,
                    patient_id=p.patient_id,
                    doctor_id=p.doctor_id,
                    doctor_name=f"Dr. {p.doctor.first_name} {p.doctor.last_name}" if p.doctor else "Doctor",
                    doctor_specialty=p.doctor.primary_specialty if p.doctor else "General Medicine",
                    clinical_notes=p.clinical_notes,
                    digital_signature_hash=p.digital_signature_hash,
                    items=items_resp,
                    intake_schedules=schedules_resp,
                    created_at=p.created_at,
                )
            )
        return result

    @staticmethod
    def get_ai_intake_history(db: Session, patient_id: str) -> List[AIIntakeHistoryItem]:
        """Fetch all AI intake sessions and triage evaluations for the patient."""
        visits = db.query(Visit).filter(Visit.patient_id == patient_id).order_by(Visit.created_at.desc()).all()
        return [
            AIIntakeHistoryItem(
                visit_id=v.id,
                visit_number=v.visit_number,
                timestamp=v.created_at,
                chief_complaint_raw=v.chief_complaint_raw,
                triage_level=v.triage_level,
                triage_score_reasoning=v.triage_score_reasoning,
                ai_soap_subjective=v.ai_soap_subjective,
                ai_soap_objective=v.ai_soap_objective,
                ai_soap_assessment=v.ai_soap_assessment,
                ai_soap_plan=v.ai_soap_plan,
                ai_confidence_score=float(v.ai_confidence_score) if v.ai_confidence_score else None,
            )
            for v in visits
        ]

    @staticmethod
    def get_consent_history(db: Session, patient_id: str) -> List[ConsentDetailResponse]:
        """Fetch consent history for patient."""
        consents = db.query(Consent).filter(Consent.patient_id == patient_id).order_by(Consent.created_at.desc()).all()
        result = []
        for c in consents:
            doc_name = None
            if c.doctor_id:
                doc = db.query(Patient).filter(Patient.id == c.doctor_id).first()  # or doctor
                if c.patient:
                    doc_name = f"Dr. Assigned ({c.doctor_id})"
            result.append(
                ConsentDetailResponse(
                    id=c.id,
                    patient_id=c.patient_id,
                    doctor_id=c.doctor_id,
                    doctor_name=doc_name,
                    visit_id=c.visit_id,
                    consent_type=c.consent_type,
                    status=c.status,
                    consent_version=c.consent_version,
                    granted_language=c.granted_language,
                    digital_signature_blob=c.digital_signature_blob,
                    expires_at=c.expires_at,
                    revoked_at=c.revoked_at,
                    created_at=c.created_at,
                )
            )
        return result

    @staticmethod
    def get_doctor_access_logs(db: Session, patient_id: str) -> List[AuditLogResponse]:
        """Fetch audit logs showing all physician views and record accesses."""
        logs = db.query(AuditLog).filter(
            AuditLog.target_record_id == patient_id,
            AuditLog.action.in_([
                AuditActionEnum.DOCTOR_VIEW_RECORD,
                AuditActionEnum.DOCTOR_UPDATE_RECORD,
                AuditActionEnum.DOCTOR_DOWNLOAD_REPORT,
            ])
        ).order_by(AuditLog.created_at.desc()).all()
        return [AuditLogResponse.model_validate(l) for l in logs]

    @staticmethod
    def add_medical_history(db: Session, patient_id: str, req: MedicalHistoryCreateRequest) -> MedicalHistoryItemSchema:
        """Add chronic medical history / allergy / surgical history."""
        hist = MedicalHistory(
            patient_id=patient_id,
            history_type=req.history_type,
            condition_name=req.condition_name,
            concept_snomed_code=req.concept_snomed_code,
            concept_icd10_code=req.concept_icd10_code,
            severity=req.severity,
            diagnosed_date=req.diagnosed_date,
            notes=req.notes,
        )
        db.add(hist)
        db.commit()
        db.refresh(hist)
        return MedicalHistoryItemSchema.model_validate(hist)
