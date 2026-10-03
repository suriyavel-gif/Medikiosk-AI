"use client";

import React, { useState, useEffect } from "react";

import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  PhoneCall,
  MessageSquare,
  Building2,
  Stethoscope,
  Users,
  History,
  Clock,
  RefreshCw,
  Send,
  ShieldCheck,
  Check,
  HeartPulse,
} from "lucide-react";

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type StepType = "CONFIRM" | "DISPATCHING" | "SUCCESS";

export function EmergencySOSModal({ isOpen, onClose }: EmergencySOSModalProps) {
  const { user } = useAuth();

  const [step, setStep] = useState<StepType>("CONFIRM");
  const [progressStep, setProgressStep] = useState(1);
  const [eventId, setEventId] = useState<string>("");
  const [sosDetails, setSosDetails] = useState<any>(null);

  const patientName = user?.full_name || "Patient";

  const vitals = {
    heart_rate: "105 bpm",
    spo2: "94%",
    blood_pressure: "140/90 mmHg",
    temperature: "99.2 F",
  };

  useEffect(() => {
    if (isOpen) {
      setStep("CONFIRM");
      setProgressStep(1);
      setSosDetails(null);
    }
  }, [isOpen]);

  const handleTriggerSOS = async () => {
    if (!user?.id || user.role !== "PATIENT") { toast.error("Sign in with a patient account to request SOS."); return; }
    setStep("DISPATCHING");
    setProgressStep(1);
    try {
      const response = await api.emergency.triggerSOS({ patient_id: user.id });
      if (!response.success || !response.event_id) throw new Error("The SOS alert was not confirmed by the server");
      setEventId(response.event_id);
      setSosDetails(response);
      setProgressStep(5);
      setStep("SUCCESS");
      toast.success("Emergency SOS was recorded in the hospital inbox.");
    } catch (error) {
      setStep("CONFIRM");
      toast.error(error instanceof Error ? error.message : "Emergency SOS could not be recorded");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in select-none">
      <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-[24px] shadow-2xl overflow-hidden animate-scale-in">
        
        {/* PHASE 1: CONFIRMATION DIALOG */}
        {step === "CONFIRM" && (
          <div>
            {/* Header */}
            <div className="bg-rose-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">Emergency SOS Confirmation</h2>
                  <p className="text-xs text-rose-100">Critical Medical Response Protocol</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs">
              <div className="text-center space-y-1 py-2">
                <h3 className="text-base font-bold text-slate-900">Are you sure you want to trigger Emergency SOS?</h3>
                <p className="text-slate-500">
                  This will create an emergency alert in the hospital inbox. SMS and voice dispatch are not configured.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900">
                The server will save this alert in the hospital inbox. No live vitals or external SMS/voice dispatch will be attached.
              </div>
              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={onClose}
                  className="ent-button-secondary text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTriggerSOS}
                  className="ent-button-primary bg-rose-600 hover:bg-rose-700 text-xs px-6 py-2.5 cursor-pointer shadow-md shadow-rose-600/20"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Trigger SOS Now</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: DISPATCHING PROGRESS */}
        {step === "DISPATCHING" && (
          <div className="p-8 space-y-6 text-center animate-fade-in text-xs">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center animate-pulse">
                <RefreshCw className="w-7 h-7 text-rose-600 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Dispatching Emergency...</h3>
                <p className="text-slate-500 text-xs">Transmitting high-priority telemetry to all responder networks</p>
              </div>
            </div>

            {/* Live Progress Stepper */}
            <div className="space-y-2.5 text-left bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0]">
              <div className={`flex items-center justify-between transition-all ${progressStep >= 1 ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                <span className="flex items-center gap-2">
                  {progressStep > 1 ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <RefreshCw className="w-3.5 h-3.5 text-[#2563EB] animate-spin" />}
                  <span>1. Saving Event in Database</span>
                </span>
                <span className="text-[10px] font-mono">{progressStep > 1 ? "SAVED" : "PROCESSING"}</span>
              </div>

              <div className={`flex items-center justify-between transition-all ${progressStep >= 2 ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                <span className="flex items-center gap-2">
                  {progressStep > 2 ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : progressStep === 2 ? <RefreshCw className="w-3.5 h-3.5 text-[#2563EB] animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>2. Sending SMS to Emergency Contact</span>
                </span>
                <span className="text-[10px] font-mono">{progressStep > 2 ? "SENT" : progressStep === 2 ? "TRANSMITTING" : "QUEUED"}</span>
              </div>

              <div className={`flex items-center justify-between transition-all ${progressStep >= 3 ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                <span className="flex items-center gap-2">
                  {progressStep > 3 ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : progressStep === 3 ? <RefreshCw className="w-3.5 h-3.5 text-[#2563EB] animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>3. Calling Relative via Twilio Voice</span>
                </span>
                <span className="text-[10px] font-mono">{progressStep > 3 ? "CONNECTED" : progressStep === 3 ? "CALLING" : "QUEUED"}</span>
              </div>

              <div className={`flex items-center justify-between transition-all ${progressStep >= 4 ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                <span className="flex items-center gap-2">
                  {progressStep > 4 ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : progressStep === 4 ? <RefreshCw className="w-3.5 h-3.5 text-[#2563EB] animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>4. Notifying Hospital & Doctor EMR</span>
                </span>
                <span className="text-[10px] font-mono">{progressStep > 4 ? "DISPATCHED" : progressStep === 4 ? "NOTIFYING" : "QUEUED"}</span>
              </div>

              <div className={`flex items-center justify-between transition-all ${progressStep >= 5 ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
                <span className="flex items-center gap-2">
                  {progressStep >= 5 ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>5. Updating Patient Medical Timeline</span>
                </span>
                <span className="text-[10px] font-mono">{progressStep >= 5 ? "UPDATED" : "PENDING"}</span>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 3: SUCCESS DIALOG */}
        {step === "SUCCESS" && (
          <div className="p-8 space-y-6 text-center animate-scale-in text-xs">
            {/* Large Green Check */}
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Emergency alert recorded</h3>
                <p className="text-slate-500">The hospital inbox saved this alert. External SMS and voice are not configured.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-slate-800 space-y-2">
              <p>SMS status: {sosDetails?.details?.sms_status || sosDetails?.sms || "Not configured"}</p>
              <p>Call status: {sosDetails?.details?.call_status || sosDetails?.call || "Not configured"}</p>
              <p>Hospital inbox: {sosDetails?.doctor_notified && sosDetails?.reception_notified ? "Recorded" : "Not confirmed"}</p>
            </div>

            {/* Event ID Badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-slate-500 font-semibold">Emergency Event ID</span>
              <strong className="font-mono text-slate-900 font-bold">{eventId}</strong>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full ent-button-primary bg-slate-900 hover:bg-slate-800 text-xs py-2.5 cursor-pointer"
            >
              Close Emergency Dossier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmergencySOSModal;
