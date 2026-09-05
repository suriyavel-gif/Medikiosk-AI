"use client";

import React from "react";
import { AppLayout } from "@/components/AppLayout";
import { Stethoscope, ShieldCheck, Building2 } from "lucide-react";

export default function AdminDoctorsPage() {
  const doctors = [
    { id: "DOC-01", name: "Dr. Rajesh Sharma", specialty: "Cardiology", regNumber: "MCI-2018-948210", hospital: "Apollo Main Campus", room: "Room 304", activeQueue: 4, status: "ON_DUTY" },
    { id: "DOC-02", name: "Dr. Arun Kumar", specialty: "General Medicine", regNumber: "MCI-2015-812049", hospital: "Apollo Main Campus", room: "Room 202", activeQueue: 6, status: "ON_DUTY" },
    { id: "DOC-03", name: "Dr. Priya Sundaram", specialty: "Pulmonology", regNumber: "MCI-2019-104928", hospital: "Victoria Memorial", room: "Room 105", activeQueue: 2, status: "ON_DUTY" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Stethoscope className="w-6 h-6 text-blue-600" />
              <span>Physician Directory & Rostering</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Healthcare Professionals Registry (HPR), department allocations, and live OPD status.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
          {doctors.map((doc) => (
            <div key={doc.id} className="p-6 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>{doc.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">{doc.specialty}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">Reg: {doc.regNumber}</span>
                </div>
                <p className="text-slate-500 font-medium">
                  {doc.hospital} • {doc.room} • Active OPD Queue: <strong>{doc.activeQueue} Patients</strong>
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                {doc.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
