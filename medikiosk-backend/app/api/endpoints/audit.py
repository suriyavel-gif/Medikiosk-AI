from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_any_role
from app.models.models import AuditLog, AuditActionEnum, UserRoleEnum
from app.schemas.auth import CurrentUser
from app.schemas.audit import AuditLogResponse
from app.schemas.common import APIResponse

router = APIRouter(prefix="/audit", tags=["Audit & Compliance Logs"])


@router.get("/logs", response_model=APIResponse[List[AuditLogResponse]])
def get_audit_logs(
    action: Optional[AuditActionEnum] = None,
    target_table: Optional[str] = None,
    target_record_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.HOSPITAL_ADMIN, UserRoleEnum.GOVERNMENT_ADMIN])),
    db: Session = Depends(get_db),
):
    """Retrieve immutable, tamper-evident audit logs with multi-attribute filtering."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if target_table:
        query = query.filter(AuditLog.target_table == target_table)
    if target_record_id:
        query = query.filter(AuditLog.target_record_id == target_record_id)
    if current_user.hospital_id and current_user.role == UserRoleEnum.HOSPITAL_ADMIN.value:
        query = query.filter(AuditLog.hospital_id == current_user.hospital_id)

    offset = (page - 1) * size
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(size).all()

    return APIResponse(
        success=True,
        message=f"Retrieved {len(logs)} audit log records",
        data=[AuditLogResponse.model_validate(l) for l in logs],
    )
