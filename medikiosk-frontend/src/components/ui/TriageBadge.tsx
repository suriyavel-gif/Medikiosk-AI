import React from "react";
import { TriageLevel } from "@/lib/types";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface TriageBadgeProps {
  level?: TriageLevel;
  showIcon?: boolean;
}

export function TriageBadge({ level, showIcon = true }: TriageBadgeProps) {
  if (!level) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
        <Clock className="w-3.5 h-3.5" />
        Pending Triage
      </span>
    );
  }

  switch (level) {
    case "ESI_1_RESUSCITATION":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">
          {showIcon && <AlertCircle className="w-4 h-4 text-red-600 animate-spin" />}
          ESI 1 • Resuscitation (Code Red)
        </span>
      );
    case "ESI_2_EMERGENT":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />}
          {"ESI 2 • Emergent (<10m)"}
        </span>
      );

    case "ESI_3_URGENT":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          ESI 3 • Urgent
        </span>
      );
    case "ESI_4_LESS_URGENT":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          {showIcon && <Clock className="w-3.5 h-3.5 text-blue-600" />}
          ESI 4 • Less Urgent
        </span>
      );
    case "ESI_5_NON_URGENT":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          ESI 5 • Non-Urgent
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
          {level}
        </span>
      );
  }
}
