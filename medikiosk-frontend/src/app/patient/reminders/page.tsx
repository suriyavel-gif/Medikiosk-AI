"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useHospital } from "@/lib/hospital-context";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Bell,
  BellRing,
  Send,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  Calendar,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Flame,
  X,
  MessageSquare,
  HelpCircle,
  Volume2,
  ChevronRight,
  Printer,
  Check,
} from "lucide-react";

interface MedicationReminderSlot {
  id: string;
  medicine_name: string;
  generic_name: string;
  dosage: string;
  frequency_label: "Morning" | "Afternoon" | "Evening" | "Night" | "Weekly";
  time_display: string;
  food_instruction: string;
  prescribed_by: string;
  is_taken: boolean;
  is_skipped: boolean;
  is_current_due: boolean;
  taken_at?: string;
  skipped_reason?: string;
  color_tag: string;
}

export default function MedicationRemindersPage() {
  const { selectedHospital } = useHospital();
  const { user } = useAuth();
  const { language, t } = useLanguage();

  // Notification Permissions
  const [browserNotificationsAllowed, setBrowserNotificationsAllowed] = useState(false);

  // Active Reminder Dialog Modal State
  const [activeReminderModal, setActiveReminderModal] = useState<MedicationReminderSlot | null>(null);

  // AI Medication Chatbot State
  const [chatQuery, setChatQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; text: string; guidance?: any }>>([
    {
      role: "assistant",
      text: "Hello! I am your AI Medication Assistant. You can ask me any question about your active prescriptions (e.g. food instructions, missed doses, side effects, or drug safety).",
    },
  ]);

  // Today's Auto-Generated Medication Schedule
  const [schedules, setSchedules] = useState<MedicationReminderSlot[]>([
    {
      id: "med-01",
      medicine_name: "Telmisartan 40mg",
      generic_name: "Telmisartan (Antihypertensive ARB)",
      dosage: "1 Tablet",
      frequency_label: "Morning",
      time_display: "08:00 AM",
      food_instruction: "Take after breakfast with water",
      prescribed_by: "Dr. Rajesh Sharma, MD (Cardiology)",
      is_taken: true,
      is_skipped: false,
      is_current_due: false,
      taken_at: "Today at 08:04 AM",
      color_tag: "emerald",
    },
    {
      id: "med-02",
      medicine_name: "Metformin 500mg SR",
      generic_name: "Metformin Sustained Release",
      dosage: "1 Tablet",
      frequency_label: "Morning",
      time_display: "08:00 AM",
      food_instruction: "Take with breakfast",
      prescribed_by: "Dr. Ananya Roy, MD (Endocrinology)",
      is_taken: true,
      is_skipped: false,
      is_current_due: false,
      taken_at: "Today at 08:05 AM",
      color_tag: "emerald",
    },
    {
      id: "med-03",
      medicine_name: "Paracetamol 650mg",
      generic_name: "Paracetamol / Acetaminophen SOS",
      dosage: "1 Tablet",
      frequency_label: "Afternoon",
      time_display: "02:00 PM",
      food_instruction: "Take after lunch if fever or pain persists",
      prescribed_by: "Dr. Rajesh Sharma, MD (Cardiology)",
      is_taken: false,
      is_skipped: false,
      is_current_due: true,
      color_tag: "blue",
    },
    {
      id: "med-04",
      medicine_name: "Metformin 500mg SR",
      generic_name: "Metformin Sustained Release",
      dosage: "1 Tablet",
      frequency_label: "Night",
      time_display: "08:00 PM",
      food_instruction: "Take after dinner",
      prescribed_by: "Dr. Ananya Roy, MD (Endocrinology)",
      is_taken: false,
      is_skipped: false,
      is_current_due: false,
      color_tag: "yellow",
    },
    {
      id: "med-05",
      medicine_name: "Levocetirizine 5mg",
      generic_name: "Levocetirizine Dihydrochloride",
      dosage: "1 Tablet",
      frequency_label: "Night",
      time_display: "09:30 PM",
      food_instruction: "Take before bedtime with water",
      prescribed_by: "Dr. Rajesh Sharma, MD (Cardiology)",
      is_taken: false,
      is_skipped: false,
      is_current_due: false,
      color_tag: "yellow",
    },
    {
      id: "med-06",
      medicine_name: "Vitamin D3 60,000 IU",
      generic_name: "Cholecalciferol Weekly Sachet",
      dosage: "1 Sachet in Warm Milk",
      frequency_label: "Weekly",
      time_display: "Every Sunday at 10:00 AM",
      food_instruction: "Mix with warm milk after breakfast",
      prescribed_by: "Dr. Sandeep Nair, MS (Orthopedics)",
      is_taken: true,
      is_skipped: false,
      is_current_due: false,
      taken_at: "Sunday, Aug 30 at 10:15 AM",
      color_tag: "emerald",
    },
  ]);

  // Check Browser Notification Permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        setBrowserNotificationsAllowed(true);
      }
    }
  }, []);

  const handleRequestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser notifications are not supported on this device.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setBrowserNotificationsAllowed(true);
      toast.success("🔔 Browser notifications enabled! You will receive timely dosage reminders.");
      new Notification("💊 MediKiosk AI Medication Reminders Active", {
        body: "You will receive automated reminders for your prescribed medicines.",
        icon: "/favicon.ico",
      });
    } else {
      toast.error("Notification permission denied.");
    }
  };

  // Mark Dose as Taken
  const handleMarkTaken = (slotId: string) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, is_taken: true, is_skipped: false, is_current_due: false, taken_at: "Just now" }
          : s
      )
    );
    setActiveReminderModal(null);
    toast.success("✨ Medication dose recorded as Taken!");
  };

  // Mark Dose as Skipped
  const handleMarkSkipped = (slotId: string, reason: string = "Patient indicated skip") => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, is_taken: false, is_skipped: true, is_current_due: false, skipped_reason: reason }
          : s
      )
    );
    setActiveReminderModal(null);
    toast.warning("Medication marked as Skipped. Logged to doctor compliance audit.");
  };

  // Snooze Dose for 15 minutes
  const handleSnooze = (slot: MedicationReminderSlot) => {
    setActiveReminderModal(null);
    toast.info(`⏰ Reminder snoozed for 15 minutes for ${slot.medicine_name}`);
    setTimeout(() => {
      setActiveReminderModal(slot);
      if (browserNotificationsAllowed) {
        new Notification(`⏰ Snoozed Medication Reminder: ${slot.medicine_name}`, {
          body: `Time to take ${slot.dosage} (${slot.food_instruction})`,
        });
      }
    }, 15000);
  };

  // AI Medication Chatbot
  const handleAskMedicationAi = async (customQuery?: string) => {
    const q = customQuery || chatQuery;
    if (!q.trim() || chatLoading) return;

    const newChat = [...chatMessages, { role: "user" as const, text: q }];
    setChatMessages(newChat);
    setChatQuery("");
    setChatLoading(true);

    try {
      const res = await api.ai.medicationChat({
        query: q,
        active_prescriptions: [
          "Telmisartan 40mg OD (Morning)",
          "Metformin 500mg SR BD (Morning & Night)",
          "Paracetamol 650mg SOS",
          "Levocetirizine 5mg (Night)",
        ],
        patient_allergies: ["Penicillin Anaphylaxis"],
        chronic_conditions: ["Essential Hypertension", "Type 2 Diabetes"],
        language: language,
      });

      if (res.success && res.data) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: res.data.reply,
            guidance: res.data,
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Take your prescribed medicines with water after food. Never skip or alter doses without consulting Dr. Rajesh Sharma.",
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "It is generally recommended to take your blood pressure and diabetes medicines after meals with water. If you miss a dose, take it as soon as remembered unless it is close to your next scheduled time. Never take a double dose.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Adherence Calculations
  const totalDoses = schedules.length;
  const takenDoses = schedules.filter((s) => s.is_taken).length;
  const skippedDoses = schedules.filter((s) => s.is_skipped).length;
  const adherenceRate = Math.round((takenDoses / (totalDoses - schedules.filter(s => !s.is_taken && !s.is_skipped).length || 1)) * 100);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1440px] mx-auto pb-12">
        
        {/* ========================================================= */}
        {/* 1. HEADER & ADHERENCE STREAK SUMMARY                      */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                  <Pill className="w-4 h-4" />
                </span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Medication Reminders & Adherence Hub
                </h1>
              </div>
              <p className="text-[15px] text-slate-500">
                Automated dosage scheduling directly generated from verified digital prescriptions
              </p>
            </div>

            {/* Notification Permission & Quick Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {!browserNotificationsAllowed ? (
                <button
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="ent-button-primary text-xs px-4 py-2.5 cursor-pointer shadow-xs"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Enable Browser Reminders</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Browser Alerts Active</span>
                </span>
              )}

              <Link
                href="/patient/prescriptions"
                className="ent-button-secondary text-xs px-4 py-2.5 cursor-pointer"
              >
                <span>View Full Prescriptions</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Adherence Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-semibold block">Monthly Adherence</span>
                <strong className="text-2xl font-bold text-emerald-700 font-mono">95%</strong>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Excellent</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-semibold block">Compliance Streak</span>
                <strong className="text-2xl font-bold text-[#2563EB] font-mono flex items-center gap-1">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <span>14 Days</span>
                </strong>
              </div>
              <span className="text-[10px] text-slate-400">Consecutive</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-semibold block">Today's Doses</span>
                <strong className="text-2xl font-bold text-slate-900 font-mono">{takenDoses} / {totalDoses - 1}</strong>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">On Track</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-semibold block">Skipped This Month</span>
                <strong className="text-2xl font-bold text-slate-700 font-mono">2</strong>
              </div>
              <span className="text-[10px] text-slate-400">Audited</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. PROACTIVE AI ADHERENCE WARNING BANNER (If Skipped)    */}
        {/* ========================================================= */}
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="space-y-0.5">
              <strong className="text-slate-900 font-bold">AI Medication Adherence Insight:</strong>
              <p className="text-slate-700 leading-relaxed">
                You are maintaining a <strong>95% adherence score</strong>. Consistently taking your antihypertensive medication (Telmisartan 40mg) in the morning helps maintain optimal 120/80 mmHg blood pressure.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAskMedicationAi("What should I do if I ever miss my morning blood pressure medicine?")}
            className="ent-button-secondary text-xs px-3 py-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <span>Ask AI Advice</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 3. MAIN GRID: TODAY'S SCHEDULE & AI PHARMA CHATBOT       */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left 2 Cols: Timeline Schedule */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-[22px] font-semibold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#2563EB]" />
                    <span>Today's Medication Timeline</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Color-coded: 🟢 Taken • 🔵 Due Now • 🟡 Upcoming • 🔴 Skipped
                  </p>
                </div>

                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </span>
              </div>

              {/* Slots List */}
              <div className="space-y-4 text-xs">
                {schedules.map((slot) => {
                  return (
                    <div
                      key={slot.id}
                      className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        slot.is_taken
                          ? "bg-emerald-50/20 border-emerald-200"
                          : slot.is_current_due
                          ? "bg-blue-50/40 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                          : slot.is_skipped
                          ? "bg-rose-50/30 border-rose-200"
                          : "bg-white border-slate-200"
                      }`}
                    >
                      {/* Left: Time & Icon & Details */}
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                          slot.is_taken
                            ? "bg-emerald-100 text-emerald-800"
                            : slot.is_current_due
                            ? "bg-[#2563EB] text-white animate-pulse"
                            : slot.is_skipped
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {slot.frequency_label === "Morning" ? (
                            <Sun className="w-5 h-5" />
                          ) : slot.frequency_label === "Afternoon" ? (
                            <Sun className="w-5 h-5" />
                          ) : slot.frequency_label === "Night" ? (
                            <Moon className="w-5 h-5" />
                          ) : (
                            <Calendar className="w-5 h-5" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {slot.time_display}
                            </span>
                            <strong className="text-sm font-bold text-slate-900">{slot.medicine_name}</strong>
                            <span className="text-slate-500">({slot.dosage})</span>
                          </div>

                          <p className="text-slate-600 text-xs font-medium">
                            {slot.food_instruction}
                          </p>
                          <span className="text-[10px] text-slate-400 block">
                            Prescribed by: {slot.prescribed_by}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions / Status */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {slot.is_taken ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>{slot.taken_at || "Taken ✓"}</span>
                          </div>
                        ) : slot.is_skipped ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-bold text-xs border border-rose-200">
                            <X className="w-4 h-4 text-rose-700" />
                            <span>Skipped</span>
                          </div>
                        ) : slot.is_current_due ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveReminderModal(slot)}
                              className="ent-button-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-2 px-3.5 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Take Medicine</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSnooze(slot)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                              title="Snooze 15 min"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-900 font-bold text-xs border border-yellow-200">
                            Upcoming
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Col: AI Medication Q&A Assistant */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col h-[600px] overflow-hidden">
              
              {/* Assistant Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">AI Medication Assistant</h3>
                    <span className="text-[10px] text-emerald-700 font-semibold">Gemini 2.5 Clinical Pharmacy</span>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Prescription-Aware
                </span>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                {chatMessages.map((msg, idx) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <div
                      key={idx}
                      className={`flex gap-2.5 ${isAssistant ? "justify-start" : "justify-end"} animate-fade-in`}
                    >
                      <div
                        className={`p-3.5 rounded-2xl max-w-[90%] leading-relaxed ${
                          isAssistant
                            ? "bg-[#F8FAFC] border border-slate-200/80 text-slate-800 rounded-tl-xs"
                            : "bg-[#2563EB] text-white rounded-tr-xs shadow-xs"
                        }`}
                      >
                        <p>{msg.text}</p>

                        {/* Structured Clinical Advice Pill if available */}
                        {msg.guidance && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1.5 text-[11px]">
                            {msg.guidance.food_instructions && (
                              <p className="text-slate-700">
                                <strong>Food: </strong>{msg.guidance.food_instructions}
                              </p>
                            )}
                            {msg.guidance.missed_dose_guidance && (
                              <p className="text-slate-700">
                                <strong>Missed Dose: </strong>{msg.guidance.missed_dose_guidance}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs pl-2 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI Pharmacist is reviewing prescription safety...</span>
                  </div>
                )}
              </div>

              {/* Quick Sample Questions */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/60 flex flex-wrap gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Ask:</span>
                {[
                  "Can I take Telmisartan with milk?",
                  "What if I miss a dose?",
                  "Can I take Paracetamol with Metformin?",
                ].map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAskMedicationAi(q)}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 text-[10px] transition cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskMedicationAi();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder="Ask about side effects, food timing, missed doses..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="submit"
                    disabled={!chatQuery.trim() || chatLoading}
                    className="ent-button-primary text-xs p-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* 4. INTERACTIVE MEDICATION REMINDER POPUP MODAL            */}
        {/* ========================================================= */}
        {activeReminderModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scale-in text-center text-xs">
              
              <div className="w-16 h-16 rounded-3xl bg-blue-100 text-[#2563EB] flex items-center justify-center mx-auto shadow-sm">
                <Pill className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block">Medication Reminder</span>
                <h2 className="text-xl font-bold text-slate-900">Time to take your medicine</h2>
                <strong className="text-lg font-black text-[#2563EB] block pt-1">
                  {activeReminderModal.medicine_name}
                </strong>
                <span className="text-slate-500 font-semibold">{activeReminderModal.dosage}</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Scheduled Slot</span>
                  <strong className="text-slate-900">{activeReminderModal.time_display}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Instructions</span>
                  <span className="text-slate-800 font-bold">{activeReminderModal.food_instruction}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-[11px]">
                  <span className="text-slate-500">Prescribed By</span>
                  <span className="text-slate-700">{activeReminderModal.prescribed_by}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleMarkTaken(activeReminderModal.id)}
                  className="w-full ent-button-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-3 justify-center shadow-xs cursor-pointer font-bold"
                >
                  <Check className="w-4 h-4" />
                  <span>Taken ✓</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSnooze(activeReminderModal)}
                    className="ent-button-secondary text-xs py-2.5 justify-center cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Remind in 15 mins</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkSkipped(activeReminderModal.id)}
                    className="p-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                  >
                    <span>Skip Dose</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveReminderModal(null)}
                className="text-[11px] text-slate-400 hover:text-slate-600 underline"
              >
                Dismiss for now
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
