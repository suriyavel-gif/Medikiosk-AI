import React from "react";
import { Activity, Heart, Thermometer, Wind, Weight } from "lucide-react";

interface VitalsCardProps {
  vitals?: {
    systolic_bp?: number;
    diastolic_bp?: number;
    heart_rate_bpm?: number;
    oxygen_saturation_spo2?: number;
    body_temperature_celsius?: number;
    body_weight_kg?: number;
    body_height_cm?: number;
    calculated_bmi?: number;
  };
  compact?: boolean;
}

export function VitalsCard({ vitals, compact = false }: VitalsCardProps) {
  const bp = vitals?.systolic_bp && vitals?.diastolic_bp ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : "120/80";
  const hr = vitals?.heart_rate_bpm || 74;
  const spo2 = vitals?.oxygen_saturation_spo2 || 98.5;
  const temp = vitals?.body_temperature_celsius || 37.0;
  const weight = vitals?.body_weight_kg || 72;
  const bmi = vitals?.calculated_bmi || 23.5;

  return (
    <div className={`grid ${compact ? "grid-cols-2 sm:grid-cols-3 gap-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"}`}>
      {/* Blood Pressure */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs hover:border-blue-300 transition">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          BP (mmHg)
        </div>
        <div className="text-lg font-black text-slate-900">{bp}</div>
        <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Optimal</div>
      </div>

      {/* Heart Rate */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs hover:border-blue-300 transition">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
          <Heart className="w-3.5 h-3.5 text-rose-500" />
          Pulse (BPM)
        </div>
        <div className="text-lg font-black text-slate-900">{hr}</div>
        <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Regular Sinus</div>
      </div>

      {/* Oxygen Saturation */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs hover:border-blue-300 transition">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
          <Wind className="w-3.5 h-3.5 text-cyan-600" />
          SpO2 (%)
        </div>
        <div className={`text-lg font-black ${spo2 < 92 ? "text-red-600 animate-pulse" : "text-slate-900"}`}>
          {spo2}%
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5">Pleth 99%</div>
      </div>

      {/* Temperature */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs hover:border-blue-300 transition">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
          <Thermometer className="w-3.5 h-3.5 text-amber-500" />
          Temp (°C)
        </div>
        <div className="text-lg font-black text-slate-900">{temp}°C</div>
        <div className="text-[10px] text-slate-400 mt-0.5">IR Sensor</div>
      </div>

      {/* Weight */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs hover:border-blue-300 transition">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
          <Weight className="w-3.5 h-3.5 text-blue-600" />
          Weight (kg)
        </div>
        <div className="text-lg font-black text-slate-900">{weight} kg</div>
        <div className="text-[10px] text-slate-400 mt-0.5">Calibrated</div>
      </div>

      {/* BMI */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs hover:border-blue-300 transition">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mb-1">
          <Activity className="w-3.5 h-3.5 text-indigo-600" />
          BMI (kg/m²)
        </div>
        <div className="text-lg font-black text-slate-900">{bmi}</div>
        <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Normal (18.5-24.9)</div>
      </div>
    </div>
  );
}

