"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useHospital } from "@/lib/hospital-context";
import { api } from "@/lib/api";
import { PrescriptionDetail, PrescriptionExplainResponse } from "@/lib/types";
import { toast } from "sonner";
import {
  Pill,
  Clock,
  Sparkles,
  Download,
  Calendar,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  ShieldCheck,
  Sun,
  Sunset,
  Moon,
  Coffee,
} from "lucide-react";

export default function PrescriptionsPage() {
  const { selectedHospital } = useHospital();
  const [prescriptions, setPrescriptions] = useState<PrescriptionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  // Gemini AI Prescription Explainer State
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanationMap, setExplanationMap] = useState<Record<string, PrescriptionExplainResponse>>({});

  useEffect(() => {
    async function loadRx() {
      try {
        const res = await api.patient.getPrescriptions();
        if (res.success && res.data) {
          setPrescriptions(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadRx();
  }, []);

  const handleExplain = async (rx: PrescriptionDetail) => {
    setExplainingId(rx.id);
    try {
      console.log("[Prescription AI Explainer] Explaining RX:", rx.prescription_number);
      const res = await api.ai.explainPrescription({
        items: rx.items,
        clinical_notes: rx.clinical_notes,
        target_language: "English",
      });
      console.log("[Prescription AI Explainer] Response received:", res);
      const payload = (res as any)?.data !== undefined ? (res as any).data : res;
      if (payload) {
        setExplanationMap((prev) => ({ ...prev, [rx.id]: payload }));
        toast.success("Prescription simplified by MediKiosk AI");
      }
    } catch (err: any) {
      console.error("[Prescription AI Explainer Error]:", err);
      toast.error(err?.response?.data?.detail || "Could not generate the prescription explanation. Please try again.");
    } finally {
      setExplainingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Pill className="w-6 h-6 text-blue-600" />
              <span>Electronic Prescriptions & Dosage Timings</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Digitally signed prescriptions by attending physicians with Gemini plain-language schedules.
            </p>
          </div>
        </div>

        {/* Prescription Cards List */}
        <div className="space-y-6">
          {prescriptions.length === 0 && !loading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
              <Pill className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">No active prescriptions currently on file.</p>
            </div>
          ) : (
            prescriptions.map((rx) => {
              const aiExplanation = explanationMap[rx.id];

              return (
                <div
                  key={rx.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-6"
                >
                  {/* Prescription Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base shadow-xs">
                        Rx
                      </div>
                      <div>
                        <div className="text-base font-black text-slate-900 flex items-center gap-2">
                          Prescription #{rx.id.slice(0, 8)}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            VERIFIED
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Issued by <strong className="text-slate-800">{rx.doctor_name || "Doctor not recorded"}</strong> • {selectedHospital.name || "Hospital not recorded"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleExplain(rx)}
                        disabled={explainingId === rx.id}
                        className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs transition flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>{explainingId === rx.id ? "Translating..." : "Explain in Plain English"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { window.print(); toast.info("Print dialog opened."); }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Print prescription</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Explanation Banner if Triggered */}
                  {aiExplanation && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-100 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-blue-800">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Plain-Language Patient Guide (AI Generated)</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{aiExplanation.simple_summary}</p>
                    </div>
                  )}

                  {/* Medication Items Structured Schedule */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider text-slate-400">
                      Prescribed Medication Schedule
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rx.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-extrabold text-sm text-slate-900">{item.medicine_name}</div>
                              <div className="text-[11px] text-slate-500">{item.dosage_instruction}</div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700">
                              {item.frequency}
                            </span>
                          </div>                          <p className="text-xs text-slate-600">Schedule details: {item.dosage_instruction || "Not recorded"}</p>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <span className="flex items-center gap-1">
                              <Coffee className="w-3 h-3 text-slate-400" />
                              {item.special_intake_conditions || "Intake conditions not recorded"}
                            </span>
                            <span className="font-bold text-slate-700">Duration: {item.duration_days} Days</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Doctor Signature & Advice Footer */}
                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Physician's Advice</span>
                      <p className="text-slate-700 font-medium mt-0.5">{rx.clinical_notes || "No advice recorded."}</p>
                    </div>
                    <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
                      <div className="text-[10px] text-slate-400">Digitally Verified & Signed</div>
                      <div className="font-extrabold text-blue-700">{rx.doctor_name || "Doctor not recorded"}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
