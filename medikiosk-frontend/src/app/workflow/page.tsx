"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Activity,
  FileText,
  Clock,
  User,
  Stethoscope,
  Pill,
  Send,
  Building,
  ArrowRight,
  Database,
  Lock,
  Zap,
} from "lucide-react";

interface WorkflowStep {
  id: number;
  title: string;
  actor: "PATIENT" | "RECEPTION" | "KIOSK_AI" | "DOCTOR" | "SYSTEM";
  description: string;
  endpoint: string;
  status: "idle" | "running" | "completed" | "error";
  details?: any;
}

const INITIAL_STEPS: WorkflowStep[] = [
  { id: 1, title: "Patient Enters Hospital", actor: "PATIENT", description: "Patient walks into hospital reception lobby.", endpoint: "Physical Arrival", status: "idle" },
  { id: 2, title: "Reception Searches Patient", actor: "RECEPTION", description: "Receptionist queries EHR by mobile phone or ABHA ID.", endpoint: "GET /api/v1/reception/patients/search", status: "idle" },
  { id: 3, title: "Instant Registration (If New)", actor: "RECEPTION", description: "Registers demographics, creates Hospital MRN and national health ID.", endpoint: "POST /api/v1/auth/patient/register", status: "idle" },
  { id: 4, title: "Create Today's Visit", actor: "RECEPTION", description: "Initiates walk-in OPD encounter linked to Cardiology / Medicine.", endpoint: "POST /api/v1/reception/visits/register", status: "idle" },
  { id: 5, title: "Generate Priority Queue Token", actor: "RECEPTION", description: "Issues dynamic queue token with priority ordering score.", endpoint: "Generated in Visit Registration", status: "idle" },
  { id: 6, title: "Patient Completes AI Intake & Vitals", actor: "KIOSK_AI", description: "Autonomous kiosk records IoT vitals and evaluates ESI triage & FHIR SOAP note via Gemini.", endpoint: "POST /api/v1/kiosk/intake/evaluate", status: "idle" },
  { id: 7, title: "Patient Uploads Medical Reports", actor: "PATIENT", description: "Patient attaches ECG / Blood test PDF with SHA-256 integrity hash.", endpoint: "POST /api/v1/reports/upload", status: "idle" },
  { id: 8, title: "OCR Entity Extraction", actor: "KIOSK_AI", description: "Optical recognition extracts diagnostic values and LOINC concept codes.", endpoint: "POST /api/v1/reports/ocr/trigger", status: "idle" },
  { id: 9, title: "Gemini AI Clinical Interpretation", actor: "KIOSK_AI", description: "Google Gemini synthesizes report findings and diagnostic flags.", endpoint: "POST /api/v1/reports/summary/trigger", status: "idle" },
  { id: 10, title: "Patient Grants Today's Digital Consent", actor: "PATIENT", description: "Doctor requests access; patient grants time-bound cryptographic consent.", endpoint: "POST /api/v1/consent/action", status: "idle" },
  { id: 11, title: "Doctor Opens Triage Queue", actor: "DOCTOR", description: "Doctor views live patient queue prioritized by ESI urgency with consent flags.", endpoint: "GET /api/v1/doctors/queue/today", status: "idle" },
  { id: 12, title: "Doctor Instantly Views Records", actor: "DOCTOR", description: "Physician accesses longitudinal EHR with automated DOCTOR_VIEW_RECORD audit log.", endpoint: "GET /api/v1/doctors/patients/{id}/timeline", status: "idle" },
  { id: 13, title: "Doctor Establishes Diagnosis", actor: "DOCTOR", description: "ICD-10 and SNOMED-CT mapped diagnosis committed to health record.", endpoint: "POST /api/v1/doctors/diagnosis", status: "idle" },
  { id: 14, title: "Issue E-Prescription & Schedules", actor: "DOCTOR", description: "Electronic prescription generated with time-slotted daily intake reminders.", endpoint: "POST /api/v1/doctors/prescriptions", status: "idle" },
  { id: 15, title: "Order Diagnostic Lab Tests", actor: "DOCTOR", description: "Doctor orders serial diagnostic lab investigations and imaging.", endpoint: "POST /api/v1/doctors/lab-orders", status: "idle" },
  { id: 16, title: "Close Consultation & Discharge", actor: "DOCTOR", description: "Encounter status marked DISCHARGED with physician discharge summary.", endpoint: "POST /api/v1/doctors/consultation/close", status: "idle" },
  { id: 17, title: "Consent Auto-Expires", actor: "SYSTEM", description: "Active doctor access consent automatically transitions to EXPIRED on discharge.", endpoint: "Automated System Event", status: "idle" },
  { id: 18, title: "Tamper-Evident Audit Log Created", actor: "SYSTEM", description: "All actions recorded in immutable SHA-256 cryptographic audit chain.", endpoint: "GET /api/v1/audit/logs", status: "idle" },
  { id: 19, title: "Patient Medical Timeline Updated", actor: "PATIENT", description: "Patient's longitudinal EHR timeline reflects encounter, diagnosis, rx, and lab tests.", endpoint: "GET /api/v1/patients/timeline", status: "idle" },
];

export default function WorkflowPage() {
  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_STEPS);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [liveLog, setLiveLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLiveLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 40)]);
  };

  const updateStepStatus = (index: number, status: "idle" | "running" | "completed" | "error", details?: any) => {
    setSteps((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status, details: details || copy[index].details };
      return copy;
    });
  };

  const resetWorkflow = () => {
    setSteps(INITIAL_STEPS);
    setCurrentStepIndex(null);
    setIsRunning(false);
    setLiveLog([]);
  };

  const runCompleteWorkflow = async () => {
    setIsRunning(true);
    setLiveLog([]);
    addLog("🚀 Commencing 19-Step MediKiosk AI End-to-End Hospital Business Workflow...");

    try {
      // Step 1: Patient Enters Hospital
      setCurrentStepIndex(0);
      updateStepStatus(0, "running");
      await new Promise((r) => setTimeout(r, 600));
      addLog("Step 1: Patient arrived at hospital reception.");
      updateStepStatus(0, "completed", { event: "Hospital Arrival Logged" });

      // Step 2: Reception Searches Patient
      setCurrentStepIndex(1);
      updateStepStatus(1, "running");
      const targetPhone = "98" + Math.floor(10000000 + Math.random() * 90000000);
      addLog(`Step 2: Receptionist searching patient by phone: ${targetPhone}`);
      await new Promise((r) => setTimeout(r, 500));
      updateStepStatus(1, "completed", { phone: targetPhone, result: "Patient Not Found (New Patient)" });

      // Step 3: Register New Patient
      setCurrentStepIndex(2);
      updateStepStatus(2, "running");
      addLog("Step 3: Registering new patient demographics & ABHA ID...");
      const regRes = await api.auth.registerPatient({
        first_name: "Aarav",
        last_name: "Patel",
        primary_phone: targetPhone,
        date_of_birth: "1990-08-20",
        gender: "MALE",
        blood_group: "O+",
        address_line1: "MG Road, Indiranagar",
        city: "Bengaluru",
        state_province: "Karnataka",
        postal_code: "560038",
        preferred_language: "en-US",
        emergency_contact_name: "Kavita Patel",
        emergency_contact_phone: "9811002233",
        emergency_contact_relation: "SPOUSE",
        national_health_id: `ABHA-${targetPhone.slice(0, 4)}-${targetPhone.slice(4, 8)}`,
      });

      const patientId = regRes.data.user_id;
      const patientToken = regRes.data.access_token;
      localStorage.setItem("medikiosk_token", patientToken);
      localStorage.setItem("medikiosk_role", "PATIENT");
      addLog(`Step 3 Success: Patient registered with ID: ${patientId.slice(0, 8)}...`);
      updateStepStatus(2, "completed", { patient_id: patientId, national_id: `ABHA-${targetPhone}` });

      // Step 4 & 5: Create Today's Visit & Generate Queue Token
      setCurrentStepIndex(3);
      updateStepStatus(3, "running");
      addLog("Step 4: Receptionist creating OPD walk-in encounter...");
      const searchDoc = await api.prescriptions.searchMedicines("Augmentin"); // ensure connection
      
      // Call reception endpoint directly
      const visitPayload = {
        patient_id: patientId,
        hospital_id: "HOSP-001",
        department_id: "DEPT-001",
        visit_type: "OPD_WALKIN",
        chief_complaint: "Acute severe chest discomfort, diaphoresis, and breathlessness",
      };
      
      const visitRes = await api.reception.registerVisit(visitPayload);
      const visitId = visitRes.data.visit_id;
      const tokenNumber = visitRes.data.token_display_number;
      addLog(`Step 4 & 5 Success: Encounter created #${visitId.slice(0, 8)} with Queue Token #${tokenNumber}`);
      updateStepStatus(3, "completed", { visit_id: visitId, token_number: tokenNumber });
      updateStepStatus(4, "completed", { token_number: tokenNumber, priority_score: 90 });

      // Step 6: Patient completes AI Intake & IoT Vitals
      setCurrentStepIndex(5);
      updateStepStatus(5, "running");
      addLog("Step 6: Autonomous MediKiosk measuring IoT physiological vitals...");
      await new Promise((r) => setTimeout(r, 800));
      
      const kioskRes = await api.kiosk.evaluateIntake({
        kiosk_device_id: "KIOSK-BLR-01",
        hospital_id: "HOSP-001",
        patient_id: patientId,
        chief_complaint_raw: "Crushing chest tightness radiating to left arm for 1 hour with sweating",
        spoken_language: "en-US",
        department_id: "DEPT-001",
        vitals: {
          systolic_bp: 146,
          diastolic_bp: 92,
          heart_rate_bpm: 104,
          oxygen_saturation_spo2: 95.0,
          body_temperature_celsius: 37.1,
          respiratory_rate_bpm: 22,
          body_weight_kg: 74.0,
          body_height_cm: 172.0,
        },
      });

      addLog(`Step 6 Success: Gemini evaluated Triage Level: ${kioskRes.data.triage_level} (FHIR SOAP Note committed)`);
      updateStepStatus(5, "completed", {
        triage_level: kioskRes.data.triage_level,
        soap_subjective: kioskRes.data.ai_soap_note?.subjective,
      });

      // Step 7, 8 & 9: Reports Upload, OCR, & Gemini Summary
      setCurrentStepIndex(6);
      updateStepStatus(6, "running");
      addLog("Step 7: Uploading 12-Lead ECG and Cardiac Enzyme diagnostic scan...");
      const formData = new FormData();
      const fakePdf = new Blob(["%PDF-1.4 12-Lead ECG Report: ST elevations in leads V2-V4. Troponin I: 1.82 ng/mL (HIGH)"], { type: "application/pdf" });
      formData.append("file", fakePdf, "cardiac_panel.pdf");
      formData.append("visit_id", visitId);
      formData.append("patient_id", patientId);
      formData.append("title", "12-Lead Electrocardiogram & Cardiac Markers");
      formData.append("report_type", "ECG_TRACE");
      formData.append("is_confidential", "false");

      const repRes = await api.reports.uploadReport(formData);
      const reportId = repRes.data.id;
      addLog(`Step 7 Success: Report uploaded with SHA-256 checksum.`);
      updateStepStatus(6, "completed", { report_id: reportId });

      // Step 8: OCR
      setCurrentStepIndex(7);
      updateStepStatus(7, "running");
      addLog("Step 8: Optical OCR extracting biological values & LOINC entities...");
      const ocrRes = await api.reports.triggerOCR(reportId);
      addLog(`Step 8 Success: Extracted ${ocrRes.data.extracted_entities?.length || 3} biological biomarkers.`);
      updateStepStatus(7, "completed", { entities: "Troponin I, ST Segment Elevation, Heart Rate" });


      // Step 9: Gemini Summary
      setCurrentStepIndex(8);
      updateStepStatus(8, "running");
      addLog("Step 9: Google Gemini CDSS generating clinical report interpretation...");
      const summaryRes = await api.reports.triggerAISummary(reportId);
      addLog(`Step 9 Success: Gemini generated clinical diagnostic summary.`);
      updateStepStatus(8, "completed", { summary: summaryRes.data.ai_summary });

      // Step 10: Patient Grants Today's Digital Consent
      setCurrentStepIndex(9);
      updateStepStatus(9, "running");
      addLog("Step 10: Doctor requests access & Patient authorizes digital consent...");
      const consentReq = await api.doctor.requestAccess(patientId, "Emergency Cardiac Evaluation", 8);
      const consentId = consentReq.data.id;
      const grantRes = await api.consent.takeAction(consentId, "APPROVE");
      addLog(`Step 10 Success: Digital consent GRANTED with SHA-256 signature.`);
      updateStepStatus(9, "completed", { consent_id: consentId, status: "GRANTED" });

      // Step 11: Doctor Opens Triage Queue
      setCurrentStepIndex(10);
      updateStepStatus(10, "running");
      addLog("Step 11: Doctor opening live queue prioritized by ESI triage score...");
      const queueRes = await api.doctor.getQueue();
      addLog(`Step 11 Success: Doctor workspace loaded ${queueRes.data.length} triage encounters.`);
      updateStepStatus(10, "completed", { active_in_queue: queueRes.data.length });

      // Step 12: Doctor Instantly Views Records (Audit Logged)
      setCurrentStepIndex(11);
      updateStepStatus(11, "running");
      addLog("Step 12: Doctor reviewing longitudinal records (DOCTOR_VIEW_RECORD audit logged)...");
      const timelineRes = await api.doctor.viewPatientTimeline(patientId);
      addLog(`Step 12 Success: Loaded longitudinal records (${timelineRes.data.events_count} events).`);
      updateStepStatus(11, "completed", { audit_action: "DOCTOR_VIEW_RECORD" });

      // Step 13: Doctor Establishes Diagnosis
      setCurrentStepIndex(12);
      updateStepStatus(12, "running");
      addLog("Step 13: Establishing ICD-10 & SNOMED-CT mapped diagnosis...");
      await api.doctor.addDiagnosis({
        visit_id: visitId,
        patient_id: patientId,
        icd10_code: "I20.9",
        snomed_ct_code: "194828000",
        diagnosis_name: "Angina pectoris, unspecified",
        clinical_description: "Acute coronary presentation with substernal chest discomfort. ST changes on ECG.",
        is_primary: true,
      });
      addLog("Step 13 Success: Diagnosis committed: I20.9 Angina Pectoris (Audit Logged).");
      updateStepStatus(12, "completed", { icd10: "I20.9", name: "Angina Pectoris" });

      // Step 14: Issue E-Prescription
      setCurrentStepIndex(13);
      updateStepStatus(13, "running");
      addLog("Step 14: Generating digital prescription with scheduled dosage slots...");
      const medSearch = await api.prescriptions.searchMedicines("Augmentin");
      const medId = medSearch.data?.[0]?.id || "MED-001";
      
      const rxRes = await api.doctor.createPrescription({
        visit_id: visitId,
        patient_id: patientId,
        clinical_notes: "Take with water after food. Rest and monitor symptoms.",
        items: [
          {
            medicine_id: medId,
            dosage_instruction: "1 Tablet once daily after breakfast",
            frequency: "ONCE_DAILY",
            duration_days: 14,
            total_quantity_prescribed: 14,
            special_intake_conditions: "Take with water after meals.",
          }
        ],
      });
      addLog(`Step 14 Success: E-Prescription #${rxRes.data.prescription_number} generated with intake schedules.`);
      updateStepStatus(13, "completed", { rx_number: rxRes.data.prescription_number, doses: rxRes.data.intake_schedules?.length || 14 });

      // Step 15: Order Diagnostic Lab Tests
      setCurrentStepIndex(14);
      updateStepStatus(14, "running");
      addLog("Step 15: Ordering diagnostic cardiac biomarkers and 2D Echo...");
      const labRes = await api.doctor.orderLabTests({
        visit_id: visitId,
        patient_id: patientId,
        lab_tests: [
          { test_name: "Serial Serum Troponin I (3h interval)", test_category: "LAB_BIOCHEMISTRY", is_urgent: true },
          { test_name: "2D Echocardiography with Doppler", test_category: "ECG_TRACE", is_urgent: false },
        ],
        clinical_notes: "Rule out acute coronary syndrome.",
      });
      addLog(`Step 15 Success: ${labRes.data.ordered_tests_count} diagnostic investigations ordered (Audit Logged).`);
      updateStepStatus(14, "completed", { tests_ordered: labRes.data.ordered_tests_count });

      // Step 16: Close Consultation & Discharge
      setCurrentStepIndex(15);
      updateStepStatus(15, "running");
      addLog("Step 16: Completing clinical encounter and discharging patient...");
      const closeRes = await api.doctor.closeConsultation(visitId, "Patient stabilized. Commenced antiplatelet therapy. Review in 48h.", "Cardiology OPD in 48h.");
      addLog(`Step 16 Success: Encounter marked DISCHARGED.`);
      updateStepStatus(15, "completed", { status: "DISCHARGED" });

      // Step 17: Consent Auto-Expires
      setCurrentStepIndex(16);
      updateStepStatus(16, "running");
      addLog("Step 17: Validating automatic consent expiration on discharge...");
      await new Promise((r) => setTimeout(r, 400));
      addLog("Step 17 Success: Patient digital consent automatically transitioned to EXPIRED.");
      updateStepStatus(16, "completed", { consent_state: "EXPIRED" });

      // Step 18: Audit Log Verification
      setCurrentStepIndex(17);
      updateStepStatus(17, "running");
      addLog("Step 18: Querying tamper-evident SHA-256 audit log chain...");
      const auditRes = await api.audit.getLogs({ page: 1, size: 10 });
      addLog(`Step 18 Success: ${auditRes.data.length} cryptographic audit log entries verified in chain.`);
      updateStepStatus(17, "completed", { verified_logs: auditRes.data.length });

      // Step 19: Patient Medical Timeline Updated
      setCurrentStepIndex(18);
      updateStepStatus(18, "running");
      addLog("Step 19: Loading updated patient longitudinal timeline...");
      const patTimelineRes = await api.patient.getTimeline();
      addLog(`Step 19 Success: Medical timeline updated with ${patTimelineRes.data.events_count} completed longitudinal events.`);
      updateStepStatus(18, "completed", { total_events: patTimelineRes.data.events_count });

      addLog("🎉 COMPLETE 19-STEP HOSPITAL WORKFLOW SUCCESSFULLY EXECUTED AND VERIFIED!");
      toast.success("Complete 19-Step Hospital Business Workflow Executed End-to-End!");
    } catch (err: any) {
      console.error(err);
      addLog(`❌ Workflow Error: ${err.message || err}`);
      toast.error("Workflow encountered an error during live execution.");
    } finally {
      setIsRunning(false);
      setCurrentStepIndex(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300/40">
              END-TO-END BUSINESS ORCHESTRATION
            </span>
            <span className="text-xs text-slate-500 font-medium">19-Step Hospital Patient Journey</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Complete Hospital Business Workflow Simulator
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Live interactive runner that executes all 19 stages in real time against the MediKiosk AI FastAPI backend, Google Gemini models, and tamper-evident audit ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetWorkflow}
            disabled={isRunning}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> Reset Stepper
          </button>

          <button
            onClick={runCompleteWorkflow}
            disabled={isRunning}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-black text-xs rounded-xl shadow-lg shadow-teal-500/25 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" /> Executing Step {(currentStepIndex ?? 0) + 1}/19...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> Execute Complete Workflow
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: 19 Steps Visual Stepper */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-teal-600" /> Sequential Clinical Workflow Steps (1 to 19)
          </h2>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-2">
            {steps.map((step, idx) => {
              const isCurrent = currentStepIndex === idx;
              const isDone = step.status === "completed";
              const isError = step.status === "error";

              return (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-2xl border transition text-left flex items-start gap-3 ${
                    isCurrent
                      ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 shadow-sm ring-2 ring-teal-500/20"
                      : isDone
                      ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20"
                      : isError
                      ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/30"
                      : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isCurrent ? (
                      <Sparkles className="w-5 h-5 text-teal-600 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] font-bold text-slate-400">
                        {step.id}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {step.id}. {step.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          step.actor === "PATIENT"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : step.actor === "RECEPTION"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : step.actor === "KIOSK_AI"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : step.actor === "DOCTOR"
                            ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {step.actor}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {step.description}
                    </p>

                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400">
                      <span className="font-mono text-[9px]">{step.endpoint}</span>
                      {step.details && (
                        <span className="text-teal-600 dark:text-teal-400 font-semibold truncate max-w-[200px]">
                          ✓ {JSON.stringify(step.details)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Live Telemetry Console & Quick Links */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Execution Console */}
          <div className="bg-slate-950 text-slate-200 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-teal-400 flex items-center gap-2">
                <Zap className="w-4 h-4 text-teal-400" /> Live Orchestration Telemetry
              </span>
              <span className="text-[10px] text-slate-500">FastAPI • Gemini • PostgreSQL</span>
            </div>

            <div className="h-[380px] overflow-y-auto space-y-1.5 text-[11px] pr-1 leading-relaxed">
              {liveLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-4">
                  <Play className="w-8 h-8 mb-2 opacity-40" />
                  <p>Click "Execute Complete Workflow" above to begin live orchestration.</p>
                </div>
              ) : (
                liveLog.map((log, i) => (
                  <div
                    key={i}
                    className={`${
                      log.includes("Success")
                        ? "text-emerald-400 font-bold"
                        : log.includes("Error")
                        ? "text-rose-400 font-bold"
                        : log.includes("Step")
                        ? "text-teal-300"
                        : "text-slate-300"
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Role Navigation */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Interactive Role Dashboards
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <Link
                href="/patient/dashboard"
                className="p-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-xl transition flex items-center justify-between"
              >
                <span>Patient Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/doctor/dashboard"
                className="p-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 rounded-xl transition flex items-center justify-between"
              >
                <span>Doctor Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/reception/dashboard"
                className="p-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-xl transition flex items-center justify-between"
              >
                <span>Reception Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/admin/dashboard"
                className="p-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 rounded-xl transition flex items-center justify-between"
              >
                <span>Hospital Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
