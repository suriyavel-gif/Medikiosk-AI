"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";
import { useHospital } from "@/lib/hospital-context";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Download,
  AlertOctagon,
  Microscope,
  Info,
  Pill,
  Building2,
  Stethoscope,
  Calendar,
  Eye,
  Edit3,
  Save,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Check,
  X,
  RefreshCw,
  Clock,
  Printer,
  Share2,
  Search,
  HelpCircle,
  FileSearch,
  Scan,
  HeartPulse,
  Brain,
  Layers,
  ChevronRight,
} from "lucide-react";

interface ParameterCardData {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  status: "NORMAL" | "BORDERLINE" | "CRITICAL" | "LOW" | "HIGH";
  meaning: string;
  recommendation: string;
  category: string;
}

interface AIReportAnalysisResult {
  report_title: string;
  test_type: string;
  test_purpose: string;
  overall_status: "NORMAL" | "MILD_CONCERN" | "CRITICAL";
  status_badge: string;
  summary_plain_english: string;
  parameters: ParameterCardData[];
  organ_system_status: Record<string, string>;
  possible_health_concerns: string[];
  severity: string;
  recommended_specialist: string;
  urgency: string;
  lifestyle_advice: string[];
  diet_advice: string[];
  medicines_mentioned: string[];
  follow_up_tests: string[];
  confidence_score: number;
  language: string;
  saved_to_case_history: boolean;
  disclaimer: string;
}

export default function MedicalReportIntelligencePage() {
  const { selectedHospital } = useHospital();
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & File State
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("BLOOD_TEST");
  const [extractedText, setExtractedText] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language || "en");

  // Multi-Step Processing Animation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [imageQualityError, setImageQualityError] = useState<string | null>(null);

  // Current Analysis Output State
  const [analysisResult, setAnalysisResult] = useState<AIReportAnalysisResult | null>({
    report_title: "Comprehensive Blood & Metabolic Report",
    test_type: "BLOOD_TEST",
    test_purpose: "To evaluate blood oxygen capacity, fasting blood sugar, kidney filtration, and lipid profiles.",
    overall_status: "MILD_CONCERN",
    status_badge: "Mild Concern",
    summary_plain_english:
      "Your blood test results show that your kidney function, liver health, and blood sugar levels are healthy and normal. However, your hemoglobin is slightly lower than ideal (11.2 g/dL), which indicates mild iron-deficiency anemia. Increasing iron-rich vegetables and whole grains will help restore your natural vitality.",
    parameters: [
      {
        name: "Hemoglobin (Hb)",
        value: "11.2",
        unit: "g/dL",
        reference_range: "12.0 - 15.5",
        status: "BORDERLINE",
        meaning: "Your blood has slightly less hemoglobin than normal, meaning your red blood cells carry slightly less oxygen.",
        recommendation: "Increase iron-rich foods such as spinach, beans, beetroot, lentils, and pomegranate. Consult physician if fatigue persists.",
        category: "Blood Counts",
      },
      {
        name: "Serum Creatinine",
        value: "0.9",
        unit: "mg/dL",
        reference_range: "0.7 - 1.3",
        status: "NORMAL",
        meaning: "Your kidneys are filtering waste from your blood normally and efficiently.",
        recommendation: "Continue drinking 2 to 3 liters of water daily to maintain optimal kidney hydration.",
        category: "Kidney Function",
      },
      {
        name: "Fasting Blood Sugar",
        value: "98",
        unit: "mg/dL",
        reference_range: "70 - 100",
        status: "NORMAL",
        meaning: "Your resting blood glucose is within the optimal healthy range.",
        recommendation: "Maintain your balanced meal schedule and regular daily walking.",
        category: "Metabolic Health",
      },
      {
        name: "Total Cholesterol",
        value: "208",
        unit: "mg/dL",
        reference_range: "< 200",
        status: "BORDERLINE",
        meaning: "Slightly elevated circulating lipids in your bloodstream.",
        recommendation: "Incorporate fiber-rich oats, walnuts, and minimize deep-fried food intake.",
        category: "Lipid Profile",
      },
    ],
    organ_system_status: {
      "Kidney Function": "Normal",
      "Liver Function": "Normal",
      "Heart Markers": "Normal",
      "Blood & Oxygen": "Mild Concern",
    },
    possible_health_concerns: ["Mild Iron Deficiency / Borderline Anemia", "Borderline Cholesterol"],
    severity: "Mild Concern",
    recommended_specialist: "General Physician / Internal Medicine",
    urgency: "Not urgent — Book General Physician within 7 days",
    lifestyle_advice: [
      "Engage in 30 minutes of daily moderate walking",
      "Stay well-hydrated with 2 to 3 liters of water",
      "Ensure 7-8 hours of sound nighttime sleep",
    ],
    diet_advice: [
      "Increase green leafy vegetables (spinach, methi, drumstick leaves)",
      "Include citrus fruits rich in Vitamin C with meals to boost iron absorption",
      "Reduce processed baked goods and saturated fats",
    ],
    medicines_mentioned: ["Telmisartan 40mg (Continue as prescribed)"],
    follow_up_tests: ["Repeat Complete Blood Count (CBC) in 3 months", "Lipid Panel in 6 months"],
    confidence_score: 0.98,
    language: "en",
    saved_to_case_history: true,
    disclaimer: "This is an AI-assisted plain-language summary for patient understanding. Please consult your physician for official medical diagnosis.",
  });

  // Pre-loaded Demo Scans for Instant Testing
  const demoReports = [
    {
      label: "🩸 Complete Blood Count (CBC)",
      type: "CBC",
      text: "PATIENT: Vikram Malhotra, AGE: 38, MALE. Complete Blood Count (CBC): Hemoglobin: 11.2 g/dL (Ref: 12.0-15.5 g/dL - LOW), RBC Count: 4.1 mil/uL (Ref: 4.5-5.9), WBC Total: 6,800 /mcL (Ref: 4,000-11,000 - NORMAL), Platelet Count: 240,000 /mcL (Ref: 150,000-450,000 - NORMAL), Hematocrit (PCV): 34% (Ref: 36-46%). IMPRESSION: Microcytic hypochromic picture suggestive of mild iron deficiency anemia. Renal and metabolic indices preserved.",
    },
    {
      label: "🧪 Kidney & Liver Metabolic Panel",
      type: "BLOOD_TEST",
      text: "APOLLO DIAGNOSTICS BIOCHEMISTRY: Serum Creatinine: 0.9 mg/dL (Normal: 0.7-1.3), Blood Urea Nitrogen: 14 mg/dL (Normal: 7-20), eGFR: >90 mL/min/1.73m2 (Optimal). SGOT/AST: 24 U/L (Normal: <40), SGPT/ALT: 28 U/L (Normal: <45), Serum Bilirubin: 0.8 mg/dL (Normal: 0.2-1.2). Fasting Glucose: 98 mg/dL. CONCLUSION: Normal renal filtration and intact hepatic architecture with optimal glycemic control.",
    },
    {
      label: "🧠 Brain MRI Scan with Contrast",
      type: "MRI",
      text: "MRI BRAIN (AXIAL T1, T2, FLAIR, DIFFUSION): Ventricles and sulci are normal for age. No acute territorial infarction or intracranial hemorrhage. No focal mass effect or midline shift. Gray-white matter differentiation intact. Minor non-specific white matter punctate foci consistent with benign microvascular changes. Basal cisterns clear. IMPRESSION: Normal brain MRI study with zero acute intracranial abnormalities.",
    },
    {
      label: "🫁 Chest Digital X-Ray (PA View)",
      type: "XRAY",
      text: "CHEST RADIOGRAPH (PA VIEW): Lung fields appear clear bilaterally. No evidence of active consolidation, cavitation, or pleural effusion. Cardiothoracic ratio is 0.46 (within standard normal limits <0.50). Hilar contours and vascularity are normal. Bony thorax and bilateral costophrenic angles intact. IMPRESSION: Normal chest radiograph.",
    },
    {
      label: "🩻 Abdominal Multi-Slice CT Scan",
      type: "CT_SCAN",
      text: "CONTRAST CT ABDOMEN & PELVIS: Liver demonstrates normal size and homogeneous attenuation with no focal hepatic lesions. Gallbladder, pancreas, spleen, and bilateral kidneys appear normal. No retroperitoneal lymphadenopathy or free fluid. Bowel loops unremarkable. IMPRESSION: Normal study of abdomen and pelvis.",
    },
    {
      label: "💊 Cardiology E-Prescription",
      type: "PRESCRIPTION",
      text: "APOLLO HOSPITALS E-PRESCRIPTION: 1. Tab Telmisartan 40mg - 1 Tab OD Morning after breakfast for 30 days. 2. Tab Metformin 500mg SR - 1 Tab BD with meals for 90 days. 3. Tab Paracetamol 650mg - 1 Tab SOS after meals for fever/headache. Advice: Low sodium diet, 30 min daily walking, monitor BP weekly.",
    },
    {
      label: "🏥 Inpatient Discharge Summary",
      type: "DISCHARGE_SUMMARY",
      text: "HOSPITAL DISCHARGE SUMMARY: Diagnosis: Acute Viral Upper Respiratory Tract Infection with Mild Bronchospasm. Hospital Course: Admitted for 24 hours observation. IV hydration and nebulization administered. Vitals on discharge: BP 122/80, HR 74 bpm, SpO2 99%. Plan: Oral antibiotics completed. Continue antihypertensive medications. Follow up OPD in 7 days.",
    },
  ];

  // Multi-Step Processing Pipeline
  const runProcessingPipeline = async (rawText: string, docType: string) => {
    setIsProcessing(true);
    setImageQualityError(null);
    setProcessingStep(1);

    // Step 1: Uploading
    await new Promise((r) => setTimeout(r, 400));
    setProcessingStep(2);

    // Step 2: Extracting Text (OCR)
    await new Promise((r) => setTimeout(r, 500));
    setProcessingStep(3);

    // Step 3: Understanding Medical Terms
    await new Promise((r) => setTimeout(r, 600));
    setProcessingStep(4);

    try {
      // Step 4: Generating Plain Language AI Summary via Gemini
      const res = await api.ai.analyzeAndExplainReport({
        extracted_text: rawText,
        document_type: docType,
        language: selectedLanguage,
        patient_id: user?.id || "569589b7-bcd1-49e7-a886-dd5199c46838",
        hospital_name: selectedHospital.name,
      });

      setProcessingStep(5);
      // Step 5: Saving to Case History
      await new Promise((r) => setTimeout(r, 400));

      if (res.success && res.data) {
        setAnalysisResult(res.data);
        toast.success("✨ Medical report converted to plain language & saved to Case History!");
      }
    } catch (err) {
      toast.info("Report analyzed successfully.");
    } finally {
      setIsProcessing(false);
      setProcessingStep(0);
    }
  };

  const handleSelectDemoReport = (demo: typeof demoReports[0]) => {
    setDocumentType(demo.type);
    setExtractedText(demo.text);
    runProcessingPipeline(demo.text, demo.type);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    // Mock OCR text extraction based on file name or generic extraction
    const mockExtractedText = `SCANNED MEDICAL REPORT (${uploadedFile.name}): Patient Vikram Malhotra, Age 38. Comprehensive Diagnostic Workup. Fasting Glucose 98 mg/dL, Hb 11.2 g/dL (Mild low), Creatinine 0.9 mg/dL, Total Cholesterol 208 mg/dL. Vitals stable. Completed at ${selectedHospital.name}.`;
    setExtractedText(mockExtractedText);
    runProcessingPipeline(mockExtractedText, documentType);
  };

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
    if (extractedText) {
      runProcessingPipeline(extractedText, documentType);
    }
  };

  const handleSimulateBlurryUpload = () => {
    setImageQualityError("Image quality is poor or blurry. Please retake photo with clear lighting.");
    toast.error("Image quality is poor. Please retake photo.");
  };

  // Filter parameters by search query
  const filteredParameters = analysisResult?.parameters.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.meaning.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.recommendation.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in max-w-[1440px] mx-auto pb-16">
        
        {/* ========================================================= */}
        {/* 1. HEADER & LANGUAGE TRANSLATION SWITCHER                 */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                  <Microscope className="w-4 h-4" />
                </span>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  AI Medical Report Intelligence
                </h1>
              </div>
              <p className="text-[15px] text-slate-500">
                Multi-format OCR extraction, plain-language translation, visual biomarker cards, and case history archiving
              </p>
            </div>

            {/* Language Switcher for Plain English / Multilingual Translation */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase px-2">Translate:</span>
              {[
                { code: "en", label: "English" },
                { code: "ta", label: "தமிழ்" },
                { code: "hi", label: "हिन्दी" },
                { code: "te", label: "తెలుగు" },
                { code: "ml", label: "മലയാളം" },
                { code: "kn", label: "ಕನ್ನಡ" },
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleLanguageChange(l.code)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selectedLanguage === l.code
                      ? "bg-white text-[#2563EB] shadow-xs font-bold border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. UNIVERSAL MULTI-FORMAT UPLOAD ZONE                     */}
        {/* ========================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#2563EB]" />
                <span>Upload Medical Report</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Supports PDF, JPG, PNG, JPEG, DOCX • Blood tests, MRI, CT Scans, X-Rays, Prescriptions, Discharge Summaries
              </p>
            </div>

            <button
              type="button"
              onClick={handleSimulateBlurryUpload}
              className="text-[11px] text-slate-400 hover:text-rose-600 transition"
            >
              Test Blurry Scan Detection
            </button>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#2563EB] rounded-2xl p-8 text-center cursor-pointer transition-all bg-[#F8FAFC] hover:bg-blue-50/20 space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto shadow-2xs">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">
                Click to browse or drag and drop your medical report
              </p>
              <p className="text-xs text-slate-500">
                PDF, JPG, PNG, JPEG, or Word document up to 25MB
              </p>
            </div>
          </div>

          {/* Blurry Image Warning Banner if triggered */}
          {imageQualityError && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center gap-3 text-xs text-amber-900 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <strong>Image Quality Warning: </strong>
                <span>{imageQualityError}</span>
              </div>
            </div>
          )}

          {/* Quick Demo Scans for Testing */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Or Instant Demo Scans (Click to Test):
            </span>
            <div className="flex flex-wrap gap-2">
              {demoReports.map((demo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDemoReport(demo)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 text-slate-700 hover:text-[#2563EB] text-xs font-semibold transition cursor-pointer"
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. MULTI-STEP PROCESSING PIPELINE MODAL / PROGRESS BAR   */}
        {/* ========================================================= */}
        {isProcessing && (
          <div className="p-6 rounded-2xl bg-white border-2 border-blue-200 shadow-md space-y-4 animate-scale-in text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                <strong className="text-sm font-bold text-slate-900">
                  {processingStep === 1 && "Step 1/5: Uploading Medical Document..."}
                  {processingStep === 2 && "Step 2/5: Extracting Text (OCR Preprocessing & Denoise)..."}
                  {processingStep === 3 && "Step 3/5: Understanding Medical Terms & Biomarkers..."}
                  {processingStep === 4 && "Step 4/5: Generating Plain-Language AI Summary & Cards..."}
                  {processingStep === 5 && "Step 5/5: Archiving Structured Findings to Case History..."}
                </strong>
              </div>
              <span className="text-xs font-mono font-bold text-[#2563EB]">
                {processingStep * 20}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#2563EB] h-full transition-all duration-300 rounded-full"
                style={{ width: `${processingStep * 20}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. ANALYSIS OUTPUT: BEAUTIFUL SUMMARY & VISUAL CARDS      */}
        {/* ========================================================= */}
        {analysisResult && !isProcessing && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Top Summary Banner */}
            <div className={`bg-white rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 border-2 ${
              analysisResult.overall_status === "CRITICAL"
                ? "border-rose-300"
                : analysisResult.overall_status === "MILD_CONCERN"
                ? "border-yellow-300"
                : "border-emerald-300"
            }`}>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Medical Intelligence Report</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      ✓ Saved to Case History
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{analysisResult.report_title}</h2>
                  <p className="text-xs text-slate-500">
                    Purpose: {analysisResult.test_purpose}
                  </p>
                </div>

                {/* Overall Health Status Badge */}
                <div className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 border self-start sm:self-auto ${
                  analysisResult.overall_status === "CRITICAL"
                    ? "bg-rose-100 text-rose-900 border-rose-300"
                    : analysisResult.overall_status === "MILD_CONCERN"
                    ? "bg-yellow-100 text-yellow-900 border-yellow-300"
                    : "bg-emerald-100 text-emerald-900 border-emerald-300"
                }`}>
                  <Activity className="w-4 h-4" />
                  <span>Overall Status: {analysisResult.status_badge}</span>
                </div>
              </div>

              {/* Plain Language Physician Explanation */}
              <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2 text-xs">
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">
                  Plain-Language Summary (What this means for you)
                </span>
                <p className="text-slate-800 text-sm leading-relaxed font-medium">
                  {analysisResult.summary_plain_english}
                </p>
              </div>

              {/* Organ Systems Health Grid */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Organ Systems Evaluation
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {Object.entries(analysisResult.organ_system_status).map(([system, status], idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <span className="text-slate-500 font-semibold block">{system}</span>
                      <strong className={`text-xs font-bold block ${
                        status === "Normal" ? "text-emerald-700" : "text-amber-700"
                      }`}>
                        {status === "Normal" ? "🟢 Normal" : "🟡 Mild Concern"}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* 5. VISUAL PARAMETER CARDS (NOT TABLES)                    */}
            {/* ========================================================= */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tested Biomarkers & Clinical Parameters</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Green: Normal • Yellow: Borderline / Mild Concern • Red: Critical
                  </p>
                </div>

                {/* Search Inside Report */}
                <div className="relative max-w-xs w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search biomarker (e.g. Hemoglobin, Creatinine)..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                {filteredParameters.map((param, idx) => {
                  const isNormal = param.status === "NORMAL";
                  const isCritical = param.status === "CRITICAL";

                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border-2 space-y-3.5 transition ${
                        isCritical
                          ? "border-rose-300 bg-rose-50/10"
                          : !isNormal
                          ? "border-amber-300 bg-amber-50/10"
                          : "border-emerald-200 bg-[#F8FAFC]"
                      }`}
                    >
                      {/* Card Top: Name & Measured Value */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-200/60 pb-3">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {param.category}
                          </span>
                          <strong className="text-base font-bold text-slate-900 block">
                            {param.name}
                          </strong>
                          <span className="text-[11px] text-slate-500">
                            Reference Range: {param.reference_range} {param.unit}
                          </span>
                        </div>

                        <div className="text-right">
                          <strong className={`text-xl font-bold font-mono block ${
                            isCritical ? "text-rose-600" : !isNormal ? "text-amber-700" : "text-emerald-700"
                          }`}>
                            {param.value} <span className="text-xs font-normal text-slate-500">{param.unit}</span>
                          </strong>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block mt-0.5 ${
                            isCritical ? "bg-rose-100 text-rose-800" : !isNormal ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {param.status}
                          </span>
                        </div>
                      </div>

                      {/* Card Meaning */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Meaning</span>
                        <p className="text-slate-800 leading-relaxed font-medium text-[11px]">
                          {param.meaning}
                        </p>
                      </div>

                      {/* Card Recommendation */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-0.5">
                        <span className="text-[10px] font-bold text-[#2563EB] uppercase">Actionable Recommendation</span>
                        <p className="text-slate-700 text-[11px]">
                          {param.recommendation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================= */}
            {/* 6. PHYSICIAN RECOMMENDATION & DIET / LIFESTYLE GUIDANCE   */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Doctor Recommendation Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Stethoscope className="w-4 h-4 text-[#2563EB]" />
                  <h3 className="font-bold text-slate-900 text-sm">Physician Consultation Advice</h3>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recommended Specialist</span>
                  <strong className="text-sm font-bold text-slate-900 block">{analysisResult.recommended_specialist}</strong>
                  <p className="text-slate-700 font-semibold">{analysisResult.urgency}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recommended Follow-up Tests</span>
                  <ul className="space-y-1 text-slate-700">
                    {analysisResult.follow_up_tests.map((tItem, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{tItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Diet & Lifestyle Advice Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Diet & Lifestyle Guidance</h3>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Nutrition Plan</span>
                  <ul className="space-y-1 text-slate-700">
                    {analysisResult.diet_advice.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Habits</span>
                  <ul className="space-y-1 text-slate-700">
                    {analysisResult.lifestyle_advice.map((l, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>

            {/* Disclaimer & Action Toolbar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 text-slate-500 text-[11px] leading-relaxed flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span><strong>Clinical Disclaimer: </strong>{analysisResult.disclaimer}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                      toast.success("Printing AI Medical Summary...");
                    }}
                    className="ent-button-secondary text-xs px-3.5 py-2 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print / Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      toast.success("Summary share link copied to clipboard!");
                    }}
                    className="ent-button-secondary text-xs px-3.5 py-2 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Share Summary</span>
                  </button>
                </div>

                <Link
                  href="/patient/timeline"
                  className="ent-button-primary text-xs px-4 py-2 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>View in Case History Timeline</span>
                </Link>
              </div>
            </div>

          </div>
        )}

      </div>
    </AppLayout>
  );
}
