import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import (
    Consent,
    Patient,
    Doctor,
    ConsentStatusEnum,
    ConsentTypeEnum,
    AuditActionEnum,
)
from app.schemas.consent import (
    ConsentRequestCreate,
    ConsentActionRequest,
    ConsentDetailResponse,
)
from app.services.audit_service import AuditService


class ConsentService:
    @staticmethod
    def request_access(
        db: Session, doctor_id: str, req: ConsentRequestCreate, client_ip: str = "127.0.0.1"
    ) -> ConsentDetailResponse:
        """Doctor requests explicit patient consent to view historical medical records."""
        patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

        # Check if already active consent exists
        active_consent = db.query(Consent).filter(
            Consent.patient_id == req.patient_id,
            Consent.doctor_id == doctor_id,
            Consent.status == ConsentStatusEnum.GRANTED,
            Consent.expires_at > datetime.now(timezone.utc),
        ).first()

        if active_consent:
            return ConsentDetailResponse.model_validate(active_consent)

        expires_at = datetime.now(timezone.utc) + timedelta(hours=req.expiry_hours)
        dummy_sig = f"PENDING_SIG_REQ_DOC_{doctor_id[:8]}_{datetime.now(timezone.utc).timestamp()}"

        consent = Consent(
            patient_id=req.patient_id,
            doctor_id=doctor_id,
            visit_id=req.visit_id,
            consent_type=req.consent_type,
            status=ConsentStatusEnum.PENDING,
            consent_version="v1.0",
            granted_language=patient.preferred_language,
            digital_signature_blob=dummy_sig,
            ip_address=client_ip,
            expires_at=expires_at,
        )
        db.add(consent)
        db.commit()
        db.refresh(consent)

        AuditService.log_event(
            db=db,
            action=AuditActionEnum.READ,
            target_table="consents",
            target_record_id=consent.id,
            actor_user_id=doctor_id,
            actor_role="DOCTOR",
            actor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            client_ip=client_ip,
            description=f"Doctor requested patient record access consent for Patient {patient.hospital_mrn}",
        )

        # Trigger Patient Consent Request Notification
        from app.services.notification_service import NotificationService
        NotificationService.trigger_consent_request(
            db=db,
            patient_id=req.patient_id,
            doctor_name=f"{doctor.first_name} {doctor.last_name}",
            purpose="Clinical Examination & EHR Review",
            consent_id=consent.id,
        )

        return ConsentDetailResponse(
            id=consent.id,
            patient_id=consent.patient_id,
            doctor_id=consent.doctor_id,
            doctor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            visit_id=consent.visit_id,
            consent_type=consent.consent_type,
            status=consent.status,
            consent_version=consent.consent_version,
            granted_language=consent.granted_language,
            digital_signature_blob=consent.digital_signature_blob,
            expires_at=consent.expires_at,
            revoked_at=consent.revoked_at,
            created_at=consent.created_at,
        )

    @staticmethod
    def process_consent_action(
        db: Session, patient_id: str, req: ConsentActionRequest, client_ip: str = "127.0.0.1"
    ) -> ConsentDetailResponse:
        """Patient approves, rejects, or revokes consent."""
        consent = db.query(Consent).filter(
            Consent.id == req.consent_id,
            Consent.patient_id == patient_id,
        ).first()

        if not consent:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent request record not found")

        action_upper = req.action.upper()
        if action_upper == "APPROVE":
            consent.status = ConsentStatusEnum.GRANTED
            sig_payload = f"{patient_id}:{consent.doctor_id}:{consent.id}:{datetime.now(timezone.utc).isoformat()}"
            consent.digital_signature_blob = hashlib.sha256(sig_payload.encode()).hexdigest()
            audit_action = AuditActionEnum.CONSENT_GIVEN
            desc = "Patient approved clinical record access consent"

            # Trigger Doctor Consent Approved Notification
            patient = db.query(Patient).filter(Patient.id == patient_id).first()
            pat_name = f"{patient.first_name} {patient.last_name}" if patient else "Patient"
            mrn = patient.hospital_mrn if patient else "MRN"
            from app.services.notification_service import NotificationService
            NotificationService.trigger_consent_approved(
                db=db,
                doctor_id=consent.doctor_id,
                patient_name=pat_name,
                hospital_mrn=mrn,
                consent_id=consent.id,
            )
        elif action_upper == "REJECT":
            consent.status = ConsentStatusEnum.REJECTED
            audit_action = AuditActionEnum.CONSENT_REJECTED
            desc = f"Patient rejected record access consent: {req.rejection_reason or 'No reason provided'}"
        elif action_upper == "REVOKE":
            consent.status = ConsentStatusEnum.REVOKED
            consent.revoked_at = datetime.now(timezone.utc)
            audit_action = AuditActionEnum.CONSENT_REVOKED
            desc = "Patient revoked active clinical record access consent"
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported action: {req.action}")

        db.commit()
        db.refresh(consent)

        AuditService.log_event(
            db=db,
            action=audit_action,
            target_table="consents",
            target_record_id=consent.id,
            actor_user_id=patient_id,
            actor_role="PATIENT",
            client_ip=client_ip,
            description=desc,
        )

        return ConsentDetailResponse.model_validate(consent)


    @staticmethod
    def check_active_consent(db: Session, patient_id: str, doctor_id: str) -> bool:
        """Verify if doctor holds active, unexpired consent for patient."""
        now = datetime.now(timezone.utc)
        active = db.query(Consent).filter(
            Consent.patient_id == patient_id,
            Consent.doctor_id == doctor_id,
            Consent.status == ConsentStatusEnum.GRANTED,
            Consent.expires_at > now,
            Consent.revoked_at.is_(None),
        ).first()
        return active is not None

    @staticmethod
    def auto_expire_visit_consents(db: Session, visit_id: str, client_ip: str = "127.0.0.1") -> int:
        """Automatically expire/close active consents linked to a visit upon consultation completion."""
        from app.models.models import Visit
        now = datetime.now(timezone.utc)
        visit = db.query(Visit).filter(Visit.id == visit_id).first()

        if visit and visit.doctor_id:
            consents = db.query(Consent).filter(
                Consent.status == ConsentStatusEnum.GRANTED,
                (Consent.visit_id == visit_id) | (
                    (Consent.patient_id == visit.patient_id) & (Consent.doctor_id == visit.doctor_id)
                ),
            ).all()
        else:
            consents = db.query(Consent).filter(
                Consent.visit_id == visit_id,
                Consent.status == ConsentStatusEnum.GRANTED,
            ).all()

        for c in consents:
            c.status = ConsentStatusEnum.EXPIRED
            c.expires_at = now
            AuditService.log_event(
                db=db,
                action=AuditActionEnum.UPDATE,
                target_table="consents",
                target_record_id=c.id,
                actor_role="SYSTEM",
                client_ip=client_ip,
                description=f"Consent auto-expired following consultation closure for Visit #{visit_id}",
            )

        db.commit()
        return len(consents)

