"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Hospital {
  id: string;
  name: string;
  shortName: string;
  networkCode: string;
  type: string;
  category: "Apex Institute" | "Super Specialty" | "Government / NHM" | "Academic Medical Center" | "Regional Care";
  city: string;
  state: string;
  beds: number;
  icuBeds: number;
  kioskStationId: string;
  emrRoom: string;
  badgeColor: string;
  accentColor: string;
  abhaLinked: boolean;
  established: number;
  emergencyHelpline: string;
  description: string;
}

export const HOSPITALS_LIST: Hospital[] = [
  {
    id: "aiims-delhi",
    name: "AIIMS New Delhi",
    shortName: "AIIMS",
    networkCode: "AIIMS-ND-01",
    type: "All India Institute of Medical Sciences",
    category: "Apex Institute",
    city: "New Delhi",
    state: "Delhi NCR",
    beds: 2478,
    icuBeds: 310,
    kioskStationId: "AIIMS-K-01",
    emrRoom: "Cardio-Thoracic OPD Room 102",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    accentColor: "from-blue-600 to-indigo-700",
    abhaLinked: true,
    established: 1956,
    emergencyHelpline: "+91-11-26588500",
    description: "National Apex Medical Institute connected to National Health Grid & ABDM Gateway.",
  },
  {
    id: "apollo-main",
    name: "Apollo Hospitals Main Campus",
    shortName: "Apollo",
    networkCode: "APOLLO-BLR-01",
    type: "Multi-Super Specialty Hospital",
    category: "Super Specialty",
    city: "Bengaluru",
    state: "Karnataka",
    beds: 750,
    icuBeds: 120,
    kioskStationId: "APOLLO-K-01",
    emrRoom: "Cardiology OPD Room 304",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    accentColor: "from-emerald-600 to-teal-700",
    abhaLinked: true,
    established: 1983,
    emergencyHelpline: "1066",
    description: "Tertiary Multi-Specialty center with automated IoT kiosk telemetry and real-time CDSS.",
  },
  {
    id: "fortis-healthcare",
    name: "Fortis Memorial Research Institute",
    shortName: "Fortis",
    networkCode: "FORTIS-NCR-02",
    type: "Super Specialty Hospital & Research",
    category: "Super Specialty",
    city: "Gurugram",
    state: "Haryana",
    beds: 1000,
    icuBeds: 180,
    kioskStationId: "FORTIS-K-03",
    emrRoom: "Internal Medicine Suite 201",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
    accentColor: "from-rose-600 to-pink-700",
    abhaLinked: true,
    established: 2001,
    emergencyHelpline: "105010",
    description: "Advanced multi-organ transplant & oncology hub integrated with FHIR R4 EHR.",
  },
  {
    id: "cmc-vellore",
    name: "CMC Hospital Vellore",
    shortName: "CMC Vellore",
    networkCode: "CMC-VEL-01",
    type: "Christian Medical College & Hospital",
    category: "Academic Medical Center",
    city: "Vellore",
    state: "Tamil Nadu",
    beds: 3000,
    icuBeds: 340,
    kioskStationId: "CMC-K-02",
    emrRoom: "Clinical Immunology OPD 114",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    accentColor: "from-amber-600 to-orange-700",
    abhaLinked: true,
    established: 1900,
    emergencyHelpline: "+91-416-2281000",
    description: "Premier charitable research center with sovereign longitudinal patient records.",
  },
  {
    id: "kauvery-hospital",
    name: "Kauvery Hospital Super Specialty",
    shortName: "Kauvery",
    networkCode: "KAUVERY-CHE-01",
    type: "Tertiary Care Health Network",
    category: "Regional Care",
    city: "Chennai",
    state: "Tamil Nadu",
    beds: 500,
    icuBeds: 85,
    kioskStationId: "KAUV-K-01",
    emrRoom: "Pulmonology & Triage Room 208",
    badgeColor: "bg-cyan-100 text-cyan-800 border-cyan-300",
    accentColor: "from-cyan-600 to-blue-700",
    abhaLinked: true,
    established: 1999,
    emergencyHelpline: "+91-44-40006000",
    description: "Regional multi-city healthcare network with integrated mobile health kiosk fleet.",
  },
  {
    id: "govt-general",
    name: "Government General Hospital & Medical College",
    shortName: "Govt Hospital",
    networkCode: "NHM-GGH-04",
    type: "State Health Mission Apex Center",
    category: "Government / NHM",
    city: "Hyderabad",
    state: "Telangana",
    beds: 1500,
    icuBeds: 160,
    kioskStationId: "GGH-K-09",
    emrRoom: "Central OPD Registration Block B",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    accentColor: "from-purple-600 to-indigo-800",
    abhaLinked: true,
    established: 1848,
    emergencyHelpline: "108",
    description: "Public health flagship hospital with Ayushman Bharat digital intake stations.",
  },
  {
    id: "srm-medical",
    name: "SRM Medical College Hospital & Research Centre",
    shortName: "SRM Hospital",
    networkCode: "SRM-MCH-01",
    type: "Academic Teaching Hospital",
    category: "Academic Medical Center",
    city: "Kattankulathur",
    state: "Tamil Nadu",
    beds: 1200,
    icuBeds: 140,
    kioskStationId: "SRM-K-04",
    emrRoom: "Cardiology EMR Station 405",
    badgeColor: "bg-sky-100 text-sky-800 border-sky-300",
    accentColor: "from-sky-600 to-blue-800",
    abhaLinked: true,
    established: 2005,
    emergencyHelpline: "+91-44-47432333",
    description: "Teaching hospital campus with decentralized multimodal AI triage kiosks.",
  },
  {
    id: "chc-regional",
    name: "Community Health Center & Tele-Triage Grid",
    shortName: "CHC Network",
    networkCode: "CHC-RURAL-11",
    type: "Rural Primary & Secondary Hub",
    category: "Government / NHM",
    city: "Mysuru Rural",
    state: "Karnataka",
    beds: 120,
    icuBeds: 15,
    kioskStationId: "CHC-K-12",
    emrRoom: "Rural Tele-Medicine Booth 01",
    badgeColor: "bg-teal-100 text-teal-800 border-teal-300",
    accentColor: "from-teal-600 to-emerald-800",
    abhaLinked: true,
    established: 2012,
    emergencyHelpline: "104",
    description: "Regional health center bridging rural patients to super-specialist doctors via AI intake.",
  },
];

interface HospitalContextType {
  selectedHospital: Hospital;
  setSelectedHospital: (hospital: Hospital) => void;
  selectHospitalById: (id: string) => void;
  allHospitals: Hospital[];
  isSelectorOpen: boolean;
  setIsSelectorOpen: (open: boolean) => void;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);

const STORAGE_KEY = "medikiosk_selected_hospital";

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const [selectedHospital, setSelectedHospitalState] = useState<Hospital>(HOSPITALS_LIST[0]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const found = HOSPITALS_LIST.find((h) => h.id === saved);
          if (found) {
            setSelectedHospitalState(found);
          }
        }
      } catch (e) {
        console.error("Error reading saved hospital:", e);
      }
    }
  }, []);

  const setSelectedHospital = (hospital: Hospital) => {
    setSelectedHospitalState(hospital);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, hospital.id);
      } catch (e) {
        console.error("Error saving hospital:", e);
      }
    }
  };

  const selectHospitalById = (id: string) => {
    const found = HOSPITALS_LIST.find((h) => h.id === id);
    if (found) {
      setSelectedHospital(found);
    }
  };

  return (
    <HospitalContext.Provider
      value={{
        selectedHospital,
        setSelectedHospital,
        selectHospitalById,
        allHospitals: HOSPITALS_LIST,
        isSelectorOpen,
        setIsSelectorOpen,
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospital() {
  const context = useContext(HospitalContext);
  if (!context) {
    throw new Error("useHospital must be used within a HospitalProvider");
  }
  return context;
}
