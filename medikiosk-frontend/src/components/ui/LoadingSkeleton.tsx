"use client";

import React from "react";

export function CardSkeleton({ className = "h-36" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-[20px] border border-[#E5E7EB] p-8 animate-pulse space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl bg-[#F1F5F9]"></div>
        <div className="w-16 h-5 rounded-full bg-[#F1F5F9]"></div>
      </div>
      <div className="space-y-2">
        <div className="w-24 h-4 rounded bg-[#F1F5F9]"></div>
        <div className="w-36 h-8 rounded-lg bg-[#E2E8F0]"></div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-8 animate-pulse space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
        <div className="w-40 h-5 rounded bg-[#E2E8F0]"></div>
        <div className="w-20 h-7 rounded-lg bg-[#F1F5F9]"></div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E2E8F0]"></div>
              <div className="space-y-1">
                <div className="w-32 h-4 rounded bg-[#E2E8F0]"></div>
                <div className="w-20 h-3 rounded bg-[#F1F5F9]"></div>
              </div>
            </div>
            <div className="w-20 h-5 rounded-full bg-[#E2E8F0]"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-[20px] border border-[#E5E7EB] p-8 animate-pulse space-y-4 h-72 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="w-40 h-5 rounded bg-[#E2E8F0]"></div>
          <div className="w-28 h-3 rounded bg-[#F1F5F9]"></div>
        </div>
        <div className="w-24 h-7 rounded-lg bg-[#F1F5F9]"></div>
      </div>
      <div className="flex items-end gap-3 h-40 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-[#F1F5F9] rounded-t-lg"
            style={{ height: `${30 + (i * 15) % 60}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
}
