"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { LANGUAGES, LanguageCode } from "@/lib/translations";
import { BrandingLogo } from "./BrandingLogo";
import {
  Search,
  Pill,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Settings,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Globe,
  Check,
} from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [userDropdown, setUserDropdown] = useState(false);
  const [langDropdown, setLangDropdown] = useState(false);
  const [medReminderDropdown, setMedReminderDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const role = user?.role || "PATIENT";

  // Searchable demo patients
  const searchablePatients = [
    { id: "569589b7-bcd1-49e7-a886-dd5199c46838", name: "Vikram Malhotra", abha: "91-4920-8831-0941", phone: "9876543210", mrn: "MRN-2026-10001", blood: "O+", age: 38 },
    { id: "569589b7-bcd1-49e7-a886-dd5199c46838", name: "Meera Nair", abha: "91-3312-9901-4412", phone: "9845012345", mrn: "MRN-2026-09412", blood: "B+", age: 54 },
    { id: "569589b7-bcd1-49e7-a886-dd5199c46838", name: "Rajesh Kulkarni", abha: "91-7741-2290-8812", phone: "9740198765", mrn: "MRN-2026-08819", blood: "A+", age: 62 },
    { id: "569589b7-bcd1-49e7-a886-dd5199c46838", name: "Sunita Patel", abha: "91-1188-4490-2213", phone: "9820011223", mrn: "MRN-2026-07741", blood: "AB+", age: 29 },
  ];

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matches = searchablePatients.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.abha.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.mrn.toLowerCase().includes(q)
      );
      setSearchResults(matches);
      setShowSearchDropdown(true);
    } else {
      setSearchResults([]);
      setShowSearchDropdown(false);
    }
  }, [searchQuery]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowSearchDropdown(false);
    if (searchResults.length > 0) {
      router.push(`/patient-history/${searchResults[0].id}`);
    } else {
      router.push(`/doctor/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setShowSearchDropdown(false);
    setSearchQuery("");
    router.push(`/patient-history/${patientId}`);
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs h-[76px] transition-all duration-200">
      <div className="max-w-[1440px] mx-auto h-full px-6 sm:px-8 flex items-center justify-between gap-6">
        
        {/* LEFT: Logo & Platform Subtitle */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            <BrandingLogo size="md" showText={false} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{t("platform_title")}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 tracking-normal hidden sm:block">
                {t("platform_subtitle")}
              </span>
            </div>
          </Link>
        </div>

        {/* CENTER: Global Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-lg hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length > 0) setShowSearchDropdown(true);
              }}
              placeholder={t("global_search_placeholder")}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/90 rounded-xl text-[13px] text-slate-900 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Instant Search Suggestions Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 text-xs animate-fade-in divide-y divide-slate-100">
              <div className="px-3.5 py-2 bg-slate-50 text-slate-500 text-[11px] font-semibold flex items-center justify-between">
                <span>Matching Patient Dossiers</span>
                <span>{searchResults.length} found</span>
              </div>

              {searchResults.length > 0 ? (
                searchResults.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPatient(p.id)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50/60 transition flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 font-bold group-hover:text-[#2563EB]">{p.name}</strong>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {p.blood}
                        </span>
                        <span className="text-slate-400">• {p.age} Yrs</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>MRN: <strong className="text-slate-700">{p.mrn}</strong></span>
                        <span>•</span>
                        <span>ABHA: <span className="font-mono text-slate-700">{p.abha}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] opacity-0 group-hover:opacity-100 transition">
                      <span>Open Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No matching patients found. Press Enter to perform a global directory query.
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Language Selector, AI Status, Notifications & User Profile */}
        <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
          
          {/* FEATURE 3: Multilingual Language Selector Dropdown */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangDropdown(!langDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-800 transition cursor-pointer"
              title="Switch Language"
            >
              <Globe className="w-4 h-4 text-[#2563EB]" />
              <span className="hidden sm:inline font-bold">{currentLangObj.nativeName}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {langDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium animate-fade-in divide-y divide-slate-100">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Select Language
                </div>
                <div className="py-1">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setLangDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 transition flex items-center justify-between cursor-pointer ${
                        language === lang.code
                          ? "bg-blue-50 text-[#2563EB] font-bold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{lang.nativeName} ({lang.name})</span>
                      {language === lang.code && <Check className="w-3.5 h-3.5 text-[#2563EB]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Clinical Status (Green Indicator) */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{t("gemini_active")}</span>
          </div>

          {/* Medicine Reminder Bell & Today's Schedule Flyout */}
          <div className="relative">
            <button
              onClick={() => setMedReminderDropdown(!medReminderDropdown)}
              className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 transition cursor-pointer"
              title="Today's Medication Reminders"
            >
              <Pill className="w-4 h-4 text-[#2563EB]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
            </button>

            {medReminderDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200/90 rounded-2xl shadow-xl p-4 z-50 text-xs font-normal animate-fade-in space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="space-y-0.5">
                    <span className="font-medium text-slate-900 text-sm block">Medication Reminders</span>
                    <span className="text-[11px] text-slate-400 font-normal">Today</span>
                  </div>
                  <Link
                    href="/patient/reminders"
                    onClick={() => setMedReminderDropdown(false)}
                    className="text-[11px] text-[#2563EB] hover:underline font-medium"
                  >
                    View All
                  </Link>
                </div>

                <div className="divide-y divide-slate-100 space-y-0">
                  <div className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <strong className="text-slate-900 font-medium block">Telmisartan 40mg</strong>
                      <span className="text-[11px] text-slate-500 font-normal">After Breakfast</span>
                    </div>
                    <span className="font-mono text-slate-600 text-[11px] font-medium">08:00 AM</span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <strong className="text-slate-900 font-medium block">Paracetamol 650mg</strong>
                      <span className="text-[11px] text-slate-500 font-normal">After Lunch (if needed)</span>
                    </div>
                    <span className="font-mono text-slate-600 text-[11px] font-medium">02:00 PM</span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <strong className="text-slate-900 font-medium block">Metformin 500mg</strong>
                      <span className="text-[11px] text-slate-500 font-normal">After Dinner</span>
                    </div>
                    <span className="font-mono text-slate-600 text-[11px] font-medium">08:00 PM</span>
                  </div>

                  <div className="py-2.5 last:pb-0 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <strong className="text-slate-900 font-medium block">Levocetirizine 5mg</strong>
                      <span className="text-[11px] text-slate-500 font-normal">Before Bedtime</span>
                    </div>
                    <span className="font-mono text-slate-600 text-[11px] font-medium">09:30 PM</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Button with Counter */}
          <Link
            href="/notifications"
            className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-xl border border-slate-200/80 transition"
            title={t("notifications")}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
          </Link>

          {/* User Profile & Settings Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdown(!userDropdown)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {user?.full_name?.charAt(0) || (role === "DOCTOR" ? "D" : "V")}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block font-bold text-slate-900 text-xs leading-tight">
                  {role === "DOCTOR"
                    ? "Dr. Rajesh Sharma"
                    : role === "HOSPITAL_ADMIN"
                    ? "Hospital Administrator"
                    : role === "RECEPTIONIST" || (role as any) === "RECEPTION"
                    ? "Reception Desk"
                    : role === "GOVERNMENT_ADMIN"
                    ? "Public Health Officer"
                    : user?.full_name || "Vikram Malhotra"}
                </span>
                <span className="block text-[10px] text-slate-500 font-medium capitalize">
                  {role.toLowerCase().replace("_", " ")}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium animate-fade-in divide-y divide-slate-100">
                <div className="px-3.5 py-2 text-slate-600">
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Account</span>
                  <strong className="text-slate-900 block font-bold text-xs mt-0.5">
                    {user?.email || (role === "DOCTOR" ? "doctor@cityhospital.com" : "patient.portal@medikiosk.ai")}
                  </strong>
                </div>

                <div className="py-1">
                  <Link
                    href="/patient/profile"
                    onClick={() => setUserDropdown(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t("settings")}</span>
                  </Link>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 transition flex items-center gap-2 cursor-pointer font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>{t("sign_out")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
export default Navbar;
