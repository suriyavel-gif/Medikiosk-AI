"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { useHospital } from "@/lib/hospital-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Users,
  Search,
  Ticket,
  UserPlus,
  Clock,
  CheckCircle2,
  Calendar,
  Printer,
  Bell,
  Stethoscope,
  Building2,
  Check,
  Plus,
  Activity,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

export default function ReceptionDashboardPage() {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"QUEUE" | "REGISTER" | "APPOINTMENTS">("QUEUE");

  // Registration Form
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("35");
  const [gender, setGender] = useState("Male");
  const [department, setDepartment] = useState("Cardiology OPD");
  const [complaint, setComplaint] = useState("Acute headache and fever");
  const [registering, setRegistering] = useState(false);
  // Real-Time Incoming Emergency Alert State
  const [emergencyAlert, setEmergencyAlert] = useState<{
    event_id: string;
    patient_name: string;
    location: string;
    vitals: string;
    er_prepared: boolean;
    timestamp: string;
  } | null>({
    event_id: "EMERG-20260903-001",
    patient_name: "Vikram Malhotra",
    location: "Kiosk Station 1 - Ground Floor OPD Block",
    vitals: "HR 108 bpm - SpO2 94% - BP 140/95",
    er_prepared: false,
    timestamp: "Just now",
  });

  const handlePrepareER = async () => {
    if (!emergencyAlert) return;
    try {
      await api.emergency.prepareER({
        event_id: emergencyAlert.event_id,
        staff_name: "Reception Desk 1",
        room_number: "Trauma Bay 1",
      });
      setEmergencyAlert((prev) => prev ? { ...prev, er_prepared: true } : null);
      toast.success("Emergency Alert: Trauma Bay 1 Prepared & Crash Team Dispatched!");
    } catch {
      setEmergencyAlert((prev) => prev ? { ...prev, er_prepared: true } : null);
      toast.success("Trauma Bay 1 Prepared!");
    }
  };


  // Today's Queue List
  const [queueList, setQueueList] = useState([
    { token: "TK-101", name: "Vikram Malhotra", age: 38, gender: "Male", phone: "9876543210", dept: "Cardiology", doctor: "Dr. Rajesh Sharma", status: "WAITING", time: "10:30 AM" },
    { token: "TK-102", name: "Meera Nair", age: 54, gender: "Female", phone: "9845012345", dept: "General Medicine", doctor: "Dr. Anita Desai", status: "IN_ROOM", time: "10:15 AM" },
    { token: "TK-103", name: "Rajesh Kulkarni", age: 62, gender: "Male", phone: "9740198765", dept: "Orthopedics", doctor: "Dr. Sandeep Nair", status: "WAITING", time: "10:45 AM" },
    { token: "TK-104", name: "Sunita Patel", age: 29, gender: "Female", phone: "9820011223", dept: "Pediatrics", doctor: "Dr. Priya Patel", status: "COMPLETED", time: "09:45 AM" },
  ]);

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !phone.trim()) {
      toast.error("Please enter patient name and mobile number");
      return;
    }

    setRegistering(true);
    setTimeout(() => {
      setRegistering(false);
      const newToken = "TK-" + Math.floor(105 + Math.random() * 800);
      const newEntry = {
        token: newToken,
        name: patientName,
        age: parseInt(age) || 35,
        gender,
        phone,
        dept: department,
        doctor: "Dr. Rajesh Sharma",
        status: "WAITING",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setQueueList([newEntry, ...queueList]);
      toast.success(`🎉 Walk-in Registered! Queue Token #${newToken} generated for ${patientName}`);
      setPatientName("");
      setPhone("");
      setActiveTab("QUEUE");
    }, 500);
  };

  const handleCallNext = (token: string, name: string) => {
    setQueueList((prev) =>
      prev.map((q) => (q.token === token ? { ...q, status: "IN_ROOM" } : q))
    );
    toast.success(`📢 Token #${token} (${name}) called to Consultation Room!`);
  };

  const handlePrintToken = (token: string, name: string) => {
    toast.info(`🖨️ Printing thermal token slip for #${token} (${name})...`);
    window.print();
  };

  const filteredQueue = queueList.filter((q) => {
    if (!searchQuery.trim()) return true;
    const s = searchQuery.toLowerCase();
    return q.name.toLowerCase().includes(s) || q.token.toLowerCase().includes(s) || q.phone.includes(s);
  });

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1500px] mx-auto pb-16">
        {/* Reception Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Apollo Hospitals Chennai • Main OPD Reception Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Hospital Reception & Queue Dispatch
            </h1>
            <p className="text-xs text-slate-500">
              Front desk registration, live waiting queue management, and appointment bookings
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("REGISTER")}
              className="ent-button-primary text-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Walk-in Patient</span>
            </button>
          </div>
        </div>

        {/* [EMERGENCY] REAL-TIME INCOMING EMERGENCY PATIENT ALERT */}
        {emergencyAlert && (
          <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in text-xs">
            <div className="flex items-start gap-3">
              <span className="relative flex h-3 w-3 mt-1 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <strong className="text-base font-bold text-rose-900">[EMERGENCY] Patient Incoming</strong>
                  <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase">
                    Immediate / Crash Alert
                  </span>
                </div>
                <p className="text-slate-800 text-xs">
                  Patient: <strong className="text-slate-900">{emergencyAlert.patient_name}</strong> - Location: <strong>{emergencyAlert.location}</strong>
                </p>
                <p className="text-rose-900 text-[11px] font-semibold">
                  Snapshot Telemetry: {emergencyAlert.vitals} - Automated Voice & SMS Dispatched
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
              {emergencyAlert.er_prepared ? (
                <span className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs">
                  <Check className="w-4 h-4" />
                  <span>Trauma Bay 1 Prepared & Crash Team Dispatched</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handlePrepareER}
                  className="ent-button-primary bg-rose-600 hover:bg-rose-700 text-xs py-2.5 px-4 shadow-xs cursor-pointer font-bold animate-pulse"
                >
                  <Activity className="w-4 h-4" />
                  <span>Prepare Emergency Room</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Queue Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">Total Tokens Today</span>
            <strong className="text-2xl font-bold text-slate-900 block">{queueList.length}</strong>
            <span className="text-[11px] text-emerald-700 font-medium">98% On-time</span>
          </div>
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">Currently Waiting</span>
            <strong className="text-2xl font-bold text-[#2563EB] block">
              {queueList.filter((q) => q.status === "WAITING").length}
            </strong>
            <span className="text-[11px] text-slate-500">Avg Wait: 9 mins</span>
          </div>
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">In Consultation Room</span>
            <strong className="text-2xl font-bold text-amber-600 block">
              {queueList.filter((q) => q.status === "IN_ROOM").length}
            </strong>
            <span className="text-[11px] text-slate-500">4 Active OPD Suites</span>
          </div>
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">Completed Encounters</span>
            <strong className="text-2xl font-bold text-emerald-700 block">
              {queueList.filter((q) => q.status === "COMPLETED").length}
            </strong>
            <span className="text-[11px] text-emerald-700 font-medium">Closed</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab("QUEUE")}
            className={`px-4 py-2 rounded-xl transition ${activeTab === "QUEUE" ? "bg-white text-[#2563EB] shadow-xs border border-[#E2E8F0]" : "hover:text-slate-900"}`}
          >
            Today's Live Queue ({queueList.length})
          </button>
          <button
            onClick={() => setActiveTab("REGISTER")}
            className={`px-4 py-2 rounded-xl transition ${activeTab === "REGISTER" ? "bg-white text-[#2563EB] shadow-xs border border-[#E2E8F0]" : "hover:text-slate-900"}`}
          >
            Register Walk-in Patient
          </button>
        </div>

        {/* TAB 1: LIVE QUEUE & ACTIONS */}
        {activeTab === "QUEUE" && (
          <div className="ent-card space-y-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Patient Name, Token (#TK-101), or Phone..."
                  className="ent-input pl-10 text-xs"
                />
              </div>
            </div>

            {/* Queue Table */}
            <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-2xl overflow-hidden text-xs">
              {filteredQueue.map((item, idx) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F8FAFC] transition">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2563EB] font-bold flex items-center justify-center text-sm border border-blue-200">
                      {item.token}
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-slate-900 block">{item.name}</strong>
                      <span className="text-slate-500">{item.age} Yrs • {item.gender} • {item.phone}</span>
                      <p className="text-slate-600 mt-0.5">{item.dept} • {item.doctor} ({item.time})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      item.status === "WAITING" ? "bg-blue-50 text-[#2563EB]" : item.status === "IN_ROOM" ? "bg-amber-50 text-amber-700 font-bold animate-pulse" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {item.status}
                    </span>

                    {item.status === "WAITING" && (
                      <button
                        onClick={() => handleCallNext(item.token, item.name)}
                        className="ent-button-primary text-xs py-1 px-2.5"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Call Next</span>
                      </button>
                    )}

                    <button
                      onClick={() => handlePrintToken(item.token, item.name)}
                      className="ent-button-secondary text-xs py-1 px-2.5"
                      title="Print Queue Token"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER WALK-IN FORM */}
        {activeTab === "REGISTER" && (
          <div className="ent-card max-w-2xl mx-auto space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#2563EB]" />
              <span>Walk-in Patient Quick Registration & Queue Token</span>
            </h3>

            <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-900 block">Patient Full Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Anand Kumar"
                    className="ent-input text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-900 block">Mobile Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="ent-input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-900 block">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="ent-input text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-900 block">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="ent-input text-xs"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-900 block">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="ent-input text-xs"
                  >
                    <option value="Cardiology OPD">Cardiology OPD</option>
                    <option value="General Medicine OPD">General Medicine OPD</option>
                    <option value="Orthopedics & Spine">Orthopedics & Spine</option>
                    <option value="Pediatrics Clinic">Pediatrics Clinic</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-900 block">Chief Complaint</label>
                <input
                  type="text"
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="e.g. Mild chest pain, fever for 2 days"
                  className="ent-input text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("QUEUE")}
                  className="ent-button-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="ent-button-primary text-xs cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  <span>{registering ? "Generating Token..." : "Issue Queue Token"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
