import os
import pytest
from app.services.ai_service import AIService
from app.schemas.ai import (
    IntakeChatMessage,
    IntakeChatResponse,
    IntakeSynthesizeResponse,
    OCRAnalysisResponse,
    DoctorCopilotSummaryResponse,
    PatientAssistantChatResponse,
    PrescriptionExplainResponse,
    DrugInteractionCheckResponse,
)
from app.models.models import TriageLevelEnum

# Ensure test runs against mock-free Gemini or configured environment
pytestmark = pytest.mark.skipif(
    not os.getenv("GEMINI_API_KEY"),
    reason="GEMINI_API_KEY not configured in environment"
)


class TestGeminiAISubsystem:
    """
    End-to-End Test Suite for all 6 Google Gemini 2.5 Flash medical capabilities.
    """

    def test_01_connectivity(self):
        """STEP 4: Test connectivity with 'Reply ONLY with HELLO'."""
        res = AIService.test_connectivity()
        assert res["success"] is True
        assert "HELLO" in res["response"].upper()
        assert res["latency_ms"] > 0
        print(f"\n[Test 1 Pass] Connectivity verified in {res['latency_ms']}ms.")

    def test_02_clinical_intake_chat(self):
        """STEP 5a: Test adaptive symptom elicitation interview."""
        messages = [
            IntakeChatMessage(role="user", content="I have had sharp chest discomfort and mild dizziness since this morning.")
        ]
        vitals = {"systolic_bp": 135, "diastolic_bp": 88, "heart_rate_bpm": 92, "oxygen_saturation_spo2": 97.0}
        
        res = AIService.chat_clinical_intake(
            messages=messages,
            spoken_language="en-US",
            patient_age=45,
            patient_gender="MALE",
            vitals=vitals,
        )
        assert isinstance(res, IntakeChatResponse)
        assert len(res.reply) > 10
        assert isinstance(res.is_complete, bool)
        print(f"\n[Test 2 Pass] Intake Chat Reply: {res.reply[:80]}...")

    def test_03_clinical_intake_synthesis(self):
        """STEP 5b: Test FHIR SOAP synthesis & ESI triage calculation."""
        messages = [
            IntakeChatMessage(role="user", content="Crushing chest pain radiating to left arm, sweating, feeling short of breath for 1 hour."),
            IntakeChatMessage(role="assistant", content="How severe is the pain on a scale of 1 to 10?"),
            IntakeChatMessage(role="user", content="It is a 9 out of 10, feels like a heavy weight on my chest."),
        ]
        vitals = {"systolic_bp": 170, "diastolic_bp": 105, "heart_rate_bpm": 115, "oxygen_saturation_spo2": 93.0}

        res = AIService.synthesize_clinical_intake(
            messages=messages,
            vitals=vitals,
            spoken_language="en-US",
            patient_age=58,
            patient_gender="MALE",
        )
        assert isinstance(res, IntakeSynthesizeResponse)
        assert res.triage_level in [TriageLevelEnum.ESI_1_RESUSCITATION, TriageLevelEnum.ESI_2_EMERGENT, TriageLevelEnum.ESI_3_URGENT]
        assert "subjective" in res.medical_summary
        assert "objective" in res.medical_summary
        assert "assessment" in res.medical_summary
        assert "plan" in res.medical_summary
        print(f"\n[Test 3 Pass] Synthesis Level: {res.triage_level.value} | Dept: {res.suggested_department}")

    def test_04_ocr_document_analysis(self):
        """STEP 6: Test medical report OCR & biomarker entity extraction."""
        sample_lab_text = """
        APOLLO DIAGNOSTICS - COMPREHENSIVE METABOLIC PANEL
        Patient: John Doe | Age: 42 | Gender: Male
        Hemoglobin: 14.5 g/dL (Ref: 13.5 - 17.5 g/dL) [NORMAL]
        Fasting Blood Glucose: 154 mg/dL (Ref: 70 - 99 mg/dL) [HIGH]
        HbA1c: 7.2 % (Ref: 4.0 - 5.6 %) [HIGH]
        Total Cholesterol: 240 mg/dL (Ref: < 200 mg/dL) [HIGH]
        Serum Creatinine: 1.0 mg/dL (Ref: 0.7 - 1.3 mg/dL) [NORMAL]
        eGFR: > 90 mL/min/1.73m2 [NORMAL]
        Impression: Uncontrolled hyperglycemia and hypercholesterolemia.
        """
        res = AIService.analyze_ocr_document(extracted_text=sample_lab_text, document_type="BLOOD_REPORT")
        assert isinstance(res, OCRAnalysisResponse)
        assert len(res.important_findings) >= 2
        assert len(res.summary) > 10
        print(f"\n[Test 4 Pass] OCR Extracted {len(res.important_findings)} findings. Summary: {res.summary[:80]}...")

    def test_05_doctor_copilot_summarize(self):
        """STEP 7: Test doctor clinical copilot longitudinal EHR synthesis."""
        visits = [
            {"visit_number": "ENC-2026-001", "status": "COMPLETED", "chief_complaint": "Acute bronchitis with persistent cough"},
            {"visit_number": "ENC-2026-002", "status": "COMPLETED", "chief_complaint": "Routine hypertension followup"},
        ]
        diagnoses = [
            {"diagnosis_name": "Essential Hypertension", "icd10": "I10"},
            {"diagnosis_name": "Type 2 Diabetes Mellitus", "icd10": "E11.9"},
        ]
        allergies = [
            {"condition_name": "Penicillin", "history_type": "ALLERGY", "severity": "SEVERE_ANAPHYLAXIS"}
        ]
        current_medicines = [
            {"medicine_name": "Telmisartan 40mg", "dosage": "1 Tab OD", "frequency": "ONCE_DAILY"},
            {"medicine_name": "Metformin 500mg", "dosage": "1 Tab BD", "frequency": "TWICE_DAILY"},
        ]
        reports = [
            {"title": "Glycemic & Lipid Panel", "report_type": "LAB_BIOCHEMISTRY", "summary": "HbA1c 7.2%, elevated LDL cholesterol 145 mg/dL"}
        ]

        res = AIService.doctor_summarize_history(
            patient_name="Vikram Malhotra",
            patient_id="PAT-TEST-001",
            visits=visits,
            current_medicines=current_medicines,
            allergies=allergies,
            diagnoses=diagnoses,
            reports=reports,
        )
        assert isinstance(res, DoctorCopilotSummaryResponse)
        assert len(res.clinical_history_summary) > 20
        assert len(res.clinical_red_flags) >= 1
        print(f"\n[Test 5 Pass] Copilot Summary: {res.clinical_history_summary[:80]}...")

    def test_06_patient_health_assistant(self):
        """STEP 8: Test patient assistant grounded QA strictly from database."""
        patient_profile = {"date_of_birth": "1988-04-12", "gender": "MALE", "blood_group": "O+"}
        active_prescriptions = [
            {
                "prescription_number": "RX-2026-0099",
                "items": [
                    {"medicine_name": "Augmentin 625 Duo", "dosage_instruction": "1 Tab after food", "frequency": "TWICE_DAILY", "duration_days": 5},
                    {"medicine_name": "Pantocid 40", "dosage_instruction": "1 Tab before breakfast", "frequency": "ONCE_DAILY", "duration_days": 5},
                ]
            }
        ]
        intake_schedules = [
            {"dosage_amount": "1 Tablet", "scheduled_time": "2026-08-26T20:00:00Z"}
        ]
        recent_visits = [{"visit_number": "ENC-001", "chief_complaint": "Bacterial pharyngitis", "status": "COMPLETED"}]
        diagnoses = [{"diagnosis_name": "Acute Pharyngitis", "icd10": "J02.9"}]

        res = AIService.patient_health_assistant(
            query="What medicines am I taking and when should I take them?",
            patient_name="Vikram Malhotra",
            patient_profile=patient_profile,
            active_prescriptions=active_prescriptions,
            intake_schedules=intake_schedules,
            recent_visits=recent_visits,
            diagnoses=diagnoses,
        )
        assert isinstance(res, PatientAssistantChatResponse)
        assert "Augmentin" in res.answer or "Pantocid" in res.answer or "medicine" in res.answer.lower()
        print(f"\n[Test 6 Pass] Patient Assistant Answer: {res.answer[:80]}...")

    def test_07_prescription_explainer(self):
        """STEP 9: Test plain-language prescription translation."""
        items = [
            {"medicine_name": "Azithromycin 500mg", "dosage_instruction": "1 Tab once daily 1 hour before food", "frequency": "ONCE_DAILY", "duration_days": 3},
            {"medicine_name": "Dolo 650", "dosage_instruction": "1 Tab SOS for fever above 100 F", "frequency": "AS_NEEDED", "duration_days": 3},
        ]
        res = AIService.explain_prescription(items=items, clinical_notes="Drink warm water, complete full 3-day antibiotic course", target_language="English")
        assert isinstance(res, PrescriptionExplainResponse)
        assert len(res.medicines) >= 1
        assert len(res.general_advice) >= 1
        print(f"\n[Test 7 Pass] Prescription Summary: {res.simple_summary[:80]}...")

    def test_08_drug_interaction_checker(self):
        """STEP 10: Test pharmacological drug-drug and allergy interaction checking."""
        new_meds = [
            {"medicine_name": "Augmentin 625 Duo", "generic_name": "Amoxicillin + Clavulanate", "strength": "625mg"}
        ]
        allergies = ["Penicillin (Severe Anaphylaxis)"]
        current_meds = ["Telmisartan 40mg"]

        res = AIService.check_drug_interactions(
            new_medicines=new_meds,
            current_medicines=current_meds,
            known_allergies=allergies,
            chronic_conditions=["Essential Hypertension"],
        )
        assert isinstance(res, DrugInteractionCheckResponse)
        assert res.overall_safety_status in ["WARNING", "CONTRAINDICATED"]
        assert len(res.allergy_risks) >= 1 or res.has_critical_interactions is True
        print(f"\n[Test 8 Pass] Drug Checker Status: {res.overall_safety_status} | Rec: {res.recommendation[:80]}...")
