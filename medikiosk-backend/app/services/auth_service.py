from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    verify_otp,
    hash_token,
)
from app.core.config import settings
from app.models.models import (
    User,
    Patient,
    Session as UserSession,
    UserRoleEnum,
    SessionTypeEnum,
    AuditActionEnum,
)
from app.schemas.auth import (
    PatientRegisterRequest,
    TokenResponse,
)
from app.services.audit_service import AuditService


class AuthService:
    @staticmethod
    def send_patient_otp(db: Session, phone: str, client_ip: str = "127.0.0.1") -> Dict[str, Any]:
        """Generate and dispatch OTP to patient phone."""
        clean_phone = phone.strip()
        patient = db.query(Patient).filter(Patient.primary_phone == clean_phone).first()
        otp = generate_otp(clean_phone)
        
        # Log to audit
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.READ,
            target_table="patients",
            target_record_id=patient.id if patient else None,
            actor_role="PATIENT",
            client_ip=client_ip,
            description=f"OTP generated for mobile: {clean_phone}",
        )

        return {
            "phone": clean_phone,
            "is_registered": patient is not None,
            "message": f"OTP sent to {clean_phone}. (For demo/testing, use {otp})",
            "demo_otp": otp,  # Included for convenience in testing/demo
        }

    @staticmethod
    def verify_patient_otp_and_login(
        db: Session, phone: str, otp: str, client_ip: str = "127.0.0.1", user_agent: Optional[str] = None
    ) -> TokenResponse:
        """Verify OTP and generate JWT tokens for patient."""
        clean_phone = phone.strip()
        if not verify_otp(clean_phone, otp.strip()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP. Please try again.",
            )

        patient = db.query(Patient).filter(Patient.primary_phone == clean_phone).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Phone number verified, but patient profile does not exist. Please register first.",
            )

        # Issue Tokens
        roles = [UserRoleEnum.PATIENT.value]
        access_token = create_access_token(
            subject=patient.id,
            roles=roles,
            extra_claims={"name": f"{patient.first_name} {patient.last_name}", "mrn": patient.hospital_mrn},
        )
        refresh_token = create_refresh_token(subject=patient.id, roles=roles)

        # Save session
        session_entry = UserSession(
            session_token_hash=hash_token(access_token),
            session_type=SessionTypeEnum.PATIENT_PORTAL,
            patient_id=patient.id,
            ip_address=client_ip,
            user_agent=user_agent,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        db.add(session_entry)
        db.commit()

        # Audit log
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.LOGIN,
            target_table="patients",
            target_record_id=patient.id,
            actor_user_id=patient.id,
            actor_role=UserRoleEnum.PATIENT.value,
            actor_name=f"{patient.first_name} {patient.last_name}",
            client_ip=client_ip,
            description="Patient successfully authenticated via OTP",
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user_id=patient.id,
            role=UserRoleEnum.PATIENT.value,
            name=f"{patient.first_name} {patient.last_name}",
            additional_info={"mrn": patient.hospital_mrn, "phone": patient.primary_phone},
        )

    @staticmethod
    def register_patient(
        db: Session, req: PatientRegisterRequest, client_ip: str = "127.0.0.1"
    ) -> TokenResponse:
        """Register a new patient and return session token."""
        existing = db.query(Patient).filter(Patient.primary_phone == req.primary_phone.strip()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient with phone {req.primary_phone} already registered. Please login.",
            )

        # Auto-generate unique MRN
        mrn_suffix = str(db.query(Patient).count() + 10001)
        hospital_mrn = f"MRN-{datetime.now().year}-{mrn_suffix}"

        dob = datetime.strptime(req.date_of_birth, "%Y-%m-%d").date()

        new_patient = Patient(
            national_health_id=req.national_health_id,
            hospital_mrn=hospital_mrn,
            first_name=req.first_name.strip(),
            middle_name=req.middle_name.strip() if req.middle_name else None,
            last_name=req.last_name.strip(),
            date_of_birth=dob,
            gender=req.gender,
            blood_group=req.blood_group,
            primary_phone=req.primary_phone.strip(),
            secondary_phone=req.secondary_phone,
            email=req.email,
            address_line1=req.address_line1,
            address_line2=req.address_line2,
            city=req.city,
            state_province=req.state_province,
            postal_code=req.postal_code,
            preferred_language=req.preferred_language,
            emergency_contact_name=req.emergency_contact_name,
            emergency_contact_phone=req.emergency_contact_phone,
            emergency_contact_relation=req.emergency_contact_relation,
        )

        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)

        # Issue tokens
        roles = [UserRoleEnum.PATIENT.value]
        access_token = create_access_token(
            subject=new_patient.id,
            roles=roles,
            extra_claims={"name": f"{new_patient.first_name} {new_patient.last_name}", "mrn": new_patient.hospital_mrn},
        )
        refresh_token = create_refresh_token(subject=new_patient.id, roles=roles)

        AuditService.log_event(
            db=db,
            action=AuditActionEnum.CREATE,
            target_table="patients",
            target_record_id=new_patient.id,
            actor_user_id=new_patient.id,
            actor_role=UserRoleEnum.PATIENT.value,
            actor_name=f"{new_patient.first_name} {new_patient.last_name}",
            client_ip=client_ip,
            description="New patient registration created",
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user_id=new_patient.id,
            role=UserRoleEnum.PATIENT.value,
            name=f"{new_patient.first_name} {new_patient.last_name}",
            additional_info={"mrn": new_patient.hospital_mrn},
        )

    @staticmethod
    def staff_login(
        db: Session,
        username_or_email: str,
        password: str,
        expected_role: Optional[UserRoleEnum] = None,
        client_ip: str = "127.0.0.1",
        user_agent: Optional[str] = None,
    ) -> TokenResponse:
        """Authenticate staff user (Doctor, Reception, Admin, Govt Admin)."""
        identifier = username_or_email.strip()
        user = db.query(User).filter(
            (User.username == identifier) | (User.email == identifier)
        ).first()

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username/email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled. Please contact administrator.",
            )

        if expected_role and user.user_type != expected_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User is registered as '{user.user_type.value}', not '{expected_role.value}'",
            )

        roles = [user.user_type.value]
        extra_claims = {
            "name": user.full_name,
            "hospital_id": user.hospital_id,
            "role": user.user_type.value,
        }
        if user.doctor_profile:
            extra_claims["doctor_id"] = user.doctor_profile.id

        access_token = create_access_token(subject=user.id, roles=roles, extra_claims=extra_claims)
        refresh_token = create_refresh_token(subject=user.id, roles=roles)

        # Save session
        session_entry = UserSession(
            session_token_hash=hash_token(access_token),
            session_type=SessionTypeEnum.DOCTOR_EHR if user.user_type == UserRoleEnum.DOCTOR else SessionTypeEnum.ADMIN_CONSOLE,
            user_id=user.id,
            ip_address=client_ip,
            user_agent=user_agent,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        db.add(session_entry)
        db.commit()

        # Audit log
        AuditService.log_event(
            db=db,
            action=AuditActionEnum.LOGIN,
            target_table="users",
            target_record_id=user.id,
            actor_user_id=user.id,
            actor_role=user.user_type.value,
            actor_name=user.full_name,
            hospital_id=user.hospital_id,
            client_ip=client_ip,
            description=f"Staff user logged in as {user.user_type.value}",
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user_id=user.id,
            role=user.user_type.value,
            name=user.full_name,
            hospital_id=user.hospital_id,
            additional_info={"doctor_id": user.doctor_profile.id if user.doctor_profile else None},
        )

    @staticmethod
    def refresh_access_token(db: Session, refresh_token_str: str) -> TokenResponse:
        """Issue new access token from valid refresh token."""
        try:
            payload = decode_token(refresh_token_str)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid refresh token: {e}",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token provided is not a refresh token",
            )

        user_id = payload.get("sub")
        roles = payload.get("roles", [])
        primary_role = roles[0] if roles else "UNKNOWN"

        if primary_role == UserRoleEnum.PATIENT.value:
            patient = db.query(Patient).filter(Patient.id == user_id).first()
            if not patient or not patient.is_active:
                raise HTTPException(status_code=401, detail="Patient account not found")
            access_token = create_access_token(
                subject=patient.id, roles=roles, extra_claims={"name": f"{patient.first_name} {patient.last_name}"}
            )
            name = f"{patient.first_name} {patient.last_name}"
            hospital_id = None
        else:
            user = db.query(User).filter(User.id == user_id).first()
            if not user or not user.is_active:
                raise HTTPException(status_code=401, detail="User account not found")
            access_token = create_access_token(
                subject=user.id, roles=roles, extra_claims={"name": user.full_name, "hospital_id": user.hospital_id}
            )
            name = user.full_name
            hospital_id = user.hospital_id

        new_refresh = create_refresh_token(subject=user_id, roles=roles)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh,
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            user_id=user_id,
            role=primary_role,
            name=name,
            hospital_id=hospital_id,
        )
