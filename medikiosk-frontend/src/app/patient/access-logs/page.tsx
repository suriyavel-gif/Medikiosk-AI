"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { AuditLog } from "@/lib/types";
import { ShieldAlert, Clock, Stethoscope, Lock, Eye, Download, Edit } from "lucide-react";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";

export default function DoctorAccessLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await api.patient.getDoctorAccessLogs();
        if (res.success && res.data) {
          setLogs(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
            TAMPER-EVIDENT SHA-256 AUDIT TRAIL
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Physician Record Access Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete, immutable regulatory audit trail tracking every instance a clinician viewed, updated, or downloaded your medical records.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log) => {
              const isView = log.action === "DOCTOR_VIEW_RECORD";
              const isUpdate = log.action === "DOCTOR_UPDATE_RECORD";
              const isDownload = log.action === "DOCTOR_DOWNLOAD_REPORT";

              return (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-500/40 transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                        isView
                          ? "bg-blue-100 text-[#2563EB]"
                          : isUpdate
                          ? "bg-purple-100 text-purple-600"
                          : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      {isView && <Eye className="w-4 h-4" />}
                      {isUpdate && <Edit className="w-4 h-4" />}
                      {isDownload && <Download className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{log.actor_name || "Doctor"}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {log.action.replace("DOCTOR_", "").replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{log.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                        <span>IP: {log.client_ip}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-blue-600">
                          <Lock className="w-3 h-3" /> Hash: {log.tamper_hash_chain.substring(0, 16)}...
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-medium self-end sm:self-center flex items-center gap-1 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white">
            <Lock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">No Doctor Accesses Logged Yet</h3>
            <p className="text-xs mt-1">Every clinical review by an attending doctor will generate an immutable audit entry here.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
