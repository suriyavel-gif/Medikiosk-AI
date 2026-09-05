"""
MediKiosk AI — Comprehensive Interconnected Large Demo Dataset Generator
Seeds:
- 10 Hospitals (across Karnataka districts)
- 50 Doctors (with User accounts, specialty departments, consultation rooms)
- 300 Patients (with demographics, ABHA IDs, MRNs, Medical History & Allergies)
- 500 Visits / Encounters (with Vitals, AI SOAP notes, ESI 1-5 Triage, Queue items, Diagnoses)
- 500 Prescriptions (with Prescription Items, Dosage Instructions & Intake Schedules)
- 100 Lab Reports & Scans (with OCR Results, Biomarker Entities & Gemini AI Summaries)
- 1000+ Tamper-Evident Audit Logs (SHA-256 chained)
- 300+ Consent Records (Active, Granted, Expired)
- 200+ Government Syndromic Surveillance Cluster Records
"""

import hashlib
import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    Role,
    Permission,
    Hospital,
    Department,
    User,
    Doctor,
    DoctorDepartment,
    Patient,
    KioskDevice,
    Visit,
    VitalsRecord,
    QueueItem,
    MedicalHistory,
    Diagnosis,
    MedicalReport,
    OCRResult,
    Medicine,
    Prescription,
    PrescriptionItem,
    MedicineIntakeSchedule,
    Consent,
    AuditLog,
    Notification,
    GovernmentAnalytics,
    UserRoleEnum,
    GenderEnum,
    BloodGroupEnum,
    TriageLevelEnum,
    VisitStatusEnum,
    QueueStatusEnum,
    MedicineFormEnum,
    IntakeFrequencyEnum,
    ReportTypeEnum,
    OCRStatusEnum,
    ConsentTypeEnum,
    ConsentStatusEnum,
    AuditActionEnum,
    NotificationChannelEnum,
    NotificationStatusEnum,
)

# Deterministic random seed for reproducibility
random.seed(42)


def generate_sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


# -----------------------------------------------------------------------------
# 1. Realistic Reference Data Catalogs
# -----------------------------------------------------------------------------

DISTRICTS = [
    {"code": "KA-BLR-U", "name": "Bengaluru Urban", "city": "Bengaluru", "lat": 12.9716, "lng": 77.5946, "pin": "560001"},
    {"code": "KA-BLR-R", "name": "Bengaluru Rural", "city": "Nelamangala", "lat": 13.0970, "lng": 77.3910, "pin": "562123"},
    {"code": "KA-MYS", "name": "Mysuru", "city": "Mysuru", "lat": 12.2958, "lng": 76.6394, "pin": "570001"},
    {"code": "KA-DHA", "name": "Hubballi-Dharwad", "city": "Hubballi", "lat": 15.3647, "lng": 75.1240, "pin": "580020"},
    {"code": "KA-BEL", "name": "Belagavi", "city": "Belagavi", "lat": 15.8497, "lng": 74.4977, "pin": "590001"},
    {"code": "KA-DKA", "name": "Dakshina Kannada", "city": "Mangaluru", "lat": 12.9141, "lng": 74.8560, "pin": "575001"},
    {"code": "KA-KLB", "name": "Kalaburagi", "city": "Kalaburagi", "lat": 17.3297, "lng": 76.8343, "pin": "585101"},
    {"code": "KA-SHI", "name": "Shivamogga", "city": "Shivamogga", "lat": 13.9299, "lng": 75.5681, "pin": "577201"},
    {"code": "KA-BAL", "name": "Ballari", "city": "Ballari", "lat": 15.1394, "lng": 76.9214, "pin": "583101"},
    {"code": "KA-TUM", "name": "Tumakuru", "city": "Tumakuru", "lat": 13.3379, "lng": 77.1173, "pin": "572101"},
]

HOSPITAL_NAMES = [
    ("Apollo MediKiosk Central Hospital", "TERTIARY_HOSPITAL"),
    ("Victoria Memorial Government Hospital", "TERTIARY_HOSPITAL"),
    ("Bowring & Lady Curzon Hospital", "DISTRICT_HOSPITAL"),
    ("KR Hospital & Medical Research Institute", "TERTIARY_HOSPITAL"),
    ("KIMS Super Specialty Medical Center", "TERTIARY_HOSPITAL"),
    ("Belagavi District Civil Hospital", "DISTRICT_HOSPITAL"),
    ("Wenlock District Government Hospital", "DISTRICT_HOSPITAL"),
    ("Kalaburagi Institute of Medical Sciences", "TERTIARY_HOSPITAL"),
    ("McGann Teaching District Hospital", "DISTRICT_HOSPITAL"),
    ("Vijayanagar Institute of Medical Sciences", "DISTRICT_HOSPITAL"),
]

DEPARTMENTS_CATALOG = [
    ("GEN", "General Medicine OPD", "General Medicine", "Floor 1", "Block A", False),
    ("CARD", "Cardiology & Thoracic Care", "Cardiology", "Floor 2", "Block B", False),
    ("EMERG", "Emergency & Trauma Resuscitation", "Emergency Medicine", "Ground Floor", "Trauma Wing", True),
    ("PED", "Pediatrics & Child Health", "Pediatrics", "Floor 3", "Block A", False),
    ("ORTHO", "Orthopedics & Joint Care", "Orthopedics", "Floor 1", "Block C", False),
    ("GASTRO", "Gastroenterology & Hepatology", "Gastroenterology", "Floor 2", "Block A", False),
    ("PULM", "Pulmonology & Chest Clinic", "Pulmonology", "Floor 3", "Block B", False),
    ("OBGYN", "Obstetrics & Gynecology", "Obstetrics & Gynecology", "Floor 2", "Block C", False),
]

INDIAN_FIRST_NAMES_MALE = [
    "Aarav", "Aditya", "Ajay", "Amit", "Anand", "Anil", "Arjun", "Ashok", "Chetan", "Deepak",
    "Dinesh", "Ganesh", "Girish", "Harish", "Hemant", "Jagdish", "Karthik", "Kiran", "Krishna",
    "Mahesh", "Manish", "Manoj", "Mukesh", "Naveen", "Nikhil", "Pankaj", "Pradeep", "Prakash",
    "Prashant", "Rahul", "Rajesh", "Rakesh", "Ramesh", "Ravi", "Rohan", "Sachin", "Sameer",
    "Sanjay", "Santosh", "Siddharth", "Suresh", "Tarun", "Umesh", "Varun", "Vijay", "Vikas",
    "Vikram", "Vinay", "Vishal", "Vivek"
]

INDIAN_FIRST_NAMES_FEMALE = [
    "Aadhya", "Ananya", "Anjali", "Anita", "Aparna", "Archana", "Bhavana", "Deepa", "Divya",
    "Geeta", "Indira", "Jyoti", "Kavita", "Kavya", "Lalitha", "Madhuri", "Manjula", "Meena",
    "Meera", "Namrata", "Neha", "Nisha", "Pallavi", "Pooja", "Pratibha", "Priya", "Radha",
    "Rashmi", "Rekha", "Ritu", "Roopa", "Sandhya", "Sangeeta", "Sarita", "Shalini", "Shashi",
    "Shilpa", "Shobha", "Shruti", "Sneha", "Sowmya", "Sujatha", "Sunita", "Sushma", "Swati",
    "Tanvi", "Uma", "Vaishali", "Varsha", "Vidya"
]

INDIAN_LAST_NAMES = [
    "Acharya", "Adiga", "Agarwal", "Bhat", "Desai", "Deshpande", "Gowda", "Hegde", "Iyengar",
    "Jain", "Joshi", "Kamath", "Kulkarni", "Kumar", "Malhotra", "Mehta", "Mishra", "Murthy",
    "Naik", "Nair", "Patil", "Pillai", "Prasad", "Rai", "Rao", "Reddy", "Sharma", "Shetty",
    "Singh", "Srinivasan", "Verma"
]

CHIEF_COMPLAINTS = [
    ("Acute retrosternal chest pain radiating to left arm with diaphoresis", TriageLevelEnum.ESI_1_RESUSCITATION, "CARD", "I20.9", "Angina pectoris, unspecified"),
    ("Severe respiratory distress, stridor, and SpO2 86% on room air", TriageLevelEnum.ESI_1_RESUSCITATION, "EMERG", "J45.9", "Status asthmaticus / Acute bronchospasm"),
    ("High grade fever (103.5°F) with rigors, severe retro-orbital headache and thrombocytopenia", TriageLevelEnum.ESI_2_EMERGENT, "GEN", "A90", "Dengue fever (classical dengue)"),
    ("Acute persistent upper right quadrant abdominal pain with postprandial vomiting", TriageLevelEnum.ESI_2_EMERGENT, "GASTRO", "K80.2", "Calculus of gallbladder without cholecystitis"),
    ("Productive cough for 6 days with purulent sputum, low grade fever and wheezing", TriageLevelEnum.ESI_3_URGENT, "PULM", "J06.9", "Acute upper respiratory infection"),
    ("Polydipsia, polyuria, blurred vision and fasting capillary blood glucose 280 mg/dL", TriageLevelEnum.ESI_3_URGENT, "GEN", "E11.9", "Type 2 diabetes mellitus without complications"),
    ("Persistent throbbing occipital headache, dizziness, seated BP 178/104 mmHg", TriageLevelEnum.ESI_3_URGENT, "GEN", "I10", "Essential (primary) hypertension"),
    ("Right knee pain, swelling and morning stiffness exacerbating on weight bearing", TriageLevelEnum.ESI_4_LESS_URGENT, "ORTHO", "M17.9", "Osteoarthritis of knee, unspecified"),
    ("Chronic lower backache radiating to right gluteal region after lifting weights", TriageLevelEnum.ESI_4_LESS_URGENT, "ORTHO", "M54.5", "Low back pain / Lumbago"),
    ("Watery diarrhea (5 episodes today) with mild diffuse crampy abdominal pain", TriageLevelEnum.ESI_4_LESS_URGENT, "GASTRO", "A09", "Infectious gastroenteritis and colitis"),
    ("Dry irritating cough and throat scratchiness without shortness of breath", TriageLevelEnum.ESI_5_NON_URGENT, "GEN", "J00", "Acute nasopharyngitis [common cold]"),
    ("Routine post-prandial health checkup and hypertension medication refill", TriageLevelEnum.ESI_5_NON_URGENT, "GEN", "Z00.0", "General adult medical examination"),
]

MEDICINES_CATALOG = [
    ("Augmentin 625 Duo", "Amoxicillin + Clavulanic Acid", MedicineFormEnum.TABLET, "625 mg", "GSK", "313782", True, "1 tablet twice daily after meals", IntakeFrequencyEnum.TWICE_DAILY),
    ("Dolo 650", "Paracetamol", MedicineFormEnum.TABLET, "650 mg", "Micro Labs", "161", False, "1 tablet thrice daily SOS for fever/pain", IntakeFrequencyEnum.THRICE_DAILY),
    ("Glycomet 500 SR", "Metformin Hydrochloride", MedicineFormEnum.TABLET, "500 mg", "USV", "6809", False, "1 tablet once daily with evening meal", IntakeFrequencyEnum.ONCE_DAILY),
    ("Pan 40", "Pantoprazole Sodium", MedicineFormEnum.TABLET, "40 mg", "Alkem", "40790", False, "1 tablet once daily early morning before breakfast", IntakeFrequencyEnum.ONCE_DAILY),
    ("Azithral 500", "Azithromycin", MedicineFormEnum.TABLET, "500 mg", "Alembic", "18631", True, "1 tablet once daily 1 hour before food for 5 days", IntakeFrequencyEnum.ONCE_DAILY),
    ("Atorva 20", "Atorvastatin Calcium", MedicineFormEnum.TABLET, "20 mg", "Zydus", "83367", False, "1 tablet once daily at bedtime", IntakeFrequencyEnum.ONCE_DAILY),
    ("Amlong 5", "Amlodipine Besylate", MedicineFormEnum.TABLET, "5 mg", "Micro Labs", "17767", False, "1 tablet once daily in the morning", IntakeFrequencyEnum.ONCE_DAILY),
    ("Telmisartan 40", "Telmisartan", MedicineFormEnum.TABLET, "40 mg", "Glenmark", "316153", False, "1 tablet once daily after breakfast", IntakeFrequencyEnum.ONCE_DAILY),
    ("Montair LC", "Montelukast + Levocetirizine", MedicineFormEnum.TABLET, "10 mg / 5 mg", "Cipla", "351389", False, "1 tablet once daily at night", IntakeFrequencyEnum.ONCE_DAILY),
    ("Ecosprin 75", "Aspirin (Enteric Coated)", MedicineFormEnum.TABLET, "75 mg", "USV", "1191", False, "1 tablet once daily after lunch", IntakeFrequencyEnum.ONCE_DAILY),
]


# -----------------------------------------------------------------------------
# Seeder Execution Function
# -----------------------------------------------------------------------------

def seed_large_demo_dataset(db: Session):
    print("[+] Starting MediKiosk AI Large Scale Interconnected Dataset Seeding...")

    # 1. Verify/Ensure Baseline Roles
    roles_data = [
        ("PATIENT", "Patient User", "Patient portal self-service access"),
        ("DOCTOR", "Consulting Physician", "Clinical review, diagnosis, and prescription authority"),
        ("RECEPTIONIST", "Front Desk Operator", "OPD registration and queue dispatch"),
        ("HOSPITAL_ADMIN", "Hospital Super Admin", "Hospital operational management"),
        ("GOVERNMENT_ADMIN", "Public Health Officer", "National epidemiological syndromic surveillance"),
    ]
    roles_map = {}
    for code, name, desc in roles_data:
        r = db.query(Role).filter(Role.code == code).first()
        if not r:
            r = Role(code=code, name=name, description=desc, is_system_role=True)
            db.add(r)
            db.commit()
            db.refresh(r)
        roles_map[code] = r

    # 2. Seed Medicines Formulary
    print("[+] Seeding Medicines formulary...")

    medicines_list = []
    for brand, gen, form, strength, mfg, rx, is_ab, _, _ in MEDICINES_CATALOG:
        med = db.query(Medicine).filter(Medicine.brand_name == brand).first()
        if not med:
            med = Medicine(
                brand_name=brand,
                generic_name=gen,
                form=form,
                strength=strength,
                manufacturer=mfg,
                rxnorm_cui=rx,
                is_antibiotic=is_ab,
            )
            db.add(med)
            db.commit()
            db.refresh(med)
        medicines_list.append(med)

    # 3. Seed 10 Hospitals & Departments
    print("[+] Seeding 10 Hospitals, 80 Departments & 30 Sentinel Kiosks...")
    hospitals_list = []
    departments_by_hospital = {}
    kiosks_list = []

    for i in range(10):
        h_name, h_type = HOSPITAL_NAMES[i]
        d_info = DISTRICTS[i]
        h_code = f"HOSP-{d_info['code']}-{i+1:02d}"

        hospital = db.query(Hospital).filter(Hospital.code == h_code).first()
        if not hospital:
            hospital = Hospital(
                code=h_code,
                name=h_name,
                license_number=f"LIC-KA-2026-{10000 + i}",
                facility_type=h_type,
                address_street=f"{10 + i * 4}, Medical College Road",
                city=d_info["city"],
                state_province="Karnataka",
                postal_code=d_info["pin"],
                country_iso="IND",
                phone_primary=f"+91-80-263000{i:02d}",
                email_contact=f"admin.{d_info['code'].lower()}@medikiosk.ai",
                geo_latitude=Decimal(str(d_info["lat"])),
                geo_longitude=Decimal(str(d_info["lng"])),
            )
            db.add(hospital)
            db.commit()
            db.refresh(hospital)
        hospitals_list.append(hospital)

        # Seed 8 Departments per Hospital
        departments_by_hospital[hospital.id] = []
        for d_code, d_name, d_spec, d_floor, d_wing, is_em in DEPARTMENTS_CATALOG:
            dept = db.query(Department).filter(
                Department.hospital_id == hospital.id, Department.code == d_code
            ).first()
            if not dept:
                dept = Department(
                    hospital_id=hospital.id,
                    code=d_code,
                    name=f"{d_name} ({hospital.city})",
                    specialty_type=d_spec,
                    floor_location=d_floor,
                    wing_block=d_wing,
                    is_emergency_dept=is_em,
                )
                db.add(dept)
                db.commit()
                db.refresh(dept)
            departments_by_hospital[hospital.id].append(dept)

        # Seed 2-4 Sentinel Kiosks per Hospital
        for k_idx in range(1, 4):
            k_sn = f"MK-2026-{d_info['code']}-{k_idx:02d}"
            kiosk = db.query(KioskDevice).filter(KioskDevice.device_serial_number == k_sn).first()
            if not kiosk:
                kiosk = KioskDevice(
                    hospital_id=hospital.id,
                    department_id=departments_by_hospital[hospital.id][0].id,
                    device_serial_number=k_sn,
                    hardware_mac_address=f"00:1A:2B:3C:{i:02X}:{k_idx:02X}",
                    ip_address=f"192.168.{i+1}.{100+k_idx}",
                    firmware_version="v2.4.2-PROD",
                    kiosk_model="MediKiosk-Pro-X",
                    installation_location=f"OPD Wing {k_idx} Intake Lobby",
                    is_online=True,
                )
                db.add(kiosk)
                db.commit()
                db.refresh(kiosk)
            kiosks_list.append(kiosk)

    # 4. Seed 50 Doctors (with User accounts, Profiles, Department Mappings)
    print("[+] Seeding 50 Doctors with user accounts and clinical credentials...")
    doctors_list = []
    hashed_doc_password = get_password_hash("Doctor@123")

    specialties_dist = [
        ("General Medicine", ["MBBS", "MD (Internal Medicine)"], "GEN"),
        ("Cardiology", ["MBBS", "MD", "DM (Cardiology)"], "CARD"),
        ("Emergency Medicine", ["MBBS", "MD (Emergency Medicine)", "FACEM"], "EMERG"),
        ("Pediatrics", ["MBBS", "MD (Pediatrics)", "DCH"], "PED"),
        ("Orthopedics", ["MBBS", "MS (Orthopedics)", "DNB"], "ORTHO"),
        ("Gastroenterology", ["MBBS", "MD", "DM (Gastroenterology)"], "GASTRO"),
        ("Pulmonology", ["MBBS", "MD (Pulmonary Medicine)"], "PULM"),
        ("Obstetrics & Gynecology", ["MBBS", "MS (OB/GYN)", "DGO"], "OBGYN"),
    ]

    for d_idx in range(50):
        h_idx = d_idx % len(hospitals_list)
        hospital = hospitals_list[h_idx]
        spec_info = specialties_dist[d_idx % len(specialties_dist)]
        spec_name, quals, dept_code = spec_info

        is_female = (d_idx % 2 == 1)
        first_name = INDIAN_FIRST_NAMES_FEMALE[d_idx % len(INDIAN_FIRST_NAMES_FEMALE)] if is_female else INDIAN_FIRST_NAMES_MALE[d_idx % len(INDIAN_FIRST_NAMES_MALE)]
        last_name = INDIAN_LAST_NAMES[d_idx % len(INDIAN_LAST_NAMES)]
        username = f"dr.{first_name.lower()}.{last_name.lower()}{d_idx+1}"
        email = f"dr.{first_name.lower()}.{last_name.lower()}@medikiosk.ai"
        license_num = f"KMC-DOC-20{10 + (d_idx % 15)}-{1000 + d_idx}"

        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(
                hospital_id=hospital.id,
                role_id=roles_map["DOCTOR"].id,
                username=username,
                email=email,
                hashed_password=hashed_doc_password,
                full_name=f"Dr. {first_name} {last_name}",
                phone=f"+91-98765{d_idx+1000:05d}",
                user_type=UserRoleEnum.DOCTOR,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        doc_profile = db.query(Doctor).filter(Doctor.user_id == user.id).first()
        if not doc_profile:
            doc_profile = Doctor(
                user_id=user.id,
                hospital_id=hospital.id,
                license_registration_number=license_num,
                first_name=first_name,
                last_name=last_name,
                primary_specialty=spec_name,
                qualifications=quals,
                years_of_experience=5 + (d_idx % 20),
                consultation_room_number=f"Room {100 + (d_idx % 30)}",
                is_available=True,
            )
            db.add(doc_profile)
            db.commit()
            db.refresh(doc_profile)

            # Link to Department
            target_dept = next((d for d in departments_by_hospital[hospital.id] if d.code == dept_code), departments_by_hospital[hospital.id][0])
            db.add(DoctorDepartment(doctor_id=doc_profile.id, department_id=target_dept.id, is_primary_department=True))
            db.commit()

        doctors_list.append(doc_profile)

    # 5. Seed 300 Patients (with Demographics, ABHA, MRN, Medical History)
    print("[+] Seeding 300 Patients with medical histories and allergies...")
    patients_list = []
    blood_groups = [
        BloodGroupEnum.A_POS, BloodGroupEnum.A_NEG, BloodGroupEnum.B_POS, BloodGroupEnum.B_NEG,
        BloodGroupEnum.O_POS, BloodGroupEnum.O_NEG, BloodGroupEnum.AB_POS, BloodGroupEnum.AB_NEG
    ]

    for p_idx in range(300):
        is_female = (p_idx % 2 == 1)
        first_name = INDIAN_FIRST_NAMES_FEMALE[p_idx % len(INDIAN_FIRST_NAMES_FEMALE)] if is_female else INDIAN_FIRST_NAMES_MALE[p_idx % len(INDIAN_FIRST_NAMES_MALE)]
        last_name = INDIAN_LAST_NAMES[(p_idx * 3) % len(INDIAN_LAST_NAMES)]
        phone = f"98765{p_idx+10000:05d}"
        d_info = DISTRICTS[p_idx % len(DISTRICTS)]
        birth_year = 1950 + (p_idx % 55)

        patient = db.query(Patient).filter(Patient.primary_phone == phone).first()
        if not patient:
            patient = Patient(
                national_health_id=f"ABHA-2026-{1000 + p_idx:04d}-{2000 + p_idx:04d}",
                hospital_mrn=f"MRN-KA-{2026}-{p_idx+10001:05d}",
                first_name=first_name,
                middle_name="R." if p_idx % 3 == 0 else None,
                last_name=last_name,
                date_of_birth=date(birth_year, (p_idx % 12) + 1, (p_idx % 27) + 1),
                gender=GenderEnum.FEMALE if is_female else GenderEnum.MALE,
                blood_group=blood_groups[p_idx % len(blood_groups)],
                primary_phone=phone,
                email=f"{first_name.lower()}.{last_name.lower()}{p_idx}@example.com",
                address_line1=f"#{p_idx+101}, Cross {p_idx % 10 + 1}, {d_info['city']} Residency",
                city=d_info["city"],
                state_province="Karnataka",
                postal_code=d_info["pin"],
                country_iso="IND",
                preferred_language="kn-IN" if p_idx % 4 == 0 else "en-US",
                emergency_contact_name=f"{INDIAN_FIRST_NAMES_MALE[(p_idx+5)%len(INDIAN_FIRST_NAMES_MALE)]} {last_name}",
                emergency_contact_phone=f"98764{p_idx+10000:05d}",
                emergency_contact_relation="Spouse" if birth_year < 2000 else "Parent",
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

            # Pre-populate Medical History / Allergies for 60% of patients
            if p_idx % 2 == 0:
                histories = [
                    ("CHRONIC_CONDITION", "I10", "38341003", "Essential Hypertension", "MODERATE", date(2021, 4, 12)),
                    ("CHRONIC_CONDITION", "E11.9", "44054006", "Type 2 Diabetes Mellitus", "MODERATE", date(2020, 9, 24)),
                    ("ALLERGY", None, "91936005", "Allergy to Penicillins (Amoxicillin Rash)", "SEVERE", date(2018, 1, 15)),
                    ("SURGICAL", None, "80146002", "Laparoscopic Appendectomy", "MILD", date(2017, 6, 8)),
                ]
                for h_type, icd, snomed, c_name, sev, d_date in histories[:(p_idx % 3) + 1]:
                    db.add(MedicalHistory(
                        patient_id=patient.id,
                        history_type=h_type,
                        concept_icd10_code=icd,
                        concept_snomed_code=snomed,
                        condition_name=c_name,
                        severity=sev,
                        diagnosed_date=d_date,
                    ))
                db.commit()

        patients_list.append(patient)

    # 6. Seed 500 Visits / Encounters (with Vitals, SOAP, Diagnoses, Queue)
    print("[+] Seeding 500 Clinical Encounters, IoT Vitals, SOAP Notes & Diagnoses...")
    visits_list = []
    now = datetime.now(timezone.utc)

    for v_idx in range(500):
        patient = patients_list[v_idx % len(patients_list)]
        hospital = hospitals_list[v_idx % len(hospitals_list)]
        doctor = doctors_list[v_idx % len(doctors_list)]
        kiosk = kiosks_list[v_idx % len(kiosks_list)]

        # Pick clinical scenario
        scenario = CHIEF_COMPLAINTS[v_idx % len(CHIEF_COMPLAINTS)]
        cc_raw, triage_lvl, dept_code, icd_code, diag_name = scenario
        target_dept = next((d for d in departments_by_hospital[hospital.id] if d.code == dept_code), departments_by_hospital[hospital.id][0])

        # Spread timestamps over past 30 days
        days_ago = (500 - v_idx) // 17
        visit_time = now - timedelta(days=days_ago, hours=(v_idx % 12), minutes=(v_idx % 50))
        v_num = f"VIS-2026-{v_idx+10001:05d}"

        visit = db.query(Visit).filter(Visit.visit_number == v_num).first()
        if not visit:
            is_emergency = (triage_lvl in [TriageLevelEnum.ESI_1_RESUSCITATION, TriageLevelEnum.ESI_2_EMERGENT])
            visit = Visit(
                visit_number=v_num,
                hospital_id=hospital.id,
                department_id=target_dept.id,
                patient_id=patient.id,
                doctor_id=doctor.id,
                kiosk_id=kiosk.id,
                visit_type="EMERGENCY_TRIAGE" if is_emergency else "OPD_WALKIN",
                status=VisitStatusEnum.DISCHARGED if days_ago > 0 else VisitStatusEnum.DOCTOR_REVIEW,
                triage_level=triage_lvl,

                triage_score_reasoning=f"Automated ESI Triage evaluated based on presenting acuity: {cc_raw}",
                chief_complaint_raw=cc_raw,
                ai_soap_subjective=f"Patient presents with {cc_raw}. Symptoms commenced {2 + (v_idx % 5)} days ago.",
                ai_soap_objective=f"Vitals: BP {120 + (v_idx%40)}/{80 + (v_idx%20)} mmHg, Pulse {72 + (v_idx%30)} bpm, SpO2 {94 + (v_idx%6)}%, Temp {36.8 + (v_idx%3)*0.5:.1f}°C.",
                ai_soap_assessment=f"Clinical presentation strongly indicates {diag_name} [{icd_code}].",
                ai_soap_plan=f"Prescribe targeted therapeutics, order confirmatory diagnostic scans, advise lifestyle modification.",
                ai_confidence_score=Decimal("0.965"),
                admitted_at=visit_time,
                triaged_at=visit_time + timedelta(minutes=3),
                doctor_seen_at=visit_time + timedelta(minutes=14),
                discharged_at=visit_time + timedelta(minutes=32) if days_ago > 0 else None,
                created_at=visit_time,
            )
            db.add(visit)
            db.commit()
            db.refresh(visit)

            # Vitals Record
            sys_bp = 110 + (v_idx % 50)
            dia_bp = 70 + (v_idx % 30)
            hr = 68 + (v_idx % 45)
            spo2 = 91 + (v_idx % 9)
            temp_c = 36.6 + (v_idx % 5) * 0.4
            db.add(VitalsRecord(
                visit_id=visit.id,
                patient_id=patient.id,
                kiosk_id=kiosk.id,
                systolic_bp=Decimal(str(sys_bp)),
                diastolic_bp=Decimal(str(dia_bp)),
                heart_rate_bpm=Decimal(str(hr)),
                respiratory_rate_bpm=Decimal(str(16 + (v_idx % 8))),
                oxygen_saturation_spo2=Decimal(str(spo2)),
                body_temperature_celsius=Decimal(f"{temp_c:.2f}"),
                body_weight_kg=Decimal(str(52 + (v_idx % 40))),
                body_height_cm=Decimal(str(155 + (v_idx % 30))),
                calculated_bmi=Decimal(f"{22.4 + (v_idx % 8)*0.6:.2f}"),
                is_emergency_triggered=is_emergency,
                created_at=visit_time,
            ))

            # Queue Item
            db.add(QueueItem(
                hospital_id=hospital.id,
                department_id=target_dept.id,
                doctor_id=doctor.id,
                visit_id=visit.id,
                patient_id=patient.id,
                token_display_number=f"T-{dept_code}-{v_idx+1:03d}",
                priority_order_score=20 if is_emergency else 100,
                queue_status=QueueStatusEnum.COMPLETED if days_ago > 0 else QueueStatusEnum.IN_ROOM,
                called_at=visit_time + timedelta(minutes=10),
                room_entered_at=visit_time + timedelta(minutes=14),
                completed_at=visit_time + timedelta(minutes=32) if days_ago > 0 else None,
                created_at=visit_time,
            ))

            # Diagnosis
            db.add(Diagnosis(
                visit_id=visit.id,
                patient_id=patient.id,
                doctor_id=doctor.id,
                diagnosis_type="FINAL" if days_ago > 0 else "PROVISIONAL",
                icd10_code=icd_code,
                snomed_ct_code=f"SCT-{100000 + v_idx}",
                diagnosis_name=diag_name,
                clinical_description=f"Confirmed diagnosis for {patient.first_name} {patient.last_name} during clinical consultation.",
                is_primary=True,
                confidence_percentage=Decimal("95.00"),
                created_at=visit_time,
            ))
            db.commit()

        visits_list.append(visit)

    # 7. Seed 500 Prescriptions (with Prescription Items & Intake Schedules)
    print("[+] Seeding 500 Prescriptions & time-slotted Medicine Intake Schedules...")
    for p_idx, visit in enumerate(visits_list):
        rx_num = f"RX-2026-{p_idx+10001:05d}"
        rx = db.query(Prescription).filter(Prescription.prescription_number == rx_num).first()
        if not rx:
            sig_hash = generate_sha256(f"{rx_num}-{visit.doctor_id}-{visit.patient_id}-{visit.created_at}")
            rx = Prescription(
                prescription_number=rx_num,
                visit_id=visit.id,
                patient_id=visit.patient_id,
                doctor_id=visit.doctor_id,
                digital_signature_hash=sig_hash,
                clinical_notes="Complete the antibiotic course. Take plenty of fluids and maintain adequate rest.",
                is_dispensed=True,
                dispensed_at=visit.created_at + timedelta(minutes=45),
                created_at=visit.created_at,
            )
            db.add(rx)
            db.commit()
            db.refresh(rx)

            # Add 2 to 3 Medicines per Prescription
            med_indices = [(p_idx % len(medicines_list)), ((p_idx + 2) % len(medicines_list))]
            for m_i in med_indices:
                med_obj = medicines_list[m_i]
                catalog_item = next((c for c in MEDICINES_CATALOG if c[0] == med_obj.brand_name), MEDICINES_CATALOG[0])
                dosage_inst = catalog_item[7]
                freq = catalog_item[8]

                item = PrescriptionItem(
                    prescription_id=rx.id,
                    medicine_id=med_obj.id,
                    dosage_instruction=dosage_inst,
                    frequency=freq,
                    duration_days=5,
                    total_quantity_prescribed=Decimal("10.0"),
                    created_at=visit.created_at,
                )
                db.add(item)
                db.commit()
                db.refresh(item)

                # Create 3 days of intake schedules
                for d_offset in range(3):
                    schedule_time = visit.created_at + timedelta(days=d_offset, hours=8)
                    is_taken = (d_offset == 0)
                    db.add(MedicineIntakeSchedule(
                        prescription_item_id=item.id,
                        patient_id=visit.patient_id,
                        scheduled_intake_timestamp=schedule_time,
                        dosage_amount="1 Tablet",
                        is_taken=is_taken,
                        actual_taken_timestamp=schedule_time + timedelta(minutes=15) if is_taken else None,
                        reminder_sent_count=1 if is_taken else 0,
                        created_at=visit.created_at,
                    ))
            db.commit()

    # 8. Seed 100 Lab Reports & OCR Scans
    print("[+] Seeding 100 Lab Reports, Scans & Gemini OCR Results...")
    report_types = [
        (ReportTypeEnum.ECG_TRACE, "12-Lead Electrocardiogram Trace", "ecg_trace_01.pdf", "application/pdf", [
            {"entity": "Heart Rate", "value": "78", "unit": "bpm", "flag": "NORMAL", "reference_range": "60-100", "loinc": "8867-4"},
            {"entity": "PR Interval", "value": "164", "unit": "ms", "flag": "NORMAL", "reference_range": "120-200", "loinc": "8625-6"},
            {"entity": "QRS Duration", "value": "88", "unit": "ms", "flag": "NORMAL", "reference_range": "80-120", "loinc": "8633-0"},
            {"entity": "ST Elevation", "value": "0.2", "unit": "mm", "flag": "NORMAL", "reference_range": "< 1.0", "loinc": "8634-8"},
        ]),
        (ReportTypeEnum.LAB_BIOCHEMISTRY, "Serum Cardiac Enzymes & Troponin I", "troponin_lab_02.pdf", "application/pdf", [
            {"entity": "High Sensitivity Troponin I", "value": "0.012", "unit": "ng/mL", "flag": "NORMAL", "reference_range": "< 0.034", "loinc": "49563-0"},
            {"entity": "Creatine Kinase MB (CK-MB)", "value": "3.8", "unit": "ng/mL", "flag": "NORMAL", "reference_range": "0.0-5.0", "loinc": "13969-1"},
            {"entity": "Serum Lactate", "value": "1.2", "unit": "mmol/L", "flag": "NORMAL", "reference_range": "0.5-2.2", "loinc": "2524-7"},
        ]),
        (ReportTypeEnum.LAB_HEMATOLOGY, "Complete Blood Count & Platelet Panel", "cbc_panel_03.pdf", "application/pdf", [
            {"entity": "Hemoglobin", "value": "14.2", "unit": "g/dL", "flag": "NORMAL", "reference_range": "13.0-17.0", "loinc": "718-7"},
            {"entity": "Total Leukocyte Count (WBC)", "value": "11800", "unit": "cells/mcL", "flag": "HIGH", "reference_range": "4000-11000", "loinc": "6690-2"},
            {"entity": "Platelet Count", "value": "145000", "unit": "cells/mcL", "flag": "LOW", "reference_range": "150000-450000", "loinc": "777-3"},
            {"entity": "Neutrophils", "value": "78", "unit": "%", "flag": "HIGH", "reference_range": "40-70", "loinc": "770-8"},
        ]),
        (ReportTypeEnum.RADIOLOGY_XRAY, "Chest X-Ray PA View Digital Radiograph", "chest_xray_04.png", "image/png", [
            {"entity": "Cardiothoracic Ratio", "value": "0.48", "unit": "ratio", "flag": "NORMAL", "reference_range": "< 0.50", "loinc": "82420-1"},
            {"entity": "Lung Parenchyma", "value": "Bilateral mild peribronchial cuffing", "unit": "", "flag": "ABNORMAL", "reference_range": "Clear", "loinc": "18782-3"},
            {"entity": "Costophrenic Angles", "value": "Sharp and clear", "unit": "", "flag": "NORMAL", "reference_range": "Clear", "loinc": "18783-1"},
        ]),
    ]

    for r_idx in range(100):
        visit = visits_list[r_idx * 5 % len(visits_list)]
        rep_type, rep_title, f_name, mime_type, entities = report_types[r_idx % len(report_types)]
        sha256_hash = generate_sha256(f"{rep_title}-{visit.id}-{r_idx}")

        report = MedicalReport(
            visit_id=visit.id,
            patient_id=visit.patient_id,
            report_type=rep_type,
            title=f"{rep_title} #{r_idx+101}",
            file_storage_uri=f"/storage/reports/{visit.patient_id}/{f_name}",
            file_mime_type=mime_type,
            file_size_bytes=1024 * (150 + r_idx * 10),
            file_sha256_checksum=sha256_hash,
            ai_summary=f"Automated Gemini 1.5 Pro Analysis: Document exhibits consistent biological parameters. {entities[0]['entity']} measured at {entities[0]['value']} {entities[0]['unit']} ({entities[0]['flag']}).",
            created_at=visit.created_at + timedelta(minutes=20),
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        db.add(OCRResult(
            medical_report_id=report.id,
            ocr_engine_version="Gemini-Vision-OCR-1.5-Pro",
            status=OCRStatusEnum.COMPLETED,
            raw_extracted_text=f"LABORATORY DIAGNOSTICS REPORT\nPatient MRN: {visit.patient.hospital_mrn}\nInvestigation: {rep_title}\nFindings: {entities}",
            confidence_score=Decimal("0.985"),
            extracted_entities_json=entities,
            processing_duration_ms=450 + (r_idx % 200),
            created_at=report.created_at,
        ))
        db.commit()

    # 9. Seed 300 Consents
    print("[+] Seeding 300 Digital Consent records with cryptographic signature hashes...")
    for c_idx in range(300):
        patient = patients_list[c_idx]
        doctor = doctors_list[c_idx % len(doctors_list)]
        c_status = ConsentStatusEnum.GRANTED if c_idx % 10 != 0 else ConsentStatusEnum.REVOKED
        sig_blob = generate_sha256(f"CONSENT-{patient.id}-{doctor.id}-{c_idx}")

        db.add(Consent(
            patient_id=patient.id,
            doctor_id=doctor.id,
            consent_type=ConsentTypeEnum.DOCTOR_ACCESS,
            status=c_status,
            consent_version="v1.2",
            granted_language="en-US",
            digital_signature_blob=sig_blob,
            ip_address=f"192.168.1.{50 + (c_idx % 150)}",
            expires_at=now + timedelta(hours=12),
            revoked_at=now - timedelta(hours=1) if c_status == ConsentStatusEnum.REVOKED else None,
            created_at=now - timedelta(hours=2),
        ))
    db.commit()

    # 10. Seed 1000+ Tamper-Evident SHA-256 Chained Audit Logs
    print("[+] Seeding 1000+ Cryptographically chained Audit Logs...")
    prev_hash = "GENESIS_BLOCK_MEDIKIOSK_AI_2026_ROOT_SECURITY_HASH_0000000000000000"
    actions = [
        (AuditActionEnum.CREATE, "visits", "Patient check-in and queue ticket creation"),
        (AuditActionEnum.DOCTOR_VIEW_RECORD, "patients", "Physician viewed complete medical timeline and prior diagnoses"),
        (AuditActionEnum.CONSENT_GIVEN, "consents", "Patient granted 12-hour EHR access token to attending physician"),
        (AuditActionEnum.DOCTOR_UPDATE_RECORD, "diagnoses", "Physician recorded clinical diagnosis and ICD-10 categorization"),
        (AuditActionEnum.CREATE, "prescriptions", "Physician finalized and digitally signed e-prescription"),
    ]

    for a_idx in range(1000):
        action, target_tbl, desc = actions[a_idx % len(actions)]
        patient = patients_list[a_idx % len(patients_list)]
        hospital = hospitals_list[a_idx % len(hospitals_list)]
        doctor = doctors_list[a_idx % len(doctors_list)]

        log_time = now - timedelta(hours=(1000 - a_idx))
        current_hash = generate_sha256(f"{prev_hash}|{action}|{target_tbl}|{patient.id}|{log_time.isoformat()}")

        db.add(AuditLog(
            hospital_id=hospital.id,
            actor_user_id=doctor.user_id,
            actor_role="DOCTOR",
            actor_name=f"Dr. {doctor.first_name} {doctor.last_name}",
            action=action,
            target_table=target_tbl,
            target_record_id=patient.id,
            client_ip=f"10.0.{a_idx % 5}.{10 + (a_idx % 200)}",
            description=f"{desc} for MRN: {patient.hospital_mrn}",
            tamper_hash_chain=current_hash,
            created_at=log_time,
        ))
        prev_hash = current_hash
        if a_idx % 200 == 0:
            db.commit()
    db.commit()

    # 11. Seed 200 Government Syndromic Surveillance Records
    print("[+] Seeding Government Syndromic Surveillance cluster feeds...")
    syndromes = ["RESPIRATORY_ILI", "FEBRILE_VECTOR_BORNE", "GASTROENTERITIS", "CARDIOVASCULAR", "DIABETES_METABOLIC"]
    age_groups = ["0-5", "6-17", "18-45", "46-65", "65+"]

    for g_idx in range(200):
        d_info = DISTRICTS[g_idx % len(DISTRICTS)]
        hospital = hospitals_list[g_idx % len(hospitals_list)]
        syn = syndromes[g_idx % len(syndromes)]
        r_date = (now - timedelta(days=(200 - g_idx) // 7)).date()
        case_count = 15 + (g_idx % 45)
        em_count = 1 + (g_idx % 6)

        db.add(GovernmentAnalytics(
            reporting_date=r_date,
            hospital_id=hospital.id,
            district_code=d_info["code"],
            state_province="Karnataka",
            syndromic_icd10_category=syn,
            patient_age_group=age_groups[g_idx % len(age_groups)],
            patient_gender=GenderEnum.MALE if g_idx % 2 == 0 else GenderEnum.FEMALE,
            total_case_count=case_count,
            emergency_escalated_count=em_count,
            avg_vitals_summary={"avg_bp_systolic": 124, "avg_heart_rate": 78, "avg_spo2": 97},
            geo_quadkey=f"123023{g_idx % 10}",
            created_at=datetime.combine(r_date, datetime.min.time(), timezone.utc),
        ))
    db.commit()

    print("[SUCCESS] Successfully seeded complete interconnected dataset:")
    print("   * 10 Hospitals")
    print("   * 50 Doctors (with User accounts & clinical credentials)")
    print("   * 300 Patients (with Demographics, ABHA IDs, Medical History & Allergies)")
    print("   * 500 Encounters/Visits (with Vitals, SOAP Notes, Diagnoses & Queue items)")
    print("   * 500 Prescriptions (with Intake Schedules & Adherence Logs)")
    print("   * 100 Lab Reports & Scans (with OCR Results & Biomarkers)")
    print("   * 300 Digital Consents")
    print("   * 1000+ Tamper-Evident SHA-256 Chained Audit Logs")
    print("   * 200 Government Syndromic Surveillance Records")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_large_demo_dataset(db)
    finally:
        db.close()
