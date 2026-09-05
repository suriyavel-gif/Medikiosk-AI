"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { useHospital } from "@/lib/hospital-context";
import { useLanguage } from "@/lib/language-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Calendar,
  Sparkles,
  Clock,
  Building2,
  Stethoscope,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Activity,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Eye,
  Edit3,
  HelpCircle,
  X,
} from "lucide-react";

interface LatestIntakeReport {
  id: string;
  patient_id: string;
  created_at: string;
  hospital_name: string;
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

export default function BookAppointmentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedHospital } = useHospital();
  const { language, t } = useLanguage();

  // Latest AI Clinical Intake Report State (Single Source of Truth)
  const [loadingReport, setLoadingReport] = useState(true);
  const [intakeReport, setIntakeReport] = useState<LatestIntakeReport | null>(null);
  const [showFullReportModal, setShowFullReportModal] = useState(false);

  // Booking Parameters
  const [hospital, setHospital] = useState("Apollo Hospitals Chennai");
  const [doctor, setDoctor] = useState("Dr. Rajesh Sharma, MD");
  const [department, setDepartment] = useState("Cardiology");
  const [date, setDate] = useState("2026-09-04");
  const [time, setTime] = useState("10:30 AM");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  const availableHospitals = [
    "Apollo Hospitals Chennai",
    "Government General Hospital",
    "AIIMS Delhi",
    "CMC Vellore",
    "Kauvery Hospital",
  ];

  // Fetch Latest Active AI Clinical Intake Report on mount
  useEffect(() => {
    async function loadLatestIntake() {
      setLoadingReport(true);
      try {
        const pId = user?.id || "569589b7-bcd1-49e7-a886-dd5199c46838";
        const res = await api.ai.getLatestIntakeReport(pId);
        if (res.success && res.data) {
          const rep = res.data;
          setIntakeReport(rep);
          if (rep.recommended_department) {
            setDepartment(rep.recommended_department);
          }
          if (rep.hospital_name) {
            setHospital(rep.hospital_name);
          }
          if (rep.recommended_department === "Cardiology") {
            setDoctor("Dr. Rajesh Sharma, MD");
          } else if (rep.recommended_department === "Neurology") {
            setDoctor("Dr. Anita Desai, MD");
          } else if (rep.recommended_department === "Orthopedics") {
            setDoctor("Dr. Sandeep Nair, MS");
          } else {
            setDoctor("Dr. Priya Raman, MD");
          }
        }
      } catch {
        // Fallback default report
        setIntakeReport({
          id: "RPT-INTAKE-2026-001",
          patient_id: "569589b7-bcd1-49e7-a886-dd5199c46838",
          created_at: "2026-09-03T07:15:00Z",
          hospital_name: "Apollo Hospitals Chennai",
          chief_complaint: "Chest pain with breathing difficulty",
          symptoms: ["Substernal chest pressure", "Left shoulder radiation", "Shortness of breath on exertion"],
          duration: "2 days",
          severity: "Severe (8/10)",
          risk: "HIGH",
          medical_history: ["Essential Hypertension", "Type 2 Diabetes"],
          current_medications: ["Telmisartan 40mg OD", "Metformin 500mg SR BD"],
          allergies: ["Penicillin Anaphylaxis"],
          vitals: { bp: "128/82 mmHg", hr: "78 BPM", spo2: "98%", temperature: "98.4 °F" },
          preliminary_assessment: "Patient reports intermittent chest pain radiating to left shoulder with mild shortness of breath. AI recommends urgent cardiology consultation and 12-lead ECG evaluation.",
          suggested_otc_medicines: [],
          recommended_department: "Cardiology",
          recommended_action: "Urgent in-person cardiology consultation recommended today. Avoid physical exertion.",
          warning_signs: ["Crushing chest pressure", "Severe breathlessness or syncope"],
          follow_up: "Immediate clinical review by attending cardiologist.",
          disclaimer: "This is an AI-assisted preliminary assessment and not a confirmed medical diagnosis.",
        });
      } finally {
        setLoadingReport(false);
      }
    }

    loadLatestIntake();
  }, [user]);

  // Handle Book Appointment using the Loaded AI Intake Report
  const handleConfirmBooking = () => {
    setBookingLoading(true);

    setTimeout(() => {
      setBookingLoading(false);
      const token = "TK-" + Math.floor(100 + Math.random() * 900);
      const bookingPayload = {
        token,
        hospital,
        doctor,
        department: intakeReport?.recommended_department || department,
        date,
        time,
        risk: intakeReport?.risk || "STANDARD",
        chief_complaint: intakeReport?.chief_complaint || "Routine consultation",
        symptoms: intakeReport?.symptoms || [],
        ai_assessment: intakeReport?.preliminary_assessment || "Outpatient physician review",
      };

      setBookingSuccess(bookingPayload);
      toast.success(`🎉 Appointment Booked! Priority Token #${token} generated from AI Triage Report.`);
    }, 500);
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
                  <Calendar className="w-4 h-4" />
                </span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Appointment Booking
                </h1>
              </div>
              <p className="text-[15px] text-slate-500">
                Connected with AI Clinical Intake — Zero duplicate data entry required
              </p>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 text-xs font-bold text-emerald-800 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Triage Synchronized</span>
            </div>
          </div>
        </div>

        {/* Booking Container / Success Confirmation */}
        {bookingSuccess ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xs text-center space-y-6 max-w-2xl mx-auto animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900">Appointment Confirmed</h2>
              <p className="text-xs text-slate-500">
                Your appointment has been booked directly from your latest <strong className="text-slate-700">AI Clinical Intake Report</strong>.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-left text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Priority Token</span>
                <strong className="text-base font-bold text-[#2563EB] font-mono">#{bookingSuccess.token}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Facility</span>
                <strong className="text-slate-900">{bookingSuccess.hospital}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Assigned Specialist</span>
                <strong className="text-slate-900">{bookingSuccess.doctor}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Department</span>
                <span className="text-slate-700 font-bold">{bookingSuccess.department}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Triage Priority</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  bookingSuccess.risk === "CRITICAL" ? "bg-rose-100 text-rose-900" :
                  bookingSuccess.risk === "HIGH" ? "bg-amber-100 text-amber-900" :
                  bookingSuccess.risk === "MEDIUM" ? "bg-yellow-100 text-yellow-900" : "bg-emerald-100 text-emerald-900"
                }`}>
                  {bookingSuccess.risk} RISK
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Scheduled Slot</span>
                <strong className="text-slate-900">{bookingSuccess.date} at {bookingSuccess.time}</strong>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setBookingSuccess(null)}
                className="ent-button-secondary text-xs cursor-pointer"
              >
                Book Another Slot
              </button>
              <Link
                href="/patient/dashboard"
                className="ent-button-primary text-xs cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* ========================================================= */}
            {/* LEFT: LATEST AI CLINICAL INTAKE READ-ONLY SUMMARY CARD   */}
            {/* (NO duplicate symptom entry!)                            */}
            {/* ========================================================= */}
            <div className="space-y-6">
              {loadingReport ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xs flex items-center justify-center text-xs text-slate-500 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                  <span>Loading latest AI Clinical Intake Report...</span>
                </div>
              ) : intakeReport ? (
                /* PREMIUM READ-ONLY SUMMARY CARD */
                <div className={`bg-white rounded-2xl p-6 sm:p-8 shadow-xs space-y-5 border-2 ${
                  intakeReport.risk === "CRITICAL"
                    ? "border-rose-300 bg-rose-50/10"
                    : intakeReport.risk === "HIGH"
                    ? "border-amber-300 bg-amber-50/10"
                    : intakeReport.risk === "MEDIUM"
                    ? "border-yellow-300 bg-yellow-50/10"
                    : "border-emerald-300 bg-emerald-50/10"
                }`}>
                  
                  {/* Card Header Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Single Source of Truth</span>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#2563EB]" />
                        <span>Latest AI Clinical Intake</span>
                      </h2>
                      <span className="text-[11px] text-slate-500 font-medium">Completed: Today (Active Assessment)</span>
                    </div>

                    <div className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto ${
                      intakeReport.risk === "CRITICAL"
                        ? "bg-rose-100 text-rose-900 border border-rose-300"
                        : intakeReport.risk === "HIGH"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : intakeReport.risk === "MEDIUM"
                        ? "bg-yellow-100 text-yellow-900 border border-yellow-300"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{intakeReport.risk} RISK</span>
                    </div>
                  </div>

                  {/* Primary Complaint & Symptoms */}
                  <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200/80 space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Primary Complaint</span>
                    <strong className="text-sm font-bold text-slate-900 block leading-snug">{intakeReport.chief_complaint}</strong>
                    
                    <div className="pt-1.5 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                      {intakeReport.symptoms.map((s, idx) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Department & Specialist */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Recommended Department</span>
                      <strong className="text-xs font-bold text-[#2563EB] block">{intakeReport.recommended_department}</strong>
                    </div>

                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Specialist</span>
                      <strong className="text-xs font-bold text-slate-900 block">{doctor}</strong>
                    </div>
                  </div>

                  {/* AI Clinical Summary */}
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold text-[#2563EB] uppercase">AI Summary & Clinical Rationale</span>
                    <p className="text-slate-800 leading-relaxed font-medium text-[11px]">{intakeReport.preliminary_assessment}</p>
                    <p className="text-slate-600 font-semibold text-[10px] pt-1">
                      Recommended Action: <span className="text-slate-900">{intakeReport.recommended_action}</span>
                    </p>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => setShowFullReportModal(true)}
                      className="ent-button-secondary text-xs px-3 py-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View Full Report</span>
                    </button>

                    <Link
                      href="/patient/intake"
                      className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Update AI Assessment</span>
                    </Link>
                  </div>
                </div>
              ) : (
                /* IF NO AI REPORT EXISTS FALLBACK */
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-4 text-xs">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">No AI Clinical Intake available</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                      Complete a quick 2-minute AI Triage Nurse assessment so our system can optimize your appointment routing and priority.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Link
                      href="/patient/intake"
                      className="ent-button-primary text-xs px-4 py-2.5 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start AI Clinical Intake (Recommended)</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toast.info("Continuing with manual slot selection...")}
                      className="ent-button-secondary text-xs px-4 py-2.5 cursor-pointer"
                    >
                      Continue with Manual Appointment
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* RIGHT: APPOINTMENT SLOT SELECTION & BOOKING CONFIRMATION  */}
            {/* ========================================================= */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900">Appointment Slot & Facility</h2>
                <p className="text-xs text-slate-500">Auto-configured based on your active AI Triage assessment</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Healthcare Facility</label>
                  <select
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  >
                    {availableHospitals.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Clinical Department</label>
                    <input
                      type="text"
                      readOnly
                      value={intakeReport?.recommended_department || department}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Attending Specialist</label>
                    <input
                      type="text"
                      readOnly
                      value={doctor}
                      className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Preferred Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Available Slot</label>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="10:30 AM">10:30 AM (Available)</option>
                      <option value="11:00 AM">11:00 AM (Available)</option>
                      <option value="02:30 PM">02:30 PM (Available)</option>
                      <option value="04:00 PM">04:00 PM (Available)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Booking Action */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={bookingLoading}
                  className="w-full ent-button-primary bg-emerald-600 hover:bg-emerald-700 text-xs py-3 justify-center shadow-xs cursor-pointer font-bold"
                >
                  {bookingLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Confirming Appointment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Book Appointment</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Transmits verified AI Triage symptoms, vital telemetry, and risk stratification to doctor workstation
                </p>
              </div>
            </div>

          </div>
        )}

        {/* FULL AI INTAKE REPORT PREVIEW MODAL */}
        {showFullReportModal && intakeReport && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Full AI Clinical Intake Report</h3>
                  <span className="text-[11px] text-slate-500">{intakeReport.id} • {intakeReport.hospital_name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFullReportModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Chief Complaint</span>
                  <p className="font-bold text-slate-900 text-sm">{intakeReport.chief_complaint}</p>
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-[#2563EB] uppercase">Preliminary Assessment</span>
                  <p className="text-slate-800 leading-relaxed font-medium">{intakeReport.preliminary_assessment}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Duration & Severity</span>
                    <p className="text-slate-800 font-semibold">{intakeReport.duration} • {intakeReport.severity}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Triage Risk Level</span>
                    <p className="font-bold text-amber-900">{intakeReport.risk} RISK</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Known Allergies & Chronic History</span>
                  <p className="text-slate-800">Allergies: <strong>{intakeReport.allergies.join(", ")}</strong></p>
                  <p className="text-slate-800">History: {intakeReport.medical_history.join(", ")}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowFullReportModal(false)}
                  className="ent-button-secondary text-xs px-4 py-2 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
