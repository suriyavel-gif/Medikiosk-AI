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
  const [expandedVisits, setExpandedVisits] = useState<Record<string, boolean>>({});
  const [encounters, setEncounters] = useState<ClinicalVisitEncounter[]>([]);
  const [intakeReports, setIntakeReports] = useState<any[]>([]);

  // AI Summary Modal State
  const [showAiSummaryModal, setShowAiSummaryModal] = useState(false);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryData, setAiSummaryData] = useState<{
    trajectory: string;
    chronicConditions: string[];
    activeMedications: string[];
    keyInsights: string[];
  } | null>(null);

  const toEncounter = (event: any): ClinicalVisitEncounter => ({
    id: event.event_id,
    visit_date: event.timestamp ? new Date(event.timestamp).toLocaleDateString() : "Date unavailable",
    visit_time: event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : "",
    hospital_name: event.hospital_name || "Hospital not recorded",
    hospital_short: event.hospital_name || "Hospital not recorded",
    department: event.metadata?.department || "Not recorded",
    doctor_name: event.doctor_name || "Not recorded",
    doctor_degree: "",
    doctor_reg: "",
    opd_room: "",
    chief_complaint: event.description || event.title || "Clinical event",
    duration: "",
    severity: event.metadata?.severity || "Not recorded",
    triage_level: event.metadata?.triage_level || "Not recorded",
    vitals: { bp: "", bp_status: "", hr: "", hr_status: "", spo2: "", spo2_status: "", temp: "", temp_status: "", resp_rate: "", bmi: "" },
    diagnoses: event.event_type === "DIAGNOSIS" ? [{ code: event.metadata?.icd10 || "", name: event.title || "Diagnosis", type: "PRIMARY" }] : [],
    prescriptions: [],
    diagnostic_tests: [],
    reports: event.event_type === "REPORT" ? [{ title: event.title, report_type: event.metadata?.mime_type || "Report", date: event.timestamp || "", findings: event.description || "" }] : [],
    soap_notes: { subjective: "", objective: "", assessment: event.metadata?.ai_summary || "", plan: "" },
    follow_up: { date: "", instructions: "", red_flags: "" },
  });

  useEffect(() => {
    let active = true;
    api.ai.getIntakeReports(user?.id || "").then((response) => {
      if (response.success && Array.isArray(response.data) && active) setIntakeReports(response.data);
    }).catch(() => { if (active) toast.error("Could not load saved intake reports"); });
    api.patient.getTimeline().then((response) => {
      if (!response.success || !response.data) throw new Error(response.message || "Could not load timeline");
      if (active) setEncounters((response.data.timeline || []).map(toEncounter));
    }).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Could not load timeline");
      if (active) setEncounters([]);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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
    if (!user?.id) { toast.error("Patient identity is unavailable."); return; }
    setAiSummaryLoading(true);
    setShowAiSummaryModal(true);
    try {
      const response = await api.ai.getCaseSummary({ patient_id: user.id });
      if (!response.success || !response.data) throw new Error(response.message || "AI case summary failed");
      setAiSummaryData({
        trajectory: response.data.clinical_notes || "",
        chronicConditions: response.data.major_diseases || [],
        activeMedications: response.data.current_medicines || [],
        keyInsights: response.data.recent_lab_findings || [],
      });
    } catch (error) {
      setAiSummaryData(null);
      toast.error(error instanceof Error ? error.message : "AI case summary failed");
    } finally { setAiSummaryLoading(false); }
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
            {intakeReports.map((report) => (
              <div key={report.id} className="p-4 rounded-2xl bg-white border border-blue-200/80 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#2563EB]">{report.id}</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">{report.risk} RISK</span>
                </div>
                <p className="font-bold text-slate-900">{report.chief_complaint}</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">{report.preliminary_assessment}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>{report.hospital_name || "Hospital not recorded"}</span>
                  <span>{new Date(report.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {!intakeReports.length && <p className="text-sm text-slate-500">No saved AI intake reports are available.</p>}
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
                    <p className="text-xs text-slate-400">Generated from your saved records.</p>
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
