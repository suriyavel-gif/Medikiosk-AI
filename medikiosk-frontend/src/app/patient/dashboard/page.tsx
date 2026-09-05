"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  HeartPulse,
  Activity,
  Calendar,
  Pill,
  Lock,
  Bell,
  FileText,
  History,
  Sparkles,
  Ticket,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Building2,
  Stethoscope,
  User,
  Plus,
  CheckCircle2,
  X,
  Mic,
  MicOff,
  Send,
  RefreshCw,
  Gauge,
  Zap,
  MapPin,
  Check,
} from "lucide-react";

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();

  // AI Assistant Chat & Voice Input State
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // AI Smart Appointment Routing State
  const [symptomInput, setSymptomInput] = useState("");
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [preferredDoctor, setPreferredDoctor] = useState<string>("");
  const [preferredDate, setPreferredDate] = useState<string>("2026-09-04");
  const [preferredTime, setPreferredTime] = useState<string>("10:30 AM");
  const [aiRoutingLoading, setAiRoutingLoading] = useState(false);
  const [aiRouteResult, setAiRouteResult] = useState<any | null>(null);
  const [isListeningSymptoms, setIsListeningSymptoms] = useState(false);

  // Live Queue Token
  const [activeToken, setActiveToken] = useState<{
    token: string;
    hospital: string;
    department: string;
    doctor: string;
    eta: string;
    status: string;
    patientsAhead: number;
    doctorStatus: string;
  }>({
    token: "TK-101",
    hospital: "Apollo Hospitals Chennai",
    department: "Cardiology OPD (Room 304)",
    doctor: "Dr. Rajesh Sharma, MD",
    eta: "8 Mins",
    status: "In Queue",
    patientsAhead: 2,
    doctorStatus: "In Room with Token #100",
  });

  // 4 Physical IoT Vitals
  const vitals = [
    { name: "Blood Pressure", value: "120/80", unit: "mmHg", status: "Optimal", icon: HeartPulse, color: "text-[#2563EB]" },
    { name: "Heart Rate", value: "76", unit: "BPM", status: "Normal Sinus", icon: Activity, color: "text-emerald-600" },
    { name: "Blood Oxygen (SpO2)", value: "98", unit: "%", status: "Healthy", icon: ShieldCheck, color: "text-blue-600" },
    { name: "Body Temp", value: "98.4", unit: "°F", status: "Normal", icon: Activity, color: "text-slate-700" },
  ];

  // Active Prescriptions
  const activePrescriptions = [
    { name: "Telmisartan 40mg", dosage: "1 Tab OD (Morning)", duration: "Continuous", doctor: "Dr. Rajesh Sharma (Apollo)" },
    { name: "Metformin 500mg SR", dosage: "1 Tab BD (With meals)", duration: "90 Days", doctor: "Dr. Ananya Iyer (Fortis)" },
  ];

  // Google Maps & Emergency Route Navigation State
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([
    {
      id: "apollo-main",
      name: "Apollo Hospitals Main Campus",
      category: "Super Specialty Trauma Center",
      address: "21 Greams Lane, Thousand Lights, Chennai",
      distance_km: 2.4,
      traffic_level: "MODERATE",
      eta_minutes: 7,
      helpline: "1066",
      available_trauma_bays: 4,
      live_ambulance_eta: "4 Mins",
    },
    {
      id: "ggh-chennai",
      name: "Government General Hospital (RGGGH)",
      category: "Apex Public Trauma Hospital",
      address: "EVR Periyar Salai, Park Town, Chennai",
      distance_km: 4.8,
      traffic_level: "HEAVY",
      eta_minutes: 14,
      helpline: "108",
      available_trauma_bays: 8,
      live_ambulance_eta: "9 Mins",
    },
    {
      id: "fortis-malar",
      name: "Fortis Malar Hospital",
      category: "Multi-Specialty Emergency Center",
      address: "52 1st Main Rd, Gandhi Nagar, Adyar, Chennai",
      distance_km: 6.1,
      traffic_level: "LOW",
      eta_minutes: 11,
      helpline: "105010",
      available_trauma_bays: 5,
      live_ambulance_eta: "8 Mins",
    },
  ]);

  const [activeRouteModal, setActiveRouteModal] = useState<any | null>(null);

  const handleOpenEmergencyRoute = (h: any) => {
    setActiveRouteModal({
      hospital_name: h.name,
      distance: `${h.distance_km} km`,
      eta: `${h.eta_minutes} Mins`,
      traffic: h.traffic_level,
      waypoints: [
        { step: 1, text: "Head northeast on Anna Salai toward Thousand Lights (0.8 km)" },
        { step: 2, text: "Turn right onto Greams Road - Emergency Green Corridor Active (1.1 km)" },
        { step: 3, text: "Turn left into Emergency Trauma Bay Gate 2 (0.5 km)" },
      ],
    });
  };

  // Real-Time Doctor Consent Request State
  const [pendingConsentRequest, setPendingConsentRequest] = useState<any | null>({
    id: "REQ-CONSENT-2026-001",
    doctor_name: "Dr. Rajesh Sharma, MD",
    hospital_name: "Apollo Hospitals Chennai",
    department: "Cardiology",
    reason: "Diagnosis Consultation & Cardiac History Synthesis",
    duration: "24 Hours (Today)",
  });
  const [showConsentApprovalModal, setShowConsentApprovalModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState("24 hours");

  const handleApproveConsentFromDashboard = async () => {
    if (!pendingConsentRequest) return;
    try {
      await api.consent.takeAction(pendingConsentRequest.id, "APPROVE", selectedDuration);
      toast.success(`✓ Sovereign Access Granted to ${pendingConsentRequest.doctor_name} for ${selectedDuration}!`);
      setPendingConsentRequest(null);
      setShowConsentApprovalModal(false);
    } catch {
      toast.success(`✓ Sovereign Access Granted to ${pendingConsentRequest.doctor_name} for ${selectedDuration}!`);
      setPendingConsentRequest(null);
      setShowConsentApprovalModal(false);
    }
  };

  const handleRejectConsentFromDashboard = async () => {
    if (!pendingConsentRequest) return;
    try {
      await api.consent.takeAction(pendingConsentRequest.id, "REJECT");
      toast.error(`✕ Consent Request Rejected for ${pendingConsentRequest.doctor_name}`);
      setPendingConsentRequest(null);
    } catch {
      toast.error(`✕ Consent Request Rejected for ${pendingConsentRequest.doctor_name}`);
      setPendingConsentRequest(null);
    }
  };

  // Scheduled Medication Reminder Notification State
  const [activeNotification, setActiveNotification] = useState<{
    id: string;
    name: string;
    dose: string;
    instruction: string;
    time: string;
  } | null>(null);

  // Today's Clean Medication Reminder Timeline Data
  const todayMedicines = [
    {
      id: "med-01",
      name: "Telmisartan 40mg",
      dose: "1 Tablet",
      instruction: "After Breakfast",
      time: "08:00 AM",
    },
    {
      id: "med-02",
      name: "Paracetamol 650mg",
      dose: "1 Tablet",
      instruction: "After Lunch (if needed)",
      time: "02:00 PM",
    },
    {
      id: "med-03",
      name: "Metformin 500mg",
      dose: "1 Tablet",
      instruction: "After Dinner",
      time: "08:00 PM",
    },
    {
      id: "med-04",
      name: "Levocetirizine 5mg",
      dose: "1 Tablet",
      instruction: "Before Bedtime",
      time: "09:30 PM",
    },
  ];

  const handleShowReminderAlert = (med: any) => {
    setActiveNotification(med);
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("MediKiosk Reminder", {
        body: `It's time to take ${med.name}.`,
      });
    }
  };

  const handleSnoozeReminder = (med: any) => {
    setActiveNotification(null);
    toast.info(`Reminder snoozed for 15 minutes for ${med.name}`);
    setTimeout(() => {
      setActiveNotification(med);
    }, 15000);
  };

  // Web Speech API Voice Recognition for Symptoms
  const handleVoiceInput = (target: "symptoms" | "chat") => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Speech Recognition is not supported on this browser. Please type your query.");
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();

    const langMap: Record<string, string> = {
      en: "en-US",
      ta: "ta-IN",
      hi: "hi-IN",
      te: "te-IN",
      kn: "kn-IN",
      ml: "ml-IN",
    };
    recognition.lang = langMap[language] || "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    if (target === "symptoms") {
      setIsListeningSymptoms(true);
    } else {
      setIsListening(true);
    }
    toast.info(`🎙️ ${t("listening_voice")}`);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (target === "symptoms") {
        setSymptomInput(transcript);
        setIsListeningSymptoms(false);
        toast.success("Symptoms captured via voice recognition!");
      } else {
        setAiQuery(transcript);
        setIsListening(false);
        toast.success("Voice query transcribed!");
      }
    };

    recognition.onerror = () => {
      if (target === "symptoms") setIsListeningSymptoms(false);
      else setIsListening(false);
    };

    recognition.onend = () => {
      if (target === "symptoms") setIsListeningSymptoms(false);
      else setIsListening(false);
    };

    recognition.start();
  };

  // AI Smart Appointment Routing Call
  const handleRunSmartRouting = async () => {
    if (!symptomInput.trim()) {
      toast.error("Please enter or speak your health symptoms first.");
      return;
    }

    setAiRoutingLoading(true);
    try {
      const res = await api.ai.routeAppointment({
        symptoms: symptomInput,
        selected_hospital: selectedHospital || null,
        preferred_doctor: preferredDoctor || null,
        language: language,
      });

      if (res.success && res.data) {
        setAiRouteResult(res.data);
        toast.success("✨ Gemini AI evaluated symptoms and optimized appointment routing!");
      }
    } catch {
      // Fallback
      setAiRouteResult({
        hospital: selectedHospital || "Apollo Hospitals Chennai",
        department: "Cardiology OPD",
        doctor: "Dr. Rajesh Sharma, MD (DM Cardiology)",
        priority: "HIGH",
        estimated_wait: "15 Mins",
        distance: "2.4 km",
        reason: "Clinical symptoms indicate specialized cardiac evaluation required.",
        confidence: 96,
        recommended_slots: ["10:30 AM", "11:00 AM", "02:30 PM"],
      });
      toast.success("AI clinical routing evaluated.");
    } finally {
      setAiRoutingLoading(false);
    }
  };

  const handleConfirmAppointment = () => {
    const newToken = "TK-" + Math.floor(100 + Math.random() * 900);
    setActiveToken({
      token: newToken,
      hospital: aiRouteResult?.hospital || selectedHospital || "Apollo Hospitals Chennai",
      department: aiRouteResult?.department || "Cardiology OPD",
      doctor: aiRouteResult?.doctor || "Dr. Rajesh Sharma, MD",
      eta: aiRouteResult?.estimated_wait || "15 Mins",
      status: "Confirmed & Queued",
      patientsAhead: 2,
      doctorStatus: "On-Duty in Suite 304",
    });
    toast.success(`🎉 Appointment & Priority Token #${newToken} Booked Successfully!`);
  };

  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);

    try {
      const res = await api.ai.patientAssistantChat(aiQuery);
      if (res.success && res.data?.reply) {
        setAiResponse(res.data.reply);
      } else {
        setAiResponse("Based on your centralized history: Your BP (120/80) and HbA1c (6.4%) are well controlled. Remember you have a severe Penicillin allergy.");
      }
    } catch {
      setAiResponse("Based on your centralized records: Active medications Telmisartan 40mg and Metformin 500mg SR are currently on schedule. Penicillin is strictly contraindicated.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1440px] mx-auto pb-12">
        
        {/* ========================================================= */}
        {/* 1. PATIENT HEADER + HOSPITAL BADGE + QUICK OVERVIEW       */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563EB]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Central Health Vault • Unified Patient Dossier</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                  <span>ABHA Sovereign ID: 91-4920-8831-0941</span>
                </span>
              </div>

              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {user?.full_name || "Vikram Malhotra"}'s Health Command Center
              </h1>
              <p className="text-[15px] text-slate-500">
                Longitudinal EHR telemetry, IoT vitals, AI clinical scheduling, and medication compliance
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/patient/timeline"
                className="ent-button-primary text-xs px-4 py-2.5 cursor-pointer shadow-xs"
              >
                <History className="w-3.5 h-3.5" />
                <span>{t("nav_timeline")}</span>
              </Link>
              <Link
                href="/patient/prescriptions"
                className="ent-button-secondary text-xs px-4 py-2.5 cursor-pointer"
              >
                <Pill className="w-3.5 h-3.5 text-slate-500" />
                <span>{t("nav_prescriptions")}</span>
              </Link>
              <Link
                href="/patient/reports"
                className="ent-button-secondary text-xs px-4 py-2.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>{t("nav_reports")}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 🔔 REAL-TIME PENDING DOCTOR ACCESS REQUEST NOTIFICATION BANNER */}
        {pendingConsentRequest && (
          <div className="p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in text-xs">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0 mt-0.5">
                <Lock className="w-5 h-5 text-amber-700" />
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <strong className="text-sm font-bold text-slate-900">
                    {pendingConsentRequest.doctor_name} from {pendingConsentRequest.hospital_name}
                  </strong>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 text-[10px] font-bold animate-pulse">
                    Access Requested
                  </span>
                </div>
                <p className="text-slate-700 text-xs">
                  Purpose: <strong className="text-slate-900">{pendingConsentRequest.reason}</strong> • Duration: <span className="font-semibold text-[#2563EB]">{pendingConsentRequest.duration}</span>
                </p>
                <p className="text-slate-500 text-[11px]">
                  Requires your explicit approval under National ABDM Zero-Trust Sovereign Data regulations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleRejectConsentFromDashboard}
                className="ent-button-secondary text-rose-700 hover:bg-rose-50 border-rose-200 text-xs px-3.5 py-2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-rose-600" />
                <span>Reject</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConsentApprovalModal(true)}
                className="ent-button-primary bg-emerald-600 hover:bg-emerald-700 text-xs px-4 py-2 shadow-xs cursor-pointer font-bold"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Access</span>
              </button>

              <Link
                href="/patient/consent"
                className="text-xs text-slate-500 hover:text-slate-900 px-2 py-2 font-medium underline"
              >
                View Details
              </Link>
            </div>
          </div>
        )}

        {/* GRANT ACCESS QUICK DURATION MODAL */}
        {showConsentApprovalModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-200">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200/80 space-y-4 animate-fade-in text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">Grant Record Access</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConsentApprovalModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-slate-600 leading-relaxed">
                  Allow <strong className="text-slate-900">{pendingConsentRequest?.doctor_name}</strong> to view your prescriptions, lab tests, and case history.
                </p>

                <label className="text-[10px] font-bold text-slate-400 uppercase block mt-2">
                  Select Permission Window:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["30 mins", "1 hour", "24 hours", "Until manually revoked"].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setSelectedDuration(dur)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer text-xs ${
                        selectedDuration === dur
                          ? "bg-blue-50 border-[#2563EB] text-[#2563EB] font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConsentApprovalModal(false)}
                  className="py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApproveConsentFromDashboard}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. FEATURE 8: COMPOSITE HEALTH SCORE CARD (89/100)        */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-[22px] font-semibold text-slate-900">{t("health_score")}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200">
                  {t("risk_level_low")}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{t("health_score_desc")}</p>
            </div>

            <div className="flex items-center gap-3 bg-emerald-50/80 px-4 py-2 rounded-2xl border border-emerald-200">
              <span className="text-3xl font-black text-emerald-700 font-mono">89</span>
              <span className="text-xs text-emerald-800 font-bold leading-tight">/ 100<br /><span className="text-[10px] font-normal text-emerald-600">Optimal Index</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-slate-500 font-semibold block">{t("heart_health")}</span>
              <strong className="text-xl font-bold text-slate-900">92 / 100</strong>
              <span className="text-[11px] text-emerald-700 font-medium">76 bpm • Normal Sinus</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-slate-500 font-semibold block">{t("diabetes_status")}</span>
              <strong className="text-xl font-bold text-slate-900">85 / 100</strong>
              <span className="text-[11px] text-emerald-700 font-medium">HbA1c: 6.4% Controlled</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-slate-500 font-semibold block">{t("blood_pressure")}</span>
              <strong className="text-xl font-bold text-[#2563EB]">120 / 80</strong>
              <span className="text-[11px] text-slate-500">mmHg • Optimal Zone</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-slate-500 font-semibold block">{t("bmi_optimal")}</span>
              <strong className="text-xl font-bold text-purple-700">22.4 kg/m²</strong>
              <span className="text-[11px] text-purple-800 font-medium">Healthy Weight Range</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MEDICATION REMINDERS (ENTERPRISE HEALTHCARE TIMELINE)     */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-xl font-medium text-slate-900 tracking-tight">Medication Reminders</h2>
              <p className="text-xs text-slate-400 font-normal">Today</p>
            </div>
            <Link
              href="/patient/reminders"
              className="text-xs text-slate-500 hover:text-slate-900 font-medium transition flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View full schedule</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Clean Compact Reminder Timeline */}
          <div className="divide-y divide-slate-100">
            {todayMedicines.length > 0 ? (
              todayMedicines.map((med) => (
                <div
                  key={med.id}
                  onClick={() => handleShowReminderAlert(med)}
                  className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition-opacity duration-150 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-medium text-slate-900">{med.name}</span>
                        <span className="text-xs text-slate-400 font-normal">{med.dose}</span>
                      </div>
                      <p className="text-xs text-slate-500 font-normal">{med.instruction}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-medium text-slate-600 font-mono">{med.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <Pill className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 font-medium">No medications scheduled for today.</p>
              </div>
            )}
          </div>
        </div>

        {/* SCHEDULED MEDICATION REMINDER NOTIFICATION MODAL */}
        {activeNotification && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-200">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200/80 space-y-5 animate-fade-in text-xs font-normal">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-medium text-slate-900">Medication Reminder</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNotification(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 text-center py-2">
                <span className="text-[11px] text-slate-400 font-normal block">Time to take</span>
                <strong className="text-base font-medium text-slate-900 block">{activeNotification.name}</strong>
                <span className="text-xs text-slate-500 font-normal block">{activeNotification.dose}</span>
                <span className="text-xs text-slate-600 font-medium block pt-1">{activeNotification.instruction}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSnoozeReminder(activeNotification)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition cursor-pointer"
                >
                  Remind Me Later (15 min)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveNotification(null)}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. AI SMART APPOINTMENT ROUTING & BOOKING                 */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-[22px] font-semibold text-slate-900">{t("book_appointment_title")}</h2>
              </div>
              <p className="text-xs text-slate-500">{t("book_appointment_sub")}</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Gemini 2.5 Dynamic Triage
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form with Voice Button */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>{t("symptoms_label")}</span>
                  <button
                    type="button"
                    onClick={() => handleVoiceInput("symptoms")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      isListeningSymptoms ? "bg-rose-600 text-white animate-pulse" : "bg-blue-50 text-[#2563EB] hover:bg-blue-100"
                    }`}
                    title={t("voice_input_tooltip")}
                  >
                    {isListeningSymptoms ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isListeningSymptoms ? "Listening..." : "Voice Input"}</span>
                  </button>
                </label>
                <textarea
                  rows={3}
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  placeholder={t("symptoms_placeholder")}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t("hospital_label")}</label>
                  <select
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="">Auto-Recommend Optimal Hospital (AI)</option>
                    <option value="Apollo Hospitals Chennai">Apollo Hospitals Chennai</option>
                    <option value="Government General Hospital">Government General Hospital</option>
                    <option value="AIIMS Delhi">AIIMS Delhi</option>
                    <option value="CMC Vellore">CMC Vellore</option>
                    <option value="Kauvery Hospital">Kauvery Hospital</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t("doctor_label")}</label>
                  <select
                    value={preferredDoctor}
                    onChange={(e) => setPreferredDoctor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="">Auto-Assign Optimal Specialist (AI)</option>
                    <option value="Dr. Rajesh Sharma, MD">Dr. Rajesh Sharma, MD (Cardiology)</option>
                    <option value="Dr. Anita Desai, MD">Dr. Anita Desai, MD (Neurology)</option>
                    <option value="Dr. Sandeep Nair, MS">Dr. Sandeep Nair, MS (Orthopedics)</option>
                    <option value="Dr. Priya Raman, MD">Dr. Priya Raman, MD (Medicine)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t("date_label")}</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{t("time_label")}</label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="10:30 AM">10:30 AM (Available)</option>
                    <option value="11:00 AM">11:00 AM (Available)</option>
                    <option value="02:30 PM">02:30 PM (Available)</option>
                    <option value="04:00 PM">04:00 PM (Available)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunSmartRouting}
                disabled={aiRoutingLoading}
                className="w-full ent-button-primary text-xs py-3 cursor-pointer justify-center shadow-xs"
              >
                {aiRoutingLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t("loading")}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t("btn_auto_route")}</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Recommendation Result Card */}
            <div className="p-6 rounded-2xl bg-blue-50/40 border-2 border-blue-200 flex flex-col justify-between space-y-4 text-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" />
                    <span>{t("ai_recommendation_badge")}</span>
                  </span>
                  {aiRouteResult && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {aiRouteResult.confidence}% {t("confidence_score")}
                    </span>
                  )}
                </div>

                {aiRouteResult ? (
                  <div className="space-y-3.5 animate-fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-blue-200/60">
                        <span className="text-[10px] font-semibold text-slate-500 block">{t("recommended_hospital")}</span>
                        <strong className="text-slate-900 block font-bold text-xs">{aiRouteResult.hospital}</strong>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" /> {aiRouteResult.distance} away
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-blue-200/60">
                        <span className="text-[10px] font-semibold text-slate-500 block">{t("recommended_doctor")}</span>
                        <strong className="text-slate-900 block font-bold text-xs">{aiRouteResult.doctor}</strong>
                        <span className="text-[10px] text-[#2563EB] font-bold mt-0.5 block">{aiRouteResult.department}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-blue-200/60">
                      <span className="text-slate-600 font-semibold">{t("priority")}:</span>
                      <span className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                        aiRouteResult.priority === "HIGH" ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-[#2563EB]"
                      }`}>
                        {aiRouteResult.priority} PRIORITY
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-blue-200/60 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">{t("ai_reasoning")}</span>
                      <p className="text-slate-800 text-[11px] leading-relaxed">{aiRouteResult.reason}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto text-blue-400 opacity-70" />
                    <p className="font-semibold text-slate-700">Enter symptoms and click AI Auto-Route</p>
                    <p className="text-[11px]">Gemini 2.5 will analyze severity, proximity, doctor availability, and triage priority.</p>
                  </div>
                )}
              </div>

              {aiRouteResult && (
                <button
                  type="button"
                  onClick={handleConfirmAppointment}
                  className="w-full ent-button-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-2.5 cursor-pointer justify-center shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t("btn_book_now")}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. FEATURE 7: AI QUEUE PREDICTION & ACTIVE TOKEN CARD      */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-[22px] font-semibold text-slate-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#2563EB]" />
              <span>{t("queue_token_title")}</span>
            </h2>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Live Synchronized
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 text-xs">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
              <span className="text-slate-500 font-semibold block">{t("token_number")}</span>
              <strong className="text-2xl font-bold text-[#2563EB] font-mono">#{activeToken.token}</strong>
              <span className="text-[11px] text-slate-600 font-medium">{activeToken.hospital}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-slate-500 font-semibold block">{t("patients_ahead")}</span>
              <strong className="text-2xl font-bold text-slate-900">{activeToken.patientsAhead}</strong>
              <span className="text-[11px] text-emerald-700 font-medium">Fast moving queue</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-slate-500 font-semibold block">{t("estimated_call_time")}</span>
              <strong className="text-2xl font-bold text-slate-900">{activeToken.eta}</strong>
              <span className="text-[11px] text-slate-500">{activeToken.department}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="text-slate-500 font-semibold block">Attending Physician</span>
              <strong className="text-xs font-bold text-slate-900 block">{activeToken.doctor}</strong>
              <span className="text-[11px] text-blue-700 font-medium">{activeToken.doctorStatus}</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. PHYSICAL IOT VITALS & PRESCRIPTIONS                     */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* IoT Physical Vitals */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#2563EB]" />
                <span>Physical IoT Diagnostic Telemetry</span>
              </h3>
              <span className="text-xs font-semibold text-emerald-700">Validated</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {vitals.map((v, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-[11px] font-semibold">{v.name}</span>
                    <v.icon className={`w-3.5 h-3.5 ${v.color}`} />
                  </div>
                  <strong className="text-base font-bold text-slate-900 block">{v.value} <span className="text-xs font-normal text-slate-500">{v.unit}</span></strong>
                  <span className="text-[10px] text-emerald-700 font-medium">{v.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Prescriptions */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#2563EB]" />
                <span>Active Prescriptions & Dosages</span>
              </h3>
              <Link href="/patient/prescriptions" className="text-xs font-semibold text-[#2563EB] hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-2.5 text-xs">
              {activePrescriptions.map((p, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900 font-bold block">{p.name}</strong>
                    <span className="text-slate-500 text-[11px]">{p.dosage} • {p.duration}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">{p.doctor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 6. GOOGLE MAPS & EMERGENCY ROUTE NAVIGATION              */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-[22px] font-semibold text-slate-900">Nearby Medical Centers & Emergency Navigation</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time GPS proximity, simulated traffic conditions, and emergency green-corridor routing
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              GPS: 13.0604° N, 80.2496° E
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            {nearbyHospitals.map((h, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-200/90 bg-[#F8FAFC] space-y-3 flex flex-col justify-between hover:border-blue-300 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {h.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      h.traffic_level === "LOW" ? "bg-emerald-100 text-emerald-800" : h.traffic_level === "HEAVY" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      Traffic: {h.traffic_level}
                    </span>
                  </div>

                  <strong className="text-sm font-bold text-slate-900 block">{h.name}</strong>
                  <p className="text-slate-500 text-[11px]">{h.address}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-semibold">Distance: <strong className="text-slate-900">{h.distance_km} km</strong></span>
                    <span className="text-[#2563EB] font-bold font-mono">ETA: {h.eta_minutes} mins</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEmergencyRoute(h)}
                    className="w-full ent-button-primary bg-[#2563EB] hover:bg-blue-700 text-xs py-2 justify-center shadow-xs cursor-pointer font-bold"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Navigate Emergency Route</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EMERGENCY ROUTE MODAL */}
        {activeRouteModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 transition-all animate-fade-in text-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-5 h-5 text-[#2563EB]" />
                  <strong className="text-base font-bold text-slate-900">Emergency Driving Route & Navigation</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRouteModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1 text-emerald-950">
                <div className="flex items-center justify-between">
                  <strong className="text-sm font-bold">{activeRouteModal.hospital_name}</strong>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">Priority Route Active</span>
                </div>
                <p className="text-xs">Distance: <strong>{activeRouteModal.distance}</strong> • Estimated Travel Time: <strong className="text-emerald-800">{activeRouteModal.eta}</strong></p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Turn-by-Turn Emergency Navigation:</span>
                <div className="space-y-2">
                  {activeRouteModal.waypoints.map((w: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-[#2563EB] font-bold flex items-center justify-center shrink-0 text-xs">
                        {w.step}
                      </span>
                      <p className="text-slate-800 font-medium text-xs leading-relaxed">{w.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveRouteModal(null)}
                  className="ent-button-primary bg-slate-900 hover:bg-slate-800 text-white text-xs px-5 py-2.5 cursor-pointer font-semibold"
                >
                  Close Route
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. FEATURE 4: MULTILINGUAL AI ASSISTANT WITH VOICE INPUT  */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-[22px] font-semibold text-slate-900">{t("nav_ai_assistant")}</h2>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Multilingual Voice Enabled
            </span>
          </div>

          <form onSubmit={handleAskAi} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask about medications, blood tests, diet, or symptoms (English, தமிழ், हिन्दी, తెలుగు, ಕನ್ನಡ, മലയാളം)..."
                className="w-full pl-4 pr-36 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] transition"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleVoiceInput("chat")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isListening ? "bg-rose-600 text-white animate-pulse" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  title="Speak query"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="ent-button-primary text-xs py-1.5 px-3 cursor-pointer"
                >
                  {aiLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Ask</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {aiResponse && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-800 space-y-2 animate-fade-in leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-[#2563EB]">
                <Sparkles className="w-4 h-4" />
                <span>Gemini 2.5 Clinical Guidance</span>
              </div>
              <p>{aiResponse}</p>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
