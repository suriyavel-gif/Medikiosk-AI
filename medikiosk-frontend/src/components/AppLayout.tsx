"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { useAuth } from "@/lib/auth-context";
import { EmergencySOSModal } from "./EmergencySOSModal";
import { ShieldAlert, Heart, Building2, ShieldCheck } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);

  const role = user?.role || "PATIENT";

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col antialiased text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Exactly ONE sticky top navbar */}
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Centered Scrollable Main Content (Max width 1440px with generous 32px section spacing) */}
        <main className="flex-1 overflow-y-auto w-full px-6 sm:px-8 lg:px-10 py-8 transition-all duration-200">
          <div className="max-w-[1440px] mx-auto w-full space-y-8">
            {children}

            {/* Standard Enterprise Clean Footer */}
            <footer className="pt-12 pb-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>MediKiosk AI™ • ISO 27001 & ABDM Sovereign Encrypted Healthcare Platform</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500">
                <span>API Status: Operational (200 OK)</span>
                <span>•</span>
                <span>Version 2.4.0 Production</span>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Floating Bottom-Right Emergency SOS Button (PATIENT ROLE ONLY) */}
      {role === "PATIENT" && (
        <button
          onClick={() => setShowSosModal(true)}
          className="fixed bottom-6 right-6 z-40 px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs shadow-xl shadow-rose-900/25 transition flex items-center gap-2.5 group cursor-pointer animate-fade-in"
          title="Trigger Emergency SOS"
        >
          <ShieldAlert className="w-4 h-4 text-white group-hover:scale-110 transition" />
          <span>Emergency SOS</span>
        </button>
      )}

      {/* Global Emergency Modal */}
      <EmergencySOSModal isOpen={showSosModal} onClose={() => setShowSosModal(false)} />
    </div>
  );
}

export default AppLayout;
