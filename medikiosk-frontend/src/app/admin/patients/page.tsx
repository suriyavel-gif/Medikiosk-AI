"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { Users, Search, ShieldCheck, ArrowRight, UserPlus } from "lucide-react";

export default function AdminPatientsPage() {
  const patients = [
    { id: "P-101", name: "Vikram Malhotra", mrn: "MRN-2026-10001", abha: "91-4920-8831-0941", age: 38, gender: "Male", phone: "+91 98765 43210", hospital: "Apollo Central", registeredAt: "12 Jan 2026", status: "ACTIVE" },
    { id: "P-102", name: "Meera Nair", mrn: "MRN-2026-09412", abha: "91-3819-2041-8812", age: 54, gender: "Female", phone: "+91 98765 43211", hospital: "Apollo Central", registeredAt: "05 Feb 2026", status: "ACTIVE" },
    { id: "P-103", name: "Rajesh Kulkarni", mrn: "MRN-2026-08819", abha: "91-5820-1948-2910", age: 62, gender: "Male", phone: "+91 98765 43212", hospital: "Victoria Memorial", registeredAt: "18 Mar 2026", status: "ACTIVE" },
    { id: "P-104", name: "Sunita Verma", mrn: "MRN-2026-10022", abha: "91-4920-8831-9011", age: 45, gender: "Female", phone: "+91 98765 43213", hospital: "Apollo Central", registeredAt: "22 Aug 2026", status: "ACTIVE" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-blue-600" />
              <span>Patient Directory & ABDM Registry</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Central hospital patient master index (EMPI) and digital health records.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
          {patients.map((p) => (
            <div key={p.id} className="p-6 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>{p.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{p.mrn}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">ABHA: {p.abha}</span>
                </div>
                <p className="text-slate-500 font-medium">
                  {p.age} Yrs • {p.gender} • Phone: {p.phone} • Primary: {p.hospital} (Registered: {p.registeredAt})
                </p>
              </div>

              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
