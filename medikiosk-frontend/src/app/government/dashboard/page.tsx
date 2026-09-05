"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  MapPin,
  Activity,
  ShieldCheck,
  Building2,
  Users,
  Flame,
  AlertTriangle,
  FileText,
  BarChart3,
  Printer,
  Sparkles,
} from "lucide-react";

export default function GovernmentDashboardPage() {
  const { user } = useAuth();
  const [selectedState, setSelectedState] = useState("Tamil Nadu");
  const [selectedDistrict, setSelectedDistrict] = useState("Chennai Metropolitan");

  // State Disease Surveillance Data
  const diseaseOutbreaks = [
    { disease: "Acute Respiratory Viral Infection (J06.9)", cases: 3842, change: "+8.4%", risk: "ELEVATED", districts: "Chennai, Tiruvallur" },
    { disease: "Dengue Fever / Vector-Borne", cases: 214, change: "-4.2%", risk: "CONTROLLED", districts: "Madurai, Coimbatore" },
    { disease: "Type 2 Diabetes Chronic Burden", cases: 142090, change: "+1.1%", risk: "CHRONIC_MONITOR", districts: "All 38 Districts" },
    { disease: "Essential Hypertension", cases: 210450, change: "+0.8%", risk: "CHRONIC_MONITOR", districts: "All 38 Districts" },
  ];

  // Hospital Comparison
  const hospitalsData = [
    { name: "Apollo Hospitals Chennai", type: "Tertiary Super Specialty", opdToday: 1480, beds: 750, occupancy: "85%", emergency: "READY" },
    { name: "Government General Hospital Chennai", type: "Apex Government Institute", opdToday: 4200, beds: 1500, occupancy: "94%", emergency: "HIGH_LOAD" },
    { name: "AIIMS New Delhi", type: "National Apex Medical Center", opdToday: 5100, beds: 2478, occupancy: "96%", emergency: "READY" },
    { name: "CMC Hospital Vellore", type: "Academic Medical Center", opdToday: 3200, beds: 3000, occupancy: "88%", emergency: "READY" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1500px] mx-auto pb-16">
        {/* Government Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>National Health Portal • State Epidemiological Surveillance Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              State Public Health & Outbreak Intelligence
            </h1>
            <p className="text-xs text-slate-500">
              Multi-hospital comparison, real-time syndromic surveillance, bed occupancy, and AI outbreak prediction
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.success("State Epidemiological Bulletin Exported")}
              className="ent-button-secondary text-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Export State Bulletin</span>
            </button>
          </div>
        </div>

        {/* State / District Filter Selectors */}
        <div className="ent-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="text-slate-500 block">State Jurisdiction</label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="ent-input text-xs"
              >
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Delhi NCR">Delhi NCR</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 block">Surveillance District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="ent-input text-xs"
              >
                <option value="Chennai Metropolitan">Chennai Metropolitan</option>
                <option value="Bengaluru Urban">Bengaluru Urban</option>
                <option value="New Delhi Central">New Delhi Central</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-semibold">
            Active Grid: 14 Facilities Reporting Live Telemetry
          </div>
        </div>

        {/* 4 State Surveillance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">State Total OPD Encounters</span>
            <strong className="text-2xl font-bold text-slate-900 block">13,980</strong>
            <span className="text-[11px] text-emerald-700 font-medium">+4.1% WoW Trend</span>
          </div>
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">State Bed Occupancy</span>
            <strong className="text-2xl font-bold text-amber-600 block">90.8%</strong>
            <span className="text-[11px] text-slate-500">7,028 / 7,728 Total Beds</span>
          </div>
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">Active Disease Clusters</span>
            <strong className="text-2xl font-bold text-rose-600 block">2 Alert Zones</strong>
            <span className="text-[11px] text-rose-700 font-medium">Respiratory Spike</span>
          </div>
          <div className="ent-card space-y-1">
            <span className="text-xs font-semibold text-slate-500">ABHA Linked Telemetry</span>
            <strong className="text-2xl font-bold text-emerald-700 block">99.2%</strong>
            <span className="text-[11px] text-emerald-700 font-medium">Sovereign Compliance</span>
          </div>
        </div>

        {/* 2-Column Disease Heatmap & Multi-Hospital Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT (6 COLS): Disease Outbreak Heatmap */}
          <div className="lg:col-span-6 ent-card space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">State Disease Surveillance & Outbreak Clusters</h3>
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0] text-xs">
              {diseaseOutbreaks.map((d, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <strong className="text-sm font-bold text-slate-900 block">{d.disease}</strong>
                    <span className="text-slate-500">Districts: {d.districts} • 7-Day Change: {d.change}</span>
                  </div>
                  <div className="text-right">
                    <strong className="text-sm font-bold text-slate-900 block">{d.cases.toLocaleString()}</strong>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      d.risk === "ELEVATED" ? "bg-rose-50 text-rose-700" : d.risk === "CONTROLLED" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-[#2563EB]"
                    }`}>
                      {d.risk}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT (6 COLS): Hospital Comparison */}
          <div className="lg:col-span-6 ent-card space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#2563EB]" />
                <h3 className="text-base font-bold text-slate-900">Cross-Hospital Capacity Comparison</h3>
              </div>
            </div>

            <div className="divide-y divide-[#E2E8F0] text-xs">
              {hospitalsData.map((h, idx) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <strong className="text-sm font-bold text-slate-900 block">{h.name}</strong>
                    <span className="text-slate-500">{h.type} • OPD: {h.opdToday} Seen</span>
                  </div>
                  <div className="text-right">
                    <strong className="text-sm font-bold text-slate-900 block">Occ: {h.occupancy}</strong>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {h.beds} Beds
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
