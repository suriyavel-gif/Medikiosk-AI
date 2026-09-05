"use client";

import React, { useState, useEffect } from "react";
import { BrandingLogo } from "./BrandingLogo";

interface SplashScreenProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export function SplashScreen({ onComplete, forceShow = false }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState("Initializing clinical services...");

  useEffect(() => {
    if (!forceShow && typeof window !== "undefined") {
      const shown = sessionStorage.getItem("medikiosk_splash_shown");
      if (shown) {
        setVisible(false);
        onComplete?.();
        return;
      }
    }

    const t1 = setTimeout(() => {
      setProgress(50);
      setStatusText("Connecting verified health network...");
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(85);
      setStatusText("Loading patient case history vault...");
    }, 1000);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText("Ready");
    }, 1500);

    const t4 = setTimeout(() => {
      setVisible(false);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("medikiosk_splash_shown", "true");
      }
      onComplete?.();
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [forceShow]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-[#111827] select-none transition-opacity duration-300">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-6">
        {/* Clean Logo */}
        <div className="relative">
          <BrandingLogo size="xl" />
        </div>

        {/* Text Hierarchy */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
            MediKiosk <span className="text-[#2563EB]">AI</span>
          </h1>
          <p className="text-xs font-medium text-[#6B7280]">
            Enterprise Patient Case History Platform
          </p>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-56 space-y-2 pt-2">
          <div className="w-full h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-[11px] font-medium text-[#9CA3AF] transition-all">
            {statusText}
          </p>
        </div>
      </div>
    </div>
  );
}
