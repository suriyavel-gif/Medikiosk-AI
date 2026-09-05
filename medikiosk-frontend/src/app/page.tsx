"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useHospital } from "@/lib/hospital-context";
import { BrandingLogo } from "@/components/BrandingLogo";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Building2,
  Phone,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  UserCheck,
  Stethoscope,
  ShieldCheck,
  Users,
  Building,
  MapPin,
  CheckCircle2,
} from "lucide-react";

type RoleType = "PATIENT" | "DOCTOR" | "RECEPTION" | "HOSPITAL_ADMIN" | "GOVERNMENT";

export default function RoleBasedLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { selectedHospital } = useHospital();

  const [role, setRole] = useState<RoleType>("PATIENT");
  const [phone, setPhone] = useState("9876543210");
  const [otp, setOtp] = useState("123456");
  const [email, setEmail] = useState("doctor@cityhospital.com");
  const [password, setPassword] = useState("doctor123");
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (newRole: RoleType) => {
    setRole(newRole);
    if (newRole === "PATIENT") {
      setPhone("9876543210");
      setOtp("123456");
    } else if (newRole === "DOCTOR") {
      setEmail("doctor@cityhospital.com");
      setPassword("doctor123");
    } else if (newRole === "RECEPTION") {
      setEmail("reception@cityhospital.com");
      setPassword("desk123");
    } else if (newRole === "HOSPITAL_ADMIN") {
      setEmail("admin@cityhospital.com");
      setPassword("admin123");
    } else if (newRole === "GOVERNMENT") {
      setEmail("gov@health.gov.in");
      setPassword("gov123");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === "PATIENT") {
        const res = await api.auth.verifyPatientOTP(phone, otp);
        if (res.success) {
          login(res.data);
          toast.success("Welcome, Vikram Malhotra!");
          router.push("/patient/dashboard");
        }
      } else if (role === "DOCTOR") {
        const res = await api.auth.doctorLogin(email, password);
        if (res.success) {
          login(res.data);
          toast.success("Welcome, Dr. Rajesh Sharma!");
          router.push("/doctor/dashboard");
        }
      } else if (role === "RECEPTION") {
        const res = await api.auth.receptionLogin(email, password);
        if (res.success) {
          login(res.data);
          toast.success("Reception Desk connected.");
          router.push("/reception/dashboard");
        }
      } else if (role === "HOSPITAL_ADMIN") {
        const res = await api.auth.hospitalAdminLogin(email, password);
        if (res.success) {
          login(res.data);
          toast.success("Hospital Administration Portal connected.");
          router.push("/admin/dashboard");
        }
      } else if (role === "GOVERNMENT") {
        const res = await api.auth.governmentAdminLogin(email, password);
        if (res.success) {
          login(res.data);
          toast.success("Public Health CDC connected.");
          router.push("/government/dashboard");
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Authentication failed. Please verify demo credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLaunch = async (targetRole: RoleType) => {
    handleRoleChange(targetRole);
    setLoading(true);
    try {
      if (targetRole === "PATIENT") {
        const res = await api.auth.verifyPatientOTP("9876543210", "123456");
        if (res.success) {
          login(res.data);
          toast.success("Welcome, Vikram Malhotra!");
          router.push("/patient/dashboard");
        }
      } else if (targetRole === "DOCTOR") {
        const res = await api.auth.doctorLogin("doctor@cityhospital.com", "doctor123");
        if (res.success) {
          login(res.data);
          toast.success("Welcome, Dr. Rajesh Sharma!");
          router.push("/doctor/dashboard");
        }
      } else if (targetRole === "RECEPTION") {
        const res = await api.auth.receptionLogin("reception@cityhospital.com", "desk123");
        if (res.success) {
          login(res.data);
          toast.success("Reception Desk connected.");
          router.push("/reception/dashboard");
        }
      } else if (targetRole === "HOSPITAL_ADMIN") {
        const res = await api.auth.hospitalAdminLogin("admin@cityhospital.com", "admin123");
        if (res.success) {
          login(res.data);
          toast.success("Hospital Administration Portal connected.");
          router.push("/admin/dashboard");
        }
      } else if (targetRole === "GOVERNMENT") {
        const res = await api.auth.governmentAdminLogin("gov@health.gov.in", "gov123");
        if (res.success) {
          login(res.data);
          toast.success("Public Health CDC connected.");
          router.push("/government/dashboard");
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 select-none">
      {/* Centered Minimal Enterprise Card */}
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-[20px] p-8 shadow-xs space-y-6 transition-all duration-200">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <BrandingLogo size="lg" />
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MediKiosk AI</h1>
          <p className="text-xs text-slate-500">Enterprise Healthcare & Case History Platform</p>
        </div>

        {/* 5-Role Selector Tabs */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-900 block">Select Access Role</label>
          <div className="grid grid-cols-5 gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => handleRoleChange("PATIENT")}
              className={`py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                role === "PATIENT" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("DOCTOR")}
              className={`py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                role === "DOCTOR" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("RECEPTION")}
              className={`py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                role === "RECEPTION" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Desk
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("HOSPITAL_ADMIN")}
              className={`py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                role === "HOSPITAL_ADMIN" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange("GOVERNMENT")}
              className={`py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                role === "GOVERNMENT" ? "bg-white text-[#2563EB] shadow-xs" : "hover:text-slate-900"
              }`}
            >
              Govt
            </button>
          </div>
        </div>

        {/* Read-Only Context Information Card (No hospital switcher on login) */}
        <div className="transition-all duration-200">
          {role === "PATIENT" && (
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>National Citizen Health Vault</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  ABDM Verified
                </span>
              </div>
              <p className="text-slate-600 text-[11px] pt-1">
                Centralized health records across all hospitals. Choose hospital when booking or taking a token.
              </p>
            </div>
          )}

          {role === "DOCTOR" && (
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Assigned Clinician Account</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Fixed
                </span>
              </div>
              <div className="pt-1 space-y-0.5 text-slate-700">
                <div>Hospital: <strong className="text-slate-900">Apollo Hospitals Chennai</strong></div>
                <div>Department: <strong className="text-slate-900">Cardiology Department</strong></div>
                <div>Doctor: <strong className="text-slate-900">Dr. Rajesh Sharma, MD</strong></div>
                <div>Designation: <strong className="text-slate-900">Consultant Cardiologist</strong></div>
              </div>
            </div>
          )}

          {role === "RECEPTION" && (
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Hospital Front Desk Terminal</span>
                </span>
                <span className="text-[10px] font-bold text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded">
                  Fixed
                </span>
              </div>
              <div className="pt-1 text-slate-700">
                <div>Hospital: <strong className="text-slate-900">Apollo Hospitals Chennai</strong></div>
                <div>Location: <strong className="text-slate-900">Main OPD Reception Desk</strong></div>
              </div>
            </div>
          )}

          {role === "HOSPITAL_ADMIN" && (
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>Hospital Organization Account</span>
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Admin
                </span>
              </div>
              <div className="pt-1 text-slate-700">
                <div>Organization: <strong className="text-slate-900">Apollo Hospitals Chennai</strong></div>
                <div>Scope: <strong className="text-slate-900">Hospital Staff, Departments & Operations</strong></div>
              </div>
            </div>
          )}

          {role === "GOVERNMENT" && (
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 text-xs animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>State Public Health Authority</span>
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  State Grid
                </span>
              </div>
              <div className="pt-1 text-slate-700">
                <div>Authority: <strong className="text-slate-900">National Health Portal CDC</strong></div>
                <div>Region: <strong className="text-slate-900">Karnataka & Tamil Nadu State Grid</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Form Inputs */}
        <form onSubmit={handleLogin} className="space-y-4">
          {role === "PATIENT" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-900">Mobile Number / ABHA ID</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="ent-input pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-900">OTP Code</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="ent-input pl-10"
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-900">
                  {role === "DOCTOR" ? "Doctor Email" : role === "RECEPTION" ? "Reception Email" : role === "HOSPITAL_ADMIN" ? "Admin Email" : "Government Officer Email"}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@organization.com"
                    className="ent-input pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-900">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="ent-input pl-10"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full ent-button-primary cursor-pointer"
          >
            <span>{loading ? "Authenticating..." : `Sign In as ${role.replace("_", " ")}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Working Demo Launchers */}
        <div className="border-t border-[#E2E8F0] pt-4 space-y-2">
          <span className="text-[11px] font-semibold uppercase text-slate-500 block text-center">
            1-Click Working Demo Credentials
          </span>
          <div className="grid grid-cols-5 gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => handleDemoLaunch("PATIENT")}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg font-semibold text-slate-900 transition flex flex-col items-center justify-center gap-1 cursor-pointer"
              title="9876543210 / 123456"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Patient</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLaunch("DOCTOR")}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg font-semibold text-slate-900 transition flex flex-col items-center justify-center gap-1 cursor-pointer"
              title="doctor@cityhospital.com / doctor123"
            >
              <Stethoscope className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Doctor</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLaunch("RECEPTION")}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg font-semibold text-slate-900 transition flex flex-col items-center justify-center gap-1 cursor-pointer"
              title="reception@cityhospital.com / desk123"
            >
              <Users className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Desk</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLaunch("HOSPITAL_ADMIN")}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg font-semibold text-slate-900 transition flex flex-col items-center justify-center gap-1 cursor-pointer"
              title="admin@cityhospital.com / admin123"
            >
              <Building className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLaunch("GOVERNMENT")}
              className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg font-semibold text-slate-900 transition flex flex-col items-center justify-center gap-1 cursor-pointer"
              title="gov@health.gov.in / gov123"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Govt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
