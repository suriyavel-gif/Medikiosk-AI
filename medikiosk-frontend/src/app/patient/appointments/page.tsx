"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Eye,
  Edit3,
  X,
} from "lucide-react";

interface LatestIntakeReport {
  id: string;
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

interface BookingConfirmation {
  appointmentNumber: string;
  hospital?: string;
  doctor?: string;
  department?: string;
  date: string;
  time: string;
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BookAppointmentPage() {
  const { user } = useAuth();

  // Latest AI Clinical Intake Report State (Single Source of Truth)
  const [loadingReport, setLoadingReport] = useState(true);
  const [intakeReport, setIntakeReport] = useState<LatestIntakeReport | null>(null);
  const [showFullReportModal, setShowFullReportModal] = useState(false);

  // Booking Parameters
  const [appointmentOptions, setAppointmentOptions] = useState<{
    hospitals: { id: string; name: string }[];
    departments: { id: string; hospital_id: string; name: string; specialty_type: string }[];
    doctors: { id: string; hospital_id: string; department_id: string; name: string; specialty: string }[];
  } | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [hospitalId, setHospitalId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  });
  const [time, setTime] = useState("10:30 AM");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<BookingConfirmation | null>(null);

  const availableDepartments = appointmentOptions?.departments.filter((d) => d.hospital_id === hospitalId) || [];
  const availableDoctors = appointmentOptions?.doctors.filter(
    (d) => d.hospital_id === hospitalId && d.department_id === departmentId
  ) || [];
  const selectedHospital = appointmentOptions?.hospitals.find((h) => h.id === hospitalId);
  const selectedDepartment = availableDepartments.find((d) => d.id === departmentId);
  const selectedDoctor = availableDoctors.find((d) => d.id === doctorId);

  useEffect(() => {
    if (!user || user.role !== "PATIENT") return;
    let active = true;
    api.appointments.getBookingOptions()
      .then((res) => {
        if (!active) return;
        if (!res.success || !res.data) throw new Error("Appointment options were not returned");
        setAppointmentOptions(res.data);
        const firstHospital = res.data.hospitals[0];
        const firstDepartment = res.data.departments.find((d) => d.hospital_id === firstHospital?.id);
        const firstDoctor = res.data.doctors.find(
          (d) => d.hospital_id === firstHospital?.id && d.department_id === firstDepartment?.id
        );
        if (firstHospital) setHospitalId(firstHospital.id);
        if (firstDepartment) setDepartmentId(firstDepartment.id);
        if (firstDoctor) setDoctorId(firstDoctor.id);
        if (!firstHospital || !firstDepartment || !firstDoctor) toast.error("No active appointment options are available.");
      })
      .catch(() => {
        if (active) toast.error("Unable to load appointment options. Please try again.");
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => { active = false; };
  }, [user]);

  // Fetch Latest Active AI Clinical Intake Report on mount
  useEffect(() => {
    async function loadLatestIntake() {
      setLoadingReport(true);
      try {
        if (!user?.id || user.role !== "PATIENT") return;
        const res = await api.ai.getLatestIntakeReport(user.id);
        if (res.success && res.data) {
          const rep = res.data;
          setIntakeReport(rep);
        }
      } catch {
        setIntakeReport(null);
        toast.error("Unable to load your saved intake report.");
      } finally {
        setLoadingReport(false);
      }
    }

    if (user?.id && user.role === "PATIENT") loadLatestIntake();
    else setLoadingReport(false);
  }, [user]);

  // Persist the appointment through the authenticated patient API.
  const handleConfirmBooking = async () => {
    if (!user || user.role !== "PATIENT") {
      toast.error("Please sign in with a patient account before booking.");
      return;
    }
    if (!hospitalId || !departmentId || !doctorId) {
      toast.error("Select an active hospital, department, and doctor.");
      return;
    }
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) {
      toast.error("Select a valid appointment time.");
      return;
    }
    let hours = Number(timeMatch[1]) % 12;
    if (timeMatch[3].toUpperCase() === "PM") hours += 12;

    setBookingLoading(true);
    try {
      const scheduledStart = new Date(`${date}T${String(hours).padStart(2, "0")}:${timeMatch[2]}:00`);
      const res = await api.appointments.create({
        hospital_id: hospitalId,
        department_id: departmentId,
        doctor_id: doctorId,
        scheduled_start_time: scheduledStart.toISOString(),
      });
      if (!res.success || !res.data) throw new Error(res.message || "Booking was not confirmed by the server");

      setBookingSuccess({
        appointmentNumber: res.data.appointment_number,
        hospital: selectedHospital?.name,
        doctor: selectedDoctor?.name,
        department: selectedDepartment?.name,
        date,
        time,
      });
      toast.success(`Appointment ${res.data.appointment_number} booked successfully.`);
    } catch {
      setBookingSuccess(null);
      toast.error("Appointment booking failed. Please review the selected details and try again.");
    } finally {
      setBookingLoading(false);
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
              Your appointment has been saved to your patient record.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-left text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Appointment Number</span>
                <strong className="text-base font-bold text-[#2563EB] font-mono">{bookingSuccess.appointmentNumber}</strong>
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
                      <strong className="text-xs font-bold text-slate-900 block">{selectedDoctor?.name || "Select a specialist"}</strong>
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
                <p className="text-xs text-slate-500">Choose an active facility, department, specialist, date, and time</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Healthcare Facility</label>
                  <select
                    value={hospitalId}
                    disabled={loadingOptions || !appointmentOptions?.hospitals.length}
                    onChange={(e) => {
                      const nextHospitalId = e.target.value;
                      const nextDepartment = appointmentOptions?.departments.find((d) => d.hospital_id === nextHospitalId);
                      const nextDoctor = appointmentOptions?.doctors.find(
                        (d) => d.hospital_id === nextHospitalId && d.department_id === nextDepartment?.id
                      );
                      setHospitalId(nextHospitalId);
                      setDepartmentId(nextDepartment?.id || "");
                      setDoctorId(nextDoctor?.id || "");
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  >
                    {(appointmentOptions?.hospitals || []).map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Clinical Department</label>
                    <select
                      value={departmentId}
                      disabled={!availableDepartments.length}
                      onChange={(e) => {
                        const nextDepartmentId = e.target.value;
                        const nextDoctor = appointmentOptions?.doctors.find(
                          (d) => d.hospital_id === hospitalId && d.department_id === nextDepartmentId
                        );
                        setDepartmentId(nextDepartmentId);
                        setDoctorId(nextDoctor?.id || "");
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      {availableDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Attending Specialist</label>
                    <select
                      value={doctorId}
                      disabled={!availableDoctors.length}
                      onChange={(e) => setDoctorId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      {availableDoctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Preferred Date</label>
                    <input
                      type="date"
                      value={date}
                      min={getLocalDateString(new Date())}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Preferred Slot</label>
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    >
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Booking Action */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={bookingLoading || loadingOptions || !hospitalId || !departmentId || !doctorId || user?.role !== "PATIENT"}
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
                  Booking is confirmed only after the hospital validates and saves the selected appointment.
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
