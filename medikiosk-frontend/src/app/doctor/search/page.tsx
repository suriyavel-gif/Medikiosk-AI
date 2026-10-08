"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { useHospital } from "@/lib/hospital-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Search,
  User,
  ShieldCheck,
  Lock,
  KeyRound,
  CheckCircle2,
  Clock,
  Sparkles,
  History,
  FileText,
  Pill,
  Activity,
  HeartPulse,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  QrCode,
  Building2,
  Phone,
  Check,
} from "lucide-react";

export default function DoctorSearchPatientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedHospital } = useHospital();

  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Verified Patient Database
  const patientRegistry = [
    {
      id: "569589b7-bcd1-49e7-a886-dd5199c46838",
      name: "Vikram Malhotra",
      age: 38,
      gender: "Male",
      bloodGroup: "O+",
      mrn: "MRN-2026-10001",
      national_health_id: "91-4920-8831-0941",
      phone: "+91 98765 43210",
      status: "Waiting in OPD Queue (Token #A-14)",
      lastDiagnosis: "J06.9 - Acute upper respiratory infection",
    },
    {
      id: "569589b7-bcd1-49e7-a886-dd5199c46838",
      name: "Meera Nair",
      age: 54,
      gender: "Female",
      bloodGroup: "B+",
      mrn: "MRN-2026-09412",
      national_health_id: "91-3312-9901-4412",
      phone: "+91 98450 12345",
      status: "Consultation Completed",
      lastDiagnosis: "I10 - Essential Hypertension",
    },
    {
      id: "569589b7-bcd1-49e7-a886-dd5199c46838",
      name: "Rajesh Kulkarni",
      age: 62,
      gender: "Male",
      bloodGroup: "A+",
      mrn: "MRN-2026-08819",
      national_health_id: "91-7741-2290-8812",
      phone: "+91 97401 98765",
      status: "Lab Reports Pending",
      lastDiagnosis: "E11.9 - Type 2 Diabetes Mellitus",
    },
  ];

  const filteredSuggestions = patientRegistry;

  const handleSelectPatient = (patient: any) => {
    router.push(`/patient-history/${patient.id}`);
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Search className="w-6 h-6 text-[#2563EB]" />
              <span>Doctor Patient Search & Discovery</span>
            </h1>
            <p className="text-sm text-slate-600">
              Type Patient ID, ABHA Number, Mobile, or Name for instant suggestions and direct history access.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSelectPatient(patientRegistry[0])}
              className="ent-button-secondary text-xs"
            >
              <QrCode className="w-4 h-4 text-[#2563EB]" />
              <span>Scan Patient QR</span>
            </button>
          </div>
        </div>

        {/* Search Card with Auto-Suggestions */}
        <div className="ent-card space-y-4 relative">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-900 block">
              Search Central ABDM Registry
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Type Patient ID (MRN-2026-10001), ABHA (91-4920-8831-0941), Mobile (9876543210), or Name..."
                className="ent-input pl-10"
              />
            </div>
          </div>

          {/* Instant Suggestions Dropdown / Grid */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">
              Matching Patient Records ({filteredSuggestions.length})
            </span>

            <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white">
              {filteredSuggestions.map((pat, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectPatient(pat)}
                  className="p-4 hover:bg-[#F8FAFC] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white font-bold flex items-center justify-center text-sm">
                      {pat.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-slate-900 font-bold">{pat.name}</strong>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] font-semibold text-[11px]">
                          {pat.mrn}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          ABHA: {pat.national_health_id}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Age: {pat.age} Yrs • Gender: {pat.gender} • Blood: <strong className="text-rose-600">{pat.bloodGroup}</strong> • Phone: {pat.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-slate-600 font-medium">{pat.status}</span>
                    <span className="ent-button-primary text-xs py-1.5 px-3">
                      <span>Open History</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
