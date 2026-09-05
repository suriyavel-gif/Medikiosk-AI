"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { useHospital } from "@/lib/hospital-context";
import { toast } from "sonner";
import {
  Building,
  Users,
  Stethoscope,
  Activity,
  BarChart3,
  FileText,
  ShieldAlert,
  Sparkles,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Flame,
  Printer,
} from "lucide-react";

export default function HospitalAdminDashboardPage() {
  const { user } = useAuth();
  const { selectedHospital } = useHospital();

  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "DOCTORS" | "RECEPTION" | "DEPTS" | "AI_ANALYTICS" | "AUDIT">("OVERVIEW");

  // Doctors Roster
  const [doctorsList, setDoctorsList] = useState([
    { id: "DOC-1", name: "Dr. Rajesh Sharma", specialty: "Cardiology", room: "Room 304", isAvailable: true, seenToday: 14 },
    { id: "DOC-2", name: "Dr. Anita Desai", specialty: "General Medicine", room: "Room 102", isAvailable: true, seenToday: 18 },
    { id: "DOC-3", name: "Dr. Sandeep Nair", specialty: "Orthopedics", room: "Room 108", isAvailable: false, seenToday: 9 },
    { id: "DOC-4", name: "Dr. Priya Patel", specialty: "Pediatrics", room: "Room 110", isAvailable: true, seenToday: 12 },
  ]);

  // Reception Staff
  const [staffList, setStaffList] = useState([
    { id: "STF-1", name: "Pooja Verma", shift: "Morning (08:00 - 16:00)", desk: "Main OPD Atrium", active: true },
    { id: "STF-2", name: "Ramesh Kumar", shift: "Evening (16:00 - 00:00)", desk: "Emergency Triage", active: true },
  ]);

  // Departments
  const [deptsList, setDeptsList] = useState([
    { code: "CARD", name: "Cardiology & Thoracic", beds: 120, occupancy: "85%", head: "Dr. Rajesh Sharma" },
    { code: "GEN", name: "General Medicine OPD", beds: 200, occupancy: "92%", head: "Dr. Anita Desai" },
    { code: "ORTHO", name: "Orthopedics & Spine", beds: 80, occupancy: "70%", head: "Dr. Sandeep Nair" },
    { code: "PED", name: "Pediatrics & Neonatal", beds: 60, occupancy: "64%", head: "Dr. Priya Patel" },
  ]);

  const toggleDoctor = (id: string) => {
    setDoctorsList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isAvailable: !d.isAvailable } : d))
    );
    toast.success("Doctor availability updated in central hospital directory");
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1500px] mx-auto pb-16">
        {/* Hospital Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Building className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Apollo Hospitals Chennai • Operations Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Hospital Operations Administration
            </h1>
            <p className="text-xs text-slate-500">
              Hospital Profile, Doctors & Staff Roster Governance, Departments, AI Metrics, and Emergency Monitoring
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.success("Hospital Daily Operational Dossier Exported")}
              className="ent-button-secondary text-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Daily Dossier</span>
            </button>
          </div>
        </div>

        {/* 4 Operations KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">Active Doctors On-Duty</span>
            <strong className="text-2xl font-bold text-slate-900 block">
              {doctorsList.filter((d) => d.isAvailable).length} / {doctorsList.length}
            </strong>
            <span className="text-[11px] text-emerald-700 font-medium">All OPD Rooms Covered</span>
          </div>
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">Total Patients Seen Today</span>
            <strong className="text-2xl font-bold text-[#2563EB] block">53</strong>
            <span className="text-[11px] text-slate-500">Avg Consult: 14 mins</span>
          </div>
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">Bed Occupancy Rate</span>
            <strong className="text-2xl font-bold text-amber-600 block">82.4%</strong>
            <span className="text-[11px] text-slate-500">388 / 460 Total Beds</span>
          </div>
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">AI Triage Interceptions</span>
            <strong className="text-2xl font-bold text-emerald-700 block">142</strong>
            <span className="text-[11px] text-emerald-700 font-medium">100% CDSS Safety Rate</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-4 py-2 rounded-xl transition ${activeTab === "OVERVIEW" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"}`}
          >
            Hospital Profile & Overview
          </button>
          <button
            onClick={() => setActiveTab("DOCTORS")}
            className={`px-4 py-2 rounded-xl transition ${activeTab === "DOCTORS" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"}`}
          >
            Doctors Management ({doctorsList.length})
          </button>
          <button
            onClick={() => setActiveTab("RECEPTION")}
            className={`px-4 py-2 rounded-xl transition ${activeTab === "RECEPTION" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"}`}
          >
            Reception Staff
          </button>
          <button
            onClick={() => setActiveTab("DEPTS")}
            className={`px-4 py-2 rounded-xl transition ${activeTab === "DEPTS" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"}`}
          >
            Departments ({deptsList.length})
          </button>
          <button
            onClick={() => setActiveTab("AI_ANALYTICS")}
            className={`px-4 py-2 rounded-xl transition ${activeTab === "AI_ANALYTICS" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"}`}
          >
            AI Usage & Safety
          </button>
        </div>

        {/* TAB 1: OVERVIEW & HOSPITAL PROFILE */}
        {activeTab === "OVERVIEW" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            <div className="ent-card space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#2563EB]" />
                <span>Hospital Facility Profile</span>
              </h3>
              <div className="space-y-2 text-xs text-slate-700">
                <div>Facility Name: <strong className="text-slate-900">Apollo Hospitals Chennai</strong></div>
                <div>License: <strong className="text-slate-900 font-mono">LIC-MED-2026-98213</strong></div>
                <div>Category: <strong className="text-slate-900">Tertiary Multi-Super Specialty Center</strong></div>
                <div>Address: <strong className="text-slate-900">21 Greams Lane, Chennai, Tamil Nadu</strong></div>
                <div>ABDM Node Status: <span className="text-emerald-700 font-bold">Connected (ABDM-TN-01)</span></div>
              </div>
            </div>

            <div className="ent-card space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Emergency Crash Dashboard</span>
              </h3>
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2 text-rose-950">
                <div className="flex items-center justify-between font-bold text-rose-900">
                  <span>Active ESI-1 Crash Telemetry</span>
                  <span>Standby</span>
                </div>
                <p className="text-rose-800">
                  Twilio Telecom Emergency Broadcast & First Responder Units KA-01-EA-4910 calibrated.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOCTORS MANAGEMENT */}
        {activeTab === "DOCTORS" && (
          <div className="ent-card space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-bold text-slate-900">Medical Doctors Roster</h3>
              <button
                onClick={() => toast.success("Add Doctor Modal opened")}
                className="ent-button-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Doctor</span>
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0] text-xs">
              {doctorsList.map((doc) => (
                <div key={doc.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <strong className="text-sm font-bold text-slate-900 block">{doc.name}</strong>
                    <span className="text-slate-500">{doc.specialty} • {doc.room}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-medium">Seen Today: {doc.seenToday}</span>
                    <button
                      onClick={() => toggleDoctor(doc.id)}
                      className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer ${
                        doc.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {doc.isAvailable ? "On Duty" : "Off Duty"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RECEPTION STAFF */}
        {activeTab === "RECEPTION" && (
          <div className="ent-card space-y-4 animate-fade-in">
            <h3 className="text-base font-bold text-slate-900">Front Desk Staff Registry</h3>
            <div className="divide-y divide-[#E2E8F0] text-xs">
              {staffList.map((stf) => (
                <div key={stf.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <strong className="text-sm font-bold text-slate-900 block">{stf.name}</strong>
                    <span className="text-slate-500">{stf.shift} • {stf.desk}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                    Active Terminal
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DEPARTMENTS */}
        {activeTab === "DEPTS" && (
          <div className="ent-card space-y-4 animate-fade-in">
            <h3 className="text-base font-bold text-slate-900">Hospital Clinical Departments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {deptsList.map((d) => (
                <div key={d.code} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="text-sm">{d.name}</span>
                    <span className="text-[#2563EB]">{d.occupancy}</span>
                  </div>
                  <p className="text-slate-500">Head: {d.head} • Total Capacity: {d.beds} Beds</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AI USAGE & SAFETY */}
        {activeTab === "AI_ANALYTICS" && (
          <div className="ent-card space-y-4 animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              <span>Gemini Clinical Decision Support & AI Safety Metrics</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1">
                <span className="font-semibold text-slate-500">AI Syntheses Generated</span>
                <strong className="text-xl font-bold text-[#2563EB] block">142 Requests</strong>
                <span className="text-slate-600 text-[11px]">Avg Latency: 1.2s</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1">
                <span className="font-semibold text-slate-500">Allergy Interceptions</span>
                <strong className="text-xl font-bold text-emerald-700 block">18 Interventions</strong>
                <span className="text-emerald-800 text-[11px]">Penicillin contraindications caught</span>
              </div>
              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 space-y-1">
                <span className="font-semibold text-slate-500">OCR Documents Extracted</span>
                <strong className="text-xl font-bold text-purple-700 block">96 Documents</strong>
                <span className="text-purple-800 text-[11px]">99.4% Field Confidence</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
