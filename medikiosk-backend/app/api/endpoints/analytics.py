from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import require_any_role, require_role
from app.models.models import UserRoleEnum, Hospital
from app.schemas.auth import CurrentUser
from app.schemas.analytics import (
    GovernmentSyndromicCluster,
    HospitalDashboardMetrics,
    GovernmentDashboardOverviewResponse,
)
from app.schemas.common import APIResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Public Health & Hospital Analytics"])


@router.get("/government/overview", response_model=APIResponse[GovernmentDashboardOverviewResponse])
def get_government_overview(
    current_user: Optional[CurrentUser] = Depends(require_any_role([UserRoleEnum.GOVERNMENT_ADMIN, UserRoleEnum.HOSPITAL_ADMIN])),
    db: Session = Depends(get_db),
):
    """
    Comprehensive state-wide public health and hospital performance dashboard.
    Strictly anonymized: Never exposes personal identifiable records (zero PII/PHI).
    """
    overview = AnalyticsService.get_government_overview(db)
    return APIResponse(success=True, message="Government public health overview loaded", data=overview)


@router.get("/government/syndromic", response_model=APIResponse[List[GovernmentSyndromicCluster]])
def get_syndromic_surveillance(
    district_code: Optional[str] = Query(None, description="Filter by district/administrative zone"),
    current_user: CurrentUser = Depends(require_role(UserRoleEnum.GOVERNMENT_ADMIN)),
    db: Session = Depends(get_db),
):
    """Real-time anonymized syndromic outbreak surveillance feed for Government Epidemiologists."""
    clusters = AnalyticsService.get_government_syndromic_clusters(db, district_code=district_code)
    return APIResponse(success=True, message="Syndromic surveillance telemetry retrieved", data=clusters)


@router.get("/hospital/{hospital_id}", response_model=APIResponse[HospitalDashboardMetrics])
def get_hospital_metrics(
    hospital_id: str,
    current_user: CurrentUser = Depends(require_any_role([UserRoleEnum.HOSPITAL_ADMIN, UserRoleEnum.GOVERNMENT_ADMIN])),
    db: Session = Depends(get_db),
):
    """Operational dashboard metrics: OPD throughput, wait times, triage breakdown, and kiosk fleet uptime."""
    metrics = AnalyticsService.get_hospital_metrics(db, hospital_id)
    return APIResponse(success=True, message="Hospital operational metrics retrieved", data=metrics)

