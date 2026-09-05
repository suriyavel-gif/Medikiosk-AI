"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import {
  LayoutDashboard,
  History,
  FileText,
  Pill,
  Sparkles,
  Lock,
  Search,
  Users,
  ShieldCheck,
  Building2,
  Building,
  Clock,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Activity,
  BarChart3,
  Ticket,
  Calendar,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useLanguage();

  const role = user?.role || "PATIENT";

  // Navigation Links tailored for all 5 roles
  const getNavLinks = () => {
    if (role === "DOCTOR") {
      return [
        { name: t("nav_dashboard"), href: "/doctor/dashboard", icon: LayoutDashboard },
        { name: "Patient Discovery", href: "/doctor/search", icon: Search },
        { name: t("nav_consultation"), href: "/doctor/consultation", icon: Stethoscope },
        { name: t("nav_prescriptions"), href: "/doctor/prescriptions", icon: Pill },
        { name: "Sovereign Access", href: "/doctor/access-requests", icon: Lock },
      ];
    } else if (role === "RECEPTIONIST" || (role as any) === "RECEPTION") {
      return [
        { name: t("nav_reception"), href: "/reception/dashboard", icon: Users },
        { name: t("nav_queue"), href: "/reception/dashboard", icon: Ticket },
        { name: t("nav_doctors"), href: "/admin/doctors", icon: Stethoscope },
      ];
    } else if (role === "HOSPITAL_ADMIN" || (role as any) === "ADMIN") {
      return [
        { name: t("nav_admin"), href: "/admin/dashboard", icon: Building },
        { name: "Doctors Roster", href: "/admin/doctors", icon: Stethoscope },
        { name: "Hospital Facilities", href: "/admin/hospitals", icon: Building2 },
        { name: "Clinical Analytics", href: "/admin/analytics", icon: BarChart3 },
        { name: "Audit Ledger", href: "/admin/audit-logs", icon: History },
      ];
    } else if (role === "GOVERNMENT_ADMIN") {
      return [
        { name: t("nav_government"), href: "/government/dashboard", icon: Activity },
        { name: "Disease Surveillance", href: "/government/dashboard", icon: ShieldCheck },
        { name: "State Health Metrics", href: "/admin/analytics", icon: BarChart3 },
        { name: "Public Audit Logs", href: "/admin/audit-logs", icon: History },
      ];
    }

    // Default: Patient Links
    return [
      { name: t("nav_dashboard"), href: "/patient/dashboard", icon: LayoutDashboard },
      { name: t("nav_appointments"), href: "/patient/appointments", icon: Calendar },
      { name: t("nav_timeline"), href: "/patient/timeline", icon: History },
      { name: "AI Clinical Intake", href: "/patient/intake", icon: Sparkles },
      { name: t("nav_prescriptions"), href: "/patient/prescriptions", icon: Pill },
      { name: t("nav_reports"), href: "/patient/reports", icon: FileText },
      { name: t("nav_queue"), href: "/patient/reminders", icon: Clock },
      { name: "Consent Ledger", href: "/patient/consent", icon: Lock },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <aside
      className={`bg-white border-r border-slate-200/80 transition-all duration-200 flex flex-col justify-between shrink-0 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4 space-y-6">
        <nav className="space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-blue-50 text-[#2563EB] shadow-2xs font-bold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#2563EB]" : "text-slate-400"}`} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-4 border-t border-slate-200/80">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition text-xs font-semibold cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse Navigation</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
