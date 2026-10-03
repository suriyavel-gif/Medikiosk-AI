from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.models import AIIntakeReport


class IntakeReportService:
    PAYLOAD_VERSION = 1

    @staticmethod
    def create_report(db: Session, patient_id: str, report_data: Dict[str, Any]) -> AIIntakeReport:
        persisted_data = {"schema_version": IntakeReportService.PAYLOAD_VERSION, **report_data}
        report = AIIntakeReport(
            patient_id=patient_id,
            report_data=persisted_data,
            created_at=datetime.now(timezone.utc),
        )
        try:
            db.add(report)
            db.commit()
            db.refresh(report)
        except Exception:
            db.rollback()
            raise
        return report

    @staticmethod
    def get_reports_for_patient(db: Session, patient_id: str) -> List[AIIntakeReport]:
        return (
            db.query(AIIntakeReport)
            .filter(AIIntakeReport.patient_id == patient_id)
            .order_by(AIIntakeReport.created_at.desc(), AIIntakeReport.id.desc())
            .all()
        )

    @staticmethod
    def get_latest_report(db: Session, patient_id: str) -> Optional[AIIntakeReport]:
        return (
            db.query(AIIntakeReport)
            .filter(AIIntakeReport.patient_id == patient_id)
            .order_by(AIIntakeReport.created_at.desc(), AIIntakeReport.id.desc())
            .first()
        )

    @staticmethod
    def to_response_item(report: AIIntakeReport) -> Dict[str, Any]:
        data = dict(report.report_data or {})
        return {
            "id": report.id,
            "patient_id": report.patient_id,
            "created_at": report.created_at,
            "report_data": data,
            **{key: value for key, value in data.items() if key != "schema_version"},
            "hospital_name": data.get("hospital_name") or "",
            "medical_history": data.get("medical_history") or [],
            "current_medications": data.get("current_medications") or [],
            "allergies": data.get("allergies") or [],
            "vitals": data.get("vitals") or {"bp": "", "hr": "", "spo2": "", "temperature": ""},
            "suggested_otc_medicines": data.get("suggested_otc_medicines") or [],
            "warning_signs": data.get("warning_signs") or [],
        }
