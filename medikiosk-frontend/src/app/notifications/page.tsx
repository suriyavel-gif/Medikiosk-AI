"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { NotificationItem, NotificationChannel } from "@/lib/types";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Sparkles,
  Clock,
  Send,
  RefreshCw,
  Filter,
  Check,
  Zap,
  User,
  Stethoscope,
  Building,
  Smartphone,
} from "lucide-react";

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);

  // Filters
  const [stakeholderFilter, setStakeholderFilter] = useState<"ALL" | "PATIENT" | "DOCTOR" | "GOVT">("ALL");
  const [channelFilter, setChannelFilter] = useState<"ALL" | "IN_APP" | "SMS" | "EMAIL">("ALL");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Simulator Form State
  const [simChannel, setSimChannel] = useState<NotificationChannel>("IN_APP");
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [listRes, countRes] = await Promise.all([
        api.notifications.getNotifications({ unread_only: unreadOnly, size: 50 }),
        api.notifications.getUnreadCount(),
      ]);

      if (listRes.success && listRes.data) {
        setNotifications(listRes.data.notifications);
      }
      if (countRes.success && countRes.data) {
        setUnreadCount(countRes.data.unread_count);
        setUrgentCount(countRes.data.urgent_count);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "READ", read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      toast.success("Notification marked as read");
    } catch (err) {
      toast.error("Failed to update notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.notifications.markAllRead();
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, status: "READ", read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
        setUrgentCount(0);
        toast.success(`Marked ${res.data.updated_count} notifications as read`);
      }
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleSimulate = async (eventType: string, customParams?: any) => {
    try {
      setIsSimulating(true);
      const res = await api.notifications.simulateEvent({
        event_type: eventType,
        channel: simChannel,
        custom_params: customParams,
      });

      if (res.success && res.data) {
        toast.success(`Triggered: ${res.data.title} (${simChannel})`);
        fetchNotifications();
      }
    } catch (err) {
      toast.error("Failed to simulate notification event");
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered Items
  const filteredNotifications = notifications.filter((n) => {
    if (channelFilter !== "ALL" && n.channel !== channelFilter) return false;
    if (stakeholderFilter === "PATIENT" && !n.template_code.startsWith("PATIENT_")) return false;
    if (stakeholderFilter === "DOCTOR" && !n.template_code.startsWith("DOCTOR_")) return false;
    if (stakeholderFilter === "GOVT" && !n.template_code.startsWith("GOVT_") && !n.template_code.startsWith("SYSTEM_")) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300/40">
              MULTI-CHANNEL NOTIFICATION ENGINE
            </span>
            <span className="text-xs text-slate-500 font-medium">In-App • SMS • Transactional Email</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Notification Center & Alert Dispatcher
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Real-time event notifications for patients, physicians, and health administrators with telecom DLT SMS and SMTP email delivery simulation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNotifications}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-500/20 transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark All as Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Notification Feed */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Stakeholder Tabs */}
              <div className="flex flex-wrap gap-1">
                {[
                  { key: "ALL", label: "All Alerts" },
                  { key: "PATIENT", label: "Patient" },
                  { key: "DOCTOR", label: "Doctor" },
                  { key: "GOVT", label: "Govt / System" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setStakeholderFilter(t.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      stakeholderFilter === t.key
                        ? "bg-teal-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Unread Toggle */}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600"
                />
                <span>Unread Only</span>
              </label>
            </div>

            {/* Channel Filters */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
              <span className="text-slate-400 font-semibold text-[11px]">Channel:</span>
              {[
                { key: "ALL", label: "All Channels" },
                { key: "IN_APP", label: "In-App", icon: Bell },
                { key: "SMS", label: "SMS", icon: MessageSquare },
                { key: "EMAIL", label: "Email", icon: Mail },
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => setChannelFilter(c.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                    channelFilter === c.key
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed List */}
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Notifications</h3>
                <p className="text-xs mt-1">Use the simulator panel on the right to trigger clinical & administrative test alerts.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isUnread = item.status !== "READ";
                const isUrgent =
                  item.title.includes("CRITICAL") ||
                  item.title.includes("EMERGENCY") ||
                  item.title.includes("ABNORMAL") ||
                  item.title.includes("SPIKE");

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition text-left space-y-2 ${
                      isUnread
                        ? isUrgent
                          ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                          : "bg-teal-50/40 dark:bg-teal-950/20 border-teal-300 dark:border-teal-800"
                        : "bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            item.channel === "SMS"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : item.channel === "EMAIL"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                          }`}
                        >
                          {item.channel === "SMS" ? (
                            <MessageSquare className="w-3.5 h-3.5" />
                          ) : item.channel === "EMAIL" ? (
                            <Mail className="w-3.5 h-3.5" />
                          ) : (
                            <Bell className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[10px] uppercase">{item.channel}</span>
                        </span>

                        <h3 className="text-xs font-black text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isUnread && (
                          <button
                            onClick={() => handleMarkAsRead(item.id)}
                            title="Mark as Read"
                            className="p-1 text-slate-400 hover:text-teal-600 rounded-md hover:bg-teal-100 dark:hover:bg-teal-950 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Delivery Details Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400 font-mono">
                      <span>Dest: {item.recipient_destination}</span>
                      {item.payload_json?.message_id && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ✓ {item.payload_json.message_id} ({item.payload_json.status})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Live Event Simulator Console */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Interactive Event Simulator
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Test real-time event triggers across channels</p>
              </div>

              {/* Target Channel Selector */}
              <select
                value={simChannel}
                onChange={(e) => setSimChannel(e.target.value as any)}
                className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="IN_APP">🔔 In-App</option>
                <option value="SMS">📱 SMS (DLT)</option>
                <option value="EMAIL">✉️ Email (SMTP)</option>
              </select>
            </div>

            {/* Category 1: Patient Events */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Patient Event Triggers
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <button
                  onClick={() => handleSimulate("PATIENT_CONSENT_REQUEST")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>🔒 Consent Request</span>
                  <span className="text-[10px] text-slate-400 font-normal">Doctor requests EHR access</span>
                </button>
                <button
                  onClick={() => handleSimulate("PATIENT_PRESCRIPTION_READY")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>💊 Prescription Ready</span>
                  <span className="text-[10px] text-slate-400 font-normal">E-Prescription & Schedules</span>
                </button>
                <button
                  onClick={() => handleSimulate("PATIENT_MEDICINE_REMINDER")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>⏰ Medicine Reminder</span>
                  <span className="text-[10px] text-slate-400 font-normal">Scheduled dose prompt</span>
                </button>
                <button
                  onClick={() => handleSimulate("PATIENT_APPOINTMENT_REMINDER")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>📅 Appointment Reminder</span>
                  <span className="text-[10px] text-slate-400 font-normal">Follow-up schedule alert</span>
                </button>
                <button
                  onClick={() => handleSimulate("PATIENT_REPORT_UPLOADED")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-900 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>📄 Report Uploaded</span>
                  <span className="text-[10px] text-slate-400 font-normal">OCR & Gemini analysis ready</span>
                </button>
              </div>
            </div>

            {/* Category 2: Doctor Events */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-[10px] uppercase font-black tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5" /> Doctor Event Triggers
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <button
                  onClick={() => handleSimulate("DOCTOR_NEW_QUEUE")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>🚨 New Triage Patient</span>
                  <span className="text-[10px] text-slate-400 font-normal">ESI 1-2 urgency queue alert</span>
                </button>
                <button
                  onClick={() => handleSimulate("DOCTOR_CONSENT_APPROVED")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>✅ Consent Approved</span>
                  <span className="text-[10px] text-slate-400 font-normal">Patient granted access</span>
                </button>
                <button
                  onClick={() => handleSimulate("DOCTOR_LAB_RESULTS_READY")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>🔬 Lab Results Ready</span>
                  <span className="text-[10px] text-slate-400 font-normal">Biomarker scan finalized</span>
                </button>
              </div>
            </div>

            {/* Category 3: Government & Public Health Events */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-[10px] uppercase font-black tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <Building className="w-3.5 h-3.5" /> Government & System Alerts
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <button
                  onClick={() => handleSimulate("GOVT_HOSPITAL_ALERT")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>🏥 Hospital Bed/Triage Alert</span>
                  <span className="text-[10px] text-slate-400 font-normal">Capacity surge & saturation</span>
                </button>
                <button
                  onClick={() => handleSimulate("GOVT_DISEASE_SPIKE")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>🚨 Disease Spike Outbreak</span>
                  <span className="text-[10px] text-slate-400 font-normal">Syndromic cluster warning</span>
                </button>
                <button
                  onClick={() => handleSimulate("SYSTEM_ALERT")}
                  disabled={isSimulating}
                  className="p-2.5 text-left rounded-xl bg-slate-50 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200 transition flex items-center justify-between"
                >
                  <span>🛡️ System Security Alert</span>
                  <span className="text-[10px] text-slate-400 font-normal">SHA-256 integrity check</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
);
}
