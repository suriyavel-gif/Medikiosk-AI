"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import {
  Pill,
  FileCheck,
  Search,
  Download,
  QrCode,
  CheckCircle2,
  ArrowRight,
  Plus,
} from "lucide-react";

export default function DoctorPrescriptionsPage() {
  const [issuedRxList, setIssuedRxList] = useState([
    {
      rxNumber: "RX-20260827-10536",
      patientName: "Vikram Malhotra",
      mrn: "MRN-2026-10001",
      diagnosis: "Acute Upper Respiratory Infection",
      medicines: ["Augmentin 625 Duo (5 Days)", "Pan 40 (7 Days)"],
      issuedAt: "Today, 10:30 AM",
      signatureHash: "SHA256:acb64b9cec4233c2c5272e4aeac51a7a...",
    },
    {
      rxNumber: "RX-20260827-10530",
      patientName: "Meera Nair",
      mrn: "MRN-2026-09412",
      diagnosis: "Essential Hypertension",
      medicines: ["Telmisartan 40mg (30 Days)", "Amlodipine 5mg (30 Days)"],
      issuedAt: "Today, 9:45 AM",
      signatureHash: "SHA256:7f83b1657ff1fc53b92dc18148a1d65d...",
    },
  ]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <FileCheck className="w-6 h-6 text-blue-600" />
              <span>Electronic Prescription Desk</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Formulated digital prescriptions with QR verification and cryptographic certificate hashes.
            </p>
          </div>

          <Link
            href="/doctor/dashboard"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Formulate New Prescription</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {issuedRxList.map((rx, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-mono font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    {rx.rxNumber}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-2">{rx.patientName} (MRN: {rx.mrn})</h3>
                  <p className="text-xs text-slate-500">Diagnosis: {rx.diagnosis}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">{rx.issuedAt}</span>
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center ml-auto mt-1">
                    <QrCode className="w-6 h-6 text-slate-700" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Prescribed Items:</span>
                <div className="flex flex-wrap gap-2">
                  {rx.medicines.map((m, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-sm">
                  {rx.signatureHash}
                </span>

                <button
                  type="button"
                  onClick={() => toast.success(`Downloaded official PDF for ${rx.rxNumber}`)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
