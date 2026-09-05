"use client";

import React, { useState } from "react";
import { useHospital, Hospital } from "@/lib/hospital-context";
import {
  Building2,
  Check,
  Search,
  X,
  MapPin,
  BedDouble,
  ShieldCheck,
  Activity,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function HospitalSelectorModal() {
  const { selectedHospital, setSelectedHospital, allHospitals, isSelectorOpen, setIsSelectorOpen } = useHospital();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  if (!isSelectorOpen) return null;

  const filteredHospitals = allHospitals.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.networkCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = selectedCategory === "ALL" || h.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const categories = ["ALL", "Apex Institute", "Super Specialty", "Government / NHM", "Academic Medical Center", "Regional Care"];

  const handleSelect = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setIsSelectorOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Select Active Hospital Network</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                  8 NETWORKS ACTIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Choose a healthcare institution to synchronize kiosk telemetry, doctor rosters, and patient records.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSelectorOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hospital name, city, state, or network code..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Hospital Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHospitals.map((h) => {
            const isSelected = selectedHospital.id === h.id;

            return (
              <div
                key={h.id}
                onClick={() => handleSelect(h)}
                className={`cursor-pointer rounded-2xl p-4 border transition-all duration-150 flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                    : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {h.networkCode}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        ABDM
                      </span>
                    </div>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        Active
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-black text-slate-900 leading-snug">
                    {h.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{h.city}, {h.state}</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">
                    {h.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-blue-600" />
                      <strong>{h.beds}</strong> Beds
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-rose-500" />
                      <strong>{h.icuBeds}</strong> ICU
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-blue-600 hover:text-white"
                    }`}
                  >
                    <span>{isSelected ? "Selected" : "Switch Hospital"}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Active Institution: <strong className="text-slate-900">{selectedHospital.name}</strong> ({selectedHospital.city})
          </div>
          <button
            onClick={() => setIsSelectorOpen(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
