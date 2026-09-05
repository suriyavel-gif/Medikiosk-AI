import os
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from app.core.config import settings
from app.models.models import (
    MedicalReport,
    OCRResult,
    Visit,
    Patient,
    ReportTypeEnum,
    OCRStatusEnum,
    AuditActionEnum,
)
from app.schemas.medical_report import (
    MedicalReportResponse,
    OCRResultResponse,
)
from app.services.ai_service import AIService
from app.services.audit_service import AuditService


class ReportService:
    @staticmethod
    async def upload_medical_report(
        db: Session,
        file: UploadFile,
        visit_id: str,
        patient_id: str,
        title: str,
        report_type: ReportTypeEnum = ReportTypeEnum.LAB_BIOCHEMISTRY,
        uploaded_by_user_id: Optional[str] = None,
        is_confidential: bool = False,
        client_ip: str = "127.0.0.1",
    ) -> MedicalReportResponse:
        """Store uploaded medical diagnostic document, compute SHA256, and initialize OCR record."""
        visit = db.query(Visit).filter(Visit.id == visit_id).first()
        if not visit:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")

        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

        content = await file.read()
        file_size = len(content)
        if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB",
            )

        sha256_hash = hashlib.sha256(content).hexdigest()
        file_ext = os.path.splitext(file.filename or "")[1] or ".pdf"
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        storage_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

        with open(storage_path, "wb") as f:
            f.write(content)

        report = MedicalReport(
            visit_id=visit_id,
            patient_id=patient_id,
            uploaded_by_user_id=uploaded_by_user_id,
            report_type=report_type,
            title=title.strip() if title else (file.filename or "Diagnostic Report"),
            file_storage_uri=storage_path,
            file_mime_type=file.content_type or "application/octet-stream",
            file_size_bytes=file_size,
            file_sha256_checksum=sha256_hash,
            is_confidential=is_confidential,
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # Audit log
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.CREATE,
            target_table="medical_reports",
            target_record_id=report.id,
            actor_user_id=uploaded_by_user_id,
            hospital_id=visit.hospital_id,
            client_ip=client_ip,
            description=f"Medical report uploaded: {report.title} (Checksum: {sha256_hash[:8]})",
        )

        return MedicalReportResponse(
            id=report.id,
            visit_id=report.visit_id,
            patient_id=report.patient_id,
            report_type=report.report_type,
            title=report.title,
            file_storage_uri=report.file_storage_uri,
            file_mime_type=report.file_mime_type,
            file_size_bytes=report.file_size_bytes,
            ai_summary=report.ai_summary,
            is_confidential=report.is_confidential,
            ocr_status=None,
            created_at=report.created_at,
        )

    @staticmethod
    def trigger_ocr(db: Session, report_id: str, client_ip: str = "127.0.0.1") -> OCRResultResponse:
        """Trigger AI OCR and clinical entity extraction pipeline for a medical report."""
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")

        start_time = datetime.now()
        raw_text, entities, summary, confidence = AIService.process_ocr_and_extract_entities(
            file_path=report.file_storage_uri,
            report_type=report.report_type.value,
        )
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        ocr = db.query(OCRResult).filter(OCRResult.medical_report_id == report_id).first()
        if not ocr:
            ocr = OCRResult(
                medical_report_id=report_id,
                ocr_engine_version="Gemini-Vision-1.5",
                status=OCRStatusEnum.COMPLETED,
                raw_extracted_text=raw_text,
                confidence_score=confidence,
                extracted_entities_json=entities,
                processing_duration_ms=duration_ms,
            )
            db.add(ocr)
        else:
            ocr.status = OCRStatusEnum.COMPLETED
            ocr.raw_extracted_text = raw_text
            ocr.confidence_score = confidence
            ocr.extracted_entities_json = entities
            ocr.processing_duration_ms = duration_ms

        report.ai_summary = summary
        db.commit()
        db.refresh(ocr)

        AuditService.log_event(
            db=db,
            action=AuditActionEnum.UPDATE,
            target_table="ocr_results",
            target_record_id=ocr.id,
            actor_role="SYSTEM",
            client_ip=client_ip,
            description=f"OCR extracted {len(entities)} clinical entities for Report #{report_id}",
        )

        return OCRResultResponse(
            id=ocr.id,
            medical_report_id=ocr.medical_report_id,
            ocr_engine_version=ocr.ocr_engine_version,
            status=ocr.status,
            raw_extracted_text=ocr.raw_extracted_text,
            confidence_score=float(ocr.confidence_score) if ocr.confidence_score else None,
            extracted_entities=ocr.extracted_entities_json or [],
            processing_duration_ms=ocr.processing_duration_ms,
            created_at=ocr.created_at,
        )

    @staticmethod
    def trigger_ai_summary(
        db: Session, report_id: str, focus_areas: Optional[List[str]] = None, client_ip: str = "127.0.0.1"
    ) -> Dict[str, Any]:
        """Generate high-level clinical summary from extracted OCR text and entities."""
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medical report not found")

        ocr = report.ocr_result
        raw_text = ocr.raw_extracted_text if ocr else report.title
        entities = ocr.extracted_entities_json if ocr else []

        summary = AIService.generate_clinical_summary(
            report_text=raw_text or "",
            entities=entities or [],
            focus_areas=focus_areas,
        )
        report.ai_summary = summary
        db.commit()

        AuditService.log_event(
            db=db,
            action=AuditActionEnum.UPDATE,
            target_table="medical_reports",
            target_record_id=report.id,
            actor_role="SYSTEM",
            client_ip=client_ip,
            description=f"AI Summary regenerated for Medical Report #{report.id}",
        )

        return {"report_id": report.id, "ai_summary": summary}
