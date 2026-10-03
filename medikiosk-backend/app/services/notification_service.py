import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.models import (
    Notification,
    Patient,
    Visit,
    Diagnosis,
    MedicalHistory,
    User,
    Doctor,
    Hospital,
    NotificationChannelEnum,
    NotificationStatusEnum,
    AuditActionEnum,
)
from app.schemas.notification import (
    NotificationCreateRequest,
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
)
from app.services.audit_service import AuditService


class NotificationService:
    @staticmethod
    def send_notification(
        db: Session,
        title: str,
        message: str,
        template_code: str,
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
        recipient_destination: Optional[str] = None,
        patient_id: Optional[str] = None,
        user_id: Optional[str] = None,
        hospital_id: Optional[str] = None,
        payload_json: Optional[Dict[str, Any]] = None,
    ) -> Notification:
        """Persist and dispatch notification across specified channels (SMS, Email, In-App)."""
        if not hospital_id and patient_id:
            patient = db.query(Patient).filter(Patient.id == patient_id).first()
            latest_visit = max(patient.visits, key=lambda v: v.created_at or datetime.min.replace(tzinfo=timezone.utc)) if patient and patient.visits else None
            hospital_id = latest_visit.hospital_id if latest_visit else None
        if not hospital_id and user_id:
            doctor = db.query(Doctor).filter(Doctor.user_id == user_id).first()
            hospital_id = doctor.hospital_id if doctor else None
        if not hospital_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Hospital context is required for this notification")

        dest = recipient_destination or "IN_APP_DEVICE"
        now = datetime.now(timezone.utc)

        # External SMS/email providers are not configured here. Persist those
        # requests as queued instead of claiming a simulated delivery.
        gateway_meta = {}

        merged_payload = {**(payload_json or {}), **gateway_meta}

        notification = Notification(
            patient_id=patient_id,
            user_id=user_id,
            hospital_id=hospital_id,
            channel=channel,
            status=NotificationStatusEnum.DELIVERED if channel == NotificationChannelEnum.IN_APP else NotificationStatusEnum.QUEUED,
            template_code=template_code,
            title=title,
            message=message,
            recipient_destination=dest,
            payload_json=merged_payload,
            sent_at=now,
            delivered_at=now if channel == NotificationChannelEnum.IN_APP else None,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    # =========================================================================
    # 1. Patient Notification Triggers
    # =========================================================================

    @staticmethod
    def trigger_consent_request(
        db: Session,
        patient_id: str,
        doctor_name: str,
        purpose: str,
        consent_id: str,
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
    ) -> Notification:
        """Trigger patient alert when a physician requests digital record access."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        dest = patient.primary_phone if patient and channel == NotificationChannelEnum.SMS else (patient.email if patient and channel == NotificationChannelEnum.EMAIL else "PATIENT_PORTAL")

        title = f"🔒 Digital Record Access Request: {doctor_name}"
        message = f"Dr. {doctor_name} has requested authorized digital access to your longitudinal medical records for '{purpose}'. Please review and approve."

        return NotificationService.send_notification(
            db=db,
            patient_id=patient_id,
            title=title,
            message=message,
            template_code="PATIENT_CONSENT_REQUEST",
            channel=channel,
            recipient_destination=dest,
            payload_json={"consent_id": consent_id, "doctor_name": doctor_name, "purpose": purpose, "action_required": "APPROVE_REJECT"},
        )

    @staticmethod
    def trigger_prescription_ready(
        db: Session,
        patient_id: str,
        prescription_number: str,
        doctor_name: str,
        item_count: int,
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
    ) -> Notification:
        """Trigger patient notification when electronic prescription is signed and intake slots created."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        dest = patient.primary_phone if patient and channel == NotificationChannelEnum.SMS else "PATIENT_PORTAL"

        title = f"💊 E-Prescription Ready (#{prescription_number})"
        message = f"Dr. {doctor_name} has generated your electronic prescription with {item_count} medication(s). Daily intake schedules and reminders are now active."

        return NotificationService.send_notification(
            db=db,
            patient_id=patient_id,
            title=title,
            message=message,
            template_code="PATIENT_PRESCRIPTION_READY",
            channel=channel,
            recipient_destination=dest,
            payload_json={"prescription_number": prescription_number, "medicine_count": item_count},
        )

    @staticmethod
    def trigger_medicine_reminder(
        db: Session,
        patient_id: str,
        medicine_name: str,
        dosage_instruction: str,
        scheduled_time: str,
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
    ) -> Notification:
        """Trigger scheduled dose reminder for patient."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        dest = patient.primary_phone if patient and channel == NotificationChannelEnum.SMS else "PATIENT_PORTAL"

        title = f"⏰ Medicine Reminder: {medicine_name}"
        message = f"Time for your scheduled dose: Take {medicine_name} ({dosage_instruction}) at {scheduled_time}."

        return NotificationService.send_notification(
            db=db,
            patient_id=patient_id,
            title=title,
            message=message,
            template_code="PATIENT_MEDICINE_REMINDER",
            channel=channel,
            recipient_destination=dest,
            payload_json={"medicine_name": medicine_name, "dosage_instruction": dosage_instruction, "scheduled_time": scheduled_time},
        )

    @staticmethod
    def trigger_appointment_reminder(
        db: Session,
        patient_id: str,
        doctor_name: str,
        department_name: str,
        appointment_time: str,
        channel: NotificationChannelEnum = NotificationChannelEnum.SMS,
    ) -> Notification:
        """Trigger appointment / review schedule reminder."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        dest = patient.primary_phone if patient and channel == NotificationChannelEnum.SMS else "PATIENT_PORTAL"

        title = f"📅 Upcoming Consultation: Dr. {doctor_name}"
        message = f"Reminder: Your consultation with Dr. {doctor_name} ({department_name}) is scheduled for {appointment_time}. Please arrive 10 minutes prior for kiosk vitals."

        return NotificationService.send_notification(
            db=db,
            patient_id=patient_id,
            title=title,
            message=message,
            template_code="PATIENT_APPOINTMENT_REMINDER",
            channel=channel,
            recipient_destination=dest,
            payload_json={"doctor_name": doctor_name, "department": department_name, "time": appointment_time},
        )

    @staticmethod
    def trigger_report_uploaded(
        db: Session,
        patient_id: str,
        report_title: str,
        report_type: str,
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
    ) -> Notification:
        """Trigger alert when diagnostic report or radiology scan is processed."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        dest = patient.primary_phone if patient and channel == NotificationChannelEnum.SMS else "PATIENT_PORTAL"

        title = f"📄 Medical Report Processed: {report_title}"
        message = f"Your {report_type} ({report_title}) has been uploaded and analyzed by the Gemini OCR engine. Results are available on your timeline."

        return NotificationService.send_notification(
            db=db,
            patient_id=patient_id,
            title=title,
            message=message,
            template_code="PATIENT_REPORT_UPLOADED",
            channel=channel,
            recipient_destination=dest,
            payload_json={"report_title": report_title, "report_type": report_type},
        )

    # =========================================================================
    # 2. Doctor Notification Triggers
    # =========================================================================

    @staticmethod
    def trigger_new_queue_alert(
        db: Session,
        doctor_id: str,
        token_number: str,
        patient_name: str,
        triage_level: str,
        chief_complaint: str,
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
    ) -> Notification:
        """Trigger physician alert when high-acuity patient is triaged to queue."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        user_id = doctor.user_id if doctor else doctor_id

        is_urgent = triage_level in ["ESI_1_RESUSCITATION", "ESI_2_EMERGENT"]
        title = f"{'🚨 CRITICAL' if is_urgent else '🩺'} New Triage Patient: Token #{token_number}"
        message = f"Patient {patient_name} ({triage_level}) triaged for '{chief_complaint}'. Priority Token #{token_number} assigned to your room."

        return NotificationService.send_notification(
            db=db,
            user_id=user_id,
            hospital_id=doctor.hospital_id if doctor else None,
            title=title,
            message=message,
            template_code="DOCTOR_NEW_QUEUE",
            channel=channel,
            recipient_destination="DOCTOR_EHR_WORKSPACE",
            payload_json={"token_number": token_number, "patient_name": patient_name, "triage_level": triage_level, "is_urgent": is_urgent},
        )

    @staticmethod
    def trigger_consent_approved(
        db: Session,
        doctor_id: str,
        patient_name: str,
        hospital_mrn: str,
        consent_id: str,
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
    ) -> Notification:
        """Trigger physician notification when patient authorizes digital record access."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        user_id = doctor.user_id if doctor else doctor_id

        title = f"✅ Consent Granted: {patient_name} ({hospital_mrn})"
        message = f"Patient {patient_name} has authorized digital consent. You can now access full longitudinal medical records and diagnostic scans."

        return NotificationService.send_notification(
            db=db,
            user_id=user_id,
            hospital_id=doctor.hospital_id if doctor else None,
            title=title,
            message=message,
            template_code="DOCTOR_CONSENT_APPROVED",
            channel=channel,
            recipient_destination="DOCTOR_EHR_WORKSPACE",
            payload_json={"patient_name": patient_name, "hospital_mrn": hospital_mrn, "consent_id": consent_id},
        )

    @staticmethod
    def trigger_lab_results_ready(
        db: Session,
        doctor_id: str,
        patient_name: str,
        test_name: str,
        report_id: str,
        has_abnormal_flags: bool = False,
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
    ) -> Notification:
        """Trigger physician alert when ordered diagnostic investigations are finalized."""
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        user_id = doctor.user_id if doctor else doctor_id

        title = f"{'⚠️ ABNORMAL' if has_abnormal_flags else '🔬'} Lab Results Ready: {patient_name}"
        message = f"Diagnostic test results for '{test_name}' ({patient_name}) are ready for review with automated Gemini biomarker interpretations."

        return NotificationService.send_notification(
            db=db,
            user_id=user_id,
            hospital_id=doctor.hospital_id if doctor else None,
            title=title,
            message=message,
            template_code="DOCTOR_LAB_RESULTS_READY",
            channel=channel,
            recipient_destination="DOCTOR_EHR_WORKSPACE",
            payload_json={"patient_name": patient_name, "test_name": test_name, "report_id": report_id, "has_abnormal_flags": has_abnormal_flags},
        )

    # =========================================================================
    # 3. Government & Public Health Alert Triggers
    # =========================================================================

    @staticmethod
    def trigger_hospital_alert(
        db: Session,
        hospital_id: str,
        alert_title: str,
        severity: str,
        metrics_summary: str,
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
    ) -> Notification:
        """Trigger hospital operational capacity or triage surge alert for health admin."""
        hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        hosp_name = hosp.name if hosp else hospital_id

        title = f"🏥 [{severity}] Hospital Alert: {hosp_name}"
        message = f"{alert_title}: {metrics_summary}. Escalated for administrative resource balancing."

        return NotificationService.send_notification(
            db=db,
            hospital_id=hospital_id,
            title=title,
            message=message,
            template_code="GOVT_HOSPITAL_ALERT",
            channel=channel,
            recipient_destination="ADMIN_SURVEILLANCE_DASHBOARD",
            payload_json={"severity": severity, "hospital_name": hosp_name, "metrics": metrics_summary},
        )

    @staticmethod
    def trigger_disease_spike(
        db: Session,
        district_code: str,
        disease_syndrome: str,
        case_count: int,
        increase_percentage: float,
        channel: NotificationChannelEnum = NotificationChannelEnum.EMAIL,
    ) -> Notification:
        """Trigger epidemiological public health syndromic outbreak warning."""
        title = f"🚨 Epidemiological Outbreak Alert: {disease_syndrome} ({district_code})"
        message = f"Automated biosurveillance detected a +{increase_percentage:.1f}% cluster surge in {disease_syndrome} cases ({case_count} cases in 24h) across {district_code} district."

        return NotificationService.send_notification(
            db=db,
            title=title,
            message=message,
            template_code="GOVT_DISEASE_SPIKE",
            channel=channel,
            recipient_destination="public.health.directorate@karnataka.gov.in",
            payload_json={"district": district_code, "syndrome": disease_syndrome, "cases": case_count, "surge_pct": increase_percentage},
        )

    @staticmethod
    def trigger_system_alert(
        db: Session,
        alert_type: str,
        description: str,
        severity: str = "HIGH",
        channel: NotificationChannelEnum = NotificationChannelEnum.IN_APP,
    ) -> Notification:
        """Trigger system-wide EHR integrity / security tamper warning."""
        title = f"🛡️ System Security Alert: {alert_type}"
        message = f"Security monitor triggered: {description} (Severity: {severity}). Tamper verification logged."

        return NotificationService.send_notification(
            db=db,
            title=title,
            message=message,
            template_code="SYSTEM_ALERT",
            channel=channel,
            recipient_destination="SYSTEM_CONSOLE",
            payload_json={"alert_type": alert_type, "severity": severity},
        )

    # =========================================================================
    # 5. Inbox & Notification Queries
    # =========================================================================

    @staticmethod
    def get_notifications(
        db: Session,
        patient_id: Optional[str] = None,
        user_id: Optional[str] = None,
        role: Optional[str] = None,
        unread_only: bool = False,
        page: int = 1,
        size: int = 30,
    ) -> NotificationListResponse:
        """Fetch notifications filtered for current user context."""
        query = db.query(Notification)

        if patient_id:
            query = query.filter(Notification.patient_id == patient_id)
        elif user_id:
            query = query.filter(Notification.user_id == user_id)
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated recipient context is required")

        if unread_only:
            query = query.filter(Notification.status != NotificationStatusEnum.READ)

        total_count = query.count()
        unread_count = db.query(Notification).filter(
            (Notification.patient_id == patient_id) if patient_id else (Notification.user_id == user_id),
            Notification.status != NotificationStatusEnum.READ
        ).count()

        items = query.order_by(Notification.created_at.desc()).offset((page - 1) * size).limit(size).all()
        return NotificationListResponse(
            total_count=total_count,
            unread_count=unread_count,
            notifications=[NotificationResponse.model_validate(n) for n in items],
        )

    @staticmethod
    def get_unread_count(
        db: Session, patient_id: Optional[str] = None, user_id: Optional[str] = None
    ) -> UnreadCountResponse:
        """Get quick unread and urgent alert counts."""
        query = db.query(Notification).filter(Notification.status != NotificationStatusEnum.READ)
        if patient_id:
            query = query.filter(Notification.patient_id == patient_id)
        elif user_id:
            query = query.filter(Notification.user_id == user_id)
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated recipient context is required")

        all_unread = query.all()
        urgent_count = sum(1 for n in all_unread if "CRITICAL" in n.title or "EMERGENCY" in n.title or "ABNORMAL" in n.title or "SPIKE" in n.title)

        return UnreadCountResponse(unread_count=len(all_unread), urgent_count=urgent_count)

    @staticmethod
    def mark_as_read(db: Session, notification_id: str, patient_id: Optional[str] = None, user_id: Optional[str] = None) -> NotificationResponse:
        """Mark single notification as READ."""
        query = db.query(Notification).filter(Notification.id == notification_id)
        if patient_id:
            query = query.filter(Notification.patient_id == patient_id)
        elif user_id:
            query = query.filter(Notification.user_id == user_id)
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated recipient context is required")
        notif = query.first()
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

        notif.status = NotificationStatusEnum.READ
        notif.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notif)
        return NotificationResponse.model_validate(notif)

    @staticmethod
    def mark_all_read(db: Session, patient_id: Optional[str] = None, user_id: Optional[str] = None) -> int:
        """Mark all notifications as READ for user/patient."""
        query = db.query(Notification).filter(Notification.status != NotificationStatusEnum.READ)
        if patient_id:
            query = query.filter(Notification.patient_id == patient_id)
        elif user_id:
            query = query.filter(Notification.user_id == user_id)
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated recipient context is required")

        unreads = query.all()
        now = datetime.now(timezone.utc)
        for n in unreads:
            n.status = NotificationStatusEnum.READ
            n.read_at = now

        db.commit()
        return len(unreads)

    @staticmethod
    def trigger_emergency_sos(
        db: Session,
        patient_id: Optional[str] = None,
        location_coords: Optional[str] = None,
        location_name: Optional[str] = None,
        custom_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Persist an SOS alert using only this patient's recorded data."""
        if not patient_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Patient identity is required")
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
        visit = db.query(Visit).filter(Visit.patient_id == patient_id).order_by(Visit.created_at.desc()).first()
        if not visit:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A hospital visit is required to route an SOS alert")
        allergies = [h.condition_name for h in db.query(MedicalHistory).filter(MedicalHistory.patient_id == patient_id, MedicalHistory.is_active.is_(True), MedicalHistory.history_type == "ALLERGY").all()]
        diagnoses = [f"{d.diagnosis_name} ({d.icd10_code})" for d in db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).all()]
        patient_name = f"{patient.first_name} {patient.last_name}"
        details = [f"Patient: {patient_name}"]
        if patient.national_health_id: details.append(f"Health ID: {patient.national_health_id}")
        if patient.blood_group: details.append(f"Blood group: {patient.blood_group.value if hasattr(patient.blood_group, 'value') else patient.blood_group}")
        if allergies: details.append(f"Recorded allergies: {', '.join(allergies)}")
        if diagnoses: details.append(f"Recorded diagnoses: {', '.join(diagnoses)}")
        if location_name: details.append(f"Reported location: {location_name}")
        if location_coords: details.append(f"Reported coordinates: {location_coords}")
        if custom_notes: details.append(f"Patient notes: {custom_notes}")
        message = "Emergency SOS requested. " + "; ".join(details)
        now = datetime.now(timezone.utc)
        sos_id = "SOS-" + uuid.uuid4().hex[:8].upper()
        notification = Notification(
            patient_id=patient.id,
            hospital_id=visit.hospital_id,
            channel=NotificationChannelEnum.IN_APP,
            status=NotificationStatusEnum.DELIVERED,
            template_code="PATIENT_EMERGENCY_SOS",
            title=f"Emergency SOS: {patient_name}",
            message=message,
            recipient_destination="EMERGENCY_CRASH_TEAM",
            payload_json={"sos_id": sos_id, "allergies": allergies, "diagnoses": diagnoses, "location_name": location_name, "location_coords": location_coords},
            sent_at=now if channel == NotificationChannelEnum.IN_APP else None,
            delivered_at=now,
        )
        try:
            db.add(notification)
            db.commit()
            db.refresh(notification)
        except Exception:
            db.rollback()
            raise
        AuditService.log_event(
            db=db, action=AuditActionEnum.EMERGENCY_BYPASS, actor_role="PATIENT",
            actor_user_id=patient.id, actor_name=patient_name, target_table="patients",
            target_record_id=patient.id, client_ip="127.0.0.1",
            description="Patient emergency SOS alert persisted to the hospital notification inbox.",
        )
        return {
            "sos_id": sos_id,
            "status": "RECORDED",
            "timestamp": now.isoformat(),
            "patient_name": patient_name,
            "health_id": patient.national_health_id,
            "blood_group": patient.blood_group.value if hasattr(patient.blood_group, "value") else patient.blood_group,
            "known_allergies": allergies,
            "active_diagnoses": diagnoses,
            "location_coords": location_coords,
            "location_name": location_name,
            "emergency_contact": {"name": patient.emergency_contact_name, "phone": patient.emergency_contact_phone, "email": patient.email},
            "emergency_summary": message,
            "channels": {"in_app": "PERSISTED", "sms": "NOT_CONFIGURED", "voice_call": "NOT_CONFIGURED", "email": "NOT_CONFIGURED"},
        }
