"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowRight,
  User,
  Building2,
  Calendar,
  Eye,
  Check,
  X,
} from "lucide-react";

export default function DoctorAccessRequestsPage() {
  const [requests, setRequests] = useState([
    {
      id: "req-01",
      patientName: "Vikram Malhotra",
      mrn: "MRN-2026-10001",
      age: 38,
      gender: "Male",
      purpose: "Clinical Examination & Longitudinal History Review",
      scope: "Full EHR, Past Prescriptions & Lab Reports",
      status: "GRANTED",
      requestedAt: "Today, 10:15 AM",
      expiresAt: "Today, 10:45 AM (Active for 22 mins)",
      signatureHash: "SHA256:fc4bcde44bd4641f28d5651498dd4ad4...",
    },
    {
      id: "req-02",
      patientName: "Sunita Verma",
      mrn: "MRN-2026-10022",
      age: 45,
      gender: "Female",
      purpose: "Cardiology Review & ECG Diagnostics",
      scope: "Cardiovascular History & ECG Traces",
      status: "PENDING",
      requestedAt: "Today, 10:20 AM",
      expiresAt: "Awaiting patient approval",
      signatureHash: "Pending Patient Authorization",
    },
    {
      id: "req-03",
      patientName: "Anil Kapoor",
      mrn: "MRN-2026-09841",
      age: 52,
      gender: "Male",
      purpose: "Post-Surgical Followup",
      scope: "Surgical Reports & Medications",
      status: "EXPIRED",
      requestedAt: "Yesterday, 4:30 PM",
      expiresAt: "Expired (Visit Closed)",
      signatureHash: "SHA256:7f83b1657ff1fc53b92dc18148a1d65d...",
    },
  ]);

  const handleApproveSim = (id: string) => {
    setRequests(
      requests.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "GRANTED",
              expiresAt: "Today, 11:00 AM (Active for 30 mins)",
              signatureHash: "SHA256:e3b0c44298fc1c149afbf4c8996fb924...",
            }
          : r
      )
    );
    toast.success("Patient approval recorded. Digital access granted!");
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <KeyRound className="w-6 h-6 text-blue-600" />
              <span>Sovereign Record Access Requests</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ABDM sovereign consent authorization logs and active physician permission tokens.
            </p>
          </div>

          <Link
            href="/doctor/search"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Request New Patient Access</span>
          </Link>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden divide-y divide-slate-100">
          {requests.map((req) => (
            <div key={req.id} className="p-6 hover:bg-slate-50/60 transition space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm">
                    {req.patientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>{req.patientName}</span>
                      <span className="text-xs text-slate-500 font-normal">
                        ({req.age} Yrs • {req.gender} • {req.mrn})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{req.purpose}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      req.status === "GRANTED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : req.status === "PENDING"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {req.status === "GRANTED" ? "ACCESS ACTIVE" : req.status === "PENDING" ? "AWAITING APPROVAL" : "EXPIRED"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Scope</span>
                  <span className="font-medium text-slate-800">{req.scope}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Requested At</span>
                  <span className="font-medium text-slate-800">{req.requestedAt}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Expiry / Validity</span>
                  <span className="font-medium text-slate-800">{req.expiresAt}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-md">
                  Signature: {req.signatureHash}
                </span>

                <div className="flex items-center gap-2">
                  {req.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleApproveSim(req.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simulate Approval</span>
                    </button>
                  )}
                  {req.status === "GRANTED" && (
                    <Link
                      href="/doctor/dashboard"
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1"
                    >
                      <span>Open Consultation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
