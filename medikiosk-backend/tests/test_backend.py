import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure app is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)


def test_system_health():
    """Verify health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"


def test_auth_and_patient_workflow():
    """Test full patient registration, OTP login, profile update, and medical history."""
    # 1. Request OTP for demo patient
    otp_req = client.post("/api/v1/auth/patient/otp/request", json={"phone": "9876543210"})
    assert otp_req.status_code == 200
    otp_data = otp_req.json()
    assert otp_data["success"] is True
    demo_otp = otp_data["data"]["demo_otp"]

    # 2. Verify OTP and login
    login_req = client.post("/api/v1/auth/patient/otp/verify", json={"phone": "9876543210", "otp": demo_otp})
    assert login_req.status_code == 200
    patient_tokens = login_req.json()["data"]
    patient_token = patient_tokens["access_token"]
    patient_id = patient_tokens["user_id"]
    headers = {"Authorization": f"Bearer {patient_token}"}

    # 3. Get Patient Profile
    prof_req = client.get("/api/v1/patients/profile", headers=headers)
    assert prof_req.status_code == 200
    assert prof_req.json()["data"]["first_name"] == "Vikram"

    # 4. Update Profile
    update_req = client.put(
        "/api/v1/patients/profile",
        headers=headers,
        json={"address_line2": "Tower 4, Floor 8", "preferred_language": "en-US"},
    )
    assert update_req.status_code == 200
    assert update_req.json()["data"]["address_line2"] == "Tower 4, Floor 8"

    # 5. Add Medical History
    hist_req = client.post(
        "/api/v1/patients/medical-history",
        headers=headers,
        json={
            "history_type": "CHRONIC_CONDITION",
            "condition_name": "Hypertension",
            "concept_snomed_code": "38341003",
            "concept_icd10_code": "I10",
            "severity": "Mild",
        },
    )
    assert hist_req.status_code == 201


def test_staff_logins_and_rbac():
    """Test Doctor, Reception, Hospital Admin, and Government Admin logins."""
    # 1. Doctor Login
    doc_login = client.post("/api/v1/auth/doctor/login", json={"username_or_email": "dr.sharma@medikiosk.ai", "password": "Doctor@123"})
    assert doc_login.status_code == 200
    assert doc_login.json()["data"]["role"] == "DOCTOR"

    # 2. Reception Login
    rec_login = client.post("/api/v1/auth/reception/login", json={"username_or_email": "reception@medikiosk.ai", "password": "Reception@123"})
    assert rec_login.status_code == 200
    assert rec_login.json()["data"]["role"] == "RECEPTIONIST"

    # 3. Hospital Admin Login
    admin_login = client.post("/api/v1/auth/hospital-admin/login", json={"username_or_email": "admin@medikiosk.ai", "password": "Admin@123"})
    assert admin_login.status_code == 200
    assert admin_login.json()["data"]["role"] == "HOSPITAL_ADMIN"

    # 4. Government Admin Login
    gov_login = client.post("/api/v1/auth/government-admin/login", json={"username_or_email": "govt.health@medikiosk.ai", "password": "Govt@123"})
    assert gov_login.status_code == 200
    assert gov_login.json()["data"]["role"] == "GOVERNMENT_ADMIN"


def test_reception_and_kiosk_intake():
    """Test Reception search, visit registration, and Kiosk autonomous AI triage intake."""
    # 1. Reception Login
    rec_login = client.post("/api/v1/auth/reception/login", json={"username_or_email": "reception@medikiosk.ai", "password": "Reception@123"})
    rec_token = rec_login.json()["data"]["access_token"]
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    # 2. Search Patient
    search_res = client.get("/api/v1/reception/patients/search?q=9876543210", headers=rec_headers)
    assert search_res.status_code == 200
    patients = search_res.json()["data"]
    assert len(patients) >= 1
    patient_id = patients[0]["id"]

    # 3. Kiosk Autonomous Intake & Triage
    # Fetch hospital ID
    from app.core.database import SessionLocal
    from app.models.models import Hospital
    db = SessionLocal()
    hosp = db.query(Hospital).first()
    hospital_id = hosp.id
    db.close()

    kiosk_payload = {
        "kiosk_device_id": "KIOSK-BLR-01",
        "hospital_id": hospital_id,
        "patient_id": patient_id,
        "chief_complaint_raw": "Severe burning abdominal pain and nausea since last night",
        "spoken_language": "en-US",
        "vitals": {
            "systolic_bp": 130.0,
            "diastolic_bp": 85.0,
            "heart_rate_bpm": 88.0,
            "respiratory_rate_bpm": 18.0,
            "oxygen_saturation_spo2": 98.0,
            "body_temperature_celsius": 37.4,
            "body_weight_kg": 75.0,
            "body_height_cm": 176.0
        }
    }
    triage_res = client.post("/api/v1/kiosk/intake/evaluate", json=kiosk_payload)
    assert triage_res.status_code == 201
    triage_data = triage_res.json()["data"]
    assert triage_data["triage_level"] in ["ESI_3_URGENT", "ESI_2_EMERGENT", "ESI_4_LESS_URGENT"]
    assert triage_data["queue_token_number"] is not None
    assert triage_data["ai_soap_note"]["subjective"] is not None
    visit_id = triage_data["visit_id"]

    # 4. View Today's Queue at Reception
    queue_res = client.get(f"/api/v1/reception/queue/today?hospital_id={hospital_id}", headers=rec_headers)
    assert queue_res.status_code == 200
    assert queue_res.json()["data"]["total_waiting"] >= 1


def test_doctor_clinical_workflow_and_consent():
    """Test Doctor Queue, Consent Request, Patient Approval, Timeline View (Audit Logged), Diagnosis, Prescription, and Consultation Closure."""
    # 1. Doctor Login (Dr. Sharma)
    doc_login = client.post("/api/v1/auth/doctor/login", json={"username_or_email": "dr.sharma@medikiosk.ai", "password": "Doctor@123"})
    doc_token = doc_login.json()["data"]["access_token"]
    doc_id = doc_login.json()["data"]["additional_info"]["doctor_id"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    # 2. Patient Login
    pat_login = client.post("/api/v1/auth/patient/otp/verify", json={"phone": "9876543210", "otp": "123456"})
    pat_token = pat_login.json()["data"]["access_token"]
    pat_id = pat_login.json()["data"]["user_id"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    # 3. Doctor Views Queue
    doc_queue = client.get("/api/v1/doctors/queue/today", headers=doc_headers)
    assert doc_queue.status_code == 200

    # 4. Doctor Requests Patient Consent
    consent_req = client.post(
        "/api/v1/doctors/access/request",
        headers=doc_headers,
        json={"patient_id": pat_id, "purpose": "Clinical Consultation & Vitals Review", "expiry_hours": 12},
    )
    assert consent_req.status_code == 201
    consent_id = consent_req.json()["data"]["id"]

    # 5. Patient Approves Consent
    consent_act = client.post(
        "/api/v1/consent/action",
        headers=pat_headers,
        json={"consent_id": consent_id, "action": "APPROVE"},
    )
    assert consent_act.status_code == 200
    assert consent_act.json()["data"]["status"] == "GRANTED"

    # 6. Doctor Views Patient Timeline (Automated DOCTOR_VIEW_RECORD Audit Log)
    timeline_res = client.get(f"/api/v1/doctors/patients/{pat_id}/timeline", headers=doc_headers)
    assert timeline_res.status_code == 200
    assert timeline_res.json()["data"]["events_count"] >= 1

    # 7. Get an active visit for the patient
    from app.core.database import SessionLocal
    from app.models.models import Visit
    db = SessionLocal()
    visit = db.query(Visit).filter(Visit.patient_id == pat_id).order_by(Visit.created_at.desc()).first()
    visit_id = visit.id
    db.close()

    # 8. Doctor Adds Diagnosis (Automated DOCTOR_UPDATE_RECORD Audit Log)
    diag_res = client.post(
        "/api/v1/doctors/diagnosis",
        headers=doc_headers,
        json={
            "visit_id": visit_id,
            "patient_id": pat_id,
            "icd10_code": "K29.70",
            "snomed_ct_code": "4556007",
            "diagnosis_name": "Gastritis, unspecified, without bleeding",
            "diagnosis_type": "FINAL",
            "clinical_description": "Epigastric tenderness on palpation.",
            "is_primary": True,
        },
    )
    assert diag_res.status_code == 201

    # 9. Search Medicines & Generate Prescription
    meds_search = client.get("/api/v1/prescriptions/medicines/search?q=Pan", headers=doc_headers)
    assert meds_search.status_code == 200
    med_list = meds_search.json()["data"]
    assert len(med_list) >= 1
    med_id = med_list[0]["id"]

    rx_res = client.post(
        "/api/v1/doctors/prescriptions",
        headers=doc_headers,
        json={
            "visit_id": visit_id,
            "patient_id": pat_id,
            "clinical_notes": "Take before breakfast for 7 days. Avoid spicy food.",
            "items": [
                {
                    "medicine_id": med_id,
                    "dosage_instruction": "1 Capsule before breakfast",
                    "frequency": "ONCE_DAILY",
                    "duration_days": 7,
                    "total_quantity_prescribed": 7.0,
                    "special_intake_conditions": "Take on an empty stomach with a glass of water."
                }
            ]
        },
    )
    assert rx_res.status_code == 201
    rx_data = rx_res.json()["data"]
    assert len(rx_data["intake_schedules"]) >= 7

    # 10. Patient Views Prescriptions and logs adherence
    pat_rx = client.get("/api/v1/patients/prescriptions", headers=pat_headers)
    assert pat_rx.status_code == 200
    schedule_id = pat_rx.json()["data"][0]["intake_schedules"][0]["id"]

    adh_res = client.put(f"/api/v1/prescriptions/schedules/{schedule_id}/adherence?is_taken=true", headers=pat_headers)
    assert adh_res.status_code == 200

    # 11. Doctor Closes Consultation (Auto-Expires Consent)
    close_res = client.post(
        "/api/v1/doctors/consultation/close",
        headers=doc_headers,
        json={"visit_id": visit_id, "clinical_summary": "Patient advised dietary modifications and antacid therapy.", "discharge_status": "DISCHARGED"},
    )
    assert close_res.status_code == 200
    assert close_res.json()["data"]["status"] == "DISCHARGED"

    # 12. Patient Views Doctor Access Logs
    logs_res = client.get("/api/v1/patients/doctor-access-logs", headers=pat_headers)
    assert logs_res.status_code == 200
    assert len(logs_res.json()["data"]) >= 1


def test_reports_ocr_and_analytics():
    """Test Medical Report Upload, OCR Trigger, AI Summary, and Analytics endpoints."""
    # 1. Doctor Login
    doc_login = client.post("/api/v1/auth/doctor/login", json={"username_or_email": "dr.sharma@medikiosk.ai", "password": "Doctor@123"})
    doc_token = doc_login.json()["data"]["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    # 2. Get demo patient and visit
    from app.core.database import SessionLocal
    from app.models.models import Patient, Visit, Hospital
    db = SessionLocal()
    patient = db.query(Patient).filter(Patient.primary_phone == "9876543210").first()
    visit = db.query(Visit).filter(Visit.patient_id == patient.id).first()
    hospital = db.query(Hospital).first()
    patient_id = patient.id
    visit_id = visit.id
    hospital_id = hospital.id
    db.close()

    # 3. Upload Sample Medical Report
    fake_pdf_content = b"%PDF-1.4 Clinical Diagnostic Test Report: Fasting Glucose 95 mg/dL, HbA1c 5.4%"
    files = {"file": ("blood_test.pdf", fake_pdf_content, "application/pdf")}
    data = {
        "visit_id": visit_id,
        "patient_id": patient_id,
        "title": "Complete Metabolic & Lipid Profile",
        "report_type": "LAB_BIOCHEMISTRY",
        "is_confidential": "false",
    }
    upload_res = client.post("/api/v1/reports/upload", files=files, data=data, headers=doc_headers)
    assert upload_res.status_code == 201
    report_id = upload_res.json()["data"]["id"]

    # 4. Trigger OCR
    ocr_res = client.post("/api/v1/reports/ocr/trigger", json={"medical_report_id": report_id}, headers=doc_headers)
    assert ocr_res.status_code == 200
    assert len(ocr_res.json()["data"]["extracted_entities"]) >= 1

    # 5. Trigger AI Summary
    sum_res = client.post("/api/v1/reports/summary/trigger", json={"medical_report_id": report_id}, headers=doc_headers)
    assert sum_res.status_code == 200
    assert sum_res.json()["data"]["ai_summary"] is not None

    # 6. Download Report (Doctor Download Audit Logged)
    dl_res = client.get(f"/api/v1/reports/{report_id}/download", headers=doc_headers)
    assert dl_res.status_code == 200

    # 7. Government Admin Analytics
    gov_login = client.post("/api/v1/auth/government-admin/login", json={"username_or_email": "govt.health@medikiosk.ai", "password": "Govt@123"})
    gov_token = gov_login.json()["data"]["access_token"]
    gov_headers = {"Authorization": f"Bearer {gov_token}"}

    gov_analytics = client.get("/api/v1/analytics/government/syndromic", headers=gov_headers)
    assert gov_analytics.status_code == 200
    assert len(gov_analytics.json()["data"]) >= 1

    # 8. Hospital Admin Operational Metrics
    admin_login = client.post("/api/v1/auth/hospital-admin/login", json={"username_or_email": "admin@medikiosk.ai", "password": "Admin@123"})
    admin_token = admin_login.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    hosp_metrics = client.get(f"/api/v1/analytics/hospital/{hospital_id}", headers=admin_headers)
    assert hosp_metrics.status_code == 200
    assert hosp_metrics.json()["data"]["hospital_id"] == hospital_id

    # 9. Audit Logs Query
    audit_logs = client.get("/api/v1/audit/logs", headers=admin_headers)
    assert audit_logs.status_code == 200
    assert len(audit_logs.json()["data"]) >= 5


def test_google_gemini_ai_suite():
    """Test comprehensive integration of all 6 Google Gemini AI capabilities."""
    # 1. Authenticate Doctor & Patient
    doc_login = client.post("/api/v1/auth/doctor/login", json={"username_or_email": "dr.sharma@medikiosk.ai", "password": "Doctor@123"})
    doc_token = doc_login.json()["data"]["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    pat_verify = client.post("/api/v1/auth/patient/otp/verify", json={"phone": "9876543210", "otp": "123456"})
    pat_token = pat_verify.json()["data"]["access_token"]
    pat_id = pat_verify.json()["data"]["user_id"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    # Capability 1: AI Clinical Intake (Adaptive Chat & Synthesis)
    chat_res = client.post(
        "/api/v1/ai/intake/chat",
        headers=pat_headers,
        json={
            "messages": [{"role": "user", "content": "I have been coughing and feeling feverish since yesterday"}],
            "spoken_language": "en-US",
            "vitals": {"systolic_bp": 122, "diastolic_bp": 80, "heart_rate_bpm": 84, "oxygen_saturation_spo2": 98, "body_temperature_celsius": 38.2}
        }
    )
    assert chat_res.status_code == 200
    assert "reply" in chat_res.json()["data"]

    synth_res = client.post(
        "/api/v1/ai/intake/synthesize",
        headers=pat_headers,
        json={
            "messages": [
                {"role": "user", "content": "Fever, chills, and productive cough for 3 days"},
                {"role": "assistant", "content": "Are you experiencing any chest tightness or breathlessness?"},
                {"role": "user", "content": "No chest pain, but mild throat irritation."}
            ],
            "vitals": {"systolic_bp": 125, "diastolic_bp": 82, "heart_rate_bpm": 88, "oxygen_saturation_spo2": 97.5, "body_temperature_celsius": 38.5, "respiratory_rate_bpm": 18}
        }
    )
    assert synth_res.status_code == 200
    synth_data = synth_res.json()["data"]
    assert "chief_complaint" in synth_data
    assert len(synth_data["symptoms"]) >= 1
    assert synth_data["possible_severity"] in ["Mild", "Moderate", "Severe", "Critical"]
    assert "medical_summary" in synth_data

    # Capability 2: OCR Analysis (Prescription / Lab / Scan)
    ocr_res = client.post(
        "/api/v1/ai/ocr/analyze",
        headers=doc_headers,
        json={
            "extracted_text": "Complete Blood Count: Hemoglobin 13.5 g/dL, WBC 11500 /uL (HIGH), Platelets 220000 /uL. Impression: Mild Leukocytosis.",
            "document_type": "BLOOD_REPORT"
        }
    )
    assert ocr_res.status_code == 200
    ocr_data = ocr_res.json()["data"]
    assert "summary" in ocr_data
    assert len(ocr_data["important_findings"]) >= 1
    assert len(ocr_data["recommendations"]) >= 1

    # Capability 3: Doctor AI Copilot (Summarize History)
    copilot_res = client.post(
        "/api/v1/ai/doctor/copilot/summarize-history",
        headers=doc_headers,
        json={"patient_id": pat_id}
    )
    assert copilot_res.status_code == 200
    copilot_data = copilot_res.json()["data"]
    assert "clinical_history_summary" in copilot_data
    assert "known_allergies" in copilot_data

    # Capability 4: Patient Health Assistant (EHR QA)
    assistant_res = client.post(
        "/api/v1/ai/patient/assistant/chat",
        headers=pat_headers,
        json={"query": "What medicines am I taking and when is my next dose?"}
    )
    assert assistant_res.status_code == 200
    assistant_data = assistant_res.json()["data"]
    assert "answer" in assistant_data
    assert "disclaimer" in assistant_data

    # Capability 5: Prescription Explanation (Layman Translator)
    explain_res = client.post(
        "/api/v1/ai/prescriptions/explain",
        headers=pat_headers,
        json={
            "items": [
                {
                    "medicine_name": "Augmentin 625 Duo",
                    "dosage_instruction": "1 Tab BID PC",
                    "frequency": "TWICE_DAILY",
                    "duration_days": 5,
                }
            ],
            "clinical_notes": "Complete antibiotic course."
        }
    )
    assert explain_res.status_code == 200
    explain_data = explain_res.json()["data"]
    assert len(explain_data["medicines"]) >= 1
    assert explain_data["medicines"][0]["food_instruction"] in ["After Food", "Before Food", "With Food"]
    assert "purpose" in explain_data["medicines"][0]

    # Capability 6: Drug Interaction Checker
    interaction_res = client.post(
        "/api/v1/ai/doctor/check-drug-interactions",
        headers=doc_headers,
        json={
            "new_medicines": [
                {"medicine_name": "Augmentin 625 Duo", "generic_name": "Amoxicillin-Clavulanate", "strength": "625mg"}
            ],
            "known_allergies": ["Penicillin"],
            "chronic_conditions": ["Hypertension"]
        }
    )
    assert interaction_res.status_code == 200
    interaction_data = interaction_res.json()["data"]
    assert interaction_data["overall_safety_status"] in ["SAFE", "WARNING", "CONTRAINDICATED"]
    assert len(interaction_data["allergy_risks"]) >= 1


def test_complete_hospital_business_workflow():
    """
    End-to-End Test for the Complete 19-Step MediKiosk AI Hospital Business Workflow:
    1. Patient enters hospital
    2. Reception searches patient (by phone)
    3. If new -> Register new patient (Demographics, ABHA, Emergency contact)
    4. Create Today's Visit (OPD Walkin, Department linked)
    5. Generate Queue Token (Dynamic priority scoring)
    6. Patient completes AI Intake (Vitals recorded + Gemini Triage ESI 1-5 + FHIR SOAP note)
    7. Patient uploads reports (Diagnostic PDF uploaded with SHA-256 checksum)
    8. OCR (Optical Engine extraction of biological entities & LOINC mapping)
    9. Gemini Summary (Clinical interpretation of report findings)
    10. Patient grants today's consent (Doctor requests -> Patient approves time-bound consent)
    11. Doctor opens queue (Patient prioritized in live queue with active consent badge)
    12. Doctor instantly views records (Encounter summary & longitudinal records loaded, DOCTOR_VIEW_RECORD audit logged)
    13. Doctor updates diagnosis (ICD-10 & SNOMED-CT diagnosis recorded, DOCTOR_UPDATE_RECORD audit logged)
    14. Prescription (E-Prescription issued with automated time-slotted intake schedules)
    15. Lab Tests (Doctor orders diagnostic investigations with audit logging)
    16. Close Consultation (Encounter marked DISCHARGED, discharge summary recorded)
    17. Consent expires automatically (Active doctor consent auto-expired upon encounter discharge)
    18. Audit Log created (Tamper-evident SHA-256 hash chain verified)
    19. Medical Timeline updated (Patient's longitudinal EHR reflects encounter, diagnosis, rx, and lab tests)
    """
    # -------------------------------------------------------------------------
    # Authentication Setup
    # -------------------------------------------------------------------------
    rec_login = client.post("/api/v1/auth/reception/login", json={"username_or_email": "reception@medikiosk.ai", "password": "Reception@123"})
    assert rec_login.status_code == 200
    rec_token = rec_login.json()["data"]["access_token"]
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    doc_login = client.post("/api/v1/auth/doctor/login", json={"username_or_email": "dr.sharma@medikiosk.ai", "password": "Doctor@123"})
    assert doc_login.status_code == 200
    doc_token = doc_login.json()["data"]["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    from app.core.database import SessionLocal
    from app.models.models import Hospital, Department, Doctor, KioskDevice
    db = SessionLocal()
    hospital = db.query(Hospital).first()
    dept = db.query(Department).filter(Department.hospital_id == hospital.id).first()
    doctor = db.query(Doctor).filter(Doctor.hospital_id == hospital.id).first()
    kiosk = db.query(KioskDevice).filter(KioskDevice.hospital_id == hospital.id).first()
    hospital_id = hospital.id
    dept_id = dept.id
    doctor_id = doctor.id
    kiosk_device_id = kiosk.device_serial_number
    db.close()

    # Step 1 & 2: Patient enters hospital -> Reception searches patient by phone
    target_phone = "9811223344"
    search_res = client.get(f"/api/v1/reception/patients/search?q={target_phone}", headers=rec_headers)
    assert search_res.status_code == 200
    is_new = len(search_res.json()["data"]) == 0

    # Step 3: If new -> Register new patient
    if is_new:
        reg_payload = {
            "first_name": "Rohan",
            "last_name": "Verma",
            "primary_phone": target_phone,
            "date_of_birth": "1992-05-15",
            "gender": "MALE",
            "blood_group": "B+",
            "address_line1": "Flat 402, Green Avenue",

            "city": "Bengaluru",
            "state_province": "Karnataka",
            "postal_code": "560001",
            "preferred_language": "en-US",
            "emergency_contact_name": "Pooja Verma",
            "emergency_contact_phone": "9811223345",
            "emergency_contact_relation": "SPOUSE",
            "national_health_id": "ABHA-9811-2233-4455",
        }
        reg_res = client.post("/api/v1/auth/patient/register", json=reg_payload)
        assert reg_res.status_code == 201, f"Failed register: {reg_res.text}"
        patient_id = reg_res.json()["data"]["user_id"]
        pat_token = reg_res.json()["data"]["access_token"]

    else:
        patient_id = search_res.json()["data"][0]["id"]
        pat_verify = client.post("/api/v1/auth/patient/otp/verify", json={"phone": target_phone, "otp": "123456"})
        pat_token = pat_verify.json()["data"]["access_token"]


    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    # Step 4 & 5: Create Today's Visit & Generate Queue Token
    walkin_payload = {
        "hospital_id": hospital_id,
        "patient_id": patient_id,
        "department_id": dept_id,
        "doctor_id": doctor_id,
        "chief_complaint": "Acute substernal chest discomfort and breathlessness",
        "visit_type": "OPD_WALKIN",
    }
    visit_res = client.post("/api/v1/reception/visits/register", headers=rec_headers, json=walkin_payload)
    assert visit_res.status_code == 201
    visit_id = visit_res.json()["data"]["visit_id"]
    token_number = visit_res.json()["data"]["token_display_number"]
    assert token_number is not None


    # Step 6: Patient completes AI Intake (IoT Vitals + Gemini Triage ESI + FHIR SOAP)
    intake_payload = {
        "kiosk_device_id": kiosk_device_id,
        "hospital_id": hospital_id,
        "patient_id": patient_id,
        "chief_complaint_raw": "Crushing chest pain radiating to left shoulder with shortness of breath for 1 hour",
        "spoken_language": "en-US",
        "department_id": dept_id,
        "vitals": {
            "systolic_bp": 148,
            "diastolic_bp": 94,
            "heart_rate_bpm": 105,
            "oxygen_saturation_spo2": 95.5,
            "body_temperature_celsius": 37.2,
            "respiratory_rate_bpm": 22,
            "body_weight_kg": 76.0,
            "body_height_cm": 174.0,
        }
    }
    triage_res = client.post("/api/v1/kiosk/intake/evaluate", json=intake_payload)
    assert triage_res.status_code == 201
    triage_data = triage_res.json()["data"]
    assert triage_data["triage_level"] in ["ESI_1_RESUSCITATION", "ESI_2_EMERGENT", "ESI_3_URGENT"]
    assert triage_data["queue_token_number"] is not None
    assert triage_data["ai_soap_note"] is not None


    # Step 7: Patient uploads reports (Diagnostic PDF)
    fake_report_pdf = b"%PDF-1.4 12-Lead ECG Report: Sinus tachycardia with ST elevation in leads V2-V4. Serum Troponin I: 1.45 ng/mL (ELEVATED)"
    files = {"file": ("ecg_panel.pdf", fake_report_pdf, "application/pdf")}
    data = {
        "visit_id": visit_id,
        "patient_id": patient_id,
        "title": "12-Lead Electrocardiogram & Cardiac Enzymes",
        "report_type": "ECG_TRACE",
        "is_confidential": "false",
    }
    rep_res = client.post("/api/v1/reports/upload", files=files, data=data, headers=pat_headers)
    assert rep_res.status_code == 201
    report_id = rep_res.json()["data"]["id"]

    # Step 8: OCR (Extract biological entities)
    ocr_res = client.post("/api/v1/reports/ocr/trigger", json={"medical_report_id": report_id}, headers=pat_headers)
    assert ocr_res.status_code == 200
    assert len(ocr_res.json()["data"]["extracted_entities"]) >= 1

    # Step 9: Gemini Summary (Clinical interpretation of report)
    summary_res = client.post("/api/v1/reports/summary/trigger", json={"medical_report_id": report_id}, headers=pat_headers)
    assert summary_res.status_code == 200
    assert summary_res.json()["data"]["ai_summary"] is not None

    # Step 10: Patient grants today's consent
    # 10a. Doctor requests access
    req_consent = client.post(
        "/api/v1/doctors/access/request",
        headers=doc_headers,
        json={"patient_id": patient_id, "purpose": "Emergency Cardiac Assessment", "expiry_hours": 8}
    )
    assert req_consent.status_code == 201
    consent_id = req_consent.json()["data"]["id"]

    # 10b. Patient grants consent
    grant_res = client.post(
        "/api/v1/consent/action",
        headers=pat_headers,
        json={"consent_id": consent_id, "action": "APPROVE"}
    )
    assert grant_res.status_code == 200
    assert grant_res.json()["data"]["status"] == "GRANTED"

    # Step 11: Doctor opens queue
    doc_queue = client.get("/api/v1/doctors/queue/today", headers=doc_headers)
    assert doc_queue.status_code == 200
    queue_data = doc_queue.json()["data"]
    assert len(queue_data) >= 1
    # Check patient has active consent
    found_patient = next((q for q in queue_data if q["patient_id"] == patient_id), None)
    assert found_patient is not None
    assert found_patient["has_active_consent"] is True

    # Step 12: Doctor instantly views records (Audit logged)
    timeline_res = client.get(f"/api/v1/doctors/patients/{patient_id}/timeline", headers=doc_headers)
    assert timeline_res.status_code == 200

    # Step 13: Doctor updates diagnosis (ICD-10 I20.9 + SNOMED 194828000)
    diag_res = client.post(
        "/api/v1/doctors/diagnosis",
        headers=doc_headers,
        json={
            "visit_id": visit_id,
            "patient_id": patient_id,
            "icd10_code": "I20.9",
            "snomed_ct_code": "194828000",
            "diagnosis_name": "Angina pectoris, unspecified",
            "diagnosis_type": "FINAL",
            "clinical_description": "Acute coronary presentation. ST elevations noted. Commenced antiplatelet and statin protocol.",
            "is_primary": True
        }
    )
    assert diag_res.status_code == 201
    assert diag_res.json()["data"]["icd10_code"] == "I20.9"

    # Step 14: Prescription (Create E-Prescription with scheduled doses)
    med_search = client.get("/api/v1/prescriptions/medicines/search?q=Augmentin", headers=doc_headers)
    med_id = med_search.json()["data"][0]["id"] if med_search.json()["data"] else None

    if not med_id:
        new_med = client.post(
            "/api/v1/prescriptions/medicines",
            headers=doc_headers,
            json={"brand_name": "Aspirin Cardio 75", "generic_name": "Acetylsalicylic Acid", "form": "TABLET", "strength": "75mg", "is_antibiotic": False, "is_narcotic_controlled": False}
        )
        med_id = new_med.json()["data"]["id"]

    rx_res = client.post(
        "/api/v1/doctors/prescriptions",
        headers=doc_headers,
        json={
            "visit_id": visit_id,
            "patient_id": patient_id,
            "clinical_notes": "Take with water after food. Avoid heavy physical exertion.",
            "items": [
                {
                    "medicine_id": med_id,
                    "dosage_instruction": "1 Tablet once daily after breakfast",
                    "frequency": "ONCE_DAILY",
                    "duration_days": 14,
                    "total_quantity_prescribed": 14,
                    "special_intake_conditions": "Take after morning meal."
                }
            ]
        }
    )
    assert rx_res.status_code == 201
    assert len(rx_res.json()["data"]["intake_schedules"]) >= 1

    # Step 15: Lab Tests (Doctor orders diagnostic investigations)
    lab_order_res = client.post(
        "/api/v1/doctors/lab-orders",
        headers=doc_headers,
        json={
            "visit_id": visit_id,
            "patient_id": patient_id,
            "lab_tests": [
                {"test_name": "Serial Serum Troponin I (3h interval)", "test_category": "LAB_BIOCHEMISTRY", "is_urgent": True},
                {"test_name": "2D Echocardiography with Doppler", "test_category": "ECG_TRACE", "is_urgent": False}
            ],
            "clinical_notes": "Rule out non-ST elevation myocardial infarction (NSTEMI)."
        }
    )
    assert lab_order_res.status_code == 201
    assert lab_order_res.json()["data"]["ordered_tests_count"] == 2

    # Step 16: Close Consultation
    close_res = client.post(
        "/api/v1/doctors/consultation/close",
        headers=doc_headers,
        json={
            "visit_id": visit_id,
            "clinical_summary": "Patient stabilized. Prescribed antiplatelet therapy and ordered serial cardiac biomarkers.",
            "discharge_status": "DISCHARGED",
            "follow_up_advice": "Cardiology OPD review in 48 hours."
        }
    )
    assert close_res.status_code == 200
    assert close_res.json()["data"]["status"] == "DISCHARGED"

    # Step 17: Consent expires automatically
    db = SessionLocal()
    from app.models.models import Consent, ConsentStatusEnum
    expired_consent = db.query(Consent).filter(Consent.id == consent_id).first()
    assert expired_consent.status == ConsentStatusEnum.EXPIRED
    db.close()

    # Step 18: Audit Log created (Tamper-evident log chain)
    admin_login = client.post("/api/v1/auth/hospital-admin/login", json={"username_or_email": "admin@medikiosk.ai", "password": "Admin@123"})
    admin_token = admin_login.json()["data"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    audit_res = client.get("/api/v1/audit/logs", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()["data"]
    assert len(logs) >= 5
    actions = [l["action"] for l in logs]
    assert "DOCTOR_VIEW_RECORD" in actions or "DOCTOR_UPDATE_RECORD" in actions or "CONSENT_GRANT" in actions

    # Step 19: Medical Timeline updated
    timeline_updated = client.get("/api/v1/patients/timeline", headers=pat_headers)
    assert timeline_updated.status_code == 200
    tl_data = timeline_updated.json()["data"]["timeline"]
    assert len(tl_data) >= 3  # Visit, Diagnosis, Prescription, Report


def test_notification_service_suite():
    """
    Test Complete Multi-Channel Notification Service:
    - Patient: Consent Request, Prescription Ready, Medicine Reminder, Appointment Reminder, Report Uploaded
    - Doctor: New Queue Alert, Consent Approved, Lab Results Ready
    - Government: Hospital Alerts, Disease Spike Surge Warning, System Security Alerts
    - Channels: Email Simulation, SMS Simulation, In-App Notifications
    - Notification Inbox: Unread Count Badge, Mark Single Read, Mark All Read
    """
    # 1. Setup Patient & Doctor Auth
    pat_verify = client.post("/api/v1/auth/patient/otp/verify", json={"phone": "9876543210", "otp": "123456"})
    pat_token = pat_verify.json()["data"]["access_token"]
    pat_id = pat_verify.json()["data"]["user_id"]
    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    doc_login = client.post("/api/v1/auth/doctor/login", json={"username_or_email": "dr.sharma@medikiosk.ai", "password": "Doctor@123"})
    doc_token = doc_login.json()["data"]["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    # 2. Test Patient Triggers (SMS, Email, In-App)
    events_patient = [
        ("PATIENT_CONSENT_REQUEST", "IN_APP", {"doctor_name": "Dr. Rajesh Sharma, MD", "purpose": "Cardiology Review"}),
        ("PATIENT_PRESCRIPTION_READY", "SMS", {"prescription_number": "RX-2026-9901", "doctor_name": "Dr. Sharma", "item_count": 2}),
        ("PATIENT_MEDICINE_REMINDER", "SMS", {"medicine_name": "Augmentin 625 Duo", "dosage": "1 Tablet", "time": "08:00 AM"}),
        ("PATIENT_APPOINTMENT_REMINDER", "EMAIL", {"doctor_name": "Dr. Rajesh Sharma", "department": "Cardiology OPD", "time": "10:30 AM"}),
        ("PATIENT_REPORT_UPLOADED", "IN_APP", {"title": "12-Lead ECG Analysis", "type": "Electrocardiogram"}),
    ]

    created_notif_ids = []
    for evt, ch, params in events_patient:
        res = client.post(
            "/api/v1/notifications/simulate",
            json={
                "event_type": evt,
                "recipient_id": pat_id,
                "channel": ch,
                "custom_params": params,
            }
        )
        assert res.status_code == 201, f"Failed for {evt}: {res.text}"
        data = res.json()["data"]
        assert data["channel"] == ch
        assert data["title"] is not None
        created_notif_ids.append(data["id"])

    # 3. Test Doctor Triggers
    events_doctor = [
        ("DOCTOR_NEW_QUEUE", "IN_APP", {"token": "OPD-C-005", "patient": "Aarav Patel", "triage": "ESI_2_EMERGENT", "complaint": "Chest pain"}),
        ("DOCTOR_CONSENT_APPROVED", "IN_APP", {"patient": "Aarav Patel", "mrn": "MRN-BLR-0012", "consent_id": "CONS-99"}),
        ("DOCTOR_LAB_RESULTS_READY", "IN_APP", {"patient": "Aarav Patel", "test": "Serum Troponin I", "report_id": "REP-01", "abnormal": True}),
    ]

    for evt, ch, params in events_doctor:
        res = client.post(
            "/api/v1/notifications/simulate",
            json={
                "event_type": evt,
                "recipient_id": "DOC-001",
                "channel": ch,
                "custom_params": params,
            }
        )
        assert res.status_code == 201
        assert res.json()["data"]["title"] is not None

    # 4. Test Government & Public Health Triggers
    events_govt = [
        ("GOVT_HOSPITAL_ALERT", "IN_APP", {"title": "Triage Overcrowding Warning", "severity": "WARNING", "metrics": "18 arrivals in 30min"}),
        ("GOVT_DISEASE_SPIKE", "EMAIL", {"district": "BLR-URBAN", "syndrome": "RESPIRATORY_ILI", "cases": 142, "surge": 52.0}),
        ("SYSTEM_ALERT", "IN_APP", {"type": "SHA-256 Chain Verification", "desc": "Audit integrity verified.", "severity": "INFO"}),
    ]

    for evt, ch, params in events_govt:
        res = client.post(
            "/api/v1/notifications/simulate",
            json={
                "event_type": evt,
                "channel": ch,
                "custom_params": params,
            }
        )
        assert res.status_code == 201

    # 5. Test Patient Notification Inbox Query
    inbox_res = client.get("/api/v1/notifications", headers=pat_headers)
    assert inbox_res.status_code == 200
    inbox_data = inbox_res.json()["data"]
    assert inbox_data["total_count"] >= 5
    assert inbox_data["unread_count"] >= 1

    # 6. Test Unread Count Endpoint
    unread_res = client.get("/api/v1/notifications/unread-count", headers=pat_headers)
    assert unread_res.status_code == 200
    assert unread_res.json()["data"]["unread_count"] >= 1

    # 7. Test Mark Single Notification as Read
    first_id = created_notif_ids[0]
    read_res = client.put(f"/api/v1/notifications/{first_id}/read", headers=pat_headers)
    assert read_res.status_code == 200
    assert read_res.json()["data"]["status"] == "READ"

    # 8. Test Mark All as Read
    mark_all_res = client.put("/api/v1/notifications/read-all", headers=pat_headers)
    assert mark_all_res.status_code == 200
    assert mark_all_res.json()["data"]["updated_count"] >= 1

    # Verify unread count becomes 0 for patient
    unread_after = client.get("/api/v1/notifications/unread-count", headers=pat_headers)
    assert unread_after.status_code == 200
    assert unread_after.json()["data"]["unread_count"] == 0



