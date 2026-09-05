from datetime import datetime, timezone, date
from typing import Dict, Any
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.dependencies import get_client_ip
from app.models.models import (
    Visit,
    VitalsRecord,
    QueueItem,
    Patient,
    Department,
    Hospital,
    QueueStatusEnum,
    VisitStatusEnum,
    TriageLevelEnum,
    AuditActionEnum,
)
from app.schemas.kiosk import (
    KioskIntakeSessionRequest,
    KioskTriageResultResponse,
    KioskVitalsPayload,
)
from app.schemas.common import APIResponse
from app.services.ai_service import AIService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/kiosk", tags=["Kiosk Hardware Intake & AI Triage"])


@router.post("/intake/evaluate", response_model=APIResponse[KioskTriageResultResponse], status_code=status.HTTP_201_CREATED)
def evaluate_kiosk_intake(
    req: KioskIntakeSessionRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Autonomous Kiosk Intake Gateway:
    Ingests IoT vital signs & multilingual patient chief complaints ->
    Evaluates algorithmic ESI triage urgency via Gemini & medical rules ->
    Generates structured FHIR-compliant SOAP note ->
    Issues prioritized queue token or engages Emergency Bypass protocol.
    """
    client_ip = get_client_ip(request)

    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    hospital = db.query(Hospital).filter(
        (Hospital.id == req.hospital_id) | (Hospital.code == req.hospital_id)
    ).first()
    if not hospital:
        hospital = db.query(Hospital).first()

    actual_hospital_id = hospital.id if hospital else req.hospital_id


    # Step 1: AI / Rule-based Triage & SOAP Generation
    vitals_dict = req.vitals.model_dump()
    age = (date.today() - patient.date_of_birth).days // 365 if patient.date_of_birth else 35

    triage_level, reasoning, soap, confidence, is_emergency = AIService.evaluate_triage_and_soap(
        chief_complaint=req.chief_complaint_raw,
        vitals=vitals_dict,
        spoken_language=req.spoken_language,
        patient_age=age,
        patient_gender=patient.gender.value,
    )

    # Step 2: Auto-assign Department based on symptoms or request
    dept_id = req.department_id
    if not dept_id:
        if triage_level in [TriageLevelEnum.ESI_1_RESUSCITATION, TriageLevelEnum.ESI_2_EMERGENT]:
            dept = db.query(Department).filter(
                Department.hospital_id == actual_hospital_id,
                Department.is_emergency_dept == True
            ).first()
        else:
            dept = db.query(Department).filter(
                Department.hospital_id == actual_hospital_id,
                Department.specialty_type.ilike("%General%")
            ).first()
        if not dept:
            dept = db.query(Department).filter(Department.hospital_id == actual_hospital_id).first()
        dept_id = dept.id if dept else "DEPT-DEFAULT"
        dept_name = dept.name if dept else "Emergency / General Medicine"
    else:
        dept = db.query(Department).filter(Department.id == dept_id).first()
        dept_name = dept.name if dept else "General Medicine"

    # Step 3: Create Encounter / Visit
    daily_count = db.query(Visit).filter(
        Visit.hospital_id == actual_hospital_id,
        func.date(Visit.created_at) == date.today()
    ).count() + 1
    visit_number = f"ENC-{date.today().strftime('%Y%m%d')}-{daily_count:04d}"

    visit = Visit(
        visit_number=visit_number,
        hospital_id=actual_hospital_id,
        department_id=dept_id,
        patient_id=req.patient_id,
        kiosk_id=req.kiosk_device_id,
        visit_type="EMERGENCY_TRIAGE" if is_emergency else "OPD_KIOSK_INTAKE",
        status=VisitStatusEnum.EMERGENCY_ESCALATED if is_emergency else VisitStatusEnum.IN_QUEUE,
        triage_level=triage_level,
        triage_score_reasoning=reasoning,
        chief_complaint_raw=req.chief_complaint_raw,
        ai_soap_subjective=soap.get("subjective"),
        ai_soap_objective=soap.get("objective"),
        ai_soap_assessment=soap.get("assessment"),
        ai_soap_plan=soap.get("plan"),
        ai_confidence_score=confidence,
        admitted_at=datetime.now(timezone.utc),
        triaged_at=datetime.now(timezone.utc),
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)

    # Step 4: Record Physical Vitals
    bmi = None
    if req.vitals.body_weight_kg and req.vitals.body_height_cm and req.vitals.body_height_cm > 0:
        h_m = req.vitals.body_height_cm / 100.0
        bmi = round(req.vitals.body_weight_kg / (h_m * h_m), 2)

    vitals_record = VitalsRecord(
        visit_id=visit.id,
        patient_id=patient.id,
        kiosk_id=req.kiosk_device_id,
        systolic_bp=req.vitals.systolic_bp,
        diastolic_bp=req.vitals.diastolic_bp,
        heart_rate_bpm=req.vitals.heart_rate_bpm,
        respiratory_rate_bpm=req.vitals.respiratory_rate_bpm,
        oxygen_saturation_spo2=req.vitals.oxygen_saturation_spo2,
        body_temperature_celsius=req.vitals.body_temperature_celsius,
        body_weight_kg=req.vitals.body_weight_kg,
        body_height_cm=req.vitals.body_height_cm,
        calculated_bmi=bmi,
        raw_sensor_waveforms=req.vitals.raw_sensor_waveforms or {},
        is_emergency_triggered=is_emergency,
    )
    db.add(vitals_record)
    db.commit()

    # Step 5: Issue Queue Token with Dynamic Priority Weight
    # ESI 1 = 100 (Highest), ESI 2 = 200, ESI 3 = 300, ESI 4 = 400, ESI 5 = 500
    esi_weight_map = {
        TriageLevelEnum.ESI_1_RESUSCITATION: 100,
        TriageLevelEnum.ESI_2_EMERGENT: 200,
        TriageLevelEnum.ESI_3_URGENT: 300,
        TriageLevelEnum.ESI_4_LESS_URGENT: 400,
        TriageLevelEnum.ESI_5_NON_URGENT: 500,
    }
    priority_score = esi_weight_map.get(triage_level, 400)

    token_prefix = "EM" if is_emergency else "K"
    token_display = f"{token_prefix}-{daily_count:03d}"

    queue_item = QueueItem(
        hospital_id=actual_hospital_id,
        department_id=dept_id,
        visit_id=visit.id,
        patient_id=patient.id,
        token_display_number=token_display,
        priority_order_score=priority_score,
        queue_status=QueueStatusEnum.EMERGENCY_BYPASS if is_emergency else QueueStatusEnum.WAITING,
    )
    db.add(queue_item)
    db.commit()
    db.refresh(queue_item)

    # Step 6: Audit Log Event
    action = AuditActionEnum.EMERGENCY_BYPASS if is_emergency else AuditActionEnum.CREATE
    AuditService.log_event(
        db=db,
        action=action,
        target_table="visits",
        target_record_id=visit.id,
        actor_role="KIOSK_AI",
        actor_name=f"MediKiosk [{req.kiosk_device_id}]",
        hospital_id=actual_hospital_id,
        client_ip=client_ip,
        description=f"Autonomous intake completed. Triage: {triage_level.value}. Token: {token_display}",
    )


    return APIResponse(
        success=True,
        message="Intake successfully evaluated and queued" if not is_emergency else "CRITICAL EMERGENCY DETECTED - CRASH TEAM ALERTED",
        data=KioskTriageResultResponse(
            visit_id=visit.id,
            visit_number=visit.visit_number,
            patient_id=patient.id,
            triage_level=triage_level,
            triage_score_reasoning=reasoning,
            is_emergency=is_emergency,
            ai_soap_note=soap,
            queue_token_number=token_display,
            assigned_department_id=dept_id,
            assigned_department_name=dept_name,
            estimated_wait_minutes=0 if is_emergency else 10,
        ),
    )
