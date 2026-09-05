"use client";

import React from "react";

interface BrandingLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
  variant?: "dark" | "light" | "color";
  tagline?: string;
}

export function BrandingLogo({
  size = "md",
  className = "",
  showText = false,
  variant = "color",
  tagline,
}: BrandingLogoProps) {
  const sizeMap = {
    sm: { icon: 24, text: "text-sm", sub: "text-[10px]" },
    md: { icon: 32, text: "text-base", sub: "text-xs" },
    lg: { icon: 44, text: "text-xl", sub: "text-xs" },
    xl: { icon: 56, text: "text-2xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Clean Minimalist Medical Cross & AI Circuit Node */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: currentSize.icon, height: currentSize.icon }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Rounded Container */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="20"
            fill="#2563EB"
          />

          {/* Clean Medical Cross in White */}
          <path
            d="M38 20C38 17.79 39.79 16 42 16H58C60.21 16 62 17.79 62 20V38H80C82.21 38 84 39.79 84 42V58C84 60.21 82.21 62 80 62H62V80C62 82.21 60.21 84 58 84H42C39.79 84 38 82.21 38 80V62H20C17.79 62 16 60.21 16 58V42C16 39.79 17.79 38 20 38H38V20Z"
            fill="#FFFFFF"
          />

          {/* Subtle AI Node Center Point */}
          <circle cx="50" cy="50" r="5" fill="#2563EB" />
          <circle cx="50" cy="50" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>

      {showText && (
        <div>
          <div
            className={`font-bold tracking-tight leading-none ${currentSize.text} ${
              variant === "light" ? "text-white" : "text-[#111827]"
            }`}
          >
            MediKiosk <span className="text-[#2563EB]">AI</span>
          </div>
          <p
            className={`font-medium mt-0.5 ${currentSize.sub} ${
              variant === "light" ? "text-slate-300" : "text-[#6B7280]"
            }`}
          >
            {tagline || "Enterprise Case History Platform"}
          </p>
        </div>
      )}
    </div>
  );
}
