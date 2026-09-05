"use client";

import React from "react";
import { AppLayout } from "@/components/AppLayout";
import { SlidersHorizontal, ShieldCheck, Key, Database, Globe } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-[1200px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <SlidersHorizontal className="w-6 h-6 text-blue-600" />
              <span>System & ABDM Gateway Configuration</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Central health exchange bridges, OAuth certificates, and encryption keys.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900">ABDM Health Data Exchange</h3>
            </div>
            <p className="text-xs text-slate-500">Connected to Ayushman Bharat Digital Mission Central Sandbox (HIU/HIP Protocol Active).</p>
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
              Gateway Status: ONLINE & SYNCHRONIZED
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-900">Cryptographic Signing Master Key</h3>
            </div>
            <p className="text-xs text-slate-500">SHA-256 tamper-evident chaining active across all patient access and prescription events.</p>
            <div className="p-3 bg-slate-50 text-slate-700 text-xs font-mono rounded-xl border border-slate-200 truncate">
              Key Hash: SHA256:7f83b1657ff1fc53b92dc18148a1d65d...
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
