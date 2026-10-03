from typing import Any, Dict, List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_user_optional, require_role, require_any_role
from app.schemas.auth import CurrentUser
from app.models.models import (
    UserRoleEnum,
    AuditActionEnum,
    Patient,
    Visit,
    Diagnosis,
    Prescription,
    MedicalReport,
    MedicalHistory,
    MedicineIntakeSchedule,
    VitalsRecord,
    Doctor,
)

from app.schemas.common import APIResponse
from app.schemas.ai import (
    MedicalReportExplainRequest,
    MedicalReportExplainResponse,
    ParameterCard,
    AIMedicationChatRequest,
    AIMedicationChatResponse,
    SaveIntakeReportRequest,
    SaveIntakeReportResponse,
    IntakeReportItem,
    AIAppointmentRouteRequest,
    AIAppointmentRouteResponse,
    AICaseSummaryRequest,
    AICaseSummaryResponse,
    IntakeChatRequest,
    IntakeChatResponse,
    IntakeSynthesizeRequest,
    IntakeSynthesizeResponse,
    OCRAnalysisRequest,
    OCRAnalysisResponse,
    DoctorCopilotSummarizeRequest,
    DoctorCopilotSummaryResponse,
    PatientAssistantChatRequest,
    PatientAssistantChatResponse,
    PrescriptionExplainRequest,
    PrescriptionExplainResponse,
    DrugInteractionCheckRequest,
    DrugInteractionCheckResponse,
)
from app.services.ai_service import AIService
from app.services.audit_service import AuditService
from app.services.intake_report_service import IntakeReportService
from app.services.consent_service import ConsentService

router = APIRouter()


# -----------------------------------------------------------------------------
# 1. AI CLINICAL INTAKE (Chat & Synthesize)
# -----------------------------------------------------------------------------
@router.post("/intake/chat", response_model=APIResponse[IntakeChatResponse])
def chat_clinical_intake(
    req: IntakeChatRequest,
    current_user: Any = Depends(get_current_user_optional),
):
    """
    Interactive conversational symptom elicitation for patient at Kiosk.
    Gemini asks adaptive clinical questions to clarify onset, severity, and red flags.
    """
    res = AIService.chat_clinical_intake(
        messages=req.messages,
        spoken_language=req.spoken_language or "en-US",
        patient_age=req.patient_age,
        patient_gender=req.patient_gender,
        vitals=req.vitals,
    )
    return APIResponse(success=True, message="Intake interview response generated", data=res)


@router.post("/intake/synthesize", response_model=APIResponse[IntakeSynthesizeResponse])
def synthesize_clinical_intake(
    req: IntakeSynthesizeRequest,
    current_user: Any = Depends(get_current_user_optional),
):
    """
    Synthesizes the completed intake chat into structured medical information:
    Chief Complaint, Symptoms, Duration, Severity, Suggested Department, FHIR SOAP, and ESI score.
    """
    res = AIService.synthesize_clinical_intake(
        messages=req.messages,
        vitals=req.vitals,
        spoken_language=req.spoken_language or "en-US",
        patient_age=req.patient_age,
        patient_gender=req.patient_gender,
    )
    return APIResponse(success=True, message="Clinical intake synthesized successfully", data=res)


# -----------------------------------------------------------------------------
# 2. OCR ANALYSIS (Prescriptions, Blood Reports, MRI, CT Scans)
# -----------------------------------------------------------------------------
@router.post("/ocr/analyze", response_model=APIResponse[OCRAnalysisResponse])
def analyze_ocr_document(
    req: OCRAnalysisRequest,
    current_user: Any = Depends(get_current_user_optional),
):
    """
    Sends extracted OCR text to Gemini.
    Generates Summary, Detected Diseases, Detected Medicines, Findings with flags, and Recommendations.
    """
    res = AIService.analyze_ocr_document(
        extracted_text=req.extracted_text,
        document_type=req.document_type,
        focus_areas=req.focus_areas,
    )
    return APIResponse(success=True, message="Medical document analyzed successfully", data=res)


# -----------------------------------------------------------------------------
# 3. DOCTOR AI COPILOT (Summarize Longitudinal Patient History)
# -----------------------------------------------------------------------------
@router.post("/doctor/copilot/summarize-history", response_model=APIResponse[DoctorCopilotSummaryResponse])
def doctor_copilot_summarize_history(
    req: DoctorCopilotSummarizeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role([UserRoleEnum.DOCTOR, UserRoleEnum.HOSPITAL_ADMIN])),
):
    """
    Doctor AI Copilot: Summarizes patient's longitudinal EHR records.
    Synthesizes Previous Visits, Current Medicines, Allergies, Diagnoses, and Lab Reports.
    """
    patient = db.query(Patient).filter(Patient.id == req.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    patient_name = f"{patient.first_name} {patient.last_name}"

    # Query EHR components
    visits = [
        {"visit_number": v.visit_number, "status": v.status.value, "chief_complaint": v.chief_complaint_raw, "created_at": v.created_at}
        for v in db.query(Visit).filter(Visit.patient_id == patient.id).order_by(Visit.created_at.desc()).limit(5).all()
    ]
    diagnoses = [
        {"diagnosis_name": d.diagnosis_name, "icd10": d.icd10_code, "notes": d.clinical_description, "created_at": d.created_at}
        for d in db.query(Diagnosis).filter(Diagnosis.patient_id == patient.id).all()
    ]
    allergies = [
        {"condition_name": h.condition_name, "history_type": str(h.history_type), "severity": h.severity}
        for h in db.query(MedicalHistory).filter(MedicalHistory.patient_id == patient.id).all()
    ]

    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient.id).order_by(Prescription.created_at.desc()).limit(3).all()
    current_medicines = []
    for rx in prescriptions:
        for item in rx.items:
            med_name = item.medicine.brand_name if item.medicine else "Medication"
            current_medicines.append({
                "medicine_name": med_name,
                "dosage": item.dosage_instruction,
                "frequency": item.frequency.value,
            })

    reports = [
        {"title": r.title, "report_type": r.report_type.value, "summary": r.ai_summary, "created_at": r.created_at}
        for r in db.query(MedicalReport).filter(MedicalReport.patient_id == patient.id).limit(5).all()
    ]

    # Generate Gemini Summary
    res = AIService.doctor_summarize_history(
        patient_name=patient_name,
        patient_id=patient.id,
        visits=visits,
        current_medicines=current_medicines,
        allergies=allergies,
        diagnoses=diagnoses,
        reports=reports,
    )

    # Log Doctor View Access
    client_ip = request.client.host if request.client else "127.0.0.1"
    AuditService.log_event(
        db=db,
        action=AuditActionEnum.DOCTOR_VIEW_RECORD,
        actor_role=str(getattr(current_user, "role", "DOCTOR")),
        actor_user_id=getattr(current_user, "id", None),
        actor_name=getattr(current_user, "full_name", "Attending Physician"),
        target_table="patients",
        target_record_id=patient.id,
        client_ip=client_ip,
        description=f"Doctor generated AI Copilot longitudinal history summary for Patient {patient_name}.",
    )

    return APIResponse(success=True, message="Longitudinal history summarized for physician", data=res)


# -----------------------------------------------------------------------------
# 4. PATIENT HEALTH ASSISTANT (EHR-Grounded Conversational QA)
# -----------------------------------------------------------------------------
@router.post("/patient/assistant/chat", response_model=APIResponse[PatientAssistantChatResponse])
def patient_health_assistant_chat(
    req: PatientAssistantChatRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
):
    """
    Patient Health Assistant: Answers patient queries grounded in their verified medical records.
    (e.g., "What medicines am I taking?", "When is my next dose?", "What happened in my previous visit?")
    """
    patient_id = current_user.patient_id or current_user.id
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient_name = f"{patient.first_name} {patient.last_name}"
    patient_profile = {
        "date_of_birth": str(patient.date_of_birth) if patient.date_of_birth else None,
        "gender": patient.gender.value if patient.gender else None,
        "blood_group": patient.blood_group.value if hasattr(patient.blood_group, "value") else patient.blood_group,
    }

    # Query active prescriptions
    active_prescriptions = []
    intake_schedules = []
    if patient:
        rxs = db.query(Prescription).filter(Prescription.patient_id == patient.id).order_by(Prescription.created_at.desc()).limit(3).all()
        for rx in rxs:
            active_prescriptions.append({
                "prescription_number": rx.prescription_number,
                "notes": rx.clinical_notes,
                "items": [
                    {
                        "medicine_name": i.medicine.brand_name if i.medicine else "Medication",
                        "dosage_instruction": i.dosage_instruction,
                        "frequency": i.frequency.value,
                        "duration_days": i.duration_days,
                    }
                    for i in rx.items
                ]
            })

        schedules = db.query(MedicineIntakeSchedule).filter(
            MedicineIntakeSchedule.patient_id == patient.id,
            MedicineIntakeSchedule.is_taken == False,
        ).order_by(MedicineIntakeSchedule.scheduled_intake_timestamp.asc()).limit(10).all()

        intake_schedules = [
            {
                "dosage_amount": s.dosage_amount,
                "scheduled_time": s.scheduled_intake_timestamp.isoformat(),
            }
            for s in schedules
        ]

    # Query recent visits & diagnoses
    recent_visits = []
    diagnoses = []
    if patient:
        visits = db.query(Visit).filter(Visit.patient_id == patient.id).order_by(Visit.created_at.desc()).limit(3).all()
        recent_visits = [
            {"visit_number": v.visit_number, "chief_complaint": v.chief_complaint_raw, "status": v.status.value}
            for v in visits
        ]
        diags = db.query(Diagnosis).filter(Diagnosis.patient_id == patient.id).limit(5).all()

        diagnoses = [{"diagnosis_name": d.diagnosis_name, "icd10": d.icd10_code} for d in diags]

    try:
        res = AIService.patient_health_assistant(
        query=req.query,
        patient_name=patient_name,
        patient_profile=patient_profile,
        active_prescriptions=active_prescriptions,
        intake_schedules=intake_schedules,
        recent_visits=recent_visits,
        diagnoses=diagnoses,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="Patient health assistant is temporarily unavailable") from exc
    return APIResponse(success=True, message="Health assistant response generated", data=res)


# -----------------------------------------------------------------------------
# 5. PRESCRIPTION EXPLANATION (Layman Translator)
# -----------------------------------------------------------------------------
@router.post("/prescriptions/explain", response_model=APIResponse[PrescriptionExplainResponse])
def explain_prescription(
    req: PrescriptionExplainRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user_optional),
):
    """
    Translates complex clinical prescriptions into easy-to-understand language:
    Morning/Afternoon/Night breakdown, Before/After Food instructions, and Plain-language Purpose.
    """
    items_to_explain = []
    clinical_notes = req.clinical_notes

    if req.prescription_id:
        rx = db.query(Prescription).filter(Prescription.id == req.prescription_id).first()
        if rx:
            clinical_notes = rx.clinical_notes or clinical_notes
            for item in rx.items:
                med_name = item.medicine.brand_name if item.medicine else "Medication"
                items_to_explain.append({
                    "medicine_name": med_name,
                    "dosage_instruction": item.dosage_instruction,
                    "frequency": item.frequency.value,
                    "duration_days": item.duration_days,
                    "special_intake_conditions": item.special_intake_conditions,
                })

    if not items_to_explain and req.items:
        items_to_explain = [item.model_dump() for item in req.items]

    if not items_to_explain:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A saved prescription or prescription items are required")

    res = AIService.explain_prescription(
        items=items_to_explain,
        clinical_notes=clinical_notes,
        target_language=req.target_language or "English",
    )
    return APIResponse(success=True, message="Prescription translated into easy language", data=res)


# -----------------------------------------------------------------------------
# 6. DRUG INTERACTION & ALLERGY CHECKER
# -----------------------------------------------------------------------------
@router.post("/doctor/check-drug-interactions", response_model=APIResponse[DrugInteractionCheckResponse])
def check_drug_interactions(
    req: DrugInteractionCheckRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user_optional),
):
    """
    When doctor creates a prescription, Gemini checks:
    - Drug-Drug Interactions (Major, Moderate, Minor)
    - Duplicate Therapies / Therapeutic Overlaps
    - Allergy Risks (e.g. Penicillin allergy vs Amoxicillin)
    - Disease-Drug Contraindications
    """
    allergies = req.known_allergies or []
    chronic_conditions = req.chronic_conditions or []
    current_meds = req.current_medicines or []

    # If patient_id is provided, automatically populate allergies & active medicines from EHR
    if req.patient_id:
        patient_allergies = db.query(MedicalHistory).filter(
            MedicalHistory.patient_id == req.patient_id,
            MedicalHistory.history_type == "ALLERGY",
        ).all()
        for a in patient_allergies:
            if a.condition_name not in allergies:
                allergies.append(a.condition_name)

        patient_conditions = db.query(MedicalHistory).filter(
            MedicalHistory.patient_id == req.patient_id,
            MedicalHistory.history_type == "CHRONIC_CONDITION",
        ).all()
        for c in patient_conditions:
            if c.condition_name not in chronic_conditions:
                chronic_conditions.append(c.condition_name)

        patient_rxs = db.query(Prescription).filter(
            Prescription.patient_id == req.patient_id
        ).order_by(Prescription.created_at.desc()).limit(2).all()
        for rx in patient_rxs:
            for item in rx.items:
                med_name = item.medicine.brand_name if item.medicine else "Medication"
                if med_name not in current_meds:
                    current_meds.append(med_name)


    new_meds_dict = [m.model_dump() for m in req.new_medicines]

    res = AIService.check_drug_interactions(
        new_medicines=new_meds_dict,
        current_medicines=current_meds,
        known_allergies=allergies,
        chronic_conditions=chronic_conditions,
    )
    return APIResponse(success=True, message="Drug interactions and allergy risks evaluated", data=res)


# -----------------------------------------------------------------------------
# 8. AI SMART APPOINTMENT ROUTING
# -----------------------------------------------------------------------------
@router.post("/appointment/route", response_model=APIResponse[AIAppointmentRouteResponse])
def route_smart_appointment(
    req: AIAppointmentRouteRequest,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
):
    """
    AI-Powered Appointment Routing:
    - Analyzes patient symptoms using Google Gemini.
    - Recommends optimal Hospital, Department, Doctor, Priority level, and Available Slot.
    - Never overrides user's explicit hospital choice if provided.
    - Supports multilingual output (en, ta, hi, te, kn, ml).
    """
    try:
        res = AIService.route_smart_appointment(
            symptoms=req.symptoms,
            selected_hospital=req.selected_hospital,
            preferred_doctor=req.preferred_doctor,
            user_location=req.user_location,
            language=req.language or "en",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="AI appointment routing is temporarily unavailable") from exc
    return APIResponse(success=True, message="AI appointment recommendation generated", data=res)


# -----------------------------------------------------------------------------
# 9. AI CLINICAL CASE SUMMARY (For Doctor Workstation)
# -----------------------------------------------------------------------------
@router.post("/case-summary", response_model=APIResponse[AICaseSummaryResponse])
def get_ai_case_summary(
    req: AICaseSummaryRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.PATIENT, UserRoleEnum.DOCTOR])),
):
    """Generate a summary only from persisted patient records and authorized identity."""
    if current_user.role == UserRoleEnum.PATIENT.value:
        patient_id = current_user.patient_id or current_user.id
        if req.patient_id != patient_id:
            raise HTTPException(status_code=404, detail="Patient records not found")
    else:
        doctor = db.query(Doctor).filter(Doctor.id == current_user.doctor_id).first() if current_user.doctor_id else None
        if not doctor or not ConsentService.check_active_consent(db, req.patient_id, doctor.id):
            raise HTTPException(status_code=403, detail="Active patient consent is required")
        patient_id = req.patient_id

    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    age = max(0, date.today().year - patient.date_of_birth.year - ((date.today().month, date.today().day) < (patient.date_of_birth.month, patient.date_of_birth.day))) if patient.date_of_birth else 0
    visits = db.query(Visit).filter(Visit.patient_id == patient_id).order_by(Visit.created_at.desc()).all()
    diagnoses = db.query(Diagnosis).filter(Diagnosis.patient_id == patient_id).order_by(Diagnosis.created_at.desc()).all()
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).order_by(Prescription.created_at.desc()).all()
    histories = db.query(MedicalHistory).filter(MedicalHistory.patient_id == patient_id, MedicalHistory.is_active.is_(True)).all()
    reports = db.query(MedicalReport).filter(MedicalReport.patient_id == patient_id, MedicalReport.ai_summary.isnot(None)).order_by(MedicalReport.created_at.desc()).all()
    latest_vitals = None
    for visit in visits:
        latest_vitals = db.query(VitalsRecord).filter(VitalsRecord.visit_id == visit.id).order_by(VitalsRecord.created_at.desc()).first()
        if latest_vitals:
            break
    vitals = {}
    if latest_vitals:
        vitals = {key: getattr(latest_vitals, key) for key in ("systolic_bp", "diastolic_bp", "heart_rate_bpm", "oxygen_saturation_spo2", "body_temperature_celsius", "body_weight_kg", "body_height_cm") if getattr(latest_vitals, key) is not None}
    diagnosis_names = [f"{d.diagnosis_name} ({d.icd10_code})" for d in diagnoses]
    medications = [f"{item.medicine.brand_name} {item.medicine.strength}: {item.dosage_instruction}" for rx in prescriptions for item in rx.items if item.medicine]
    allergies = [h.condition_name + (f" ({h.severity})" if h.severity else "") for h in histories if h.history_type.upper() == "ALLERGY"]
    lab_reports = [r.ai_summary for r in reports if r.ai_summary]
    latest_visit = visits[0] if visits else None
    chief_complaint = latest_visit.chief_complaint_raw if latest_visit and latest_visit.chief_complaint_raw else ""

    try:
        result = AIService.generate_case_summary(
            patient_name=f"{patient.first_name} {patient.last_name}", age=age,
            gender=patient.gender.value if patient.gender else "UNDISCLOSED",
            blood_group=patient.blood_group.value if patient.blood_group else "",
            mrn=patient.hospital_mrn or "", national_health_id=patient.national_health_id or "",
            chief_complaint=chief_complaint, vitals=vitals, diagnoses=diagnosis_names,
            medications=medications, allergies=allergies, lab_reports=lab_reports,
            language=req.language or "en",
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="AI case summary synthesis failed") from exc
    return APIResponse(success=True, message="Patient case summary generated from saved records", data=result)
# -----------------------------------------------------------------------------
# 10. AI CLINICAL INTAKE REPORT PERSISTENCE (Case History)
# -----------------------------------------------------------------------------
@router.post("/intake/save-report", response_model=APIResponse[SaveIntakeReportResponse])
def save_clinical_intake_report(
    req: SaveIntakeReportRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
):
    """Persist the authenticated patient's self-service AI intake report."""
    patient_id = current_user.patient_id
    if not patient_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Authenticated patient identity is unavailable")
    if req.patient_id and req.patient_id != patient_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot save an intake report for another patient")

    report_data = req.model_dump(exclude={"patient_id"}, mode="json")
    report = IntakeReportService.create_report(db, patient_id, report_data)

    # Audit metadata identifies the record without duplicating clinical content.
    try:
        AuditService.log_event(
            db,
            action=AuditActionEnum.CREATE,
            target_table="ai_intake_reports",
            target_record_id=report.id,
            actor_user_id=current_user.id,
            actor_role=current_user.role,
            actor_name=current_user.full_name,
            description="AI intake report saved",
            new_state={"schema_version": IntakeReportService.PAYLOAD_VERSION},
        )
    except Exception:
        pass

    return APIResponse(
        success=True,
        message="AI Clinical Intake Report saved successfully",
        data=SaveIntakeReportResponse(
            report_id=report.id,
            patient_id=patient_id,
            saved_at=report.created_at.isoformat(),
            created_at=report.created_at,
            status="SAVED_TO_CASE_HISTORY",
            message="Your AI Clinical Intake Report was saved.",
            report_data=report.report_data,
        ),
    )


@router.get("/intake/reports/{patient_id}", response_model=APIResponse[List[IntakeReportItem]])
def get_patient_intake_reports(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
):
    """Retrieve persisted AI intake reports for the authenticated patient."""
    _require_intake_report_owner(patient_id, current_user)
    reports = IntakeReportService.get_reports_for_patient(db, patient_id)
    items = [IntakeReportService.to_response_item(report) for report in reports]
    return APIResponse(success=True, message="Intake reports retrieved", data=items)


@router.get("/intake/latest/{patient_id}", response_model=APIResponse[Optional[IntakeReportItem]])
def get_latest_patient_intake_report(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
):
    """Retrieve the latest persisted report, or null when none exists."""
    _require_intake_report_owner(patient_id, current_user)
    report = IntakeReportService.get_latest_report(db, patient_id)
    data = IntakeReportService.to_response_item(report) if report else None
    message = "Latest AI intake report retrieved" if report else "No saved AI intake report"
    return APIResponse(success=True, message=message, data=data)


def _require_intake_report_owner(patient_id: str, current_user: CurrentUser) -> None:
    if not current_user.patient_id or patient_id != current_user.patient_id:
        # 404 avoids disclosing whether another patient's report exists.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intake report not found")

# 11. AI MEDICATION CHAT & ADHERENCE Q&A
# -----------------------------------------------------------------------------
@router.post("/medication/chat", response_model=APIResponse[AIMedicationChatResponse])
def chat_medication_assistant(
    req: AIMedicationChatRequest,
    current_user: Any = Depends(get_current_user_optional),
):
    """
    Intelligent pharmacology and medication adherence assistant powered by Gemini 2.5.
    Answers patient questions regarding food instructions, missed doses, interactions, and side effects.
    """
    res = AIService.chat_medication_assistant(
        query=req.query,
        medicine_name=req.medicine_name,
        active_prescriptions=req.active_prescriptions,
        patient_allergies=req.patient_allergies,
        chronic_conditions=req.chronic_conditions,
        language=req.language or "en",
    )
    return APIResponse(success=True, message="Medication guidance generated", data=res)


# -----------------------------------------------------------------------------
# 12. AI MEDICAL REPORT INTELLIGENCE & PERSISTENCE
# -----------------------------------------------------------------------------
@router.post("/reports/analyze-and-explain", response_model=APIResponse[MedicalReportExplainResponse])
def analyze_and_explain_report(
    req: MedicalReportExplainRequest,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Explain OCR from the authenticated patient's report and persist it to that report."""
    patient_id = current_user.patient_id or current_user.id
    if req.patient_id and req.patient_id != patient_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot analyze a report for another patient")
    if req.image_quality in {"POOR", "BLURRY"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Image quality is poor or blurry. Please upload a clearer report.")

    report = None
    extracted_text = req.extracted_text.strip()
    if req.medical_report_id:
        report = db.query(MedicalReport).filter(
            MedicalReport.id == req.medical_report_id,
            MedicalReport.patient_id == patient_id,
        ).first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")
        if not report.ocr_result or not (report.ocr_result.raw_extracted_text or "").strip():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Run OCR successfully before generating the report explanation")
        extracted_text = report.ocr_result.raw_extracted_text.strip()
    if not extracted_text:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Extracted report text is required")

    result = AIService.explain_medical_report(
        extracted_text=extracted_text,
        document_type=req.document_type,
        language=req.language or "en",
        patient_id=patient_id,
        hospital_name=req.hospital_name,
    )
    result.saved_to_case_history = False
    if report:
        result.saved_to_case_history = True
        persisted = result.model_dump(mode="json")
        report.ai_summary = result.summary_plain_english
        existing = dict(report.fhir_diagnostic_report_payload or {})
        existing["ai_explanation"] = persisted
        report.fhir_diagnostic_report_payload = existing
        try:
            db.commit()
            db.refresh(report)
        except Exception:
            db.rollback()
            raise

    message = "Medical report analysis saved to case history" if result.saved_to_case_history else "Medical report analysis generated"
    return APIResponse(success=True, message=message, data=result)


@router.get("/reports/dossier/{patient_id}", response_model=Dict[str, Any])
def get_patient_analyzed_reports_dossier(
    patient_id: str,
    query: Optional[str] = None,
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.PATIENT)),
    db: Session = Depends(get_db),
):
    """Read saved AI explanations from the authenticated patient's medical report records."""
    if patient_id != (current_user.patient_id or current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical reports not found")
    rows = db.query(MedicalReport).filter(
        MedicalReport.patient_id == patient_id,
        MedicalReport.fhir_diagnostic_report_payload.isnot(None),
    ).order_by(MedicalReport.created_at.desc()).all()
    reports = []
    for row in rows:
        explanation = (row.fhir_diagnostic_report_payload or {}).get("ai_explanation")
        if not explanation:
            continue
        item = {
            "id": row.id,
            "patient_id": row.patient_id,
            "date": row.created_at.isoformat() if row.created_at else None,
            "title": row.title,
            "document_type": explanation.get("test_type", row.report_type.value),
            "overall_status": explanation.get("overall_status"),
            "summary": explanation.get("summary_plain_english"),
            "parameters": explanation.get("parameters", []),
            "specialist": explanation.get("recommended_specialist"),
            "urgency": explanation.get("urgency"),
            "diet_advice": explanation.get("diet_advice", []),
            "language": explanation.get("language", "en"),
        }
        reports.append(item)
    if query:
        term = query.casefold()
        reports = [item for item in reports if term in (item.get("title") or "").casefold()
                   or term in (item.get("summary") or "").casefold()
                   or term in (item.get("document_type") or "").casefold()
                   or any(term in str(param.get("name", "")).casefold() or term in str(param.get("meaning", "")).casefold() for param in item.get("parameters", []))]
    return {"success": True, "count": len(reports), "reports": reports}
