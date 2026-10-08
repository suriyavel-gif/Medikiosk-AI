import os
from typing import Optional
from fastapi import APIRouter, Depends, Request, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_client_ip
from app.models.models import (
    MedicalReport,
    ReportTypeEnum,
    UserRoleEnum,
    AuditActionEnum,
    Visit,
    Doctor,
)
from app.schemas.auth import CurrentUser
from app.schemas.medical_report import (
    MedicalReportResponse,
    OCRResultResponse,
    TriggerOCRRequest,
    TriggerAISummaryRequest,
)
from app.schemas.common import APIResponse
from app.services.report_service import ReportService
from app.services.audit_service import AuditService
from app.services.consent_service import ConsentService

router = APIRouter(prefix="/reports", tags=["Medical Reports & Diagnostic OCR"])


def _require_report_access(report: MedicalReport, current_user: CurrentUser, db: Session) -> None:
    if current_user.role == UserRoleEnum.PATIENT.value:
        if (current_user.patient_id or current_user.id) == report.patient_id:
            return
    elif current_user.role == UserRoleEnum.DOCTOR.value:
        doctor = db.query(Doctor).filter(Doctor.id == current_user.doctor_id).first() if current_user.doctor_id else db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if doctor and report.visit and doctor.hospital_id == report.visit.hospital_id and ConsentService.check_active_consent(db, report.patient_id, doctor.id):
            return
    elif current_user.role in (UserRoleEnum.RECEPTIONIST.value, UserRoleEnum.HOSPITAL_ADMIN.value):
        if current_user.hospital_id and report.visit and current_user.hospital_id == report.visit.hospital_id:
            return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")


@router.post("/upload", response_model=APIResponse[MedicalReportResponse], status_code=status.HTTP_201_CREATED)
async def upload_report(
    request: Request,
    file: UploadFile = File(...),
    visit_id: Optional[str] = Form(None),
    patient_id: str = Form(...),
    title: str = Form(...),
    report_type: ReportTypeEnum = Form(ReportTypeEnum.LAB_BIOCHEMISTRY),
    is_confidential: bool = Form(False),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a diagnostic lab report, radiology scan, or historical prescription."""
    if current_user.role == UserRoleEnum.PATIENT.value:
        if patient_id != (current_user.patient_id or current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot upload a report for another patient")
    elif current_user.role not in (UserRoleEnum.DOCTOR.value, UserRoleEnum.RECEPTIONIST.value, UserRoleEnum.HOSPITAL_ADMIN.value):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role cannot upload patient reports")
    if visit_id:
        visit = db.query(Visit).filter(Visit.id == visit_id, Visit.patient_id == patient_id).first()
        if not visit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient visit not found")
        if current_user.role != UserRoleEnum.PATIENT.value and current_user.hospital_id != visit.hospital_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Visit is outside your hospital")
    client_ip = get_client_ip(request)
    report = await ReportService.upload_medical_report(
        db=db,
        file=file,
        visit_id=visit_id,
        patient_id=patient_id,
        title=title,
        report_type=report_type,
        uploaded_by_user_id=current_user.id if current_user.role != UserRoleEnum.PATIENT.value else None,
        is_confidential=is_confidential,
        client_ip=client_ip,
    )
    return APIResponse(success=True, message="Medical report uploaded successfully", data=report)


@router.post("/ocr/trigger", response_model=APIResponse[OCRResultResponse])
@router.post("/{report_id}/ocr/trigger", response_model=APIResponse[OCRResultResponse])
def trigger_ocr(
    request: Request,
    report_id: Optional[str] = None,
    req: Optional[TriggerOCRRequest] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger AI Optical Character Recognition & Clinical Entity Extraction on an uploaded document."""
    client_ip = get_client_ip(request)
    target_report_id = report_id or (req.medical_report_id if req else None)
    if not target_report_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Medical report ID is required")
    report = db.query(MedicalReport).filter(MedicalReport.id == target_report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")
    _require_report_access(report, current_user, db)
    ocr_result = ReportService.trigger_ocr(db, report_id=target_report_id, client_ip=client_ip)
    return APIResponse(success=True, message="OCR processing completed and entities extracted", data=ocr_result)


@router.post("/summary/trigger", response_model=APIResponse)
@router.post("/{report_id}/summary/trigger", response_model=APIResponse)
def trigger_ai_summary(
    request: Request,
    report_id: Optional[str] = None,
    req: Optional[TriggerAISummaryRequest] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger Gemini AI Clinical Summary generation for physician review."""
    client_ip = get_client_ip(request)
    target_report_id = report_id or (req.medical_report_id if req else None)
    if not target_report_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Medical report ID is required")
    report = db.query(MedicalReport).filter(MedicalReport.id == target_report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")
    _require_report_access(report, current_user, db)
    focus_areas = req.focus_areas if req else None
    result = ReportService.trigger_ai_summary(
        db, report_id=target_report_id, focus_areas=focus_areas, client_ip=client_ip
    )
    return APIResponse(success=True, message="AI summary generated successfully", data=result)



@router.get("/{report_id}", response_model=APIResponse[MedicalReportResponse])
def get_report_details(
    report_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve metadata and OCR status for a medical report."""
    report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    _require_report_access(report, current_user, db)
    return APIResponse(success=True, message="Report metadata retrieved", data=MedicalReportResponse.model_validate(report))


@router.get("/{report_id}/download")
def download_report(
    report_id: str,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download diagnostic report binary file.
    AUTOMATIC AUDIT EVENT: Logs DOCTOR_DOWNLOAD_REPORT if accessed by a physician.
    """
    client_ip = get_client_ip(request)
    report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found")
    _require_report_access(report, current_user, db)
    if not os.path.exists(report.file_storage_uri):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file not found on disk")

    if current_user.role == UserRoleEnum.DOCTOR.value:
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.DOCTOR_DOWNLOAD_REPORT,
            target_table="medical_reports",
            target_record_id=report.id,
            actor_user_id=current_user.id,
            actor_role="DOCTOR",
            actor_name=current_user.full_name,
            client_ip=client_ip,
            description=f"Doctor downloaded diagnostic report file: {report.title}",
        )

    return FileResponse(
        path=report.file_storage_uri,
        media_type=report.file_mime_type,
        filename=f"Report_{report.title[:20]}.pdf",
    )
