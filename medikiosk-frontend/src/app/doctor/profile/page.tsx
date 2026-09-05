"use client";

import React from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { useHospital } from "@/lib/hospital-context";
import {
  Stethoscope,
  Building2,
  Award,
  Calendar,
  Clock,
  ShieldCheck,
  Phone,
  Mail,
  FileText,
} from "lucide-react";

export default function DoctorProfilePage() {
  const { selectedHospital } = useHospital();
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-[1200px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Stethoscope className="w-6 h-6 text-blue-600" />
              <span>Physician Profile & Credentials</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Medical council registrations, hospital affiliations, and active digital signing keys.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-5 border-b border-slate-100 pb-6">
            <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/25">
              DR
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900">Dr. Rajesh Sharma, MD, DM</h2>
              <p className="text-sm font-semibold text-blue-600">Interventional Cardiologist & Internal Medicine Consultant</p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Reg: <strong>MCI-2018-948210</strong></span>
                <span>•</span>
                <span>Experience: <strong>14 Years</strong></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Hospital Affiliation</span>
              <strong className="text-slate-900 text-sm block">{selectedHospital.name}</strong>
              <p className="text-slate-500">Cardiology OPD • Room 304</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">ABDM Physician ID</span>
              <strong className="text-slate-900 text-sm block">91-DOC-2018-49201</strong>
              <p className="text-slate-500">Verified Healthcare Professional Registry (HPR)</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
