"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import {
  History,
  CheckCircle2,
  Search,
  Calendar,
  User,
  FileText,
  Pill,
  ArrowRight,
  Stethoscope,
} from "lucide-react";

export default function DoctorHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const pastEncounters = [
    {
      id: "569589b7-bcd1-49e7-a886-dd5199c46838",
      patientName: "Vikram Malhotra",
      mrn: "MRN-2026-10001",
      age: 38,
      gender: "Male",
      diagnosis: "ICD-10 J06.9 - Acute upper respiratory infection",
      date: "Today, 10:30 AM",
      rxIssued: "Paracetamol 650mg, Levocetirizine 5mg",
      status: "COMPLETED",
    },
    {
      id: "569589b7-bcd1-49e7-a886-dd5199c46838",
      patientName: "Meera Nair",
      mrn: "MRN-2026-09412",
      age: 54,
      gender: "Female",
      diagnosis: "ICD-10 I10 - Essential Hypertension Review",
      date: "Today, 9:45 AM",
      rxIssued: "Telmisartan 40mg, Amlodipine 5mg",
      status: "COMPLETED",
    },
    {
      id: "569589b7-bcd1-49e7-a886-dd5199c46838",
      patientName: "Rajesh Kulkarni",
      mrn: "MRN-2026-08819",
      age: 62,
      gender: "Male",
      diagnosis: "ICD-10 E11.9 - Type 2 Diabetes Routine Care",
      date: "Today, 9:15 AM",
      rxIssued: "Metformin 500mg, Glimepiride 1mg",
      status: "COMPLETED",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight flex items-center gap-2.5">
              <History className="w-6 h-6 text-[#2563EB]" />
              <span>Consultation History & Closed Encounters</span>
            </h1>
            <p className="text-sm text-[#6B7280]">
              Chronological log of closed outpatient clinical encounters with 1-click access to complete longitudinal patient history.
            </p>
          </div>
        </div>

        {/* History List */}
        <div className="ent-card space-y-4">
          <div className="divide-y divide-[#E5E7EB]">
            {pastEncounters.map((enc, idx) => (
              <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-[#111827]">
                      {enc.patientName} ({enc.age} Yrs, {enc.gender})
                    </h3>
                    <p className="text-xs text-[#6B7280]">
                      MRN: {enc.mrn} • {enc.date}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      Discharged
                    </span>
                    <Link
                      href={`/patient-history/${enc.id}`}
                      className="ent-button-primary text-xs py-1.5 px-3"
                    >
                      <span>View Longitudinal History</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] text-xs space-y-1">
                  <div><strong>Diagnosis:</strong> {enc.diagnosis}</div>
                  <div><strong>Prescribed Regimen:</strong> {enc.rxIssued}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
