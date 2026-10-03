import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  APIResponse,
  CurrentUser,
  TokenResponse,
  PatientProfile,
  PatientTimeline,
  PrescriptionDetail,
  AIIntakeHistoryItem,
  ConsentDetail,
  AuditLog,
  QueueItemDetail,
  DoctorQueuePatientItem,
  MedicalReport,
  OCRResult,
  SyndromicCluster,
  HospitalMetrics,
  Medicine,
  NotificationListResponse,
  UnreadCountResponse,
  NotificationItem,
  SimulateNotificationRequest,
  GovernmentDashboardOverviewResponse,
  AIIntakeReportSaveRequest,
  AIIntakeReportSaveResponse,
  AIIntakeReportRecord,
} from "./types";



const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 90000,
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("medikiosk_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Errors & Notifications
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const errorMsg = error.response?.data?.detail || error.response?.data?.message || error.message || "An unexpected error occurred";
    
    // Skip toast on 401 token checks
    if (error.response?.status !== 401) {
      toast.error(typeof errorMsg === "string" ? errorMsg : "Request failed");
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------
// Typed API Endpoints Service
// ---------------------------------------------------------------------
export const api = {
  // Authentication
  auth: {
    requestPatientOTP: (phone: string) =>
      apiClient.post<APIResponse>("/auth/patient/otp/request", { phone }).then((r) => r.data),
    verifyPatientOTP: (phone: string, otp: string) =>
      apiClient.post<APIResponse<TokenResponse>>("/auth/patient/otp/verify", { phone, otp }).then((r) => r.data),
    registerPatient: (data: any) =>
      apiClient.post<APIResponse<TokenResponse>>("/auth/patient/register", data).then((r) => r.data),
    doctorLogin: (username_or_email: string, password: string) =>
      apiClient.post<APIResponse<TokenResponse>>("/auth/doctor/login", { username_or_email, password }).then((r) => r.data),
    receptionLogin: (username_or_email: string, password: string) =>
      apiClient.post<APIResponse<TokenResponse>>("/auth/reception/login", { username_or_email, password }).then((r) => r.data),
    hospitalAdminLogin: (username_or_email: string, password: string) =>
      apiClient.post<APIResponse<TokenResponse>>("/auth/hospital-admin/login", { username_or_email, password }).then((r) => r.data),
    governmentAdminLogin: (username_or_email: string, password: string) =>
      apiClient.post<APIResponse<TokenResponse>>("/auth/government-admin/login", { username_or_email, password }).then((r) => r.data),
    getMe: () =>
      apiClient.get<APIResponse<CurrentUser>>("/auth/me").then((r) => r.data),
  },

  // Patient APIs
  patient: {
    getProfile: () =>
      apiClient.get<APIResponse<PatientProfile>>("/patients/profile").then((r) => r.data),
    updateProfile: (data: Partial<PatientProfile>) =>
      apiClient.put<APIResponse<PatientProfile>>("/patients/profile", data).then((r) => r.data),
    getTimeline: () =>
      apiClient.get<APIResponse<PatientTimeline>>("/patients/timeline").then((r) => r.data),
    getPrescriptions: () =>
      apiClient.get<APIResponse<PrescriptionDetail[]>>("/patients/prescriptions").then((r) => r.data),
    getAIIntakeHistory: () =>
      apiClient.get<APIResponse<AIIntakeHistoryItem[]>>("/patients/ai-intake-history").then((r) => r.data),
    getConsentHistory: () =>
      apiClient.get<APIResponse<ConsentDetail[]>>("/patients/consent-history").then((r) => r.data),
    getDoctorAccessLogs: () =>
      apiClient.get<APIResponse<AuditLog[]>>("/patients/doctor-access-logs").then((r) => r.data),
    addMedicalHistory: (data: any) =>
      apiClient.post<APIResponse>("/patients/medical-history", data).then((r) => r.data),
    getMedicalHistory: () =>
      apiClient.get<APIResponse<any[]>>("/patients/medical-history").then((r) => r.data),
  },

  // Patient Appointments
  appointments: {
    getBookingOptions: () =>
      apiClient.get<APIResponse<{
        hospitals: { id: string; name: string }[];
        departments: { id: string; hospital_id: string; name: string; specialty_type: string }[];
        doctors: { id: string; hospital_id: string; department_id: string; name: string; specialty: string }[];
      }>>("/appointments/options").then((r) => r.data),
    create: (data: {
      hospital_id: string;
      department_id: string;
      doctor_id: string;
      scheduled_start_time: string;
      chief_complaint_summary?: string;
    }) => apiClient.post<APIResponse<{
      id: string;
      appointment_number: string;
      patient_id: string;
      hospital_id: string;
      department_id: string;
      doctor_id: string;
      scheduled_start_time: string;
      scheduled_end_time: string;
      status: string;
    }>>("/appointments", data).then((r) => r.data),
  },

  // Reception APIs
  reception: {
    getOptions: () =>
      apiClient.get<APIResponse<{ hospitals: { id: string; name: string }[]; departments: { id: string; hospital_id: string; name: string }[] }>>("/reception/options").then((r) => r.data),
    searchPatients: (q: string) =>
      apiClient.get<APIResponse<PatientProfile[]>>(`/reception/patients/search?q=${encodeURIComponent(q)}`).then((r) => r.data),
    registerVisit: (data: { patient_id: string; hospital_id: string; department_id: string; doctor_id?: string; chief_complaint?: string; visit_type?: string }) =>
      apiClient.post<APIResponse>("/reception/visits/register", data).then((r) => r.data),
    assignDoctor: (visit_id: string, doctor_id: string) =>
      apiClient.post<APIResponse>("/reception/visits/assign-doctor", { visit_id, doctor_id }).then((r) => r.data),
    getTodayQueue: (hospital_id?: string, department_id?: string) =>
      apiClient.get<APIResponse<{ total_waiting: number; total_in_room: number; total_completed: number; queue: QueueItemDetail[] }>>(
        `/reception/queue/today?${hospital_id ? `hospital_id=${hospital_id}` : ""}${department_id ? `&department_id=${department_id}` : ""}`
      ).then((r) => r.data),
    callQueueItem: (queue_id: string) =>
      apiClient.post<APIResponse<{ queue_id: string; visit_id: string; token_number: string; queue_status: string }>>(`/reception/queue/${queue_id}/call`).then((r) => r.data),
  },

  // Doctor Workspace APIs
  doctor: {
    getQueue: () =>
      apiClient.get<APIResponse<DoctorQueuePatientItem[]>>("/doctors/queue/today").then((r) => r.data),
    callNext: (queue_id: string) =>
      apiClient.post<APIResponse<{ queue_id: string; visit_id: string; token_number: string; queue_status: string }>>(`/reception/queue/${queue_id}/call`).then((r) => r.data),
    requestAccess: (patient_id: string, purpose?: string, expiry_hours?: number) =>
      apiClient.post<APIResponse<ConsentDetail>>("/doctors/access/request", { patient_id, purpose, expiry_hours }).then((r) => r.data),
    viewPatientTimeline: (patient_id: string) =>
      apiClient.get<APIResponse<PatientTimeline>>(`/doctors/patients/${patient_id}/timeline`).then((r) => r.data),
    addDiagnosis: (data: { visit_id: string; patient_id: string; icd10_code: string; diagnosis_name: string; diagnosis_type?: string; snomed_ct_code?: string; clinical_description?: string; is_primary?: boolean }) =>
      apiClient.post<APIResponse>("/doctors/diagnosis", data).then((r) => r.data),
    createPrescription: (data: { visit_id: string; patient_id: string; clinical_notes?: string; items: any[] }) =>
      apiClient.post<APIResponse<PrescriptionDetail>>("/doctors/prescriptions", data).then((r) => r.data),
    orderLabTests: (data: { visit_id: string; patient_id: string; lab_tests: { test_name: string; test_category?: string; clinical_indication?: string; is_urgent?: boolean }[]; clinical_notes?: string }) =>
      apiClient.post<APIResponse<any>>("/doctors/lab-orders", data).then((r) => r.data),
    closeConsultation: (visit_id: string, clinical_summary?: string, follow_up_advice?: string) =>
      apiClient.post<APIResponse>("/doctors/consultation/close", { visit_id, clinical_summary, follow_up_advice }).then((r) => r.data),
  },


  // Real-Time ABDM Consent APIs
  consent: {
    getRequests: (params?: { patient_id?: string; doctor_id?: string; status_filter?: string }) =>
      apiClient.get<{ success: boolean; count: number; requests: any[] }>("/consent/requests", { params }).then((r) => r.data),
    checkAccess: (patientId: string, doctorId?: string) =>
      apiClient.get<{ success: boolean; has_access: boolean; status: string; consent: any; message: string }>("/consent/check-access", { params: { patient_id: patientId, doctor_id: doctorId || "DOC-CARD-001" } }).then((r) => r.data),
    requestAccess: (data: { patient_id: string; patient_name?: string; reason: string; duration_text?: string; duration_minutes?: number; doctor_notes?: string; hospital_name?: string; department?: string; doctor_name?: string; doctor_id?: string }) =>
      apiClient.post<{ success: boolean; message: string; request: any }>("/consent/request", data).then((r) => r.data),
    takeAction: (requestId: string, action: "APPROVE" | "REJECT" | "REVOKE", duration_text?: string, duration_minutes?: number) =>
      apiClient.post<{ success: boolean; message: string; request: any }>("/consent/action", { request_id: requestId, action, duration_text, duration_minutes: duration_minutes ?? (duration_text ? parseInt(duration_text, 10) * (duration_text.toLowerCase().includes("hour") ? 60 : 1) : undefined) }).then((r) => r.data),
    getLedger: (patientId: string) =>
      apiClient.get<{ success: boolean; count: number; ledger: any[] }>(`/consent/ledger/${patientId}`).then((r) => r.data),
    getActivityLogs: (patientId: string) =>
      apiClient.get<{ success: boolean; count: number; logs: any[] }>(`/consent/activity-logs/${patientId}`).then((r) => r.data),
  },

  // Prescriptions & Medicines
  prescriptions: {
    searchMedicines: (q: string) =>
      apiClient.get<APIResponse<Medicine[]>>(`/prescriptions/medicines/search?q=${encodeURIComponent(q)}`).then((r) => r.data),
    logAdherence: (schedule_id: string, is_taken: boolean, notes?: string) =>
      apiClient.put<APIResponse>(`/prescriptions/schedules/${schedule_id}/adherence?is_taken=${is_taken}`, { notes }).then((r) => r.data),
  },

  // Medical Reports & OCR
  reports: {
    uploadReport: (formData: FormData) =>
      apiClient.post<APIResponse<MedicalReport>>("/reports/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data),
    triggerOCR: (medical_report_id: string) =>
      apiClient.post<APIResponse<OCRResult>>("/reports/ocr/trigger", { medical_report_id }).then((r) => r.data),
    triggerAISummary: (medical_report_id: string, focus_areas?: string[]) =>
      apiClient.post<APIResponse<{ report_id: string; ai_summary: string }>>("/reports/summary/trigger", { medical_report_id, focus_areas }).then((r) => r.data),
  },

  // Kiosk AI Intake Gateway
  kiosk: {
    evaluateIntake: (data: {
      kiosk_device_id: string;
      hospital_id: string;
      patient_id: string;
      chief_complaint_raw: string;
      spoken_language?: string;
      department_id?: string;
      vitals: {
        systolic_bp?: number;
        diastolic_bp?: number;
        heart_rate_bpm?: number;
        respiratory_rate_bpm?: number;
        oxygen_saturation_spo2?: number;
        body_temperature_celsius?: number;
        body_weight_kg?: number;
        body_height_cm?: number;
      };
    }) => apiClient.post<APIResponse>("/kiosk/intake/evaluate", data).then((r) => r.data),
  },

  // Analytics & Admin
  analytics: {
    getGovernmentOverview: () =>
      apiClient.get<APIResponse<GovernmentDashboardOverviewResponse>>("/analytics/government/overview").then((r) => r.data),
    getGovernmentSyndromic: (district_code?: string) =>
      apiClient.get<APIResponse<SyndromicCluster[]>>(`/analytics/government/syndromic${district_code ? `?district_code=${district_code}` : ""}`).then((r) => r.data),
    getHospitalMetrics: (hospital_id: string) =>
      apiClient.get<APIResponse<HospitalMetrics>>(`/analytics/hospital/${hospital_id}`).then((r) => r.data),
  },


  // Audit Logs
  audit: {
    getLogs: (params?: { action?: string; target_table?: string; page?: number; size?: number }) =>
      apiClient.get<APIResponse<AuditLog[]>>("/audit/logs", { params }).then((r) => r.data),
  },

  // Google Gemini AI Intelligence
  ai: {
    chatIntake: (data: { messages: any[]; spoken_language?: string; patient_age?: number; patient_gender?: string; vitals?: any }) =>
      apiClient.post<APIResponse<any>>("/ai/intake/chat", data).then((r) => r.data),
    synthesizeIntake: (data: { messages: any[]; vitals: any; spoken_language?: string; patient_age?: number; patient_gender?: string }) =>
      apiClient.post<APIResponse<any>>("/ai/intake/synthesize", data).then((r) => r.data),
    analyzeOCR: (data: { extracted_text: string; document_type: string; focus_areas?: string[] }) =>
      apiClient.post<APIResponse<any>>("/ai/ocr/analyze", data).then((r) => r.data),
    doctorSummarizeHistory: (patient_id: string) =>
      apiClient.post<APIResponse<any>>("/ai/doctor/copilot/summarize-history", { patient_id }).then((r) => r.data),
    patientAssistantChat: (query: string, conversation_history?: any[]) =>
      apiClient.post<APIResponse<any>>("/ai/patient/assistant/chat", { query, conversation_history }).then((r) => r.data),
    explainPrescription: (data: { prescription_id?: string; items?: any[]; clinical_notes?: string; target_language?: string }) =>
      apiClient.post<APIResponse<any>>("/ai/prescriptions/explain", data).then((r) => r.data),
    checkDrugInteractions: (data: { patient_id?: string; new_medicines: any[]; current_medicines?: string[]; known_allergies?: string[]; chronic_conditions?: string[] }) =>
      apiClient.post<APIResponse<any>>("/ai/doctor/check-drug-interactions", data).then((r) => r.data),
    routeAppointment: (data: { symptoms: string; selected_hospital?: string | null; preferred_doctor?: string | null; user_location?: string; language?: string }) =>
      apiClient.post<APIResponse<any>>("/ai/appointment/route", data).then((r) => r.data),
    getCaseSummary: (data: { patient_id: string; language?: string }) =>
      apiClient.post<APIResponse<any>>("/ai/case-summary", data).then((r) => r.data),
    saveIntakeReport: (data: AIIntakeReportSaveRequest) =>
      apiClient.post<APIResponse<AIIntakeReportSaveResponse>>("/ai/intake/save-report", data).then((r) => r.data),
    getIntakeReports: (patientId: string) =>
      apiClient.get<APIResponse<AIIntakeReportRecord[]>>(`/ai/intake/reports/${patientId}`).then((r) => r.data),
    getLatestIntakeReport: (patientId: string) =>
      apiClient.get<APIResponse<AIIntakeReportRecord | null>>(`/ai/intake/latest/${patientId}`).then((r) => r.data),
    medicationChat: (data: { query: string; medicine_name?: string; active_prescriptions?: string[]; patient_allergies?: string[]; chronic_conditions?: string[]; language?: string }) =>
      apiClient.post<APIResponse<any>>("/ai/medication/chat", data).then((r) => r.data),
    analyzeAndExplainReport: (data: { extracted_text: string; document_type: string; language?: string; patient_id?: string; medical_report_id?: string; hospital_name?: string; image_quality?: string }) =>
      apiClient.post<APIResponse<any>>("/ai/reports/analyze-and-explain", data).then((r) => r.data),
    getReportDossier: (patientId: string, query?: string) =>
      apiClient.get<any>(`/ai/reports/dossier/${patientId}`, { params: { query } }).then((r) => r.data),
  },

  // Notification Service
  notifications: {
    getNotifications: (params?: { unread_only?: boolean; page?: number; size?: number }) =>
      apiClient.get<APIResponse<NotificationListResponse>>("/notifications", { params }).then((r) => r.data),
    getUnreadCount: () =>
      apiClient.get<APIResponse<UnreadCountResponse>>("/notifications/unread-count").then((r) => r.data),
    markAsRead: (notification_id: string) =>
      apiClient.put<APIResponse<NotificationItem>>(`/notifications/${notification_id}/read`).then((r) => r.data),
    markAllRead: () =>
      apiClient.put<APIResponse<{ updated_count: number }>>("/notifications/read-all").then((r) => r.data),
dispatch: (payload: any) =>
      apiClient.post<APIResponse<NotificationItem>>("/notifications/dispatch", payload).then((r) => r.data),
    triggerSos: (payload?: any) =>
      apiClient.post<APIResponse<any>>("/notifications/sos", payload || {}).then((r) => r.data),
  },

  // Emergency SOS (Twilio SMS & Voice Call Dispatch)
  emergency: {
    triggerSOS: (data?: {
      patient_id?: string;
      hospital_id?: string;
      patient_name?: string;
      hospital_name?: string;
      location?: string;
      reason?: string;
      emergency_message?: string;
      contact_phone?: string;
      vitals?: any;
    }) =>
      apiClient
        .post<{
          success: boolean;
          sms: string;
          call: string;
          event_id: string;
          patient_name: string;
          hospital_name: string;
          timestamp: string;
          doctor_notified: boolean;
          reception_notified: boolean;
          timeline_updated: boolean;
          details?: any;
          sid?: string;
          status?: string;
          recipient?: string;
        }>("/emergency/sos", data || {})
        .then((r) => r.data),
    getActiveAlerts: () =>
      apiClient.get<{ success: boolean; count: number; alerts: any[] }>("/emergency/alerts/active").then((r) => r.data),
    acceptCase: (data: { event_id: string; doctor_name?: string; doctor_id?: string; notes?: string }) =>
      apiClient.post<{ success: boolean; message: string; accepted_by: string; accepted_at: string; response_time_seconds: number }>("/emergency/alerts/accept", data).then((r) => r.data),
    prepareER: (data: { event_id: string; staff_name?: string; room_number?: string }) =>
      apiClient.post<{ success: boolean; message: string; room_number: string }>("/emergency/alerts/prepare-er", data).then((r) => r.data),
  },

  // Hospital Master & Multi-Tenant Isolation
  hospitals: {
    list: () =>
      apiClient.get<{ success: boolean; count: number; hospitals: any[] }>("/hospitals").then((r) => r.data),
    getById: (hospital_id: string) =>
      apiClient.get<{ success: boolean; hospital: any }>(`/hospitals/${hospital_id}`).then((r) => r.data),
    updateProfile: (hospital_id: string, data: any) =>
      apiClient.put<{ success: boolean; message: string; hospital: any }>(`/hospitals/${hospital_id}`, data).then((r) => r.data),
  },

  // Real-Time Synchronization Engine (SSE / Event Bus)
  sync: {
    dispatch: (event: { type: string; role_target?: string; hospital_id?: string; payload: any }) =>
      apiClient.post<{ success: boolean; message: string; event: any }>("/sync/dispatch", event).then((r) => r.data),
    getRecent: (limit: number = 10) =>
      apiClient.get<{ success: boolean; count: number; events: any[] }>("/sync/events", { params: { limit } }).then((r) => r.data),
  },

  // Google Maps & Emergency Routing Engine
  maps: {
    getNearestHospitals: (lat: number = 13.0604, lng: number = 80.2496, emergency_only: boolean = true) =>
      apiClient.get<{ success: boolean; user_coordinates: any; count: number; hospitals: any[] }>("/maps/nearest-hospitals", {
        params: { lat, lng, emergency_only },
      }).then((r) => r.data),
    getEmergencyRoute: (target_hospital_id: string = "apollo-main", origin_lat?: number, origin_lng?: number) =>
      apiClient.get<{
        success: boolean;
        target_hospital: string;
        destination_coordinates: any;
        origin_coordinates: any;
        distance_km: number;
        estimated_arrival_minutes: number;
        traffic_level: string;
        priority_route_active: boolean;
        turn_by_turn_waypoints: any[];
      }>("/maps/emergency-route", {
        params: { target_hospital_id, origin_lat, origin_lng },
      }).then((r) => r.data),
  },
};
