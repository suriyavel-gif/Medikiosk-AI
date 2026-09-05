"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useHospital } from "@/lib/hospital-context";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { PatientTimeline } from "@/lib/types";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import {
  History,
  Building2,
  Stethoscope,
  Calendar,
  FileText,
  Pill,
  ChevronDown,
  ChevronUp,
  Download,
  Activity,
  CheckCircle2,
  Lock,
  Search,
  Filter,
  Sparkles,
  Printer,
  HeartPulse,
  Thermometer,
  Wind,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  ShieldCheck,
  User,
  Bot,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";

interface ClinicalVisitEncounter {
  id: string;
  visit_date: string;
  visit_time: string;
  hospital_name: string;
  hospital_short: string;
  department: string;
  doctor_name: string;
  doctor_degree: string;
  doctor_reg: string;
  opd_room: string;
  chief_complaint: string;
  duration: string;
  severity: string;
  triage_level: string;
  vitals: {
    bp: string;
    bp_status: string;
    hr: string;
    hr_status: string;
    spo2: string;
    spo2_status: string;
    temp: string;
    temp_status: string;
    resp_rate: string;
    bmi: string;
  };
  diagnoses: Array<{
    code: string;
    name: string;
    type: "PRIMARY" | "SECONDARY" | "CHRONIC";
  }>;
  prescriptions: Array<{
    medicine_name: string;
    generic_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    food_instruction: string;
    morning: boolean;
    afternoon: boolean;
    night: boolean;
  }>;
  diagnostic_tests: Array<{
    test_name: string;
    category: string;
    status: "COMPLETED" | "PENDING";
    result_summary: string;
  }>;
  reports: Array<{
    title: string;
    report_type: string;
    date: string;
    findings: string;
  }>;
  soap_notes: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  follow_up: {
    date: string;
    instructions: string;
    red_flags: string;
  };
}

export default function MedicalTimelinePage() {
  const { selectedHospital } = useHospital();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("ALL");
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState("ALL");
  const [expandedVisits, setExpandedVisits] = useState<Record<string, boolean>>({
    "enc-01": true,
  });

  // AI Summary Modal State
  const [showAiSummaryModal, setShowAiSummaryModal] = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryData, setAiSummaryData] = useState<{
    trajectory: string;
    chronicConditions: string[];
    activeMedications: string[];
    keyInsights: string[];
  } | null>(null);

  // Longitudinal Clinical Encounters Dataset
  const encounters: ClinicalVisitEncounter[] = [
    {
      id: "enc-01",
      visit_date: "August 28, 2026",
      visit_time: "10:30 AM",
      hospital_name: selectedHospital.name,
      hospital_short: selectedHospital.shortName,
      department: "Cardiology & Internal Medicine",
      doctor_name: "Dr. Rajesh Sharma",
      doctor_degree: "MD (Cardiology), DM (Interventional)",
      doctor_reg: "MCI-2018-948210",
      opd_room: `OPD ${selectedHospital.emrRoom}`,
      chief_complaint: "Productive cough and mild chest tightness on moderate exertion",
      duration: "3 days",
      severity: "Moderate (4/10)",
      triage_level: "ESI_3_URGENT",
      vitals: {
        bp: "128/82 mmHg",
        bp_status: "Prehypertension",
        hr: "76 BPM",
        hr_status: "Sinus Rhythm",
        spo2: "98%",
        spo2_status: "Optimal",
        temp: "98.4 °F",
        temp_status: "Afebrile",
        resp_rate: "16 bpm",
        bmi: "23.4 (Normal)",
      },
      diagnoses: [
        { code: "ICD-10 J06.9", name: "Acute upper respiratory infection, unspecified", type: "PRIMARY" },
        { code: "ICD-10 I10", name: "Essential (primary) hypertension", type: "CHRONIC" },
      ],
      prescriptions: [
        {
          medicine_name: "Telmisartan 40mg",
          generic_name: "Telmisartan",
          dosage: "1 Tablet (40mg)",
          frequency: "Once Daily",
          duration: "30 Days",
          food_instruction: "After Breakfast (8:00 AM)",
          morning: true,
          afternoon: false,
          night: false,
        },
        {
          medicine_name: "Augmentin 625 Duo",
          generic_name: "Amoxicillin + Clavulanic Acid",
          dosage: "1 Tablet (625mg)",
          frequency: "Twice Daily",
          duration: "5 Days",
          food_instruction: "After Food (8 AM & 8 PM)",
          morning: true,
          afternoon: false,
          night: true,
        },
        {
          medicine_name: "Pan 40",
          generic_name: "Pantoprazole 40mg",
          dosage: "1 Tablet (40mg)",
          frequency: "Once Daily",
          duration: "7 Days",
          food_instruction: "Before Breakfast (7:30 AM)",
          morning: true,
          afternoon: false,
          night: false,
        },
      ],
      diagnostic_tests: [
        { test_name: "Complete Blood Count (CBC)", category: "Hematology", status: "COMPLETED", result_summary: "WBC 7,200/mcL, Hb 14.2 g/dL (Normal)" },
        { test_name: "Chest X-Ray (PA View)", category: "Radiology", status: "COMPLETED", result_summary: "No focal consolidation or pleural effusion" },
      ],
      reports: [
        { title: "CBC Automated Panel", report_type: "LAB_HEMATOLOGY", date: "Aug 28, 2026", findings: "Hemoglobin 14.2 g/dL, Platelets 240,000 /mcL, Neutrophils 62%" },
        { title: "Chest Radiograph PA View", report_type: "RADIOLOGY_XRAY", date: "Aug 28, 2026", findings: "Clear bilateral lung fields, normal cardiothoracic ratio (0.46)" },
      ],
      soap_notes: {
        subjective: "Patient presented with a 3-day history of productive mucoid cough and mild retrosternal tightness on climbing stairs. No fever spikes at home. Compliant with antihypertensive therapy.",
        objective: "Hemodynamically stable. Vitals: BP 128/82 mmHg, HR 76 BPM, SpO2 98% on room air. Chest auscultation revealed bilateral vesicular breath sounds with faint scattered expiratory wheeze. S1/S2 heard normally, no murmurs.",
        assessment: "1. Acute viral upper respiratory tract infection with mild bronchospasm. 2. Well-controlled Essential Hypertension.",
        plan: "1. 5-day course of Augmentin 625 Duo and gastroprotective PPI. 2. Continue Telmisartan 40mg morning. 3. Steam inhalation twice daily. 4. Review in 5 days if cough persists.",
      },
      follow_up: {
        date: "September 02, 2026",
        instructions: "Maintain adequate oral hydration. Avoid cold beverages and air pollutants. Take medications strictly after meals.",
        red_flags: "Immediate emergency review if fever exceeds 102°F, hemoptysis occurs, or acute breathlessness develops.",
      },
    },
    {
      id: "enc-02",
      visit_date: "June 14, 2026",
      visit_time: "11:15 AM",
      hospital_name: "Fortis Healthcare Center",
      hospital_short: "Fortis FMRI",
      department: "Endocrinology & General Medicine",
      doctor_name: "Dr. Ananya Roy",
      doctor_degree: "MBBS, MD (Endocrinology)",
      doctor_reg: "DMC-2016-778219",
      opd_room: "OPD 108",
      chief_complaint: "Routine 3-month glycemic review and annual metabolic wellness check",
      duration: "Routine Check",
      severity: "Mild (1/10)",
      triage_level: "ESI_5_NON_URGENT",
      vitals: {
        bp: "124/80 mmHg",
        bp_status: "Normotensive",
        hr: "72 BPM",
        hr_status: "Sinus Rhythm",
        spo2: "99%",
        spo2_status: "Optimal",
        temp: "98.2 °F",
        temp_status: "Afebrile",
        resp_rate: "14 bpm",
        bmi: "23.2 (Normal)",
      },
      diagnoses: [
        { code: "ICD-10 E11.9", name: "Type 2 diabetes mellitus without complications", type: "CHRONIC" },
        { code: "ICD-10 E78.0", name: "Pure hypercholesterolemia", type: "SECONDARY" },
      ],
      prescriptions: [
        {
          medicine_name: "Metformin 500mg SR",
          generic_name: "Metformin Extended Release",
          dosage: "1 Tablet (500mg)",
          frequency: "Twice Daily",
          duration: "90 Days",
          food_instruction: "With Meals (8 AM & 8 PM)",
          morning: true,
          afternoon: false,
          night: true,
        },
        {
          medicine_name: "Atorvastatin 10mg",
          generic_name: "Atorvastatin Calcium",
          dosage: "1 Tablet (10mg)",
          frequency: "Once Daily",
          duration: "90 Days",
          food_instruction: "At Bedtime (10:00 PM)",
          morning: false,
          afternoon: false,
          night: true,
        },
      ],
      diagnostic_tests: [
        { test_name: "Glycated Hemoglobin (HbA1c)", category: "Biochemistry", status: "COMPLETED", result_summary: "HbA1c 6.4% (Target: <7.0%)" },
        { test_name: "Fasting Blood Sugar (FBS)", category: "Biochemistry", status: "COMPLETED", result_summary: "FBS 108 mg/dL (Normal)" },
        { test_name: "Comprehensive Lipid Profile", category: "Biochemistry", status: "COMPLETED", result_summary: "Total Cholesterol 184 mg/dL, LDL 102 mg/dL, HDL 48 mg/dL" },
      ],
      reports: [
        { title: "Metabolic Biomarker Report", report_type: "LAB_BIOCHEMISTRY", date: "Jun 14, 2026", findings: "HbA1c 6.4%, Fasting Glucose 108 mg/dL, Serum Creatinine 0.9 mg/dL" },
        { title: "Lipid Profile Panel", report_type: "LAB_BIOCHEMISTRY", date: "Jun 14, 2026", findings: "Total Cholesterol 184 mg/dL, Triglycerides 142 mg/dL, LDL 102 mg/dL" },
      ],
      soap_notes: {
        subjective: "Asymptomatic 38-year-old male presenting for routine glycemic monitoring. Reports excellent compliance with Metformin and daily 30-minute brisk walks. No polyuria, polydipsia, or neuropathic numbness.",
        objective: "Physical exam unremarkable. BP 124/80 mmHg, Pulse 72 BPM regular. Pedal pulses well palpable bilaterally. Monofilament sensory testing normal.",
        assessment: "Type 2 Diabetes Mellitus with excellent glycemic control (HbA1c 6.4%). Mild dyslipidemia well-stabilized on low-dose statin.",
        plan: "1. Continue Metformin 500mg SR twice daily with meals. 2. Continue Atorvastatin 10mg at bedtime. 3. Maintain regular aerobic exercise and low-glycemic dietary regimen. 4. Next HbA1c review in 3 months.",
      },
      follow_up: {
        date: "September 15, 2026",
        instructions: "Repeat Fasting Blood Sugar and HbA1c 1 week prior to next review.",
        red_flags: "Contact clinic if recurrent hypoglycemic symptoms (tremors, sweating, dizziness) occur.",
      },
    },
    {
      id: "enc-03",
      visit_date: "January 22, 2026",
      visit_time: "02:45 PM",
      hospital_name: "AIIMS New Delhi",
      hospital_short: "AIIMS Delhi",
      department: "Cardiology OPD",
      doctor_name: "Dr. Vikram Seth",
      doctor_degree: "MD, DM (Cardiology)",
      doctor_reg: "MCI-2012-441209",
      opd_room: "Room 204",
      chief_complaint: "Annual cardiovascular health evaluation and ECG rhythm screening",
      duration: "Annual Check",
      severity: "Mild (1/10)",
      triage_level: "ESI_5_NON_URGENT",
      vitals: {
        bp: "126/82 mmHg",
        bp_status: "Normotensive",
        hr: "74 BPM",
        hr_status: "Normal Sinus Rhythm",
        spo2: "99%",
        spo2_status: "Optimal",
        temp: "98.4 °F",
        temp_status: "Afebrile",
        resp_rate: "15 bpm",
        bmi: "23.5 (Normal)",
      },
      diagnoses: [
        { code: "ICD-10 I10", name: "Essential (primary) hypertension", type: "CHRONIC" },
      ],
      prescriptions: [
        {
          medicine_name: "Telmisartan 40mg",
          generic_name: "Telmisartan",
          dosage: "1 Tablet (40mg)",
          frequency: "Once Daily",
          duration: "180 Days",
          food_instruction: "After Breakfast",
          morning: true,
          afternoon: false,
          night: false,
        },
      ],
      diagnostic_tests: [
        { test_name: "12-Lead Electrocardiogram (ECG)", category: "Cardiology", status: "COMPLETED", result_summary: "Normal sinus rhythm at 74 BPM, normal axis, no ST-T wave abnormalities" },
        { test_name: "2D Echocardiography", category: "Cardiology", status: "COMPLETED", result_summary: "Normal LV systolic function, LVEF 62%, no regional wall motion abnormality" },
      ],
      reports: [
        { title: "12-Lead Resting ECG Trace", report_type: "ECG_TRACE", date: "Jan 22, 2026", findings: "PR interval 150ms, QRS 88ms, QTc 410ms. No ischemic changes." },
        { title: "Transthoracic 2D Echo Report", report_type: "CARDIOLOGY_ECHO", date: "Jan 22, 2026", findings: "Concentric LV remodeling absent, preserved ejection fraction (62%), normal diastolic function." },
      ],
      soap_notes: {
        subjective: "Patient presented for annual cardiovascular health audit. Reports feeling well, zero anginal chest pain, no palpitations, excellent functional capacity (NYHA Class I).",
        objective: "Resting BP 126/82 mmHg. Normal heart sounds S1 and S2. Peripheral pulses intact.",
        assessment: "Stable primary hypertension with zero end-organ damage and preserved myocardial function.",
        plan: "1. Continue Telmisartan 40mg daily. 2. Maintain dietary salt restriction (<5g/day). 3. Annual cardiac follow-up in 12 months.",
      },
      follow_up: {
        date: "January 2027",
        instructions: "Maintain home BP log (measure weekly). Continue regular exercise.",
        red_flags: "Seek emergency evaluation for acute substernal chest pressure radiating to left arm or jaw.",
      },
    },
  ];

  useEffect(() => {
    setLoading(false);
  }, []);

  const toggleVisit = (id: string) => {
    setExpandedVisits((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    encounters.forEach((e) => (allExpanded[e.id] = true));
    setExpandedVisits(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedVisits({});
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleGenerateAiSummary = async () => {
    setAiSummaryLoading(true);
    setShowAiSummaryModal(true);

    try {
      // Simulate Gemini longitudinal synthesis
      setTimeout(() => {
        setAiSummaryData({
          trajectory: "Vikram Malhotra's multi-year longitudinal health trajectory reflects well-managed chronic conditions (Essential Hypertension and Type 2 Diabetes) across Apollo, Fortis, and AIIMS. Myocardial structure and renal parameters are fully preserved.",
          chronicConditions: [
            "Essential Hypertension (ICD-10 I10) — Stable on Telmisartan 40mg (BP 124-128/80-82 mmHg)",
            "Type 2 Diabetes Mellitus (ICD-10 E11.9) — Optimal glycemic control (HbA1c 6.4%, FBS 108 mg/dL)",
          ],
          activeMedications: [
            "Telmisartan 40mg (Morning after breakfast)",
            "Metformin 500mg SR (Twice daily with meals)",
            "Atorvastatin 10mg (Night at bedtime)",
          ],
          keyInsights: [
            "Preserved Cardiac Function: 2D Echo confirms LVEF 62% with normal sinus rhythm.",
            "Metabolic Control: HbA1c of 6.4% is comfortably below the diabetic target threshold of 7.0%.",
            "Acute Episode: Recent Aug 2026 URI episode managed with Augmentin 625 Duo; resolve in 5 days.",
            "Proactive Wellness: Continue daily 30-minute brisk walks and low-sodium Mediterranean diet.",
          ],
        });
        setAiSummaryLoading(false);
      }, 900);
    } catch (err) {
      setAiSummaryLoading(false);
    }
  };

  // Filter Encounters
  const filteredEncounters = encounters.filter((e) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      e.hospital_name.toLowerCase().includes(q) ||
      e.doctor_name.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q) ||
      e.chief_complaint.toLowerCase().includes(q) ||
      e.diagnoses.some((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)) ||
      e.prescriptions.some((p) => p.medicine_name.toLowerCase().includes(q) || p.generic_name.toLowerCase().includes(q));

    const matchesSpecialty =
      selectedSpecialty === "ALL" || e.department.toLowerCase().includes(selectedSpecialty.toLowerCase());

    const matchesHospital =
      selectedHospitalFilter === "ALL" || e.hospital_name.toLowerCase().includes(selectedHospitalFilter.toLowerCase());

    return matchesSearch && matchesSpecialty && matchesHospital;
  });

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in w-full pb-12">
        {/* Page Top Header with Title, AI Summary & Print Export */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                ABDM SOVEREIGN HEALTH RECORD
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                MULTI-HOSPITAL SYNCHRONIZED
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
              <History className="w-7 h-7 text-blue-600" />
              <span>Longitudinal Patient Health Timeline</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological medical case history aggregating encounters, vitals, prescriptions, lab tests, and SOAP notes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            <button
              onClick={handleGenerateAiSummary}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-black shadow-md shadow-blue-600/20 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Trajectory Summary</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 shadow-xs transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Export PDF Dossier</span>
            </button>

            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={handleExpandAll}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 rounded-xl transition"
              >
                Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 rounded-xl transition"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* Search & Specialty Filter Toolbar */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by diagnosis (ICD-10), medication (Metformin), doctor, symptom, or hospital..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedHospitalFilter}
                onChange={(e) => setSelectedHospitalFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-600"
              >
                <option value="ALL">All Network Hospitals</option>
                <option value="Apollo">{selectedHospital.shortName}</option>
                <option value="Fortis">Fortis Healthcare</option>
                <option value="AIIMS">AIIMS New Delhi</option>
              </select>

              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-600"
              >
                <option value="ALL">All Specialties</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Endocrinology">Endocrinology</option>
                <option value="Internal Medicine">Internal Medicine</option>
              </select>
            </div>
          </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600">
              <span className="text-slate-400 font-semibold mr-1">Categories:</span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
              >
                All Events
              </button>
              <button
                type="button"
                onClick={() => setSearchQuery("Prescription")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Prescriptions & Medicines
              </button>
              <button
                type="button"
                onClick={() => setSearchQuery("Diagnostic")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Lab Reports & Scans
              </button>
              <button
                type="button"
                onClick={() => setSearchQuery("Hypertension")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Chronic Conditions
              </button>
              <button
                type="button"
                onClick={() => setSearchQuery("AIIMS")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                AIIMS Hospital Visits
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>
                Showing <strong className="text-slate-900">{filteredEncounters.length}</strong> of {encounters.length} verified encounters
              </span>
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SHA-256 Tamper-Evident Chained</span>
              </span>
            </div>
        </div>

        {/* AI Clinical Intake Reports Banner */}
        <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white rounded-3xl border border-blue-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">AI Clinical Intake & Triage Reports</h3>
                <p className="text-xs text-slate-500">Autonomous conversational triage nurse records and preliminary assessments</p>
              </div>
            </div>

            <Link
              href="/patient/intake"
              className="ent-button-primary text-xs px-3.5 py-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New AI Intake</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white border border-blue-200/80 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#2563EB]">RPT-INTAKE-2026-001</span>
                <span className="px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-800 text-[10px] font-bold">
                  MEDIUM RISK
                </span>
              </div>
              <p className="font-bold text-slate-900">Acute viral URI with low-grade fever & sore throat</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Preliminary Assessment: Acute upper respiratory tract presentation with stable hemodynamics. Recommended Outpatient consultation within 24-48 hours.
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                <span>Apollo Hospitals Chennai</span>
                <span>Sep 02, 2026 • 10:30 AM</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-700">RPT-INTAKE-2026-002</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  LOW RISK
                </span>
              </div>
              <p className="font-bold text-slate-900">Mild seasonal rhinitis and nasal congestion</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Preliminary Assessment: Self-limiting allergic/viral rhinitis. Recommended home hydration, saline nasal spray, and symptom monitoring.
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                <span>Apollo Hospitals Chennai</span>
                <span>Aug 10, 2026 • 09:15 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chronological Vertical Timeline Stream */}
        <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-blue-600 before:via-indigo-400 before:to-slate-300">
          {filteredEncounters.map((enc) => {
            const isExpanded = expandedVisits[enc.id];

            return (
              <div key={enc.id} className="relative space-y-3 animate-fade-in">
                {/* Timeline Pulsing Node */}
                <div className="absolute -left-6 sm:-left-10 top-2 w-6 h-6 rounded-full bg-white border-4 border-blue-600 shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></div>
                </div>

                {/* Main Encounter Card */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition overflow-hidden">
                  {/* Card Header Banner */}
                  <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-xl text-xs font-black shadow-xs">
                          {enc.visit_date} • {enc.visit_time}
                        </span>
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
                          {enc.hospital_name}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold">
                          {enc.opd_room}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 pt-0.5">
                        <Stethoscope className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Attending: <strong className="text-slate-900">{enc.doctor_name}</strong> ({enc.doctor_degree}) — <span className="text-slate-500">{enc.department}</span>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleVisit(enc.id)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start md:self-auto shrink-0"
                    >
                      <span>{isExpanded ? "Hide Full Clinical EHR" : "View Full Clinical EHR"}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-5">
                    {/* Chief Complaint & Severity Tag */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chief Complaint</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-slate-900 leading-snug">{enc.chief_complaint}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                          Duration: {enc.duration}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                          {enc.severity}
                        </span>
                      </div>
                    </div>

                    {/* 4-Metric Calibrated IoT Vitals Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Blood Pressure</span>
                          <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                        <div className="text-sm font-black text-slate-900">{enc.vitals.bp}</div>
                        <span className="text-[10px] font-semibold text-emerald-700">{enc.vitals.bp_status}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Heart Rate</span>
                          <Activity className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div className="text-sm font-black text-slate-900">{enc.vitals.hr}</div>
                        <span className="text-[10px] font-semibold text-blue-700">{enc.vitals.hr_status}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-400">SpO2 Oxygen</span>
                          <Wind className="w-3.5 h-3.5 text-cyan-500" />
                        </div>
                        <div className="text-sm font-black text-slate-900">{enc.vitals.spo2}</div>
                        <span className="text-[10px] font-semibold text-cyan-700">{enc.vitals.spo2_status}</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Body Temp</span>
                          <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div className="text-sm font-black text-slate-900">{enc.vitals.temp}</div>
                        <span className="text-[10px] font-semibold text-amber-700">{enc.vitals.temp_status}</span>
                      </div>
                    </div>

                    {/* Standardized ICD-10 Diagnoses */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Documented Diagnoses</span>
                      <div className="flex flex-wrap gap-2">
                        {enc.diagnoses.map((diag, idx) => (
                          <div
                            key={idx}
                            className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${
                              diag.type === "PRIMARY"
                                ? "bg-blue-50 border-blue-200 text-blue-900 font-bold"
                                : diag.type === "CHRONIC"
                                ? "bg-purple-50 border-purple-200 text-purple-900 font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-800 font-medium"
                            }`}
                          >
                            <span className="font-mono text-[11px] font-black">{diag.code}</span>
                            <span>{diag.name}</span>
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white font-extrabold border">
                              {diag.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expanded Clinical Sections */}
                    {isExpanded && (
                      <div className="space-y-5 pt-4 border-t border-slate-100 animate-fade-in">
                        {/* 1. Prescribed Medications Schedule */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Pill className="w-4 h-4 text-blue-600" />
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                              Prescribed Medications & Timings
                            </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {enc.prescriptions.map((rx, idx) => (
                              <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <strong className="text-slate-900">{rx.medicine_name}</strong>
                                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold">
                                    {rx.duration}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">Generic: {rx.generic_name}</div>
                                <div className="text-[11px] text-slate-700 font-medium">{rx.food_instruction}</div>
                                <div className="flex items-center gap-1.5 pt-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rx.morning ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-400"}`}>
                                    Morning
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rx.afternoon ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-400"}`}>
                                    Afternoon
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rx.night ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-400"}`}>
                                    Night
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 2. Diagnostic Investigation Panels & Attached Reports */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Tests */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-teal-600" />
                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                Diagnostic Investigations Ordered
                              </h4>
                            </div>
                            <div className="space-y-2">
                              {enc.diagnostic_tests.map((test, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs space-y-1">
                                  <div className="flex items-center justify-between font-bold text-slate-900">
                                    <span>{test.test_name}</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                                      {test.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600">{test.result_summary}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Reports */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-purple-600" />
                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                Uploaded Reports & Scans
                              </h4>
                            </div>
                            <div className="space-y-2">
                              {enc.reports.map((rep, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs space-y-1">
                                  <div className="flex items-center justify-between font-bold text-slate-900">
                                    <span>{rep.title}</span>
                                    <span className="text-[10px] text-slate-400">{rep.date}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600">{rep.findings}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* 3. Attending Physician SOAP Clinical Notes */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2 text-xs">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                            <span>Physician SOAP Clinical Notes</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] pt-1 text-slate-700">
                            <div>
                              <strong className="text-slate-900 block font-bold">Subjective:</strong>
                              <p className="mt-0.5">{enc.soap_notes.subjective}</p>
                            </div>
                            <div>
                              <strong className="text-slate-900 block font-bold">Objective:</strong>
                              <p className="mt-0.5">{enc.soap_notes.objective}</p>
                            </div>
                            <div>
                              <strong className="text-slate-900 block font-bold">Assessment:</strong>
                              <p className="mt-0.5">{enc.soap_notes.assessment}</p>
                            </div>
                            <div>
                              <strong className="text-slate-900 block font-bold">Plan & Instructions:</strong>
                              <p className="mt-0.5">{enc.soap_notes.plan}</p>
                            </div>
                          </div>
                        </div>

                        {/* 4. Follow-up & Red Flags */}
                        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/70 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-black uppercase text-emerald-800">Follow-up Review</span>
                            <p className="font-extrabold text-emerald-950">{enc.follow_up.date}</p>
                            <p className="text-[11px] text-emerald-800">{enc.follow_up.instructions}</p>
                          </div>
                          <div className="text-[11px] text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 max-w-sm">
                            <strong>Emergency Red Flags:</strong> {enc.follow_up.red_flags}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Longitudinal Summary Modal */}
        {showAiSummaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">AI Longitudinal Health Trajectory Summary</h3>
                    <p className="text-xs text-slate-400">Synthesized across Apollo, Fortis, and AIIMS records</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiSummaryModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {aiSummaryLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500 text-xs">
                  <Sparkles className="w-8 h-8 text-blue-600 animate-spin" />
                  <span>Synthesizing multi-hospital longitudinal case history with Gemini...</span>
                </div>
              ) : aiSummaryData ? (
                <div className="space-y-5 text-xs text-slate-700">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200/70 leading-relaxed text-sm text-blue-950 font-medium">
                    {aiSummaryData.trajectory}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        <span>Chronic Conditions Monitored</span>
                      </h4>
                      <ul className="space-y-1.5 text-slate-600">
                        {aiSummaryData.chronicConditions.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0"></span>
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <span>Active Medication Regimen</span>
                      </h4>
                      <ul className="space-y-1.5 text-slate-600">
                        {aiSummaryData.activeMedications.map((m, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                    <h4 className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Key Clinical Insights & Next Steps</span>
                    </h4>
                    <ul className="space-y-1 text-emerald-900">
                      {aiSummaryData.keyInsights.map((k, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0"></span>
                          <span>{k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowAiSummaryModal(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                >
                  Close Summary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
