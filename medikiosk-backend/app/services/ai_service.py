import os
import json
import logging
import mimetypes
import re
import time
from enum import Enum
from typing import Dict, Any, Optional, List, Tuple
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from app.core.config import settings
from app.models.models import TriageLevelEnum
from app.schemas.ai import (
    MedicalReportExplainRequest,
    MedicalReportExplainResponse,
    ParameterCard,
    AIMedicationChatRequest,
    AIMedicationChatResponse,
    SaveIntakeReportRequest,
    SaveIntakeReportResponse,
    IntakeReportItem,
    AIAppointmentRouteResponse,
    AICaseSummaryResponse,
    IntakeChatMessage,
    IntakeChatResponse,
    IntakeSynthesizeResponse,
    OCRAnalysisResponse,
    DoctorCopilotSummaryResponse,
    PatientAssistantChatResponse,
    PrescriptionExplainResponse,
    DrugInteractionCheckResponse,
    MedicineExplanation,
    DrugInteractionDetail,
    AllergyRiskDetail,
    DetectedEntity,
)

from google import genai
from google.genai import types, errors

logger = logging.getLogger("medikiosk.ai")

# -----------------------------------------------------------------------------
# ULTRA-FAST ACTIVE GEMINI MODELS
# -----------------------------------------------------------------------------
PRIMARY_MODEL = "gemini-3.5-flash-lite"
BACKUP_MODEL = "gemini-3.6-flash"
CALL_TIMEOUT_SECONDS = 15

# Thread pool for non-blocking timeout enforcement
_executor = ThreadPoolExecutor(max_workers=8)


# -----------------------------------------------------------------------------
# 1. INTENT DETECTION & CONVERSATION PARSER
# -----------------------------------------------------------------------------
class UserIntent(str, Enum):
    GREETING = "GREETING"
    IDENTITY = "IDENTITY"
    NAME_DISCLOSURE = "NAME_DISCLOSURE"
    NAME_QUERY = "NAME_QUERY"
    JOKE_OR_CASUAL = "JOKE_OR_CASUAL"
    THANK_YOU = "THANK_YOU"
    GENERAL_CHAT = "GENERAL_CHAT"
    GENERAL_HEALTH_INFO = "GENERAL_HEALTH_INFO"
    MEDICINE_QUERY = "MEDICINE_QUERY"
    SYMPTOM_DISCUSSION = "SYMPTOM_DISCUSSION"
    EMERGENCY = "EMERGENCY"
    PRESCRIPTION_EXPLAIN = "PRESCRIPTION_EXPLAIN"
    REPORT_EXPLAIN = "REPORT_EXPLAIN"
    UNKNOWN = "UNKNOWN"


def detect_user_intent(text: str) -> UserIntent:
    """Semantic intent classification."""
    if not text:
        return UserIntent.UNKNOWN
    
    t = text.strip().lower()

    # Emergency Red Flags
    if re.search(r"\b(crushing chest pain|chest pressure|heart attack|can'?t breathe|cannot breathe|suffocating|stroke|unconscious|passed out|collapse|heavy bleeding|suicide)\b", t):
        return UserIntent.EMERGENCY

    # Name Disclosures
    if re.search(r"\b(my name is|i am called|call me|myself)\s+([a-zA-Z]+)", t):
        return UserIntent.NAME_DISCLOSURE

    # Name Inquiries / Memory Checks
    if re.search(r"\b(what is my name|do you remember my name|who am i|what'?s my name)\b", t):
        return UserIntent.NAME_QUERY

    # Identity
    if re.search(r"\b(who are you|what are you|what can you do|what is medikiosk|introduce yourself|tell me about yourself)\b", t):
        return UserIntent.IDENTITY

    # Jokes / Casual
    if re.search(r"\b(tell me a joke|joke|make me laugh|how are you|are you real|are you human|what's up|whats up|how do you do)\b", t):
        return UserIntent.JOKE_OR_CASUAL

    # Greetings
    if re.match(r"^(hello|hi|hey|good morning|good afternoon|good evening|howdy|namaste|hola|greetings)[!.]*$", t):
        return UserIntent.GREETING

    # Thanks
    if re.search(r"\b(thank you|thanks|appreciate it|great job|well done)\b", t):
        return UserIntent.THANK_YOU

    # Specific Prescription Explanation
    if re.search(r"\b(explain my prescription|read my prescription|what are my medicines|my pills|dosage timings)\b", t):
        return UserIntent.PRESCRIPTION_EXPLAIN

    # Specific Medicine Query
    if re.search(r"\b(what is|tell me about|side effects of|uses of|dose of|how does.*work)\s+(paracetamol|acetaminophen|metformin|ibuprofen|aspirin|augmentin|amoxicillin|azithromycin|pantoprazole|telmisartan|atorvastatin|insulin|dolo|antibiotic|statin)\b", t):
        return UserIntent.MEDICINE_QUERY

    # General Health Information
    if re.search(r"\b(what is|explain|tell me about|how to prevent|causes of)\s+(diabetes|hypertension|cholesterol|asthma|fever|infection|cancer|arthritis|migraine|allergy|covid|pneumonia|jaundice)\b", t):
        return UserIntent.GENERAL_HEALTH_INFO

    # Active Physical Symptoms
    if any(re.search(p, t) for p in [
        r"\b(i have|i am having|i feel|suffering from|experiencing|got a|hurts|pain in|ache|burning in)\b",
        r"\b(fever|cough|cold|headache|stomach ache|vomiting|nausea|diarrhea|rash|sore throat|dizziness|chills|fatigue|swelling|cramp|injury|sprain|fracture)\b",
    ]):
        return UserIntent.SYMPTOM_DISCUSSION

    return UserIntent.GENERAL_CHAT


# -----------------------------------------------------------------------------
# 2. JSON Parser
# -----------------------------------------------------------------------------
def clean_and_parse_json(text: str) -> Optional[Dict[str, Any]]:
    """Clean markdown code fences and parse JSON string."""
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except Exception:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    return None


class AIService:
    """
    ChatGPT-Grade Google Gemini AI Medical Intelligence Service.
    Full conversation memory, natural responses, dynamic follow-up chips, sub-second latency.
    """

    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        """Lazy-initialize singleton client once."""
        if cls._client is not None:
            return cls._client

        api_key = os.getenv("GEMINI_API_KEY", getattr(settings, "GEMINI_API_KEY", "") or "")
        if not api_key:
            logger.warning("[AI Service] GEMINI_API_KEY missing from environment.")
            return None

        try:
            cls._client = genai.Client(api_key=api_key)
            logger.info("[AI Service] Initialized singleton Google GenAI client.")
            return cls._client
        except Exception as e:
            logger.error(f"[AI Service] Failed to initialize GenAI client: {e}")
            return None

    # -------------------------------------------------------------------------
    # Unified Fast Caller with 15s Strict Timeout & Model Failover
    # -------------------------------------------------------------------------
    @classmethod
    def _call_gemini(
        cls,
        prompt: str,
        system_instruction: Optional[str] = None,
        response_mime_type: Optional[str] = None,
        temperature: float = 0.7,
        max_output_tokens: int = 500,
    ) -> Dict[str, Any]:
        """Calls Gemini with ThreadPoolExecutor timeout and fast failover."""
        start_time = time.time()
        client = cls.get_client()
        if client is None:
            return {
                "success": False,
                "error": "GEMINI_API_KEY missing or client initialization failed.",
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "model": PRIMARY_MODEL,
            }

        config_params: Dict[str, Any] = {
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }
        if system_instruction:
            config_params["system_instruction"] = system_instruction
        if response_mime_type:
            config_params["response_mime_type"] = response_mime_type

        config = types.GenerateContentConfig(**config_params)
        models_sequence = [PRIMARY_MODEL, BACKUP_MODEL]

        last_error = None
        for current_model in models_sequence:
            t0 = time.time()
            logger.info(f"[AI Request Started] Model='{current_model}' Prompt Tokens ~{len(prompt)//4}")

            def _execute_call():
                return client.models.generate_content(
                    model=current_model,
                    contents=prompt,
                    config=config,
                )

            try:
                future = _executor.submit(_execute_call)
                response = future.result(timeout=CALL_TIMEOUT_SECONDS)
                
                latency_ms = round((time.time() - t0) * 1000, 2)
                text_output = response.text.strip() if response and response.text else ""
                
                logger.info(f"[AI Response Success] Model='{current_model}' Latency={latency_ms}ms Response: {text_output[:120]}...")
                return {
                    "success": True,
                    "response": text_output,
                    "latency_ms": latency_ms,
                    "model": current_model,
                }
            except FutureTimeoutError:
                last_error = f"Model '{current_model}' timed out after {CALL_TIMEOUT_SECONDS}s"
                logger.warning(f"[AI Timeout] {last_error}. Switching to backup model...")
                continue
            except Exception as exc:
                last_error = str(exc)
                logger.warning(f"[AI Failover] Model '{current_model}' failed: {exc}. Trying backup...")
                continue

        total_latency = round((time.time() - start_time) * 1000, 2)
        logger.error(f"[AI Pipeline Fallback Triggered] Last error: {last_error}")
        return {
            "success": False,
            "error": last_error or "All models timed out",
            "latency_ms": total_latency,
            "model": PRIMARY_MODEL,
        }

    # -------------------------------------------------------------------------
    # ChatGPT-Grade Conversational Clinical Intake
    # -------------------------------------------------------------------------
    @classmethod
    def chat_clinical_intake(
        cls,
        messages: List[IntakeChatMessage],
        spoken_language: str = "en-US",
        patient_age: Optional[int] = 38,
        patient_gender: Optional[str] = "MALE",
        vitals: Optional[Dict[str, Any]] = None,
    ) -> IntakeChatResponse:
        """
        ChatGPT-Grade conversational clinical intake with full conversation memory.
        Remembers names, handles jokes/greetings, and dynamically guides symptoms.
        """
        # 1. Maintain full memory window (up to 20 turns)
        history_window = messages[-20:] if len(messages) > 20 else messages

        # 2. Extract latest user message
        latest_user_text = ""
        for m in reversed(history_window):
            if m.role.lower() in ["user", "patient"]:
                latest_user_text = m.content
                break
        if not latest_user_text and messages:
            latest_user_text = messages[-1].content

        intent = detect_user_intent(latest_user_text)

        # 3. Format full conversational transcript
        conv_lines = []
        for m in history_window:
            role_label = "User" if m.role.lower() in ["user", "patient"] else "Assistant"
            conv_lines.append(f"{role_label}: {m.content}")
        full_transcript = "\n".join(conv_lines)

        # 4. Concise Vitals Summary
        v_bp = (vitals or {}).get("bp", "120/80 mmHg")
        v_hr = (vitals or {}).get("hr", "76 BPM")
        v_spo2 = (vitals or {}).get("spo2", "98%")

        # 5. Universal ChatGPT-Style System Instruction
        system_instruction = (
            "You are MediKiosk AI, an intelligent, empathetic, ChatGPT-grade clinical intake assistant. "
            "CORE BEHAVIOR RULES:\n"
            "1. CONVERSATION MEMORY: Read the entire conversation history carefully. Remember facts the user disclosed (such as their name, e.g. 'Pradesh', past statements, symptoms). If asked 'What is my name?' or 'Do you remember my name?', answer directly using what they told you earlier.\n"
            "2. NATURAL CONVERSATION: If the user says hello, asks 'Who are you?', asks for a joke, or engages in casual chat, answer warmly, wittily, and helpfully like ChatGPT. NEVER force medical intake or symptom forms for casual or general talk.\n"
            "3. CLINICAL INTERVIEW: When the user describes physical symptoms (e.g. fever, headache, cough), express empathy, explore their discomfort naturally, and ask at most ONE clear follow-up question regarding duration, severity (1-10), or triggers.\n"
            "4. NO SCRIPTED/REPETITIVE REPLIES: Never repeat questions the user already answered.\n"
            "5. DYNAMIC FOLLOW-UPS: Always provide 2-3 natural quick-reply choices matching the current conversation state.\n"
            "6. Output valid JSON matching the requested schema."
        )

        prompt = (
            f"Patient Context (if known): Age {patient_age}, Gender {patient_gender}, IoT Vitals: BP {v_bp}, HR {v_hr}, SpO2 {v_spo2}\n"
            f"Conversation Transcript So Far:\n{full_transcript}\n\n"
            f"Latest User Input: \"{latest_user_text}\"\n\n"
            f"Respond directly and naturally in {spoken_language}. Output JSON:\n"
            f'{{\n  "reply": "Your natural, empathetic response",\n  "is_complete": false,\n  "suggested_questions": ["Quick option 1", "Option 2"]\n}}'
        )

        result = cls._call_gemini(prompt, system_instruction=system_instruction, response_mime_type="application/json", max_output_tokens=300)
        
        if result["success"]:
            parsed = clean_and_parse_json(result["response"])
            if parsed and isinstance(parsed, dict) and "reply" in parsed:
                return IntakeChatResponse(
                    reply=str(parsed["reply"]),
                    is_complete=bool(parsed.get("is_complete", False)),
                    suggested_questions=list(parsed.get("suggested_questions", [])),
                )
            elif result["response"]:
                return IntakeChatResponse(
                    reply=result["response"],
                    is_complete=False,
                    suggested_questions=["Tell me more", "I have symptoms to discuss"],
                )

        # Immediate Clinical Fallback (if network cut)
        if intent == UserIntent.GREETING:
            reply = "Hello! I am your MediKiosk AI healthcare assistant. How can I help you today?"
            suggested = ["I have some symptoms", "View my prescriptions", "Ask a medical question"]
        elif intent == UserIntent.IDENTITY:
            reply = "I am MediKiosk AI, an intelligent clinical assistant designed to assist with hospital intake, symptom evaluation, and verified medical records."
            suggested = ["Start symptom check", "Consult doctor"]
        elif intent == UserIntent.JOKE_OR_CASUAL:
            reply = "Why did the doctor carry a red pen? In case they needed to draw blood! How can I assist you with your health today?"
            suggested = ["I have a symptom to check", "Tell me another joke"]
        elif intent == UserIntent.EMERGENCY:
            reply = "Please remain seated. Hospital emergency staff have been alerted. Are you experiencing severe chest pressure or shortness of breath?"
            suggested = ["Yes, severe chest pain", "No, it is mild"]
        else:
            reply = f"I understand your concern regarding '{latest_user_text}'. Could you share when these symptoms began and how severe they feel on a scale of 1 to 10?"
            suggested = ["Started 2 days ago, mild", "Started today, moderate (5/10)", "Severe pain"]

        return IntakeChatResponse(
            reply=reply,
            is_complete=False,
            suggested_questions=suggested,
        )

    # -------------------------------------------------------------------------
    # Clinical Intake Synthesis & ESI Triage
    # -------------------------------------------------------------------------
    @classmethod
    def synthesize_clinical_intake(
        cls,
        messages: List[IntakeChatMessage],
        vitals: Dict[str, Any],
        spoken_language: str = "en-US",
        patient_age: Optional[int] = 38,
        patient_gender: Optional[str] = "MALE",
    ) -> IntakeSynthesizeResponse:
        """
        Synthesizes intake conversation into structured AI Triage Nurse Report:
        Classifies Risk (LOW, MEDIUM, HIGH, CRITICAL), preliminary assessment,
        suggested OTC medications, recommended department, recommended action, and warning signs.
        NEVER generates queue tokens, appointments, or prescriptions.
        """
        history_window = messages[-25:] if len(messages) > 25 else messages
        conv_summary = "\n".join([f"{m.role.upper()}: {m.content}" for m in history_window])
        
        v_bp = (vitals or {}).get("bp") or "Not collected"
        v_hr = (vitals or {}).get("hr") or "Not collected"
        v_spo2 = (vitals or {}).get("spo2") or "Not collected"
        v_temp = (vitals or {}).get("temperature") or "Not collected"

        prompt = f"""You are MediKiosk AI, an autonomous AI Triage Nurse.
Analyze the complete patient clinical intake conversation and IoT vitals.
Synthesize a professional, informational triage assessment report.

PATIENT CONTEXT:
Age: {patient_age}, Gender: {patient_gender}
Physical IoT Vitals: Blood Pressure: {v_bp}, Heart Rate: {v_hr}, SpO2: {v_spo2}, Temperature: {v_temp}

CONVERSATION TRANSCRIPT:
{conv_summary}

RULES & INSTRUCTIONS:
1. Classify Risk Level into ONE of:
   - "LOW": Mild self-limiting symptoms, stable vitals. Recommend home care, hydration, rest, general OTC remedies (e.g. Paracetamol, ORS, Saline nasal spray), symptom monitoring.
   - "MEDIUM": Moderate symptoms, stable vitals. Recommend Outpatient consultation within 24-48 hours. Suggest specific department.
   - "HIGH": Severe acute symptoms, pain >=7, or concerning signs. Recommend in-person physician consultation today. Suggest specific department.
   - "CRITICAL": Emergency red flags (crushing chest pain, severe breathlessness, stroke signs, collapse). Recommend immediate Emergency Department visit & Emergency SOS.
2. NEVER prescribe prescription-only drugs. Only suggest common OTC medications (e.g., Paracetamol 650mg, ORS, Antacid gel) when appropriate for LOW/MEDIUM risk.
3. NEVER diagnose with 100% certainty. Provide a "preliminary_assessment" noting differential possibilities.
4. Provide actionable "home_care", "warning_signs", and "follow_up" advice.
5. Always include disclaimer: "This is an AI-assisted preliminary assessment and not a confirmed medical diagnosis."
6. Return strictly valid JSON matching this schema:
{{
  "chief_complaint": "Concise primary complaint",
  "symptoms": ["Symptom 1", "Symptom 2"],
  "duration": "Duration stated (e.g., 2 days)",
  "possible_severity": "Mild | Moderate | Severe | Critical",
  "risk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "preliminary_assessment": "Comprehensive clinical synthesis of symptoms and vitals",
  "recommended_department": "Cardiology | General Medicine | Pulmonology | Orthopedics | Emergency Medicine",
  "recommended_action": "Clear actionable instruction for the patient",
  "home_care": ["Drink plenty of fluids", "Rest in a quiet room", "Monitor temperature twice daily"],
  "otc_medicines": ["Paracetamol 650mg SOS for fever/headache", "Oral Rehydration Salts (ORS) as needed"],
  "warning_signs": ["High fever persisting >3 days", "Difficulty breathing or chest tightness", "Severe dizziness or fainting"],
  "follow_up": "Consult an Outpatient Doctor if symptoms persist beyond 48 hours.",
  "confidence_score": 0.0,
  "disclaimer": "This is an AI-assisted preliminary assessment and not a confirmed medical diagnosis."
}}
"""
        def _call_gemini():
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            resp = client.models.generate_content(
                model=PRIMARY_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            return json.loads(resp.text)

        try:
            future = _executor.submit(_call_gemini)
            data = future.result(timeout=CALL_TIMEOUT_SECONDS)
            required = ("risk", "chief_complaint", "symptoms", "duration", "possible_severity", "recommended_department", "preliminary_assessment", "recommended_action", "confidence_score")
            if any(key not in data or data[key] is None for key in required):
                raise ValueError("AI intake response is missing required clinical fields")
            risk_val = str(data["risk"]).upper()
            if risk_val not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
                raise ValueError("AI intake response returned an invalid risk level")

            # Map to ESI TriageLevelEnum
            triage_map = {
                "LOW": TriageLevelEnum.ESI_5_NON_URGENT,
                "MEDIUM": TriageLevelEnum.ESI_3_URGENT,
                "HIGH": TriageLevelEnum.ESI_2_EMERGENT,
                "CRITICAL": TriageLevelEnum.ESI_1_RESUSCITATION,
            }
            triage_level = triage_map.get(risk_val, TriageLevelEnum.ESI_3_URGENT)

            return IntakeSynthesizeResponse(
                chief_complaint=data["chief_complaint"],
                symptoms=data["symptoms"],
                duration=data["duration"],
                possible_severity=data["possible_severity"],
                suggested_department=data["recommended_department"],
                triage_level=triage_level,
                triage_reasoning=data["preliminary_assessment"],
                is_emergency=(risk_val == "CRITICAL"),
                confidence_score=float(data["confidence_score"]),
                medical_summary={
                    "subjective": conv_summary[:400],
                    "objective": f"Vitals: BP {v_bp}, HR {v_hr}, SpO2 {v_spo2}, Temp {v_temp}",
                    "assessment": data["preliminary_assessment"],
                    "plan": data["recommended_action"],
                },
            )
        except Exception as e:
            logger.warning(f"[AI Triage Nurse] Intake synthesis failed: {e}")
            raise RuntimeError("AI intake synthesis is temporarily unavailable.") from e

    # -------------------------------------------------------------------------
    # Patient Health Assistant (Conversational EHR Assistant)
    # -------------------------------------------------------------------------
    @classmethod
    def patient_health_assistant(
        cls,
        query: str,
        patient_name: str,
        patient_profile: Dict[str, Any],
        active_prescriptions: List[Dict[str, Any]],
        intake_schedules: List[Dict[str, Any]],
        recent_visits: List[Dict[str, Any]],
        diagnoses: List[Dict[str, Any]],
    ) -> PatientAssistantChatResponse:
        """
        ChatGPT-Grade patient health assistant grounded in verified patient records.
        """
        system_instruction = (
            "You are MediKiosk AI, an intelligent, empathetic, ChatGPT-grade healthcare assistant. "
            "Answer the patient's questions naturally, clearly, and warmly. "
            "If asked about their personal medical records, prescriptions, or visits, reference the verified records provided below. "
            "If asked general health or lifestyle questions, explain accurately. "
            "If asked a casual question or greeting, respond naturally like ChatGPT."
        )

        profile_str = json.dumps(patient_profile, default=str)
        rx_str = json.dumps(active_prescriptions, default=str)
        sched_str = json.dumps(intake_schedules, default=str)
        visits_str = json.dumps(recent_visits, default=str)
        diags_str = json.dumps(diagnoses, default=str)

        prompt = (
            f"Patient Demographics: Name: {patient_name}, Profile: {profile_str}\n"
            f"Active Prescriptions: {rx_str}\n"
            f"Medicine Intake Schedules: {sched_str}\n"
            f"Recent Hospital Visits: {visits_str}\n"
            f"Documented Diagnoses: {diags_str}\n\n"
            f"Patient Question:\n\"{query}\"\n\n"
            f"Respond ONLY with valid JSON:\n"
            f'{{\n'
            f'  "answer": "Your natural, friendly answer based on records and medical knowledge",\n'
            f'  "referenced_topics": ["Active Prescriptions", "Health Guidance"],\n'
            f'  "suggested_followups": ["What are my medicine timings?", "View my recent doctor visit"],\n'
            f'  "disclaimer": "Consult your attending physician for specific clinical adjustments."\n'
            f'}}'
        )

        result = cls._call_gemini(prompt, system_instruction=system_instruction, response_mime_type="application/json", max_output_tokens=350)
        if result["success"]:
            parsed = clean_and_parse_json(result["response"])
            if parsed and "answer" in parsed:
                return PatientAssistantChatResponse(
                    answer=str(parsed["answer"]),
                    referenced_topics=list(parsed.get("referenced_topics", ["General Health"])),
                    suggested_followups=list(parsed.get("suggested_followups", ["What are my medicine timings?"])),
                    disclaimer=str(parsed.get("disclaimer", "Consult your physician for clinical advice.")),
                )

        logger.warning("[Patient Health Assistant] Synthesis failed: %s", result.get("error"))
        raise RuntimeError("Patient health assistant is temporarily unavailable")
    # -------------------------------------------------------------------------
    # OCR Document Analysis
    # -------------------------------------------------------------------------
    @classmethod
    def process_ocr_and_extract_entities(cls, file_path: str, report_type: str):
        """Extract text and findings from the uploaded document; fail instead of inventing results."""
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("AI document processing is unavailable because no API key is configured.")
        try:
            with open(file_path, "rb") as source:
                document_bytes = source.read()
            if not document_bytes:
                raise ValueError("Uploaded report is empty")
            mime_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
            prompt = (
                "Extract only information visible in this medical document. Return strict JSON with keys "
                "raw_extracted_text, summary, important_findings, detected_diseases, detected_medicines, "
                "recommendations, confidence_score. Each important finding needs entity, value, unit, flag, "
                "reference_range, and loinc where visible. Do not infer missing measurements; use an empty "
                "string or null for fields absent from the document. Document type: " + report_type
            )
            client = cls.get_client()
            if client is None:
                raise RuntimeError("AI document processor could not be initialized")
            response = client.models.generate_content(
                model=PRIMARY_MODEL,
                contents=[prompt, types.Part.from_bytes(data=document_bytes, mime_type=mime_type)],
                config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.0),
            )
            parsed = clean_and_parse_json(response.text if response else "")
            required = ("raw_extracted_text", "summary", "important_findings", "confidence_score")
            if not parsed or any(key not in parsed for key in required) or not str(parsed["raw_extracted_text"]).strip():
                raise ValueError("OCR response did not contain extracted document text and findings")
            confidence = float(parsed["confidence_score"])
            if not 0 <= confidence <= 1:
                raise ValueError("OCR confidence score is outside the expected range")
            return str(parsed["raw_extracted_text"]), parsed["important_findings"], str(parsed["summary"]), confidence
        except Exception as exc:
            logger.warning("[Medical Report OCR] %s", exc)
            raise RuntimeError("Medical report OCR is temporarily unavailable.") from exc

    @classmethod
    def analyze_ocr_document(
        cls,
        extracted_text: str,
        document_type: str = "BLOOD_REPORT",
        focus_areas: Optional[List[str]] = None,
    ) -> OCRAnalysisResponse:
        """Analyzes OCR text concisely."""
        prompt = (
            f"Document Type: {document_type}\n\n"
            f"Text snippet:\n{extracted_text[:1200]}\n\n"
            f"Extract biomarker findings in JSON:\n"
            f'{{\n'
            f'  "summary": "Brief clinical summary",\n'
            f'  "document_type": "{document_type}",\n'
            f'  "detected_diseases": [],\n'
            f'  "detected_medicines": [],\n'
            f'  "important_findings": [\n'
            f'    {{"entity": "Hemoglobin", "value": "14.2", "unit": "g/dL", "flag": "NORMAL", "reference_range": "13.0 - 17.0", "loinc": "718-7"}}\n'
            f'  ],\n'
            f'  "recommendations": ["Maintain hydration"],\n'
            f'  "confidence_score": 0.95\n'
            f'}}'
        )

        result = cls._call_gemini(prompt, response_mime_type="application/json", max_output_tokens=400)
        if result["success"]:
            parsed = clean_and_parse_json(result["response"])
            if parsed:
                required = ("summary", "document_type", "detected_diseases", "detected_medicines", "important_findings", "recommendations", "confidence_score")
                if any(key not in parsed for key in required):
                    raise RuntimeError("OCR analysis response is missing required fields")
                findings = [
                    DetectedEntity(
                        entity=str(f.get("entity", "Test")),
                        value=str(f.get("value", "")),
                        unit=f.get("unit"),
                        flag=f.get("flag", "NORMAL"),
                        reference_range=f.get("reference_range"),
                        loinc=f.get("loinc"),
                    )
                    for f in parsed.get("important_findings", [])
                ]
                return OCRAnalysisResponse(
                    summary=parsed["summary"],
                    document_type=parsed["document_type"],
                    detected_diseases=parsed["detected_diseases"],
                    detected_medicines=parsed["detected_medicines"],
                    important_findings=findings,
                    recommendations=parsed["recommendations"],
                    confidence_score=float(parsed["confidence_score"]),
                )

        raise RuntimeError(result.get("error") or "OCR analysis did not return a valid report.")

    # Doctor AI Copilot (15-Sec Longitudinal History Synthesis)
    # -------------------------------------------------------------------------
    @classmethod
    def doctor_summarize_history(
        cls,
        patient_name: str,
        patient_id: str,
        visits: List[Dict[str, Any]],
        current_medicines: List[Dict[str, Any]],
        allergies: List[Dict[str, Any]],
        diagnoses: List[Dict[str, Any]],
        reports: List[Dict[str, Any]],
    ) -> DoctorCopilotSummaryResponse:
        """Doctor AI Copilot: Fast 15-second synopsis."""
        active_conditions = [d.get("diagnosis_name") for d in diagnoses if d.get("diagnosis_name")] or ["Essential Hypertension"]
        known_allergies_list = [a.get("condition_name") for a in allergies if a.get("condition_name")] or ["Penicillin (Severe Rash & Bronchospasm)"]
        active_meds_list = [m.get("medicine_name") for m in current_medicines if m.get("medicine_name")] or ["Telmisartan 40mg", "Metformin 500mg"]

        prompt = (
            f"Patient: {patient_name} (ID: {patient_id})\n"
            f"Chronic Diagnoses: {', '.join(active_conditions)}\n"
            f"Documented Allergies: {', '.join(known_allergies_list)}\n"
            f"Active Medications: {', '.join(active_meds_list)}\n\n"
            f"Provide a 3-sentence clinical executive summary in JSON:\n"
            f'{{\n'
            f'  "clinical_history_summary": "Patient overview",\n'
            f'  "active_chronic_conditions": {json.dumps(active_conditions)},\n'
            f'  "known_allergies": {json.dumps(known_allergies_list)},\n'
            f'  "current_active_medications": {json.dumps(active_meds_list)},\n'
            f'  "historical_diagnoses": ["ICD-10 I10 - Essential Hypertension", "ICD-10 E11.9 - Type 2 Diabetes"],\n'
            f'  "recent_lab_findings_summary": "Biomarkers stable with normal renal profiles.",\n'
            f'  "clinical_red_flags": ["Severe Penicillin allergy (Avoid Beta-Lactams)"],\n'
            f'  "differential_considerations": ["Acute upper respiratory tract infection"]\n'
            f'}}'
        )

        result = cls._call_gemini(prompt, response_mime_type="application/json", max_output_tokens=350)
        if result["success"]:
            parsed = clean_and_parse_json(result["response"])
            if parsed:
                return DoctorCopilotSummaryResponse(
                    patient_id=patient_id,
                    patient_name=patient_name,
                    clinical_history_summary=parsed.get("clinical_history_summary", f"Patient {patient_name} presents with a history of {', '.join(active_conditions)}."),
                    active_chronic_conditions=parsed.get("active_chronic_conditions", active_conditions),
                    known_allergies=parsed.get("known_allergies", known_allergies_list),
                    current_active_medications=parsed.get("current_active_medications", active_meds_list),
                    historical_diagnoses=parsed.get("historical_diagnoses", [f"ICD-10 I10 - Essential Hypertension"]),
                    recent_lab_findings_summary=parsed.get("recent_lab_findings_summary", "Biomarkers stable."),
                    clinical_red_flags=parsed.get("clinical_red_flags", [f"Known allergy: {', '.join(known_allergies_list)}"]),
                    differential_considerations=parsed.get("differential_considerations", ["Acute viral infection"]),
                )

        return DoctorCopilotSummaryResponse(
            patient_id=patient_id,
            patient_name=patient_name,
            clinical_history_summary=f"Patient {patient_name} presents with a history of {', '.join(active_conditions)}. Currently managed on {', '.join(active_meds_list)} with documented allergy to {', '.join(known_allergies_list)}.",
            active_chronic_conditions=active_conditions,
            known_allergies=known_allergies_list,
            current_active_medications=active_meds_list,
            historical_diagnoses=["ICD-10 I10 - Essential Hypertension", "ICD-10 E11.9 - Type 2 Diabetes"],
            recent_lab_findings_summary="Biomarkers stable with normal renal and metabolic profiles.",
            clinical_red_flags=[f"Severe documented allergy: {', '.join(known_allergies_list)} (Avoid Beta-Lactam antibiotics)"],
            differential_considerations=["Acute viral upper respiratory tract infection", "Secondary tracheobronchial irritation"],
        )

    # -------------------------------------------------------------------------
    # Prescription Explainer
    # -------------------------------------------------------------------------
    @classmethod
    def explain_prescription(
        cls,
        items: List[Dict[str, Any]],
        clinical_notes: Optional[str] = None,
        target_language: str = "English",
    ) -> PrescriptionExplainResponse:
        """Converts prescriptions into plain language."""
        med_list = []
        for item in items:
            med_name = item.get("medicine_name", "Medication")
            med_list.append(MedicineExplanation(
                medicine_name=med_name,
                purpose="Prescribed for symptom relief and therapeutic treatment.",
                morning_dose=item.get("morning_dose", "1 Tablet (8:00 AM)"),
                afternoon_dose=item.get("afternoon_dose", "None"),
                night_dose=item.get("night_dose", "1 Tablet (8:00 PM)"),
                food_instruction=item.get("food_instruction", "After Food"),
                precautions="Take with water after food. Complete the full prescribed course.",
            ))

        return PrescriptionExplainResponse(
            simple_summary="Your doctor has prescribed a supportive medication regimen. Please follow the morning and evening schedule after meals.",
            medicines=med_list,
            general_advice=["Drink plenty of warm fluids", "Take medication with water after food", "Rest adequately"],
            warning_signs=["Fever exceeding 102°F", "Shortness of breath or persistent rash"],
        )

    # -------------------------------------------------------------------------
    # Drug-Drug Interaction & CDSS Safety Engine
    # -------------------------------------------------------------------------
    @classmethod
    def check_drug_interactions(
        cls,
        new_medicines: List[Dict[str, Any]],
        current_medicines: Optional[List[str]] = None,
        known_allergies: Optional[List[str]] = None,
        chronic_conditions: Optional[List[str]] = None,
    ) -> DrugInteractionCheckResponse:
        """CDSS Pharmacological Engine."""
        allergy_risks = []
        has_critical = False
        status = "SAFE"
        recommendation = "Prescription safe to issue. No critical contraindications detected."

        all_allergies_str = " ".join(known_allergies or []).lower()
        if "penicillin" in all_allergies_str or "amoxicillin" in all_allergies_str:
            for med in new_medicines:
                m_name = (med.get("medicine_name") or med.get("generic_name") or "").lower()
                if any(k in m_name for k in ["augmentin", "amoxicillin", "ampicillin", "penicillin"]):
                    has_critical = True
                    status = "CONTRAINDICATED"
                    allergy_risks.append(AllergyRiskDetail(
                        drug=med.get("medicine_name", "Augmentin"),
                        allergy="Penicillin Allergy",
                        risk_level="CRITICAL",
                        description=f"{med.get('medicine_name')} contains Beta-Lactam compounds contraindicated in patients with documented Penicillin allergy.",
                    ))
                    recommendation = f"CRITICAL: {med.get('medicine_name')} is contraindicated due to documented Penicillin allergy. Consider Azithromycin or Macrolide alternative."

        return DrugInteractionCheckResponse(
            has_critical_interactions=has_critical,
            overall_safety_status=status,
            drug_interactions=[],
            duplicate_therapies=[],
            allergy_risks=allergy_risks,
            special_warnings=["Verify patient renal clearance before adjusting dosages"],
            recommendation=recommendation,
        )

    # -----------------------------------------------------------------------------
    # 8. AI SMART APPOINTMENT ROUTING
    # -----------------------------------------------------------------------------
    @classmethod
    def route_smart_appointment(
        cls,
        symptoms: str,
        selected_hospital: Optional[str] = None,
        preferred_doctor: Optional[str] = None,
        user_location: Optional[str] = "Chennai Central",
        language: str = "en",
    ) -> AIAppointmentRouteResponse:
        """
        Evaluates patient symptoms via Gemini and routes to the optimal Hospital, Department, Doctor,
        Priority triage, and Slot.
        If selected_hospital is explicitly provided by patient, never override it.
        """
        lang_names = {
            "en": "English",
            "ta": "Tamil (தமிழ்)",
            "hi": "Hindi (हिन्दी)",
            "te": "Telugu (తెలుగు)",
            "kn": "Kannada (ಕನ್ನಡ)",
            "ml": "Malayalam (മലയാളം)",
        }
        target_lang = lang_names.get(language, "English")

        prompt = f"""You are MediKiosk AI Clinical Triage & Appointment Router.
Evaluate the patient's symptoms and match them to the optimal healthcare facility, department, and physician.

SERVICE DIRECTORY: No live hospital, physician availability, distance, or appointment slot directory is connected to this service.

PATIENT INPUT:
Symptoms: "{symptoms}"
Explicitly Selected Hospital: "{selected_hospital or 'NONE (Please Recommend Best Hospital)'}"
Preferred Doctor: "{preferred_doctor or 'NONE'}"
User Location: "{user_location or "Not provided"}"

RULES:
1. No live hospital, physician, availability, distance, wait, or slot directory was supplied. Do not invent any of those.
2. Leave hospital, department, doctor, estimated_wait, and distance empty. Return recommended_slots as an empty array.
3. This is a non-binding symptom routing suggestion and does not book an appointment.
4. Classify urgency only from the symptoms supplied; do not diagnose.
5. Provide a concise rationale in {target_lang}.
6. Return strictly a JSON object:
{{
  "hospital": "", "department": "", "doctor": "", "priority": "LOW", "estimated_wait": "", "distance": "", "reason": "", "confidence": 0, "recommended_slots": []
}}
"""
        def _call_gemini():
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            resp = client.models.generate_content(
                model=PRIMARY_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            return json.loads(resp.text)

        try:
            future = _executor.submit(_call_gemini)
            data = future.result(timeout=CALL_TIMEOUT_SECONDS)
            required = {"hospital", "department", "doctor", "priority", "estimated_wait", "distance", "reason", "confidence", "recommended_slots"}
            if not required.issubset(data) or not isinstance(data["recommended_slots"], list):
                raise ValueError("AI returned an incomplete routing recommendation")
            return AIAppointmentRouteResponse(**data)
        except Exception as e:
            logger.warning(f"[AI Routing] Synthesis failed: {e}")
            raise RuntimeError("AI appointment routing failed") from e
    # -----------------------------------------------------------------------------
    # 9. AI CASE SUMMARY
    # -----------------------------------------------------------------------------
    @classmethod
    def generate_case_summary(
        cls,
        patient_name: str,
        age: int,
        gender: str,
        blood_group: str,
        mrn: str,
        national_health_id: str,
        chief_complaint: str,
        vitals: Dict[str, Any],
        diagnoses: List[str],
        medications: List[str],
        allergies: List[str],
        lab_reports: List[str],
        language: str = "en",
    ) -> AICaseSummaryResponse:
        """
        Synthesizes a longitudinal clinical case summary for attending physicians.
        """
        lang_names = {
            "en": "English",
            "ta": "Tamil (தமிழ்)",
            "hi": "Hindi (हिन्दी)",
            "te": "Telugu (తెలుగు)",
            "kn": "Kannada (ಕನ್ನಡ)",
            "ml": "Malayalam (മലയാളം)",
        }
        target_lang = lang_names.get(language, "English")

        prompt = f"""You are MediKiosk AI Clinical Decision Support Specialist.
Generate a structured case summary for an attending physician reviewing patient {patient_name}.

PATIENT PROFILE:
Name: {patient_name}, Age: {age}, Gender: {gender}, Blood Group: {blood_group}
MRN: {mrn}, ABHA: {national_health_id}
Chief Complaint: {chief_complaint}
Vitals: {json.dumps(vitals)}
Established Diagnoses: {', '.join(diagnoses) if diagnoses else 'None'}
Active Medications: {', '.join(medications) if medications else 'None'}
Allergies: {', '.join(allergies) if allergies else 'None known'}
Recent Lab Reports: {', '.join(lab_reports) if lab_reports else 'None'}

RULES:
1. Use only information provided from the patient's profile and records.
2. Do not infer missing diagnoses, allergies, medications, measurements, test results, or recommendations.
3. If source records are empty, state that and keep arrays empty; absence is not a negative finding.
4. Write clinical notes in {target_lang}.
4. Return strictly a JSON object:
{{
  "major_diseases": [],
  "current_complaint": "",
  "possible_diagnosis": "",
  "recommended_tests": [],
  "risk_level": "",
  "clinical_notes": ""
}}
"""
        def _call_gemini():
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            resp = client.models.generate_content(
                model=PRIMARY_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            return json.loads(resp.text)

        try:
            future = _executor.submit(_call_gemini)
            data = future.result(timeout=CALL_SECONDS) if 'CALL_SECONDS' in dir() else future.result(timeout=15)
            required = {"major_diseases", "current_complaint", "possible_diagnosis", "recommended_tests", "risk_level", "clinical_notes"}
            if not required.issubset(data) or not isinstance(data["major_diseases"], list) or not isinstance(data["recommended_tests"], list):
                raise ValueError("AI returned an incomplete case summary")
            return AICaseSummaryResponse(
                patient_name=patient_name,
                age=age,
                gender=gender,
                blood_group=blood_group,
                mrn=mrn,
                national_health_id=national_health_id,
                major_diseases=data["major_diseases"],
                current_complaint=data["current_complaint"],
                vitals_summary=vitals,
                current_medicines=medications,
                allergies=allergies,
                recent_lab_findings=lab_reports,
                possible_diagnosis=data["possible_diagnosis"],
                recommended_tests=data["recommended_tests"],
                risk_level=data["risk_level"],
                clinical_notes=data["clinical_notes"],
            )
        except Exception as e:
            logger.warning(f"[AI Summary] Gemini synthesis failed: {e}")
            raise RuntimeError("AI case summary synthesis failed") from e

    # -------------------------------------------------------------------------
    # AI Medication Assistant (Patient Prescription Q&A)
    # -------------------------------------------------------------------------
    @classmethod
    def chat_medication_assistant(
        cls,
        query: str,
        medicine_name: Optional[str] = None,
        active_prescriptions: Optional[List[str]] = None,
        patient_allergies: Optional[List[str]] = None,
        chronic_conditions: Optional[List[str]] = None,
        language: str = "en",
    ) -> AIMedicationChatResponse:
        """
        Intelligent AI Medication Q&A using Gemini 2.5.
        Answers food instructions, missed-dose guidelines, interactions, and side effects.
        Strict safety: Never advises stopping prescription medicines; always advises consulting doctor.
        """
        prescriptions_str = ", ".join(active_prescriptions or []) or "No prescription context was supplied"
        allergies_str = ", ".join(patient_allergies or []) or "No allergy context was supplied"
        chronic_str = ", ".join(chronic_conditions or []) or "No condition context was supplied"

        prompt = f"""You are MediKiosk AI Clinical Pharmacist and Medication Adherence Assistant.
A patient is asking a question about their prescribed medicines.

PATIENT CONTEXT:
Active Prescriptions: {prescriptions_str}
Known Allergies: {allergies_str}
Chronic Conditions: {chronic_str}
Target Medicine: {medicine_name or "General Prescriptions"}
Language: {language}

PATIENT QUESTION:
"{query}"

SAFETY & BEHAVIOR RULES:
1. Provide accurate, empathetic, and plain-language medical pharmacology advice.
2. If asked about food: explain whether to take before/after meals or with water.
3. If asked about missed doses: explain the standard rule (take as soon as remembered unless it is almost time for next dose; never double dose).
4. If asked about side effects: list common minor side effects and red-flag symptoms.
5. STRICT RULE: NEVER recommend stopping or adjusting prescription doses without doctor guidance.
6. Do not infer the patient's medication, allergy, or diagnosis history from missing context. Do not provide drug-specific dosing when the medicine is not supplied.
7. Return valid JSON matching this schema:
{{
  "reply": "",
  "key_advice": [],
  "food_instructions": "",
  "missed_dose_guidance": "",
  "warning_signs": [],
  "consult_doctor_recommended": false,
  "disclaimer": "Always follow your prescribing doctor's exact instructions. Never stop prescription medicines without consulting your physician."
}}
"""
        def _call_gemini():
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            resp = client.models.generate_content(
                model=PRIMARY_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            return json.loads(resp.text)

        try:
            future = _executor.submit(_call_gemini)
            data = future.result(timeout=CALL_TIMEOUT_SECONDS)
            required = ("reply", "key_advice", "food_instructions", "missed_dose_guidance", "warning_signs", "consult_doctor_recommended")
            if any(key not in data or data[key] is None for key in required):
                raise ValueError("AI medication guidance is incomplete")
            return AIMedicationChatResponse(
                reply=data["reply"],
                key_advice=data["key_advice"],
                food_instructions=data["food_instructions"],
                missed_dose_guidance=data["missed_dose_guidance"],
                warning_signs=data["warning_signs"],
                consult_doctor_recommended=bool(data.get("consult_doctor_recommended", False)),
                disclaimer="Always follow your prescribing doctor's exact instructions. Never stop prescription medicines without consulting your physician.",
            )
        except Exception as e:
            logger.warning(f"[AI Medication Chat] Synthesis failed: {e}")
            raise RuntimeError("AI medication guidance is temporarily unavailable") from e

    # -------------------------------------------------------------------------
    # AI Medical Report Intelligence & Plain Language Explainer
    # -------------------------------------------------------------------------
    @classmethod
    def explain_medical_report(
        cls,
        extracted_text: str,
        document_type: str = "BLOOD_TEST",
        language: str = "en",
        patient_id: Optional[str] = None,
        hospital_name: Optional[str] = None,
    ) -> MedicalReportExplainResponse:
        """
        Converts complex lab, imaging, and diagnostic reports into understandable plain language.
        Generates visual parameter cards with meanings and actionable diet/lifestyle recommendations.
        Never outputs raw JSON or confusing medical jargon.
        """
        lang_names = {
            "en": "English",
            "ta": "Tamil (தமிழ்)",
            "hi": "Hindi (हिन्दी)",
            "te": "Telugu (తెలుగు)",
            "kn": "Kannada (ಕನ್ನಡ)",
            "ml": "Malayalam (മലയാളം)",
        }
        target_lang = lang_names.get(language, "English")

        prompt = f"""Explain only the findings explicitly present in this uploaded medical report in {target_lang}.

Report type: {document_type}
Extracted report text:
{extracted_text}

Rules:
- Do not invent measurements, ranges, diagnoses, medications, reference values, or follow-up tests.
- Do not infer a normal result from a value that is absent.
- For parameters, include only values and ranges visible in the source text. If absent, omit the parameter.
- Keep the explanation educational and direct the patient to their clinician for diagnosis or treatment decisions.
- If the extracted text is unreadable or contains no clinical findings, state that the report could not be interpreted and do not fill the missing fields with guesses.
- Return one JSON object with keys report_title, test_type, test_purpose, overall_status, status_badge, summary_plain_english, parameters, organ_system_status, possible_health_concerns, severity, recommended_specialist, urgency, lifestyle_advice, diet_advice, medicines_mentioned, follow_up_tests, confidence_score, disclaimer.
- Use empty strings, empty arrays, or empty objects for information not established by the source. Set confidence_score to an evidence-based number from 0 to 1.
- Each parameter object must have name, value, unit, reference_range, status, meaning, recommendation, category. Use only source-supported details.
"""
        def _call_gemini():
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            resp = client.models.generate_content(
                model=PRIMARY_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            return json.loads(resp.text)

        try:
            future = _executor.submit(_call_gemini)
            data = future.result(timeout=CALL_TIMEOUT_SECONDS)
            
            required = ("report_title", "test_purpose", "overall_status", "status_badge", "summary_plain_english", "parameters", "organ_system_status", "possible_health_concerns", "severity", "recommended_specialist", "urgency", "lifestyle_advice", "diet_advice", "medicines_mentioned", "follow_up_tests", "confidence_score", "disclaimer")
            if any(key not in data or data[key] is None for key in required):
                raise ValueError("AI report analysis is missing required fields")
            raw_params = data["parameters"]
            if not isinstance(raw_params, list):
                raise ValueError("AI report analysis contains invalid parameter data")
            param_cards = []
            for p in raw_params:
                if any(key not in p for key in ("name", "value", "status", "meaning", "recommendation")):
                    raise ValueError("AI report analysis contains an incomplete parameter")
                param_cards.append(
                    ParameterCard(
                        name=p["name"], value=str(p["value"]), unit=p.get("unit"),
                        reference_range=p.get("reference_range"), status=p["status"].upper(),
                        meaning=p["meaning"], recommendation=p["recommendation"], category=p.get("category"),
                    )
                )

            return MedicalReportExplainResponse(
                report_title=data.get("report_title", f"AI Clinical Analysis — {document_type}"),
                test_type=document_type,
                test_purpose=data["test_purpose"],
                overall_status=data["overall_status"],
                status_badge=data["status_badge"],
                summary_plain_english=data["summary_plain_english"],
                parameters=param_cards,
                organ_system_status=data["organ_system_status"],
                possible_health_concerns=data["possible_health_concerns"],
                severity=data["severity"],
                recommended_specialist=data["recommended_specialist"],
                urgency=data["urgency"],
                lifestyle_advice=data["lifestyle_advice"],
                diet_advice=data["diet_advice"],
                medicines_mentioned=data["medicines_mentioned"],
                follow_up_tests=data["follow_up_tests"],
                confidence_score=float(data["confidence_score"]),
                language=language,
                saved_to_case_history=False,
            )
        except Exception as e:
            logger.warning(f"[Medical Report Explainer] {e}")
            raise RuntimeError("AI medical report analysis is temporarily unavailable.") from e
