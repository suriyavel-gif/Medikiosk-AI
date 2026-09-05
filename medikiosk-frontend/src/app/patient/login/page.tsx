"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Activity, Phone, KeyRound, Sparkles, ArrowRight, ShieldCheck, UserCheck, Stethoscope, Lock, Mail } from "lucide-react";

export default function PatientLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [authMode, setAuthMode] = useState<"PATIENT_OTP" | "STAFF_CREDENTIALS">("PATIENT_OTP");
  
  // Patient OTP State
  const [phone, setPhone] = useState("9876543210");
  const [otp, setOtp] = useState("123456");
  const [otpSent, setOtpSent] = useState(false);
  
  // Staff Login State
  const [staffUsername, setStaffUsername] = useState("dr.sharma@medikiosk.ai");
  const [staffPassword, setStaffPassword] = useState("Doctor@123");
  const [staffRole, setStaffRole] = useState<"DOCTOR" | "GOVERNMENT_ADMIN">("DOCTOR");
  
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.error("Please enter a valid mobile number");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.auth.requestPatientOTP(phone);
      if (res.success) {
        toast.success(res.message);
        setOtpSent(true);
        if (res.data?.demo_otp) {
          setOtp(res.data.demo_otp);
        }
      }
    } catch (err: any) {
      toast.error("Failed to request OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.auth.verifyPatientOTP(phone, otp);
      if (res.success && res.data) {
        login(res.data);
        router.push("/patient/dashboard");
      }
    } catch (err: any) {
      toast.error("Invalid OTP code. Please try 123456.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (staffRole === "DOCTOR") {
        const res = await api.auth.doctorLogin(staffUsername, staffPassword);
        if (res.success && res.data) {
          login(res.data);
          router.push("/doctor/dashboard");
        }
      } else {
        const res = await api.auth.governmentAdminLogin(staffUsername, staffPassword);
        if (res.success && res.data) {
          login(res.data);
          router.push("/government/dashboard");
        }
      }
    } catch (err: any) {
      toast.error("Invalid credentials. Please verify your email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Instant Demo Persona Logins
  const handleQuickDemo = async (type: "PATIENT" | "DOCTOR" | "GOVT") => {
    setIsLoading(true);
    try {
      if (type === "PATIENT") {
        const res = await api.auth.verifyPatientOTP("9876543210", "123456");
        if (res.success) {
          login(res.data);
          router.push("/patient/dashboard");
        }
      } else if (type === "DOCTOR") {
        const res = await api.auth.doctorLogin("dr.sharma@medikiosk.ai", "Doctor@123");
        if (res.success) {
          login(res.data);
          router.push("/doctor/dashboard");
        }
      } else {
        const res = await api.auth.governmentAdminLogin("govt.health@medikiosk.ai", "Govt@123");
        if (res.success) {
          login(res.data);
          router.push("/government/dashboard");
        }
      }
    } catch (e) {
      toast.error("Demo login error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-md space-y-7 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-md shadow-blue-600/20">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            MediKiosk Hospital Portal
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Secure clinical gateway for patients, attending physicians, and public health officers.
          </p>
        </div>

        {/* 1-Click Demo Persona Launch Bar */}
        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-800">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Instant Demo Access (1-Click Launch)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("PATIENT")}
              className="py-2 px-2 bg-white hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs transition"
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("DOCTOR")}
              className="py-2 px-2 bg-white hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs transition"
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("GOVT")}
              className="py-2 px-2 bg-white hover:bg-blue-600 hover:text-white text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs transition"
            >
              Public CDC
            </button>
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setAuthMode("PATIENT_OTP")}
            className={`py-2.5 rounded-xl transition ${
              authMode === "PATIENT_OTP" ? "bg-white text-blue-700 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            Patient (Phone OTP)
          </button>
          <button
            type="button"
            onClick={() => setAuthMode("STAFF_CREDENTIALS")}
            className={`py-2.5 rounded-xl transition ${
              authMode === "STAFF_CREDENTIALS" ? "bg-white text-blue-700 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            Staff & Doctor Login
          </button>
        </div>

        {/* Tab 1: Patient OTP Form */}
        {authMode === "PATIENT_OTP" ? (
          !otpSent ? (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobile Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
              >
                {isLoading ? "Sending OTP..." : "Request 6-Digit OTP"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Enter 6-Digit Verification OTP sent to +91 {phone}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-lg tracking-widest font-black text-center text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
              >
                {isLoading ? "Verifying..." : "Verify & Open Patient Portal"}
                <ShieldCheck className="w-4 h-4" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-xs text-slate-500 hover:text-blue-600"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )
        ) : (
          /* Tab 2: Staff & Doctor Credentials Form */
          <form onSubmit={handleStaffLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinical Role</label>
              <select
                value={staffRole}
                onChange={(e) => {
                  const role = e.target.value as "DOCTOR" | "GOVERNMENT_ADMIN";
                  setStaffRole(role);
                  if (role === "DOCTOR") {
                    setStaffUsername("dr.sharma@medikiosk.ai");
                    setStaffPassword("Doctor@123");
                  } else {
                    setStaffUsername("govt.health@medikiosk.ai");
                    setStaffPassword("Govt@123");
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              >
                <option value="DOCTOR">Consulting Doctor (Cardiology / Internal Med)</option>
                <option value="GOVERNMENT_ADMIN">Public Health Administrator (CDC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Staff Email / Username</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2"
            >
              {isLoading ? "Signing in..." : `Sign In as ${staffRole === "DOCTOR" ? "Doctor" : "Administrator"}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

