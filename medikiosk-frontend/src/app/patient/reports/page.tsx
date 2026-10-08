"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/AppLayout";

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

  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & File State



  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language || "en");

  // Multi-Step Processing Animation State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [imageQualityError, setImageQualityError] = useState<string | null>(null);

  // Current Analysis Output State
  const [analysisResult, setAnalysisResult] = useState<AIReportAnalysisResult | null>(null);

  const runProcessingPipeline = async (uploadedFile: File, docType: string) => {
    if (!user?.id) {
      toast.error("Please sign in before uploading a report.");
      return;
    }
    setIsProcessing(true);
    setImageQualityError(null);
    setProcessingStep(1);
    try {
      setProcessingStep(2);
        const formData = new FormData();
        formData.append("file", uploadedFile);
      formData.append("patient_id", user.id);
      formData.append("title", uploadedFile.name);
      formData.append("report_type", docType);
      const uploaded = await api.reports.uploadReport(formData);
      if (!uploaded.success || !uploaded.data?.id) throw new Error(uploaded.message || "Report upload failed");
      setProcessingStep(3);
      const ocr = await api.reports.triggerOCR(uploaded.data.id);
      if (!ocr.success || !ocr.data?.raw_extracted_text?.trim()) throw new Error(ocr.message || "OCR did not return report text");

      setProcessingStep(4);
      const explained = await api.ai.analyzeAndExplainReport({
        medical_report_id: uploaded.data.id,
        extracted_text: ocr.data.raw_extracted_text,
        document_type: docType,
        language: selectedLanguage,
        patient_id: user.id,
      });
      if (!explained.success || !explained.data?.saved_to_case_history) throw new Error(explained.message || "Report analysis was not saved");
      setProcessingStep(5);
      setAnalysisResult(explained.data);
      toast.success("Report uploaded, analyzed, and saved.");
    } catch (error) {
      setAnalysisResult(null);
      toast.error(error instanceof Error ? error.message : "Report processing failed.");
    } finally {
      setIsProcessing(false);
      setProcessingStep(0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    runProcessingPipeline(uploadedFile, "LAB_BIOCHEMISTRY");
  };

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report analysis</span>
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
