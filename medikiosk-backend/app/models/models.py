import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Numeric,
    DateTime,
    Date,
    Text,
    ForeignKey,
    JSON,
    Index,
    Enum as SAEnum,
    UniqueConstraint,
    CheckConstraint,
    Table,
)
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


def generate_uuid_str() -> str:
    """Generate string UUID (UUID4 fallback/standard for cross-DB compatibility)."""
    return str(uuid.uuid4())


# ---------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------
class UserRoleEnum(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    RECEPTIONIST = "RECEPTIONIST"
    HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
    GOVERNMENT_ADMIN = "GOVERNMENT_ADMIN"
    KIOSK_OPERATOR = "KIOSK_OPERATOR"


class GenderEnum(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    UNDISCLOSED = "UNDISCLOSED"


class BloodGroupEnum(str, enum.Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"
    UNKNOWN = "UNKNOWN"


class AppointmentStatusEnum(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    CONFIRMED = "CONFIRMED"
    CHECKED_IN = "CHECKED_IN"
    IN_CONSULTATION = "IN_CONSULTATION"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class VisitStatusEnum(str, enum.Enum):
    INITIATED = "INITIATED"
    TRIAGE_PENDING = "TRIAGE_PENDING"
    TRIAGE_COMPLETE = "TRIAGE_COMPLETE"
    IN_QUEUE = "IN_QUEUE"
    DOCTOR_REVIEW = "DOCTOR_REVIEW"
    EMERGENCY_ESCALATED = "EMERGENCY_ESCALATED"
    DISCHARGED = "DISCHARGED"
    ABANDONED = "ABANDONED"


class TriageLevelEnum(str, enum.Enum):
    ESI_1_RESUSCITATION = "ESI_1_RESUSCITATION"
    ESI_2_EMERGENT = "ESI_2_EMERGENT"
    ESI_3_URGENT = "ESI_3_URGENT"
    ESI_4_LESS_URGENT = "ESI_4_LESS_URGENT"
    ESI_5_NON_URGENT = "ESI_5_NON_URGENT"


class QueueStatusEnum(str, enum.Enum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    IN_ROOM = "IN_ROOM"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    EMERGENCY_BYPASS = "EMERGENCY_BYPASS"


class ConsentTypeEnum(str, enum.Enum):
    DATA_STORAGE = "DATA_STORAGE"
    EHR_SYNC = "EHR_SYNC"
    TELECONSULT_SHARING = "TELECONSULT_SHARING"
    RESEARCH_ANONYMIZED = "RESEARCH_ANONYMIZED"
    DOCTOR_ACCESS = "DOCTOR_ACCESS"
    EMERGENCY_OVERRIDE = "EMERGENCY_OVERRIDE"


class ConsentStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    GRANTED = "GRANTED"
    REJECTED = "REJECTED"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"


class AuditActionEnum(str, enum.Enum):
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    DOCTOR_VIEW_RECORD = "DOCTOR_VIEW_RECORD"
    DOCTOR_UPDATE_RECORD = "DOCTOR_UPDATE_RECORD"
    DOCTOR_DOWNLOAD_REPORT = "DOCTOR_DOWNLOAD_REPORT"
    CONSENT_GIVEN = "CONSENT_GIVEN"
    CONSENT_REVOKED = "CONSENT_REVOKED"
    CONSENT_REJECTED = "CONSENT_REJECTED"
    EMERGENCY_BYPASS = "EMERGENCY_BYPASS"
    LOGIN = "LOGIN"


class ReportTypeEnum(str, enum.Enum):
    LAB_BIOCHEMISTRY = "LAB_BIOCHEMISTRY"
    LAB_HEMATOLOGY = "LAB_HEMATOLOGY"
    RADIOLOGY_XRAY = "RADIOLOGY_XRAY"
    RADIOLOGY_CT = "RADIOLOGY_CT"
    RADIOLOGY_MRI = "RADIOLOGY_MRI"
    ECG_TRACE = "ECG_TRACE"
    PATHOLOGY = "PATHOLOGY"
    PREVIOUS_PRESCRIPTION = "PREVIOUS_PRESCRIPTION"
    DISCHARGE_SUMMARY = "DISCHARGE_SUMMARY"
    OTHER = "OTHER"


class OCRStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    MANUALLY_CORRECTED = "MANUALLY_CORRECTED"


class MedicineFormEnum(str, enum.Enum):
    TABLET = "TABLET"
    CAPSULE = "CAPSULE"
    SYRUP = "SYRUP"
    INJECTION = "INJECTION"
    OINTMENT = "OINTMENT"
    DROPS = "DROPS"
    INHALER = "INHALER"
    PATCH = "PATCH"


class IntakeFrequencyEnum(str, enum.Enum):
    ONCE_DAILY = "ONCE_DAILY"
    TWICE_DAILY = "TWICE_DAILY"
    THRICE_DAILY = "THRICE_DAILY"
    FOUR_TIMES_DAILY = "FOUR_TIMES_DAILY"
    EVERY_4_HOURS = "EVERY_4_HOURS"
    EVERY_6_HOURS = "EVERY_6_HOURS"
    EVERY_8_HOURS = "EVERY_8_HOURS"
    AS_NEEDED_PRN = "AS_NEEDED_PRN"
    STAT_IMMEDIATE = "STAT_IMMEDIATE"


class NotificationChannelEnum(str, enum.Enum):
    SMS = "SMS"
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    PUSH = "PUSH"
    IN_APP = "IN_APP"
    KIOSK_AUDIO = "KIOSK_AUDIO"
    CRASH_PAGER = "CRASH_PAGER"


class NotificationStatusEnum(str, enum.Enum):
    QUEUED = "QUEUED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    READ = "READ"


class SessionTypeEnum(str, enum.Enum):
    KIOSK_HARDWARE = "KIOSK_HARDWARE"
    PATIENT_PORTAL = "PATIENT_PORTAL"
    DOCTOR_EHR = "DOCTOR_EHR"
    ADMIN_CONSOLE = "ADMIN_CONSOLE"
    RECEPTION_DESK = "RECEPTION_DESK"


# ---------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    license_number = Column(String(100), nullable=False, unique=True)
    facility_type = Column(String(100), nullable=False, default="TERTIARY_HOSPITAL")
    address_street = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    state_province = Column(String(100), nullable=False, index=True)
    postal_code = Column(String(20), nullable=False)
    country_iso = Column(String(3), nullable=False, default="IND")
    phone_primary = Column(String(20), nullable=False)
    email_contact = Column(String(255), nullable=False)
    geo_latitude = Column(Numeric(9, 6), nullable=True)
    geo_longitude = Column(Numeric(9, 6), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    departments = relationship("Department", back_populates="hospital", cascade="all, delete-orphan")
    doctors = relationship("Doctor", back_populates="hospital")
    kiosks = relationship("KioskDevice", back_populates="hospital")
    visits = relationship("Visit", back_populates="hospital")


class Department(Base):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(50), nullable=False)
    name = Column(String(150), nullable=False)
    specialty_type = Column(String(100), nullable=False, index=True)
    floor_location = Column(String(50), nullable=True)
    wing_block = Column(String(50), nullable=True)
    is_emergency_dept = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("hospital_id", "code", name="uq_hospital_dept_code"),)

    # Relationships
    hospital = relationship("Hospital", back_populates="departments")
    doctors = relationship("DoctorDepartment", back_populates="department")
    visits = relationship("Visit", back_populates="department")


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    users = relationship("User", back_populates="role")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    code = Column(String(100), nullable=False, unique=True, index=True)
    module = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    roles = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(String(36), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    granted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="roles")


class User(Base):
    """System authentication user record (Doctor, Reception, Admin, Govt Admin)."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True, index=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20), nullable=True)
    user_type = Column(SAEnum(UserRoleEnum), nullable=False, default=UserRoleEnum.DOCTOR)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    role = relationship("Role", back_populates="users")
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False, index=True)
    license_registration_number = Column(String(100), nullable=False, unique=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    primary_specialty = Column(String(100), nullable=False, index=True)
    qualifications = Column(JSON, nullable=True, default=list)
    years_of_experience = Column(Integer, default=0)
    consultation_room_number = Column(String(50), nullable=True)
    is_available = Column(Boolean, nullable=False, default=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    hospital = relationship("Hospital", back_populates="doctors")
    departments = relationship("DoctorDepartment", back_populates="doctor", cascade="all, delete-orphan")
    visits = relationship("Visit", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")
    diagnoses = relationship("Diagnosis", back_populates="doctor")


class DoctorDepartment(Base):
    __tablename__ = "doctor_departments"

    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="CASCADE"), primary_key=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), primary_key=True)
    is_primary_department = Column(Boolean, nullable=False, default=True)
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    doctor = relationship("Doctor", back_populates="departments")
    department = relationship("Department", back_populates="doctors")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    national_health_id = Column(String(100), unique=True, index=True, nullable=True)  # ABHA / NHS
    hospital_mrn = Column(String(100), nullable=False, unique=True, index=True)
    first_name = Column(String(100), nullable=False)
    middle_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    gender = Column(SAEnum(GenderEnum), nullable=False)
    blood_group = Column(SAEnum(BloodGroupEnum), nullable=False, default=BloodGroupEnum.UNKNOWN)
    primary_phone = Column(String(20), nullable=False, unique=True, index=True)
    secondary_phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address_line1 = Column(String(255), nullable=False)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=False, index=True)
    state_province = Column(String(100), nullable=False, index=True)
    postal_code = Column(String(20), nullable=False)
    country_iso = Column(String(3), nullable=False, default="IND")
    emergency_contact_name = Column(String(150), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)
    preferred_language = Column(String(10), nullable=False, default="en-US")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    visits = relationship("Visit", back_populates="patient", cascade="all, delete-orphan")
    medical_histories = relationship("MedicalHistory", back_populates="patient", cascade="all, delete-orphan")
    consents = relationship("Consent", back_populates="patient", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="patient")
    reports = relationship("MedicalReport", back_populates="patient")
    intake_schedules = relationship("MedicineIntakeSchedule", back_populates="patient")
    ai_intake_reports = relationship("AIIntakeReport", back_populates="patient", cascade="all, delete-orphan")


class AIIntakeReport(Base):
    __tablename__ = "ai_intake_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    report_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_ai_intake_reports_patient_created_at", "patient_id", "created_at"),
    )

    patient = relationship("Patient", back_populates="ai_intake_reports")


class KioskDevice(Base):
    __tablename__ = "kiosk_devices"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    device_serial_number = Column(String(100), nullable=False, unique=True, index=True)
    hardware_mac_address = Column(String(17), nullable=False, unique=True)
    ip_address = Column(String(45), nullable=True)
    firmware_version = Column(String(50), nullable=False, default="1.0.0")
    kiosk_model = Column(String(100), nullable=False, default="MediKiosk-Pro-X")
    installation_location = Column(String(150), nullable=False)
    is_online = Column(Boolean, nullable=False, default=True)
    last_heartbeat_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status_flags = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    hospital = relationship("Hospital", back_populates="kiosks")
    visits = relationship("Visit", back_populates="kiosk")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    session_token_hash = Column(String(64), nullable=False, unique=True, index=True)
    session_type = Column(SAEnum(SessionTypeEnum), nullable=False)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    kiosk_id = Column(String(36), ForeignKey("kiosk_devices.id", ondelete="CASCADE"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=False, default="127.0.0.1")
    user_agent = Column(Text, nullable=True)
    jwt_claims = Column(JSON, default=dict)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    appointment_number = Column(String(50), nullable=False, unique=True, index=True)
    scheduled_start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    scheduled_end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(SAEnum(AppointmentStatusEnum), nullable=False, default=AppointmentStatusEnum.SCHEDULED, index=True)
    chief_complaint_summary = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Visit(Base):
    """Clinical encounter / intake session."""
    __tablename__ = "visits"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    visit_number = Column(String(50), nullable=False, unique=True, index=True)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    kiosk_id = Column(String(36), ForeignKey("kiosk_devices.id", ondelete="SET NULL"), nullable=True)
    appointment_id = Column(String(36), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    visit_type = Column(String(50), nullable=False, default="OPD_WALKIN")
    status = Column(SAEnum(VisitStatusEnum), nullable=False, default=VisitStatusEnum.INITIATED, index=True)
    triage_level = Column(SAEnum(TriageLevelEnum), nullable=True, index=True)
    triage_score_reasoning = Column(Text, nullable=True)
    chief_complaint_raw = Column(Text, nullable=True)
    ai_soap_subjective = Column(Text, nullable=True)
    ai_soap_objective = Column(Text, nullable=True)
    ai_soap_assessment = Column(Text, nullable=True)
    ai_soap_plan = Column(Text, nullable=True)
    ai_confidence_score = Column(Numeric(4, 3), nullable=True)
    fhir_encounter_payload = Column(JSON, default=dict)
    admitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    triaged_at = Column(DateTime(timezone=True), nullable=True)
    doctor_seen_at = Column(DateTime(timezone=True), nullable=True)
    discharged_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    hospital = relationship("Hospital", back_populates="visits")
    department = relationship("Department", back_populates="visits")
    patient = relationship("Patient", back_populates="visits")
    doctor = relationship("Doctor", back_populates="visits")
    kiosk = relationship("KioskDevice", back_populates="visits")
    vitals = relationship("VitalsRecord", back_populates="visit", cascade="all, delete-orphan")
    queue_item = relationship("QueueItem", back_populates="visit", uselist=False, cascade="all, delete-orphan")
    diagnoses = relationship("Diagnosis", back_populates="visit", cascade="all, delete-orphan")
    prescriptions = relationship("Prescription", back_populates="visit", cascade="all, delete-orphan")
    reports = relationship("MedicalReport", back_populates="visit", cascade="all, delete-orphan")


class VitalsRecord(Base):
    __tablename__ = "vitals_records"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    visit_id = Column(String(36), ForeignKey("visits.id", ondelete="CASCADE"), nullable=True, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    kiosk_id = Column(String(36), ForeignKey("kiosk_devices.id", ondelete="SET NULL"), nullable=True)
    systolic_bp = Column(Numeric(5, 2), nullable=True)
    diastolic_bp = Column(Numeric(5, 2), nullable=True)
    mean_arterial_pressure = Column(Numeric(5, 2), nullable=True)
    heart_rate_bpm = Column(Numeric(5, 2), nullable=True)
    respiratory_rate_bpm = Column(Numeric(4, 1), nullable=True)
    oxygen_saturation_spo2 = Column(Numeric(4, 1), nullable=True)
    body_temperature_celsius = Column(Numeric(4, 2), nullable=True)
    body_weight_kg = Column(Numeric(5, 2), nullable=True)
    body_height_cm = Column(Numeric(5, 2), nullable=True)
    calculated_bmi = Column(Numeric(4, 2), nullable=True)
    ecg_rhythm_summary = Column(String(100), nullable=True)
    raw_sensor_waveforms = Column(JSON, default=dict)
    is_emergency_triggered = Column(Boolean, nullable=False, default=False, index=True)
    sensor_fault_flags = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    visit = relationship("Visit", back_populates="vitals")


class QueueItem(Base):
    __tablename__ = "queue"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    visit_id = Column(String(36), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, unique=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    token_display_number = Column(String(20), nullable=False)
    priority_order_score = Column(Integer, nullable=False, default=100, index=True)
    queue_status = Column(SAEnum(QueueStatusEnum), nullable=False, default=QueueStatusEnum.WAITING, index=True)
    called_at = Column(DateTime(timezone=True), nullable=True)
    room_entered_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    visit = relationship("Visit", back_populates="queue_item")


class MedicalHistory(Base):
    __tablename__ = "medical_histories"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    history_type = Column(String(50), nullable=False)  # CHRONIC_CONDITION, ALLERGY, SURGICAL, FAMILY
    concept_snomed_code = Column(String(50), nullable=True)
    concept_icd10_code = Column(String(20), nullable=True)
    condition_name = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=True)
    diagnosed_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("Patient", back_populates="medical_histories")


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    visit_id = Column(String(36), ForeignKey("visits.id", ondelete="CASCADE"), nullable=True, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False, index=True)
    diagnosis_type = Column(String(50), nullable=False, default="PROVISIONAL")  # PROVISIONAL, FINAL, DIFFERENTIAL
    icd10_code = Column(String(20), nullable=False, index=True)
    snomed_ct_code = Column(String(50), nullable=True)
    diagnosis_name = Column(String(255), nullable=False)
    clinical_description = Column(Text, nullable=True)
    is_primary = Column(Boolean, nullable=False, default=True)
    confidence_percentage = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    visit = relationship("Visit", back_populates="diagnoses")
    doctor = relationship("Doctor", back_populates="diagnoses")


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    visit_id = Column(String(36), ForeignKey("visits.id", ondelete="CASCADE"), nullable=True, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    report_type = Column(SAEnum(ReportTypeEnum), nullable=False, default=ReportTypeEnum.LAB_BIOCHEMISTRY)
    title = Column(String(255), nullable=False)
    file_storage_uri = Column(Text, nullable=False)
    file_mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_sha256_checksum = Column(String(64), nullable=False)
    ai_summary = Column(Text, nullable=True)
    fhir_diagnostic_report_payload = Column(JSON, default=dict)
    is_confidential = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    visit = relationship("Visit", back_populates="reports")
    patient = relationship("Patient", back_populates="reports")
    ocr_result = relationship("OCRResult", back_populates="report", uselist=False, cascade="all, delete-orphan")


class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    medical_report_id = Column(String(36), ForeignKey("medical_reports.id", ondelete="CASCADE"), nullable=False, unique=True)
    ocr_engine_version = Column(String(50), nullable=False, default="Gemini-Vision-OCR-1.5")
    status = Column(SAEnum(OCRStatusEnum), nullable=False, default=OCRStatusEnum.PENDING)
    raw_extracted_text = Column(Text, nullable=True)
    confidence_score = Column(Numeric(4, 3), nullable=True)
    extracted_entities_json = Column(JSON, default=list)
    bounding_boxes_json = Column(JSON, default=dict)
    processing_duration_ms = Column(Integer, nullable=True)
    verified_by_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    report = relationship("MedicalReport", back_populates="ocr_result")


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    rxnorm_cui = Column(String(50), unique=True, nullable=True)
    brand_name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), nullable=False, index=True)
    form = Column(SAEnum(MedicineFormEnum), nullable=False, default=MedicineFormEnum.TABLET)
    strength = Column(String(100), nullable=False)
    manufacturer = Column(String(255), nullable=True)
    atc_code = Column(String(20), nullable=True)
    contraindications = Column(JSON, default=list)
    side_effects = Column(JSON, default=list)
    is_antibiotic = Column(Boolean, nullable=False, default=False)
    is_narcotic_controlled = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    prescription_items = relationship("PrescriptionItem", back_populates="medicine")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    prescription_number = Column(String(50), nullable=False, unique=True, index=True)
    visit_id = Column(String(36), ForeignKey("visits.id", ondelete="CASCADE"), nullable=True, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="RESTRICT"), nullable=False, index=True)
    digital_signature_hash = Column(Text, nullable=False)
    clinical_notes = Column(Text, nullable=True)
    is_dispensed = Column(Boolean, nullable=False, default=False)
    dispensed_at = Column(DateTime(timezone=True), nullable=True)
    fhir_medication_request_payload = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    visit = relationship("Visit", back_populates="prescriptions")
    patient = relationship("Patient", back_populates="prescriptions")
    doctor = relationship("Doctor", back_populates="prescriptions")
    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    prescription_id = Column(String(36), ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="RESTRICT"), nullable=False, index=True)
    dosage_instruction = Column(String(255), nullable=False)  # e.g., "1 tab after food"
    frequency = Column(SAEnum(IntakeFrequencyEnum), nullable=False, default=IntakeFrequencyEnum.TWICE_DAILY)
    duration_days = Column(Integer, nullable=False, default=5)
    total_quantity_prescribed = Column(Numeric(6, 2), nullable=False, default=10)
    special_intake_conditions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    prescription = relationship("Prescription", back_populates="items")
    medicine = relationship("Medicine", back_populates="prescription_items")
    schedules = relationship("MedicineIntakeSchedule", back_populates="prescription_item", cascade="all, delete-orphan")


class MedicineIntakeSchedule(Base):
    __tablename__ = "medicine_intake_schedules"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    prescription_item_id = Column(String(36), ForeignKey("prescription_items.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_intake_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    dosage_amount = Column(String(50), nullable=False)
    is_taken = Column(Boolean, nullable=False, default=False, index=True)
    actual_taken_timestamp = Column(DateTime(timezone=True), nullable=True)
    reminder_sent_count = Column(Integer, nullable=False, default=0)
    patient_adherence_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    prescription_item = relationship("PrescriptionItem", back_populates="schedules")
    patient = relationship("Patient", back_populates="intake_schedules")


class Consent(Base):
    __tablename__ = "consents"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True)
    visit_id = Column(String(36), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True, index=True)
    consent_type = Column(SAEnum(ConsentTypeEnum), nullable=False, default=ConsentTypeEnum.DOCTOR_ACCESS)
    status = Column(SAEnum(ConsentStatusEnum), nullable=False, default=ConsentStatusEnum.GRANTED, index=True)
    consent_version = Column(String(20), nullable=False, default="v1.0")
    granted_language = Column(String(10), nullable=False, default="en-US")
    digital_signature_blob = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=False, default="127.0.0.1")
    purpose = Column(Text, nullable=True)
    permission_minutes = Column(Integer, nullable=True, default=30)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("Patient", back_populates="consents")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_user_id = Column(String(36), nullable=True, index=True)
    actor_role = Column(String(50), nullable=False, default="SYSTEM", index=True)
    actor_name = Column(String(150), nullable=True)
    action = Column(SAEnum(AuditActionEnum), nullable=False, index=True)
    target_table = Column(String(100), nullable=False)
    target_record_id = Column(String(36), nullable=True, index=True)
    client_ip = Column(String(45), nullable=False, default="127.0.0.1")
    user_agent = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    previous_state_json = Column(JSON, nullable=True)
    new_state_json = Column(JSON, nullable=True)
    tamper_hash_chain = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False, index=True)
    channel = Column(SAEnum(NotificationChannelEnum), nullable=False, default=NotificationChannelEnum.IN_APP)
    status = Column(SAEnum(NotificationStatusEnum), nullable=False, default=NotificationStatusEnum.QUEUED, index=True)
    template_code = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    recipient_destination = Column(String(255), nullable=False)
    payload_json = Column(JSON, default=dict)
    retry_count = Column(Integer, nullable=False, default=0)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class CentralHealthRecord(Base):
    """National centralized patient EHR snapshot, synced after every clinical event."""
    __tablename__ = "central_health_records"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    patient_display_id = Column(String(50), nullable=True, index=True)
    snapshot_json = Column(JSON, nullable=False, default=dict)
    last_event_type = Column(String(50), nullable=True)
    last_hospital_id = Column(String(36), nullable=True)
    last_synced_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class GovernmentAnalytics(Base):
    __tablename__ = "government_analytics"

    id = Column(String(36), primary_key=True, default=generate_uuid_str)
    reporting_date = Column(Date, nullable=False, index=True)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="RESTRICT"), nullable=False, index=True)
    district_code = Column(String(50), nullable=False, index=True)
    state_province = Column(String(100), nullable=False, index=True)
    syndromic_icd10_category = Column(String(50), nullable=False, index=True)  # RESPIRATORY_ILI, FEBRILE, GASTRO
    patient_age_group = Column(String(20), nullable=False)  # 0-5, 6-17, 18-45, 46-65, 65+
    patient_gender = Column(SAEnum(GenderEnum), nullable=False)
    total_case_count = Column(Integer, nullable=False, default=0)
    emergency_escalated_count = Column(Integer, nullable=False, default=0)
    avg_vitals_summary = Column(JSON, default=dict)
    geo_quadkey = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
