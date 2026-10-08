"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { useHospital } from "@/lib/hospital-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Stethoscope,
  Users,
  Search,
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Pill,
  FileText,
  Building2,
  Bell,
  RefreshCw,
  Lock,
  Activity,
  User,
  Check,
  ShieldAlert,
  BarChart3,
  Calendar,
  Send,
} from "lucide-react";

export default function DoctorDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedHospital } = useHospital();

  const [searchQuery, setSearchQuery] = useState("");

  // Real-Time Intelligent Emergency Response Alert State
  const [emergencyAlert, setEmergencyAlert] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    const fetchAlerts = async () => {
      try {
        const res = await api.emergency.getActiveAlerts();
        if (active && res.success && res.alerts && res.alerts.length > 0) {
          setEmergencyAlert(res.alerts[0]);
        } else if (active) {
          setEmergencyAlert(null);
        }
      } catch (e) {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => { active = false; clearInterval(interval); };
  }, []);


  const handleAcceptEmergencyCase = async () => {
    if (!emergencyAlert) return;
    try {
      const response = await api.emergency.acceptCase({ event_id: emergencyAlert.event_id, doctor_name: user?.full_name });
      if (!response.success) throw new Error(response.message || "Emergency case could not be accepted");
      setEmergencyAlert((prev: any) => prev ? { ...prev, doctor_accepted: true, accepted_by: user?.full_name, status: "ACCEPTED" } : null);
      toast.success("Emergency case accepted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Emergency case could not be accepted");
    }
  };
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [queuePatients, setQueuePatients] = useState<any[]>([]);
  const [recentPatients] = useState<any[]>([]);
  const currentPatient = queuePatients.find((patient) => patient.status === "IN_ROOM") || queuePatients.find((patient) => patient.status === "CALLED") || null;

  const refreshQueue = async () => {
    try {
      const response = await api.doctor.getQueue();
      if (!response.success || !Array.isArray(response.data)) throw new Error(response.message || "Queue could not be loaded");
      setQueuePatients(response.data.map((patient) => ({
        id: patient.patient_id,
        queueId: patient.queue_id,
        visitId: patient.visit_id,
        token: patient.token_number,
        name: patient.patient_name,
        age: patient.patient_age,
        gender: patient.patient_gender,
        mrn: patient.hospital_mrn,
        chiefComplaint: patient.chief_complaint || "No complaint recorded",
        triage: patient.triage_level || "Not triaged",
        time: patient.waiting_since,
        status: patient.queue_status,
      })));
    } catch (error) {
      setQueuePatients([]);
      toast.error(error instanceof Error ? error.message : "Queue could not be loaded");
    }
  };

  useEffect(() => { void refreshQueue(); }, []);

  const handleCallNext = async () => {
    const next = queuePatients.find((patient) => patient.status === "WAITING");
    if (!next) { toast.error("No waiting patient is available."); return; }
    try {
      const response = await api.doctor.callNext(next.queueId);
      if (!response.success || !response.data) throw new Error(response.message || "Could not call patient");
      await refreshQueue();
      toast.success(`Token ${response.data.token_number} called.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not call patient");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/doctor/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleRunAiCopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || !currentPatient) { toast.error("Select a patient currently in the queue first."); return; }
    setAiLoading(true);
    try {
      const response = await api.ai.doctorSummarizeHistory(currentPatient.id);
      if (!response.success || !response.data) throw new Error(response.message || "Clinical summary failed");
      setAiResponse(JSON.stringify(response.data, null, 2));
      toast.success("Patient history summary loaded.");
    } catch (error) {
      setAiResponse(null);
      toast.error(error instanceof Error ? error.message : "Clinical summary failed");
    } finally { setAiLoading(false); }
  };
  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1440px] mx-auto pb-12">
        
        {/* ========================================================= */}
        {/* 1. DOCTOR DASHBOARD HEADER + HOSPITAL BADGE + QUICK STATS */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Title & Hospital Badge */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563EB]">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Assigned hospital</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                  <Stethoscope className="w-3 h-3 text-slate-500" />
                  <span>{user?.full_name || "Doctor"}</span>
                </span>
              </div>

              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Doctor Dashboard
              </h1>
              <p className="text-[15px] text-slate-500">
                Outpatient clinical workstation, longitudinal case records, and queue management
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleCallNext}
                className="ent-button-primary text-xs px-4 py-2.5 cursor-pointer shadow-xs"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Call Next Patient</span>
              </button>

              <Link
                href="/doctor/consultation"
                className="ent-button-secondary text-xs px-4 py-2.5 cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                <span>New Consultation</span>
              </Link>

              <Link
                href="/doctor/prescriptions"
                className="ent-button-secondary text-xs px-4 py-2.5 cursor-pointer"
              >
                <Pill className="w-3.5 h-3.5 text-slate-500" />
                <span>E-Prescription</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-slate-100">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Today's Patients</span>
                <strong className="text-2xl font-bold text-slate-900">24</strong>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">14 Seen</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Appointments</span>
                <strong className="text-2xl font-bold text-[#2563EB]">18</strong>
              </div>
              <span className="text-xs text-slate-500">4 Remaining</span>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-rose-700 block">Critical Cases</span>
                <strong className="text-2xl font-bold text-rose-600">2</strong>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-white px-2 py-1 rounded border border-rose-200">ESI-1 Alert</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PATIENT SEARCH SECTION                                 */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-semibold text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-[#2563EB]" />
              <span>Patient Search</span>
            </h2>
            <span className="text-xs text-slate-500">Query centralized ABDM longitudinal health directory</span>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient ID, ABHA Number (91-4920...), Mobile Number, MRN, or Name..."
              className="w-full pl-12 pr-28 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 ent-button-primary text-xs py-2 px-4 cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* ========================================================= */}
        {/* 3. TODAY'S QUEUE SECTION                                  */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          
          {/* 🔴 REAL-TIME CRITICAL EMERGENCY CASE BANNER (Always on top of queue) */}
          {emergencyAlert && (
            <div className="p-5 rounded-2xl bg-rose-50/90 border-2 border-rose-400 space-y-4 shadow-sm animate-fade-in text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                  </span>
                  <strong className="text-base font-bold text-rose-900 flex items-center gap-2">
                    <span>🔴 EMERGENCY CASE</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                      {emergencyAlert.priority}
                    </span>
                  </strong>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-rose-800 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Triggered: {emergencyAlert.timestamp}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-rose-950">
                <div className="p-3 bg-white rounded-xl border border-rose-200/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">Patient</span>
                  <strong className="text-sm font-bold text-slate-900 block">{emergencyAlert.patient_name}</strong>
                  <span className="text-[11px] text-slate-500">ABHA: {emergencyAlert.national_health_id}</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-rose-200/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">Location</span>
                  <strong className="text-xs font-bold text-slate-900 block">{emergencyAlert.location}</strong>
                  <span className="text-[11px] text-slate-500">{emergencyAlert.hospital_name}</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-rose-200/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">Symptoms</span>
                  <p className="text-xs font-bold text-slate-900 leading-snug">{emergencyAlert.symptoms}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-rose-200/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">IoT Vitals</span>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-mono font-bold text-slate-900">
                    <span>HR: {emergencyAlert.vitals.heart_rate}</span>
                    <span>SpO2: {emergencyAlert.vitals.spo2}</span>
                    <span>BP: {emergencyAlert.vitals.blood_pressure}</span>
                    <span>Temp: {emergencyAlert.vitals.temperature}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-rose-200">
                <div className="flex items-center gap-2 text-[11px] text-rose-900">
                  <span className="font-semibold">Audit Trail:</span>
                  <span>SMS SID: <strong className="font-mono">{emergencyAlert.sms_sid.slice(0, 14)}...</strong></span>
                  <span>•</span>
                  <span>Call SID: <strong className="font-mono">{emergencyAlert.call_sid.slice(0, 14)}...</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/patient-history/${emergencyAlert.patient_id}`}
                    className="ent-button-secondary bg-white text-xs py-1.5 px-3 cursor-pointer shadow-2xs"
                  >
                    <span>View Patient</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => toast.info(`📞 Initiating voice communication with caregiver (+918248381919)...`)}
                    className="ent-button-secondary bg-white text-xs py-1.5 px-3 cursor-pointer shadow-2xs"
                  >
                    <span>Call Patient</span>
                  </button>

                  {emergencyAlert.doctor_accepted ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Case Accepted by {emergencyAlert.accepted_by || "Dr. Rajesh Sharma"}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAcceptEmergencyCase}
                      className="ent-button-primary bg-rose-600 hover:bg-rose-700 text-xs py-1.5 px-4 shadow-xs cursor-pointer font-bold animate-pulse"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Case</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-[22px] font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2563EB]" />
                <span>Today's Outpatient Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Live roster for Room 304 Consultation Suite</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {queuePatients.filter((patient) => patient.status === "WAITING").length} Patients Waiting
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {queuePatients.map((pat, idx) => (
              <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 p-3 rounded-xl transition">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] font-bold flex items-center justify-center text-sm border border-blue-200 shrink-0">
                    {pat.token}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-[15px] font-bold text-slate-900">{pat.name}</strong>
                      <span className="text-slate-400">• {pat.age} Yrs ({pat.gender})</span>
                    </div>
                    <p className="text-slate-700 text-xs font-medium">
                      <strong className="text-slate-900 font-bold">AI Clinical Intake: </strong>
                      {pat.chiefComplaint} (Waiting since: {new Date(pat.time).toLocaleTimeString()})
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>MRN: <strong className="text-slate-700">{pat.mrn}</strong></span>
                      <span>•</span>
                      <span>Triage: <strong className="text-[#2563EB]">{pat.triage}</strong></span>
                      <span>•</span>
                      <span>Allergy: <strong className="text-rose-700">{pat.allergy}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    pat.status === "IN_ROOM" ? "bg-amber-50 text-amber-700 animate-pulse border border-amber-200" : "bg-blue-50 text-[#2563EB]"
                  }`}>
                    {pat.status === "IN_ROOM" ? "In Room" : "Waiting"}
                  </span>

                  <Link
                    href={`/patient-history/${pat.id}`}
                    className="ent-button-secondary text-xs py-1.5 px-3 cursor-pointer"
                  >
                    <span>View Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. RECENT PATIENTS SECTION                                */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-[22px] font-semibold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-[#2563EB]" />
              <span>Recently Consulted Patients</span>
            </h2>
            <span className="text-xs text-slate-500"></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            {!recentPatients.length && <p className="text-sm text-slate-500">No recent consultation records are available.</p>}
            {recentPatients.map((rp, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-[15px] font-bold text-slate-900">{rp.name}</strong>
                  <span className="text-[11px] font-mono text-slate-500">{rp.time}</span>
                </div>
                <div className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-500 block">Diagnosis</span>
                  <p className="font-medium text-slate-900">{rp.diagnosis}</p>
                </div>
                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-500 block">Prescribed</span>
                  <p className="text-slate-800 truncate">{rp.prescription}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. ANALYTICS SECTION */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
            <h2 className="text-[22px] font-semibold text-slate-900">Departmental Clinical Analytics</h2>
          </div>
          <p className="text-sm text-slate-500">No verified analytics are available.</p>
        </div>
        {/* 6. AI ASSISTANT SECTION                                   */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-[22px] font-semibold text-slate-900">Gemini Clinical AI Copilot</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Gemini 2.5 Diagnostic Copilot
            </span>
          </div>

          <form onSubmit={handleRunAiCopilot} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask for a summary of the selected patient saved history..."
                className="w-full pl-4 pr-28 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] transition"
              />
              <button
                type="submit"
                disabled={aiLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 ent-button-primary text-xs py-1.5 px-3 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Ask AI</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {aiResponse && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-800 space-y-2 animate-fade-in font-sans leading-relaxed whitespace-pre-line">
              <div className="flex items-center gap-1.5 font-bold text-[#2563EB]">
                <Sparkles className="w-4 h-4" />
                <span>AI Clinical Recommendation</span>
              </div>
              <p>{aiResponse}</p>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
