"use client";

import React from "react";
import Link from "next/link";
import { BrandingLogo } from "@/components/BrandingLogo";
import { ArrowLeft, Home, Stethoscope, UserCheck, ShieldAlert } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50 space-y-6 animate-scale-in">
        <div className="flex justify-center">
          <BrandingLogo size="lg" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
            HTTP 404 ERROR
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Clinical Page Not Found
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The requested medical resource, clinical route, or endpoint does not exist or has been relocated within the network.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold">
          <Link
            href="/"
            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            <Home className="w-4 h-4" />
            <span>Home Gateway</span>
          </Link>

          <Link
            href="/patient/dashboard"
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl transition flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Patient Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
