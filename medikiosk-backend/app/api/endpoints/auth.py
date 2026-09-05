from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, get_client_ip
from app.schemas.auth import (
    PatientOTPRequest,
    PatientOTPVerify,
    PatientRegisterRequest,
    StaffLoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    CurrentUser,
)
from app.schemas.common import APIResponse
from app.services.auth_service import AuthService
from app.models.models import UserRoleEnum

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.post("/patient/otp/request", response_model=APIResponse)
def request_patient_otp(
    req: PatientOTPRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Simulate and dispatch OTP to patient phone for passwordless login."""
    client_ip = get_client_ip(request)
    result = AuthService.send_patient_otp(db, req.phone, client_ip=client_ip)
    return APIResponse(success=True, message=result["message"], data=result)


@router.post("/patient/otp/verify", response_model=APIResponse[TokenResponse])
def verify_patient_otp(
    req: PatientOTPVerify,
    request: Request,
    db: Session = Depends(get_db),
):
    """Verify patient OTP and issue JWT Access + Refresh tokens."""
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    tokens = AuthService.verify_patient_otp_and_login(
        db, phone=req.phone, otp=req.otp, client_ip=client_ip, user_agent=user_agent
    )
    return APIResponse(success=True, message="Patient authenticated successfully", data=tokens)


@router.post("/patient/register", response_model=APIResponse[TokenResponse], status_code=status.HTTP_201_CREATED)
def register_patient(
    req: PatientRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Register a new patient and issue JWT tokens."""
    client_ip = get_client_ip(request)
    tokens = AuthService.register_patient(db, req=req, client_ip=client_ip)
    return APIResponse(success=True, message="Patient registered successfully", data=tokens)


@router.post("/doctor/login", response_model=APIResponse[TokenResponse])
def doctor_login(
    req: StaffLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Doctor login endpoint with role enforcement."""
    client_ip = get_client_ip(request)
    tokens = AuthService.staff_login(
        db,
        username_or_email=req.username_or_email,
        password=req.password,
        expected_role=UserRoleEnum.DOCTOR,
        client_ip=client_ip,
        user_agent=request.headers.get("User-Agent"),
    )
    return APIResponse(success=True, message="Doctor authenticated successfully", data=tokens)


@router.post("/reception/login", response_model=APIResponse[TokenResponse])
def reception_login(
    req: StaffLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Receptionist login endpoint."""
    client_ip = get_client_ip(request)
    tokens = AuthService.staff_login(
        db,
        username_or_email=req.username_or_email,
        password=req.password,
        expected_role=UserRoleEnum.RECEPTIONIST,
        client_ip=client_ip,
        user_agent=request.headers.get("User-Agent"),
    )
    return APIResponse(success=True, message="Receptionist authenticated successfully", data=tokens)


@router.post("/hospital-admin/login", response_model=APIResponse[TokenResponse])
@router.post("/admin/login", response_model=APIResponse[TokenResponse])
def hospital_admin_login(
    req: StaffLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Hospital Administrator login endpoint."""
    client_ip = get_client_ip(request)
    tokens = AuthService.staff_login(
        db,
        username_or_email=req.username_or_email,
        password=req.password,
        expected_role=UserRoleEnum.HOSPITAL_ADMIN,
        client_ip=client_ip,
        user_agent=request.headers.get("User-Agent"),
    )
    return APIResponse(success=True, message="Hospital Admin authenticated successfully", data=tokens)


@router.post("/government-admin/login", response_model=APIResponse[TokenResponse])
@router.post("/government/login", response_model=APIResponse[TokenResponse])
def government_admin_login(
    req: StaffLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Government Public Health Administrator login endpoint."""
    client_ip = get_client_ip(request)
    tokens = AuthService.staff_login(
        db,
        username_or_email=req.username_or_email,
        password=req.password,
        expected_role=UserRoleEnum.GOVERNMENT_ADMIN,
        client_ip=client_ip,
        user_agent=request.headers.get("User-Agent"),
    )
    return APIResponse(success=True, message="Government Admin authenticated successfully", data=tokens)


@router.post("/refresh", response_model=APIResponse[TokenResponse])
def refresh_token(
    req: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """Renew JWT access token using a valid refresh token."""
    tokens = AuthService.refresh_access_token(db, req.refresh_token)
    return APIResponse(success=True, message="Token refreshed successfully", data=tokens)


@router.get("/me", response_model=APIResponse[CurrentUser])
def get_current_user_profile(
    current_user: CurrentUser = Depends(get_current_user),
):
    """Retrieve active session profile and permissions for the authenticated user."""
    return APIResponse(success=True, message="Current user profile retrieved", data=current_user)
