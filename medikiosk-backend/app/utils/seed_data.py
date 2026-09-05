from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.models import (
    Role,
    Permission,
    RolePermission,
    Hospital,
    Department,
    User,
    Doctor,
    DoctorDepartment,
    Patient,
    KioskDevice,
    Medicine,
    UserRoleEnum,
    GenderEnum,
    BloodGroupEnum,
    MedicineFormEnum,
)


def seed_initial_database(db: Session):
    """Seed baseline roles, permissions, hospital, demo staff accounts, medicines, and demo patient."""
    # 1. Seed Roles
    roles_data = [
        ("PATIENT", "Patient User", "Patient portal self-service access"),
        ("DOCTOR", "Consulting Physician", "Clinical review, diagnosis, and prescription authority"),
        ("RECEPTIONIST", "Front Desk Operator", "OPD registration and queue dispatch"),
        ("HOSPITAL_ADMIN", "Hospital Super Admin", "Hospital operational management"),
        ("GOVERNMENT_ADMIN", "Public Health Officer", "National epidemiological syndromic surveillance"),
        ("KIOSK_OPERATOR", "Kiosk Device Daemon", "Automated physical kiosk terminal ingestion"),
    ]

    roles_map = {}
    for code, name, desc in roles_data:
        role = db.query(Role).filter(Role.code == code).first()
        if not role:
            role = Role(code=code, name=name, description=desc, is_system_role=True)
            db.add(role)
            db.commit()
            db.refresh(role)
        roles_map[code] = role

    # 2. Seed Hospital
    hospital = db.query(Hospital).filter(Hospital.code == "HOSP-BLR-01").first()
    if not hospital:
        hospital = Hospital(
            code="HOSP-BLR-01",
            name="Apollo MediKiosk Central Hospital",
            license_number="LIC-MED-2026-98213",
            facility_type="TERTIARY_HOSPITAL",
            address_street="14/2 Bannerghatta Main Road",
            city="Bengaluru",
            state_province="Karnataka",
            postal_code="560076",
            country_iso="IND",
            phone_primary="+91-80-26300000",
            email_contact="contact@blr.apollo.medikiosk.ai",
            geo_latitude=12.8945,
            geo_longitude=77.5982,
        )
        db.add(hospital)
        db.commit()
        db.refresh(hospital)

    # 3. Seed Departments
    depts_data = [
        ("GEN", "General Medicine OPD", "General Medicine", "Floor 1", "Block A", False),
        ("CARD", "Cardiology & Thoracic Care", "Cardiology", "Floor 2", "Block B", False),
        ("EMERG", "Emergency & Trauma Bay", "Emergency Medicine", "Ground Floor", "Trauma Wing", True),
        ("PED", "Pediatrics & Neonatology", "Pediatrics", "Floor 3", "Block A", False),
        ("ORTHO", "Orthopedics & Joint Clinic", "Orthopedics", "Floor 1", "Block C", False),
        ("GASTRO", "Gastroenterology & Hepato Care", "Gastroenterology", "Floor 2", "Block A", False),
    ]
    depts_map = {}
    for code, name, specialty, floor, wing, is_em in depts_data:
        dept = db.query(Department).filter(
            Department.hospital_id == hospital.id, Department.code == code
        ).first()
        if not dept:
            dept = Department(
                hospital_id=hospital.id,
                code=code,
                name=name,
                specialty_type=specialty,
                floor_location=floor,
                wing_block=wing,
                is_emergency_dept=is_em,
            )
            db.add(dept)
            db.commit()
            db.refresh(dept)
        depts_map[code] = dept

    # 4. Seed Kiosk Hardware Device
    kiosk = db.query(KioskDevice).filter(KioskDevice.device_serial_number == "MK-2026-X992").first()
    if not kiosk:
        kiosk = KioskDevice(
            hospital_id=hospital.id,
            department_id=depts_map["GEN"].id,
            device_serial_number="MK-2026-X992",
            hardware_mac_address="00:1A:2B:3C:4D:5E",
            ip_address="192.168.1.105",
            firmware_version="v2.4.1-PROD",
            kiosk_model="MediKiosk-Pro-X",
            installation_location="Lobby A - OPD Main Intake Bay",
            is_online=True,
        )
        db.add(kiosk)
        db.commit()

    # 5. Seed Staff Users
    # 5.1 Doctor 1: Dr. Rajesh Sharma (Cardiology)
    doc1_user = db.query(User).filter(User.username == "dr.sharma").first()
    if not doc1_user:
        doc1_user = User(
            hospital_id=hospital.id,
            role_id=roles_map["DOCTOR"].id,
            username="dr.sharma",
            email="dr.sharma@medikiosk.ai",
            hashed_password=get_password_hash("Doctor@123"),
            full_name="Dr. Rajesh Sharma",
            phone="+91-9876500001",
            user_type=UserRoleEnum.DOCTOR,
        )
        db.add(doc1_user)
        db.commit()
        db.refresh(doc1_user)

        doc1_profile = Doctor(
            user_id=doc1_user.id,
            hospital_id=hospital.id,
            license_registration_number="KMC-DOC-1988-7712",
            first_name="Rajesh",
            last_name="Sharma",
            primary_specialty="Cardiology",
            qualifications=["MBBS", "MD (General Medicine)", "DM (Cardiology)"],
            years_of_experience=16,
            consultation_room_number="Room 204",
            is_available=True,
        )
        db.add(doc1_profile)
        db.commit()
        db.refresh(doc1_profile)

        # Assign Dept
        db.add(DoctorDepartment(doctor_id=doc1_profile.id, department_id=depts_map["CARD"].id, is_primary_department=True))
        db.commit()

    # 5.2 Doctor 2: Dr. Anita Desai (Internal Medicine)
    doc2_user = db.query(User).filter(User.username == "dr.anita").first()
    if not doc2_user:
        doc2_user = User(
            hospital_id=hospital.id,
            role_id=roles_map["DOCTOR"].id,
            username="dr.anita",
            email="dr.anita@medikiosk.ai",
            hashed_password=get_password_hash("Doctor@123"),
            full_name="Dr. Anita Desai",
            phone="+91-9876500002",
            user_type=UserRoleEnum.DOCTOR,
        )
        db.add(doc2_user)
        db.commit()
        db.refresh(doc2_user)

        doc2_profile = Doctor(
            user_id=doc2_user.id,
            hospital_id=hospital.id,
            license_registration_number="KMC-DOC-2002-9981",
            first_name="Anita",
            last_name="Desai",
            primary_specialty="General Medicine",
            qualifications=["MBBS", "MD (Internal Medicine)"],
            years_of_experience=12,
            consultation_room_number="Room 102",
            is_available=True,
        )
        db.add(doc2_profile)
        db.commit()
        db.refresh(doc2_profile)

        db.add(DoctorDepartment(doctor_id=doc2_profile.id, department_id=depts_map["GEN"].id, is_primary_department=True))
        db.commit()

    # 5.3 Receptionist User
    rec_user = db.query(User).filter(User.username == "reception").first()
    if not rec_user:
        rec_user = User(
            hospital_id=hospital.id,
            role_id=roles_map["RECEPTIONIST"].id,
            username="reception",
            email="reception@medikiosk.ai",
            hashed_password=get_password_hash("Reception@123"),
            full_name="Pooja Verma (Reception Desk)",
            phone="+91-9876500003",
            user_type=UserRoleEnum.RECEPTIONIST,
        )
        db.add(rec_user)
        db.commit()

    # 5.4 Hospital Admin User
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            hospital_id=hospital.id,
            role_id=roles_map["HOSPITAL_ADMIN"].id,
            username="admin",
            email="admin@medikiosk.ai",
            hashed_password=get_password_hash("Admin@123"),
            full_name="Dr. Harish Rao (Medical Director)",
            phone="+91-9876500004",
            user_type=UserRoleEnum.HOSPITAL_ADMIN,
        )
        db.add(admin_user)
        db.commit()

    # 5.5 Government Health Admin User
    gov_user = db.query(User).filter(User.username == "govt.health").first()
    if not gov_user:
        gov_user = User(
            hospital_id=None,
            role_id=roles_map["GOVERNMENT_ADMIN"].id,
            username="govt.health",
            email="govt.health@medikiosk.ai",
            hashed_password=get_password_hash("Govt@123"),
            full_name="Dr. S. K. Murthy (State Epidemiologist)",
            phone="+91-9876500005",
            user_type=UserRoleEnum.GOVERNMENT_ADMIN,
        )
        db.add(gov_user)
        db.commit()

    # 6. Seed Medicines Formulary
    meds_data = [
        ("Augmentin 625 Duo", "Amoxicillin and Clavulanate Potassium", MedicineFormEnum.TABLET, "625 mg", "GSK", "313782", True, False),
        ("Dolo 650", "Paracetamol", MedicineFormEnum.TABLET, "650 mg", "Micro Labs", "161", False, False),
        ("Glycomet 500 SR", "Metformin Hydrochloride", MedicineFormEnum.TABLET, "500 mg", "USV", "6809", False, False),
        ("Pan 40", "Pantoprazole Sodium", MedicineFormEnum.TABLET, "40 mg", "Alkem", "40790", False, False),
        ("Azithral 500", "Azithromycin", MedicineFormEnum.TABLET, "500 mg", "Alembic", "18631", True, False),
        ("Atorva 20", "Atorvastatin Calcium", MedicineFormEnum.TABLET, "20 mg", "Zydus", "83367", False, False),
        ("Amlong 5", "Amlodipine Besylate", MedicineFormEnum.TABLET, "5 mg", "Micro Labs", "17767", False, False),
        ("Montair LC", "Montelukast and Levocetirizine", MedicineFormEnum.TABLET, "10 mg / 5 mg", "Cipla", "351389", False, False),
    ]

    for brand, generic, form, strength, mfg, rx, is_ab, is_narc in meds_data:
        med = db.query(Medicine).filter(Medicine.brand_name == brand).first()
        if not med:
            med = Medicine(
                brand_name=brand,
                generic_name=generic,
                form=form,
                strength=strength,
                manufacturer=mfg,
                rxnorm_cui=rx,
                is_antibiotic=is_ab,
                is_narcotic_controlled=is_narc,
            )
            db.add(med)
    db.commit()

    # 7. Seed Demo Patient
    demo_patient = db.query(Patient).filter(Patient.primary_phone == "9876543210").first()
    if not demo_patient:
        demo_patient = Patient(
            national_health_id="ABHA-2026-9921-4412",
            hospital_mrn="MRN-2026-10001",
            first_name="Vikram",
            middle_name="R.",
            last_name="Malhotra",
            date_of_birth=date(1985, 6, 15),
            gender=GenderEnum.MALE,
            blood_group=BloodGroupEnum.B_POS,
            primary_phone="9876543210",
            email="vikram.malhotra@example.com",
            address_line1="Apartment 302, Prestige Palms",
            city="Bengaluru",
            state_province="Karnataka",
            postal_code="560076",
            preferred_language="en-US",
            emergency_contact_name="Sunita Malhotra",
            emergency_contact_phone="9876543211",
            emergency_contact_relation="Spouse",
        )
        db.add(demo_patient)
        db.commit()
