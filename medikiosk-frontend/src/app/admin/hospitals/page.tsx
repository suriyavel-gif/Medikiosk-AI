"use client";

import React from "react";
import { AppLayout } from "@/components/AppLayout";
import { Building2, Activity, ShieldCheck, MapPin } from "lucide-react";

export default function AdminHospitalsPage() {
  const hospitals = [
    { id: "HOSP-01", name: "Apollo Hospital Main Campus", city: "Bengaluru", state: "Karnataka", beds: 450, occupancy: "82%", kiosks: 12, status: "ACTIVE" },
    { id: "HOSP-02", name: "Victoria Memorial Government Hospital", city: "Bengaluru", state: "Karnataka", beds: 600, occupancy: "92%", kiosks: 16, status: "ACTIVE" },
    { id: "HOSP-03", name: "Bowring & Lady Curzon Hospital", city: "Bengaluru", state: "Karnataka", beds: 380, occupancy: "76%", kiosks: 8, status: "ACTIVE" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-blue-600" />
              <span>Hospital Network & Facility Registry</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Facility infrastructure, bed capacity, and Multimodal Kiosk fleet distribution.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {hospitals.map((h) => (
            <div key={h.id} className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">{h.id}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{h.status}</span>
              </div>
              <h3 className="font-extrabold text-sm text-slate-900">{h.name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{h.city}, {h.state}</span>
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] block">Capacity</span>
                  <strong>{h.beds} Beds ({h.occupancy})</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Kiosk Fleet</span>
                  <strong>{h.kiosks} Online</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
