from typing import List, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models.models import User, Patient, Doctor, UserRoleEnum
from app.schemas.auth import CurrentUser

security_bearer = HTTPBearer(auto_error=False)


def get_client_ip(request: Request) -> str:
    """Extract client IP address handling proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> CurrentUser:
    """FastAPI Dependency: Authenticate JWT Bearer Token and return CurrentUser."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth.credentials
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    roles = payload.get("roles", [])
    primary_role = roles[0] if roles else "UNKNOWN"

    if primary_role == UserRoleEnum.PATIENT.value:
        patient = db.query(Patient).filter(Patient.id == user_id).first()
        if not patient or not patient.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Patient account not found or inactive",
            )
        return CurrentUser(
            id=patient.id,
            role=UserRoleEnum.PATIENT.value,
            username=patient.primary_phone,
            full_name=f"{patient.first_name} {patient.last_name}",
            email=patient.email,
            patient_id=patient.id,
        )
    else:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or inactive",
            )
        
        doctor_id = None
        if user.doctor_profile:
            doctor_id = user.doctor_profile.id

        return CurrentUser(
            id=user.id,
            role=user.user_type.value,
            username=user.username,
            full_name=user.full_name,
            email=user.email,
            hospital_id=user.hospital_id,
            doctor_id=doctor_id,
        )


def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> Optional[CurrentUser]:
    """FastAPI Dependency: Return CurrentUser if bearer token is valid, else None."""
    if not auth or not auth.credentials:
        return None
    try:
        return get_current_user(auth, db)
    except HTTPException:
        return None



def require_role(required_role: UserRoleEnum):
    """Dependency factory: require a single specific user role."""
    def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role != required_role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role '{required_role.value}', your role is '{current_user.role}'",
            )
        return current_user
    return role_checker


def require_any_role(allowed_roles: List[UserRoleEnum]):
    """Dependency factory: require any of the allowed roles."""
    allowed_values = [r.value for r in allowed_roles]
    def roles_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_values:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires one of {allowed_values}, your role is '{current_user.role}'",
            )
        return current_user
    return roles_checker
