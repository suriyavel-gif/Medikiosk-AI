"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useHospital } from "@/lib/hospital-context";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Stethoscope,
  KeyRound,
  FileCheck,
  AlertTriangle,
  History,
  QrCode,
  Calendar,
  Eye,
  Check,
  X,
  RefreshCw,
  Search,
  ExternalLink,
  Laptop,
} from "lucide-react";

type ConsentTab = "PENDING" | "APPROVED" | "LEDGER" | "ACTIVITY";

export default function ConsentPage() {
  const { selectedHospital } = useHospital();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ConsentTab>("PENDING");
  const [loading, setLoading] = useState(false);

  // Live Consent Requests from Backend
  const [requests, setRequests] = useState<any[]>([]);

  // Consent Ledger Data
  const [ledger, setLedger] = useState<any[]>([]);

  // Doctor Activity Logs
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Approval Modal with Duration Selector
  const [selectedRequestForApproval, setSelectedRequestForApproval] = useState<any | null>(null);
  const [approvalDuration, setApprovalDuration] = useState<string>("24 hours");

  // Load latest state from backend
  const refreshRequests = async () => {
    if (!user?.id || user.role !== "PATIENT") return;
    try {
      const [requestRes, ledgerRes, activityRes] = await Promise.all([
        api.consent.getRequests({ patient_id: user.id }),
        api.consent.getLedger(user.id),
        api.consent.getActivityLogs(user.id),
      ]);
      if (requestRes.success) setRequests(requestRes.requests || []);
      if (ledgerRes.success) setLedger(ledgerRes.ledger || []);
      if (activityRes.success) setActivityLogs(activityRes.logs || []);
    } catch {
      toast.error("Unable to load consent records. Please try again.");
    }
  };

  useEffect(() => {
    refreshRequests();
    const interval = setInterval(refreshRequests, 5000);
    return () => clearInterval(interval);
  }, [user?.id, user?.role]);

  const handleOpenApproveModal = (req: any) => {
    setSelectedRequestForApproval(req);
  };

  const handleConfirmApproval = async () => {
    if (!selectedRequestForApproval) return;
    try {
      const result = await api.consent.takeAction(selectedRequestForApproval.id, "APPROVE", approvalDuration);
      if (!result.success) throw new Error("Consent approval was not confirmed");
      toast.success(`Access granted to ${selectedRequestForApproval.doctor_name} for ${approvalDuration}`);
      setSelectedRequestForApproval(null);
      await refreshRequests();
    } catch {
      toast.error("Consent approval failed. Please try again.");
    }
  };

  const handleReject = async (reqId: string, doctorName: string) => {
    try {
      const result = await api.consent.takeAction(reqId, "REJECT");
      if (!result.success) throw new Error("Consent rejection was not confirmed");
      toast.success(`Consent request rejected for ${doctorName}`);
      await refreshRequests();
    } catch {
      toast.error("Consent rejection failed. Please try again.");
    }
  };

  const handleRevoke = async (reqId: string, doctorName: string) => {
    try {
      const result = await api.consent.takeAction(reqId, "REVOKE");
      if (!result.success) throw new Error("Consent revocation was not confirmed");
      toast.success(`Access revoked for ${doctorName}`);
      await refreshRequests();
    } catch {
      toast.error("Consent revocation failed. Please try again.");
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const approvedRequests = requests.filter((r) => r.status === "APPROVED");

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1440px] mx-auto pb-16">
        
        {/* Page Header */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  Sovereign Consent & ABDM Access Control
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                Manage doctor permissions in real time. Doctors cannot view your medical case history without your explicit approval.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero-Trust Patient Sovereignty Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === "PENDING"
                ? "bg-white text-[#2563EB] shadow-xs font-bold border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Pending Requests</span>
            {pendingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("APPROVED")}
            className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === "APPROVED"
                ? "bg-white text-[#2563EB] shadow-xs font-bold border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Active Permissions ({approvedRequests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LEDGER")}
            className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === "LEDGER"
                ? "bg-white text-[#2563EB] shadow-xs font-bold border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Consent Ledger (Audit Timeline)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ACTIVITY")}
            className={`px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === "ACTIVITY"
                ? "bg-white text-[#2563EB] shadow-xs font-bold border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Doctor Activity Logs</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: PENDING REQUESTS                                   */}
        {/* ========================================================= */}
        {activeTab === "PENDING" && (
          <div className="space-y-4 text-xs">
            {pendingRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <strong className="text-sm font-bold text-slate-900 block">No Pending Consent Requests</strong>
                <p className="text-slate-500">All doctor access requests have been acted upon.</p>
              </div>
            ) : (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border-2 border-amber-300 rounded-2xl p-6 shadow-xs space-y-4 animate-fade-in"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-base font-bold text-slate-900">{req.doctor_name}</strong>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                            Pending Action
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs">{req.hospital_name} • {req.department}</p>
                      </div>
                    </div>

                    <span className="text-xs text-slate-500 font-mono">{req.requested_at}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Consultation Reason</span>
                      <strong className="text-xs font-bold text-slate-900 block">{req.reason}</strong>
                      <span className="text-slate-600 text-[11px]">{req.purpose}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Requested Duration</span>
                      <strong className="text-xs font-bold text-[#2563EB] block">{req.duration_text}</strong>
                      <span className="text-slate-500 text-[11px]">Auto-expires when window ends</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Doctor Note</span>
                      <p className="text-slate-700 text-xs leading-relaxed">{req.doctor_notes || "Clinical history evaluation."}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 text-[11px]">
                      Scope: Longitudinal prescriptions, lab reports, AI triage intake, and radiology scans.
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReject(req.id, req.doctor_name)}
                        className="ent-button-secondary text-rose-700 hover:bg-rose-50 text-xs px-4 py-2 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 text-rose-600" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenApproveModal(req)}
                        className="ent-button-primary bg-emerald-600 hover:bg-emerald-700 text-xs px-5 py-2 cursor-pointer shadow-xs font-bold"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Access</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ACTIVE APPROVED PERMISSIONS                        */}
        {/* ========================================================= */}
        {activeTab === "APPROVED" && (
          <div className="space-y-4 text-xs">
            {approvedRequests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-2">
                <Lock className="w-10 h-10 text-slate-300 mx-auto" />
                <strong className="text-sm font-bold text-slate-900 block">No Active Permissions</strong>
                <p className="text-slate-500">No external doctors currently have access to your health dossier.</p>
              </div>
            ) : (
              approvedRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white border-2 border-emerald-200 rounded-2xl p-6 shadow-xs space-y-4 animate-fade-in"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-base font-bold text-slate-900">{req.doctor_name}</strong>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            ACTIVE ACCESS
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs">{req.hospital_name} • {req.department}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevoke(req.id, req.doctor_name)}
                      className="ent-button-secondary text-rose-700 hover:bg-rose-50 border-rose-200 text-xs px-3.5 py-1.5 cursor-pointer self-start sm:self-auto"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Revoke Permission</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Consultation Reason</span>
                      <strong className="text-xs font-bold text-slate-900 block">{req.reason}</strong>
                      <span className="text-slate-600 text-[11px]">{req.purpose}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-0.5 border border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Access Window</span>
                      <strong className="text-xs font-bold text-emerald-700 block">{req.duration_text}</strong>
                      <span className="text-slate-500 text-[11px]">{req.expires_at || "Active"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CONSENT LEDGER (AUDIT TIMELINE)                    */}
        {/* ========================================================= */}
        {activeTab === "LEDGER" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">ABDM Cryptographic Consent Ledger</h2>
                <p className="text-slate-500 text-xs mt-0.5">Immutable audit trail of all approval, rejection, and revocation events</p>
              </div>
              <span className="text-xs font-mono text-slate-400">SHA-256 Ledger Verified</span>
            </div>

            <div className="divide-y divide-slate-100">
              {ledger.map((item, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 text-right font-mono text-[11px] text-slate-500">
                      <strong className="block text-slate-800">{item.time}</strong>
                      <span>{item.date}</span>
                    </div>

                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.badge_color}`}>
                          {item.action}
                        </span>
                        <strong className="text-slate-900 font-bold text-xs">{item.doctor_name}</strong>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        {item.hospital} • {item.department} ({item.duration})
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: DOCTOR ACTIVITY LOGS                               */}
        {/* ========================================================= */}
        {activeTab === "ACTIVITY" && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Doctor Access & Record Viewing Logs</h2>
                <p className="text-slate-500 text-xs mt-0.5">Transparency telemetry tracking when and which records were opened by physicians</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {activityLogs.map((log, idx) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-bold text-xs">{log.doctor_name}</strong>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600">{log.hospital}</span>
                    </div>
                    <p className="text-slate-800 font-medium text-xs">
                      Viewed: <strong className="text-[#2563EB]">{log.record_type}</strong>
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Timestamp: {log.timestamp}</span>
                      <span>•</span>
                      <span>Session Duration: {log.duration}</span>
                      <span>•</span>
                      <span>IP: <span className="font-mono">{log.ip_address}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* GRANT ACCESS DURATION MODAL                               */}
        {/* ========================================================= */}
        {selectedRequestForApproval && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 transition-all animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <strong className="text-sm font-bold text-slate-900">Grant Sovereign Record Access</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequestForApproval(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-slate-600 leading-relaxed">
                  You are granting <strong className="text-slate-900">{selectedRequestForApproval.doctor_name}</strong> ({selectedRequestForApproval.hospital_name}) temporary permission to review your health records.
                </p>

                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-2">
                    Select Access Duration Window:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "30 Minutes", val: "30 mins" },
                      { label: "1 Hour", val: "1 hour" },
                      { label: "24 Hours (Today)", val: "24 hours" },
                      { label: "Until Manually Revoked", val: "Until manually revoked" },
                    ].map((d) => (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => setApprovalDuration(d.val)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          approvalDuration === d.val
                            ? "bg-blue-50 border-[#2563EB] text-[#2563EB] font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span className="block text-xs">{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRequestForApproval(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer shadow-xs"
                >
                  Approve Access
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
