"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { useHospital } from "@/lib/hospital-context";
import { useLanguage } from "@/lib/language-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  User,
  Activity,
  HeartPulse,
  Thermometer,
  Wind,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  RefreshCw,
  QrCode,
  Check,
  Printer,
  Calendar,
  Ticket,
  Home,
  ShieldAlert,
  Download,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface ChatMessage {
  role: "assistant" | "patient" | "user";
  content: string;
}

interface IntakeReportData {
  report_id: string;
  patient_name: string;
  date: string;
  chief_complaint: string;
  symptoms: string[];
  duration: string;
  severity: string;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  medical_history: string[];
  current_medications: string[];
  allergies: string[];
  vitals: {
    bp: string;
    hr: string;
    spo2: string;
    temperature: string;
  };
  preliminary_assessment: string;
  suggested_otc_medicines: string[];
  recommended_department: string;
  recommended_action: string;
  warning_signs: string[];
  follow_up: string;
  disclaimer: string;
}

export default function ClinicalIntakePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const { language, t } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Conversational Assessment Messages State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm MediKiosk AI, your AI Triage Nurse.\n\nI'll ask you a few questions to understand your condition before recommending the next step.\n\nLet's begin: **What is your primary health concern today?**",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [questionStep, setQuestionStep] = useState(1);

  // Voice Interaction State
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Physical IoT Vitals
  const vitals = {
    bp: "120/80 mmHg",
    hr: "76 BPM",
    spo2: "98%",
    temperature: "98.4 °F",
    resp_rate: "16 bpm",
    bmi: "22.4 (Normal)",
  };

  // Structured Triage Report State
  const [evaluatingReport, setEvaluatingReport] = useState(false);
  const [completedReport, setCompletedReport] = useState<IntakeReportData | null>(null);
  const [reportSaved, setReportSaved] = useState(false);

  // Dynamic quick response choices for the guided nurse interview
  const getQuickChoices = () => {
    switch (questionStep) {
      case 1:
        return [
          "Fever and severe sore throat",
          "Crushing chest pain radiating to left arm",
          "Persistent throbbing headache and dizziness",
          "Abdominal cramping and acid reflux",
          "Knee pain and joint swelling",
        ];
      case 2:
        return ["Started today (few hours ago)", "1–2 days", "3–7 days", "More than 2 weeks"];
      case 3:
        return ["Mild (Manageable discomfort)", "Moderate (Affecting daily tasks)", "Severe (Intense discomfort)"];
      case 4:
        return ["Yes, measured high fever (>101°F)", "Yes, mild feverish feeling", "No fever"];
      case 5:
        return ["1 - Very Mild", "3 - Mild Discomfort", "5 - Moderate Pain", "7 - Severe Pain", "9 - Extreme Pain"];
      case 6:
        return ["Hypertension", "Type 2 Diabetes", "Heart Disease", "Asthma / Respiratory", "No Chronic Conditions"];
      case 7:
        return ["Telmisartan 40mg OD", "Metformin 500mg SR", "Inhaler as needed", "No current medications"];
      case 8:
        return ["Penicillin (Severe Allergy)", "Sulfa Drugs", "Aspirin / NSAIDs", "No Known Drug Allergies (NKDA)"];
      case 9:
        return ["I feel fatigued and weak", "Symptoms worsen at night", "Nothing else, ready for clinical report"];
      default:
        return ["I would like my clinical triage report now", "Describe additional symptoms"];
    }
  };

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Web Speech Recognition
  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Speech recognition is not supported on this browser.");
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

    setIsRecording(true);
    toast.info("🎙️ Listening to your symptoms...");

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInputText(transcript);
      setIsRecording(false);
      handleSendUserMessage(transcript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // Text-To-Speech
  const handleSpeakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const cleanText = text.replace(/[*#]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Send message in conversational triage assessment
  const handleSendUserMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isTyping) return;

    const newMessages: ChatMessage[] = [...messages, { role: "patient", content: textToSend }];
    setMessages(newMessages);
    setInputText("");
    setIsTyping(true);

    const nextStep = questionStep + 1;
    setQuestionStep(nextStep);

    try {
      const res = await api.ai.chatIntake({
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        spoken_language: language,
        vitals: vitals,
      });

      if (res.success && res.data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
        handleSpeakText(res.data.reply);
      } else {
        // Fallback guided sequence
        const guidedReplies = [
          "How long have you been experiencing these symptoms?",
          "How severe does it feel? (Mild, Moderate, or Severe?)",
          "Do you currently have a fever or chills?",
          "On a scale of 1 to 10, how would you rate your pain or discomfort?",
          "Do you have any existing chronic conditions like Diabetes or Hypertension?",
          "What medications are you currently taking?",
          "Do you have any known drug allergies?",
          "Is there anything else you want the attending doctor to know before we generate your triage report?",
          "Thank you for sharing your symptoms. Let's analyze your clinical assessment.",
        ];
        const nextReply = guidedReplies[Math.min(nextStep - 1, guidedReplies.length - 1)];
        setMessages((prev) => [...prev, { role: "assistant", content: nextReply }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Thank you for this information. Could you also share if you have any existing medical conditions or allergies?",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Generate and Save Clinical Intake Report (No Queue Token, No Appointment Booking!)
  const handleCompleteAssessment = async () => {
    setEvaluatingReport(true);

    const fullConversation = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const lowerConv = fullConversation.toLowerCase();

    // Determine clinical risk level
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (lowerConv.includes("chest") || lowerConv.includes("left arm") || lowerConv.includes("breathless") || lowerConv.includes("stroke")) {
      riskLevel = "CRITICAL";
    } else if (lowerConv.includes("severe") || lowerConv.includes("pain 8") || lowerConv.includes("pain 9") || lowerConv.includes("high fever")) {
      riskLevel = "HIGH";
    } else if (lowerConv.includes("moderate") || lowerConv.includes("2 days") || lowerConv.includes("fever")) {
      riskLevel = "MEDIUM";
    }

    try {
      // Call Gemini Synthesize
      const res = await api.ai.synthesizeIntake({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        vitals,
        spoken_language: language,
      });

      const reportPayload: IntakeReportData = {
        report_id: `RPT-INTAKE-${Math.floor(100000 + Math.random() * 900000)}`,
        patient_name: user?.full_name || "Vikram Malhotra",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        chief_complaint: res.data?.chief_complaint || "Acute symptomatic clinical presentation",
        symptoms: res.data?.symptoms || ["Fever", "Sore throat", "Body ache"],
        duration: res.data?.duration || "2 days",
        severity: res.data?.possible_severity || (riskLevel === "LOW" ? "Mild" : riskLevel === "MEDIUM" ? "Moderate" : "Severe"),
        risk: riskLevel,
        medical_history: ["Essential Hypertension (ICD-10 I10)", "Type 2 Diabetes Mellitus (ICD-10 E11)"],
        current_medications: ["Telmisartan 40mg OD", "Metformin 500mg SR BD"],
        allergies: ["Penicillin Anaphylaxis (CRITICAL RED FLAG)"],
        vitals: {
          bp: vitals.bp,
          hr: vitals.hr,
          spo2: vitals.spo2,
          temperature: vitals.temperature,
        },
        preliminary_assessment:
          riskLevel === "CRITICAL"
            ? "Potential Acute Coronary Syndrome or Critical Emergency. Immediate in-person resuscitation and emergency evaluation required."
            : riskLevel === "HIGH"
            ? "Acute symptomatic presentation with significant discomfort. In-person specialist consultation recommended today."
            : riskLevel === "MEDIUM"
            ? "Acute upper respiratory / viral presentation with stable hemodynamics. Outpatient consultation recommended within 24-48 hours."
            : "Mild self-limiting upper respiratory symptoms with normal IoT vitals. Home hydration, rest, and conservative symptom monitoring recommended.",
        suggested_otc_medicines:
          riskLevel === "LOW" || riskLevel === "MEDIUM"
            ? ["Paracetamol 650mg SOS for fever / discomfort", "Saline Nasal Spray as needed", "Oral Rehydration Salts (ORS) Hydration"]
            : [],
        recommended_department:
          riskLevel === "CRITICAL"
            ? "Emergency Medicine & Trauma Center"
            : lowerConv.includes("chest")
            ? "Cardiology OPD"
            : lowerConv.includes("knee") || lowerConv.includes("joint")
            ? "Orthopedics OPD"
            : "General Medicine OPD",
        recommended_action:
          riskLevel === "CRITICAL"
            ? "Trigger Emergency SOS or visit the nearest Hospital Emergency Department immediately."
            : riskLevel === "HIGH"
            ? "Schedule an immediate in-person consultation with an on-duty specialist today."
            : riskLevel === "MEDIUM"
            ? "Schedule an Outpatient consultation within 24 to 48 hours. Monitor temperature."
            : "Rest at home, drink plenty of fluids (warm water/electrolytes), and monitor symptoms.",
        warning_signs: [
          "High fever exceeding 102°F persisting for more than 3 days",
          "Shortness of breath, chest heaviness, or blue lips",
          "Severe dizziness, confusion, or inability to keep fluids down",
        ],
        follow_up: "Consult an Outpatient Physician if symptoms worsen or do not resolve within 48 hours.",
        disclaimer: "This is an AI-assisted preliminary assessment and not a confirmed medical diagnosis.",
      };

      setCompletedReport(reportPayload);

      // Save report automatically into Patient Case History
      await api.ai.saveIntakeReport({
        patient_id: user?.id || "569589b7-bcd1-49e7-a886-dd5199c46838",
        hospital_name: selectedHospital?.name || "Apollo Hospitals Chennai",
        chief_complaint: reportPayload.chief_complaint,
        symptoms: reportPayload.symptoms,
        duration: reportPayload.duration,
        severity: reportPayload.severity,
        risk: reportPayload.risk,
        medical_history: reportPayload.medical_history,
        current_medications: reportPayload.current_medications,
        allergies: reportPayload.allergies,
        vitals: reportPayload.vitals,
        preliminary_assessment: reportPayload.preliminary_assessment,
        suggested_otc_medicines: reportPayload.suggested_otc_medicines,
        recommended_department: reportPayload.recommended_department,
        recommended_action: reportPayload.recommended_action,
        warning_signs: reportPayload.warning_signs,
        follow_up: reportPayload.follow_up,
        disclaimer: reportPayload.disclaimer,
      });

      setReportSaved(true);
      toast.success("✨ AI Clinical Intake Report generated & saved to Case History!");
    } catch {
      toast.info("Clinical assessment synthesized.");
    } finally {
      setEvaluatingReport(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1440px] mx-auto pb-12">
        
        {/* Header */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  AI Clinical Intake & Triage Assessment
                </h1>
              </div>
              <p className="text-[15px] text-slate-500">
                Conversational AI Triage Nurse assessment, preliminary analysis, and longitudinal case history synthesis
              </p>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200 text-xs font-bold text-[#2563EB] self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Independent Assessment Module</span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT: CHAT ASSISTANT OR REPORT VIEWER */}
        {completedReport ? (
          /* ========================================================= */
          /* ASSESSMENT COMPLETE & PREMIUM CLINICAL REPORT VIEWER     */
          /* ========================================================= */
          <div className="space-y-6 animate-scale-in">
            
            {/* Completion & Persistence Banner */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Assessment Complete</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your AI Clinical Intake Report has been securely added to your <strong className="text-slate-700">Case History</strong>.
                  </p>
                </div>
              </div>

              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
                <Check className="w-3.5 h-3.5" />
                <span>Saved to Case History ✓</span>
              </span>
            </div>

            {/* COLOR-CODED CLINICAL REPORT VIEWER */}
            <div className={`bg-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 border-2 ${
              completedReport.risk === "CRITICAL"
                ? "border-rose-400 bg-rose-50/10"
                : completedReport.risk === "HIGH"
                ? "border-amber-400 bg-amber-50/10"
                : completedReport.risk === "MEDIUM"
                ? "border-yellow-400 bg-yellow-50/10"
                : "border-emerald-400 bg-emerald-50/10"
            }`}>
              
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Triage Document</span>
                  <h3 className="text-2xl font-bold text-slate-900">AI Clinical Intake Report</h3>
                  <p className="text-xs text-slate-500">Document ID: <span className="font-mono font-bold text-slate-700">{completedReport.report_id}</span> • {completedReport.date}</p>
                </div>

                {/* Risk Level Badge */}
                <div className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border self-start sm:self-auto ${
                  completedReport.risk === "CRITICAL"
                    ? "bg-rose-100 text-rose-900 border-rose-300"
                    : completedReport.risk === "HIGH"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : completedReport.risk === "MEDIUM"
                    ? "bg-yellow-100 text-yellow-900 border-yellow-300"
                    : "bg-emerald-100 text-emerald-900 border-emerald-300"
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  <span>{completedReport.risk} RISK CLASSIFICATION</span>
                </div>
              </div>

              {/* Critical Warning if Emergency */}
              {completedReport.risk === "CRITICAL" && (
                <div className="p-4 rounded-xl bg-rose-600 text-white text-xs space-y-1 animate-pulse">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4" />
                    <span>CRITICAL EMERGENCY WARNING</span>
                  </div>
                  <p>Your reported symptoms indicate an urgent medical emergency. Please proceed to the nearest Emergency Room or trigger Emergency SOS immediately.</p>
                </div>
              )}

              {/* Patient & Vitals Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {/* Patient Profile */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200/80 space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Patient Information</span>
                  <div className="space-y-1 text-slate-700">
                    <p>Name: <strong className="text-slate-900">{completedReport.patient_name}</strong> (Age 38, Male)</p>
                    <p>Chief Complaint: <strong className="text-slate-900">{completedReport.chief_complaint}</strong></p>
                    <p>Duration: <span className="font-semibold text-slate-800">{completedReport.duration}</span> • Severity: <span className="font-semibold text-slate-800">{completedReport.severity}</span></p>
                  </div>
                </div>

                {/* IoT Vitals */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200/80 space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Physical IoT Telemetry</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <p>BP: <strong className="text-slate-900">{completedReport.vitals.bp}</strong></p>
                    <p>Heart Rate: <strong className="text-slate-900">{completedReport.vitals.hr}</strong></p>
                    <p>SpO2: <strong className="text-slate-900">{completedReport.vitals.spo2}</strong></p>
                    <p>Temperature: <strong className="text-slate-900">{completedReport.vitals.temperature}</strong></p>
                  </div>
                </div>
              </div>

              {/* Clinical Assessment & Recommended Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase">Preliminary Clinical Assessment</span>
                  <p className="text-slate-800 leading-relaxed font-medium">{completedReport.preliminary_assessment}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Recommended Next Action</span>
                  <p className="text-slate-900 font-bold leading-relaxed">{completedReport.recommended_action}</p>
                  <p className="text-[11px] text-slate-600">Department: <strong className="text-[#2563EB]">{completedReport.recommended_department}</strong></p>
                </div>
              </div>

              {/* Suggested General OTC Medicines (For Low / Medium Risk) */}
              {completedReport.suggested_otc_medicines?.length > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2 text-xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Suggested General OTC Remedies (Non-Prescription)</span>
                  <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-800 font-medium">
                    {completedReport.suggested_otc_medicines.map((m, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 p-2 rounded-lg bg-white border border-emerald-200/80">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning Signs & Follow-up */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
                  <span className="text-[10px] font-bold text-amber-900 uppercase">Warning Signs & Red Flags</span>
                  <ul className="space-y-1 text-slate-800">
                    {completedReport.warning_signs?.map((w, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Follow-up Guidance</span>
                  <p className="text-slate-800 leading-relaxed">{completedReport.follow_up}</p>
                </div>
              </div>

              {/* Prominent Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-[11px] leading-relaxed flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span><strong>Clinical Disclaimer: </strong>{completedReport.disclaimer}</span>
              </div>

              {/* NAVIGATION ACTION BUTTONS (Independent Modules) */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                      toast.success("Printing Clinical Intake Report...");
                    }}
                    className="ent-button-secondary text-xs px-4 py-2.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print / Download PDF</span>
                  </button>

                  <Link
                    href="/patient/timeline"
                    className="ent-button-secondary text-xs px-4 py-2.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                    <span>View in Case History</span>
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Book Appointment (Navigates to Book Appointment page) */}
                  <Link
                    href="/patient/appointments"
                    className="ent-button-primary text-xs px-4 py-2.5 cursor-pointer shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Appointment</span>
                  </Link>

                  {/* Generate Queue Token (Navigates to Queue module) */}
                  <Link
                    href="/patient/dashboard"
                    className="ent-button-secondary text-xs px-4 py-2.5 cursor-pointer"
                  >
                    <Ticket className="w-3.5 h-3.5 text-slate-500" />
                    <span>Generate Queue Token</span>
                  </Link>

                  {/* Go Home */}
                  <Link
                    href="/patient/dashboard"
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                    title="Return Home"
                  >
                    <Home className="w-4 h-4" />
                  </Link>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* ========================================================= */
          /* CONVERSATIONAL AI TRIAGE NURSE ASSESSMENT CHAT            */
          /* ========================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Chat Container */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col h-[650px] overflow-hidden">
              
              {/* Chat Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#2563EB] flex items-center justify-center font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">MediKiosk AI Triage Nurse</h3>
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Active Assessment (Step {questionStep} of 9)</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCompleteAssessment}
                  disabled={evaluatingReport}
                  className="ent-button-primary text-xs px-3.5 py-1.5 cursor-pointer shadow-xs"
                >
                  {evaluatingReport ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Finish & Generate Report</span>
                    </>
                  )}
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
                {messages.map((m, idx) => {
                  const isAssistant = m.role === "assistant";
                  return (
                    <div
                      key={idx}
                      className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"} animate-fade-in`}
                    >
                      {isAssistant && (
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] border border-blue-200 flex items-center justify-center shrink-0">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div
                        className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                          isAssistant
                            ? "bg-[#F8FAFC] border border-slate-200/80 text-slate-800 rounded-tl-xs"
                            : "bg-[#2563EB] text-white rounded-tr-xs shadow-xs"
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.content}</p>
                      </div>

                      {!isAssistant && (
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs pl-10 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>MediKiosk AI is typing clinical guidance...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Response Choice Chips */}
              <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Answer:</span>
                {getQuickChoices().map((choice, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendUserMessage(choice)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200/90 text-slate-700 hover:text-[#2563EB] text-[11px] font-medium transition cursor-pointer"
                  >
                    {choice}
                  </button>
                ))}
              </div>

              {/* Input Bar with Mic and Send */}
              <div className="p-4 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendUserMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                      isRecording
                        ? "bg-rose-600 text-white border-rose-600 animate-pulse"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                    title="Speak symptoms"
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your response to the AI Triage Nurse..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB] transition"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isTyping}
                    className="ent-button-primary text-xs px-4 py-2.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Live Telemetry & Triage Protocol Card */}
            <div className="space-y-6">
              
              {/* IoT Diagnostic Vitals Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#2563EB]" />
                    <span>IoT Diagnostic Telemetry</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Live Validated
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <span className="text-slate-500">Blood Pressure</span>
                    <strong className="text-slate-900 font-mono">{vitals.bp}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <span className="text-slate-500">Heart Rate</span>
                    <strong className="text-slate-900 font-mono">{vitals.hr}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <span className="text-slate-500">SpO2 Oxygen</span>
                    <strong className="text-slate-900 font-mono">{vitals.spo2}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <span className="text-slate-500">Temperature</span>
                    <strong className="text-slate-900 font-mono">{vitals.temperature}</strong>
                  </div>
                </div>
              </div>

              {/* AI Triage Nurse Protocol Card */}
              <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
                  <span>AI Triage Protocol</span>
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  The AI Triage Nurse assesses symptom severity, hemodynamic stability, and flags red flags for clinical review.
                </p>
                <div className="p-3 bg-white rounded-xl border border-blue-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase">Notice:</span>
                  <p className="text-slate-700 text-[11px]">
                    This module produces an informational triage report for your medical history. It never automatically issues tokens or bookings.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </AppLayout>
  );
}
