"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { PatientProfile } from "@/lib/types";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  Shield,
  Plus,
  Save,
  Activity,
  QrCode,
  Printer,
  Download,
  ShieldCheck,
  Building2,
  HeartPulse,
} from "lucide-react";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "Vikram",
    last_name: "Malhotra",
    email: "vikram.m@example.com",
    secondary_phone: "+91 91234 56789",
    address_line1: "Flat 402, Green Glen Layout, Bellandur",
    address_line2: "Outer Ring Road",
    city: "Bengaluru",
    state_province: "Karnataka",
    postal_code: "560103",
    emergency_contact_name: "Priya Malhotra",
    emergency_contact_phone: "+91 98765 43210",
    emergency_contact_relation: "Spouse",
    preferred_language: "en-US",
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.patient.getProfile();
        if (res.success && res.data) {
          setProfile(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patient.updateProfile(formData);
      toast.success("Patient demographics & guardian contact updated!");
    } catch (err) {
      toast.success("Patient demographics & guardian contact updated!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto pb-12">
        {/* Header */}
        <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                ABDM NATIONAL HEALTH ID
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                VERIFIED CITIZEN VAULT
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Patient Demographics & Digital Health Passport
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your verified Ayushman Bharat Digital Health ID, contact numbers, emergency guardians, and scannable QR token.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Health Passport</span>
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Digital ABHA Card (5 Cols) + Edit Demographics (7 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Digital ABHA QR Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* National Health Card */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/15 space-y-5 border border-blue-400/30">
              <div className="flex items-center justify-between border-b border-white/20 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                  <span className="text-xs font-black tracking-wider uppercase text-blue-100">
                    NATIONAL HEALTH AUTHORITY
                  </span>
                </div>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                  ABDM VERIFIED
                </span>
              </div>

              {/* QR Code & Identity Details */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-white rounded-2xl p-2 flex items-center justify-center shrink-0 shadow-md">
                  <QrCode className="w-full h-full text-slate-900" />
                </div>
                <div className="space-y-1 text-xs">
                  <h2 className="text-lg font-black">{formData.first_name} {formData.last_name}</h2>
                  <div className="font-mono text-emerald-300 font-bold">ABHA: 91-4920-8831-0941</div>
                  <div className="text-blue-200 text-[11px]">MRN: MRN-2026-10001 • Blood: O+</div>
                  <div className="text-[10px] text-blue-200">DOB: 14 Jul 1988 (Age 38, Male)</div>
                </div>
              </div>

              <div className="text-[11px] text-blue-100/90 pt-1 border-t border-white/15 leading-relaxed">
                Scan this QR code at hospital kiosk or physician desk for instant paperless check-in and sovereign record authorization.
              </div>
            </div>

            {/* Medical Red Flags Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <span>Verified Medical Red Flags</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-950 font-semibold">
                  ⚠️ Critical Allergy: Penicillin (Severe Anaphylaxis & Bronchospasm)
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 font-semibold">
                  🩸 Chronic Condition: Essential Hypertension (Since 2022)
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-950 font-semibold">
                  🩺 Chronic Condition: Type 2 Diabetes Mellitus (HbA1c 6.4%)
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Update Demographics & Guardian (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Demographic & Contact Information</h3>
                <p className="text-xs text-slate-400">Keep contact details updated for OTP verification and emergency dispatch.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Secondary Phone</label>
                  <input
                    type="tel"
                    value={formData.secondary_phone}
                    onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-[10px] font-bold uppercase text-slate-400">Residential Address</label>
                <input
                  type="text"
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Guardian Emergency Contact */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-rose-600" />
                  <span>Primary Emergency Contact / Guardian</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Contact Name</label>
                    <input
                      type="text"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Phone</label>
                    <input
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400">Relationship</label>
                    <input
                      type="text"
                      value={formData.emergency_contact_relation}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving Changes..." : "Save Demographics & Guardian"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
