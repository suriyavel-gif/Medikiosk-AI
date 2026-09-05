export type UserRole = "PATIENT" | "DOCTOR" | "RECEPTIONIST" | "HOSPITAL_ADMIN" | "GOVERNMENT_ADMIN" | "KIOSK_OPERATOR";

export type TriageLevel = "ESI_1_RESUSCITATION" | "ESI_2_EMERGENT" | "ESI_3_URGENT" | "ESI_4_LESS_URGENT" | "ESI_5_NON_URGENT";

export type QueueStatus = "WAITING" | "CALLED" | "IN_ROOM" | "COMPLETED" | "SKIPPED" | "EMERGENCY_BYPASS";

export type ConsentStatus = "PENDING" | "GRANTED" | "REJECTED" | "REVOKED" | "EXPIRED";

export type ReportType = "LAB_BIOCHEMISTRY" | "LAB_HEMATOLOGY" | "RADIOLOGY_XRAY" | "RADIOLOGY_CT" | "RADIOLOGY_MRI" | "ECG_TRACE" | "PATHOLOGY" | "PREVIOUS_PRESCRIPTION" | "DISCHARGE_SUMMARY" | "OTHER";

export interface APIResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

export interface CurrentUser {
  id: string;
  role: UserRole;
  username: string;
  email?: string;
  full_name: string;
  hospital_id?: string;
  patient_id?: string;
  doctor_id?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_minutes: number;
  user_id: string;
  role: UserRole;
  name: string;
  hospital_id?: string;
  additional_info?: Record<string, any>;
}

export interface PatientProfile {
  id: string;
  national_health_id?: string;
  hospital_mrn: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED";
  blood_group: string;
  primary_phone: string;
  secondary_phone?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_iso: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  preferred_language: string;
  is_active: boolean;
  created_at: string;
}

export interface TimelineEvent {
  event_type: "VISIT" | "DIAGNOSIS" | "PRESCRIPTION" | "REPORT";
  event_id: string;
  timestamp: string;
  title: string;
  description?: string;
  doctor_name?: string;
  hospital_name?: string;
  metadata: Record<string, any>;
}

export interface PatientTimeline {
  patient_id: string;
  patient_name: string;
  hospital_mrn: string;
  events_count: number;
  timeline: TimelineEvent[];
}

export interface PrescriptionItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name: string;
  form: string;
  strength: string;
  dosage_instruction: string;
  frequency: string;
  duration_days: number;
  total_quantity_prescribed: number;
  special_intake_conditions?: string;
}

export interface MedicineScheduleSlot {
  id: string;
  medicine_name: string;
  dosage_amount: string;
  scheduled_intake_timestamp: string;
  is_taken: boolean;
  actual_taken_timestamp?: string;
}

export interface PrescriptionDetail {
  id: string;
  prescription_number: string;
  visit_id: string;
  patient_id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_specialty: string;
  clinical_notes?: string;
  digital_signature_hash: string;
  items: PrescriptionItem[];
  intake_schedules: MedicineScheduleSlot[];
  created_at: string;
}

export interface AIIntakeHistoryItem {
  visit_id: string;
  visit_number: string;
  timestamp: string;
  chief_complaint_raw?: string;
  triage_level?: TriageLevel;
  triage_score_reasoning?: string;
  ai_soap_subjective?: string;
  ai_soap_objective?: string;
  ai_soap_assessment?: string;
  ai_soap_plan?: string;
  ai_confidence_score?: number;
}

export interface ConsentDetail {
  id: string;
  patient_id: string;
  doctor_id?: string;
  doctor_name?: string;
  visit_id?: string;
  consent_type: string;
  status: ConsentStatus;
  consent_version: string;
  granted_language: string;
  digital_signature_blob: string;
  expires_at: string;
  revoked_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  hospital_id?: string;
  actor_user_id?: string;
  actor_role: string;
  actor_name?: string;
  action: string;
  target_table: string;
  target_record_id?: string;
  client_ip: string;
  description?: string;
  tamper_hash_chain: string;
  created_at: string;
}

export interface QueueItemDetail {
  queue_id: string;
  token_number: string;
  visit_id: string;
  visit_number: string;
  patient_id: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  department_name: string;
  doctor_name?: string;
  triage_level?: TriageLevel;
  priority_order_score: number;
  queue_status: QueueStatus;
  called_at?: string;
  created_at: string;
}

export interface DoctorQueuePatientItem {
  queue_id: string;
  token_number: string;
  visit_id: string;
  visit_number: string;
  patient_id: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  hospital_mrn: string;
  chief_complaint?: string;
  triage_level?: TriageLevel;
  triage_reasoning?: string;
  priority_order_score: number;
  queue_status: QueueStatus;
  has_active_consent: boolean;
  kiosk_vitals?: Record<string, any>;
  ai_soap_summary?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  waiting_since: string;
}

export interface MedicalReport {
  id: string;
  visit_id: string;
  patient_id: string;
  report_type: ReportType;
  title: string;
  file_storage_uri: string;
  file_mime_type: string;
  file_size_bytes: number;
  ai_summary?: string;
  is_confidential: boolean;
  ocr_status?: string;
  created_at: string;
}

export interface OCRResult {
  id: string;
  medical_report_id: string;
  ocr_engine_version: string;
  status: string;
  raw_extracted_text?: string;
  confidence_score?: number;
  extracted_entities: Array<{
    entity: string;
    value: string;
    unit?: string;
    flag?: "HIGH" | "LOW" | "NORMAL";
    reference_range?: string;
    loinc?: string;
  }>;
  processing_duration_ms?: number;
  created_at: string;
}

export interface SyndromicCluster {
  reporting_date: string;
  district_code: string;
  state_province: string;
  syndromic_category: string;
  total_cases: number;
  emergency_cases: number;
  age_breakdown: Record<string, number>;
  gender_breakdown: Record<string, number>;
  anomaly_detected: boolean;
  risk_level: "NORMAL" | "ELEVATED" | "CRITICAL_OUTBREAK";
}

export interface HospitalMetrics {
  hospital_id: string;
  hospital_name: string;
  date: string;
  total_opd_intakes: number;
  triage_breakdown: Record<string, number>;
  average_wait_time_minutes: number;
  average_consultation_time_minutes: number;
  active_doctors_count: number;
  emergency_bypasses_count: number;
  kiosk_fleet_uptime_percentage: number;
  department_load_distribution: Array<{
    department_id: string;
    department_name: string;
    active_patients: number;
  }>;
}

export interface Medicine {
  id: string;
  brand_name: string;
  generic_name: string;
  form: string;
  strength: string;
  manufacturer?: string;
  is_antibiotic: boolean;
  is_narcotic_controlled: boolean;
}

// -----------------------------------------------------------------------------
// Google Gemini AI Intelligence Types
// -----------------------------------------------------------------------------
export interface IntakeChatMessage {
  role: "user" | "assistant" | "model";
  content: string;
}

export interface IntakeChatResponse {
  reply: string;
  is_complete: boolean;
  suggested_questions?: string[];
}

export interface IntakeSynthesizeResponse {
  chief_complaint: string;
  symptoms: string[];
  duration: string;
  possible_severity: "Mild" | "Moderate" | "Severe" | "Critical";
  suggested_department: string;
  triage_level: TriageLevel;
  triage_reasoning: string;
  is_emergency: boolean;
  confidence_score: number;
  medical_summary: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

export interface DetectedEntity {
  entity: string;
  value: string;
  unit?: string;
  flag?: "HIGH" | "LOW" | "NORMAL" | "CRITICAL";
  reference_range?: string;
  loinc?: string;
}

export interface OCRAnalysisResponse {
  summary: string;
  document_type: string;
  detected_diseases: string[];
  detected_medicines: Array<{ name: string; dosage?: string; frequency?: string }>;
  important_findings: DetectedEntity[];
  recommendations: string[];
  confidence_score: number;
}

export interface DoctorCopilotSummaryResponse {
  patient_id: string;
  patient_name: string;
  clinical_history_summary: string;
  active_chronic_conditions: string[];
  known_allergies: string[];
  current_active_medications: string[];
  historical_diagnoses: string[];
  recent_lab_findings_summary: string;
  clinical_red_flags: string[];
  differential_considerations: string[];
}

export interface PatientAssistantChatResponse {
  answer: string;
  referenced_topics: string[];
  suggested_followups: string[];
  disclaimer: string;
}

export interface MedicineExplanation {
  medicine_name: string;
  purpose: string;
  morning_dose: string;
  afternoon_dose: string;
  night_dose: string;
  food_instruction: string;
  precautions: string;
}

export interface PrescriptionExplainResponse {
  simple_summary: string;
  medicines: MedicineExplanation[];
  general_advice: string[];
  warning_signs: string[];
}

export interface DrugInteractionDetail {
  drug1: string;
  drug2: string;
  severity: "MAJOR" | "MODERATE" | "MINOR";
  mechanism: string;
  clinical_recommendation: string;
}

export interface AllergyRiskDetail {
  drug: string;
  allergy: string;
  risk_level: "HIGH" | "MODERATE";
  description: string;
}

export interface DrugInteractionCheckResponse {
  has_critical_interactions: boolean;
  overall_safety_status: "SAFE" | "WARNING" | "CONTRAINDICATED";
  drug_interactions: DrugInteractionDetail[];
  duplicate_therapies: string[];
  allergy_risks: AllergyRiskDetail[];
  special_warnings: string[];
  recommendation: string;
}

// ----------------------------------------------------------------------------
// Notification System Types
// ----------------------------------------------------------------------------

export type NotificationChannel =
  | "IN_APP"
  | "SMS"
  | "EMAIL"
  | "PUSH"
  | "WHATSAPP"
  | "KIOSK_AUDIO"
  | "CRASH_PAGER";

export type NotificationStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "READ";

export interface NotificationItem {
  id: string;
  patient_id?: string | null;
  user_id?: string | null;
  hospital_id: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  template_code: string;
  title: string;
  message: string;
  recipient_destination: string;
  payload_json?: Record<string, any> | null;
  retry_count: number;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  total_count: number;
  unread_count: number;
  notifications: NotificationItem[];
}

export interface UnreadCountResponse {
  unread_count: number;
  urgent_count: number;
}

export interface SimulateNotificationRequest {
  event_type: string;
  recipient_id?: string;
  channel?: NotificationChannel;
  custom_params?: Record<string, any>;
}

// ----------------------------------------------------------------------------
// Government Surveillance & Anonymized Public Health Types
// ----------------------------------------------------------------------------

export interface DiseaseTrendPoint {
  period: string;
  respiratory_ili: number;
  febrile_vector_borne: number;
  gastroenteritis: number;
  cardiovascular: number;
  diabetes_metabolic: number;
  hypertension: number;
}

export interface TopDiseaseItem {
  rank: number;
  icd10_code: string;
  disease_name: string;
  category: string;
  total_cases: number;
  prevalence_pct: number;
  change_from_last_month: number;
  severity_ratio: number;
}

export interface HospitalPerformanceItem {
  hospital_id: string;
  hospital_name: string;
  district: string;
  daily_footfall: number;
  bed_occupancy_pct: number;
  avg_door_to_doc_minutes: number;
  emergency_escalations: number;
  kiosk_count: number;
  performance_score: number;
}

export interface DoctorSpecialtyStatistic {
  specialty: string;
  total_physicians: number;
  total_consultations_completed: number;
  avg_duration_minutes: number;
  prescription_compliance_pct: number;
  antibiotic_prescribed_pct: number;
}

export interface MedicineUsageItem {
  medicine_name: string;
  generic_name: string;
  therapeutic_class: string;
  total_prescribed_units: number;
  is_antibiotic: boolean;
  is_essential_drug: boolean;
  stock_status: string;
}

export interface DistrictStatisticItem {
  district_code: string;
  district_name: string;
  population_millions: number;
  total_cases: number;
  incidence_per_100k: number;
  risk_level: string;
  anomaly_detected: boolean;
  active_kiosks: number;
  avg_wait_time_minutes: number;
}

export interface HeatmapGeoPoint {
  district_code: string;
  district_name: string;
  lat: number;
  lng: number;
  syndromic_intensity: number;
  case_density: number;
  outbreak_risk_score: number;
}

export interface MonthlySurveillanceReport {
  month: string;
  total_consultations: number;
  top_syndrome: string;
  outbreak_anomalies_resolved: number;
  antimicrobial_compliance_pct: number;
  report_download_url: string;
}

export interface GovernmentDashboardOverviewResponse {
  summary_kpis: Record<string, any>;
  disease_trends: DiseaseTrendPoint[];
  top_diseases: TopDiseaseItem[];
  hospital_performance: HospitalPerformanceItem[];
  doctor_statistics: DoctorSpecialtyStatistic[];
  average_waiting_time: Record<string, any>;
  consultations_summary: Record<string, any>;
  medicine_usage: MedicineUsageItem[];
  district_statistics: DistrictStatisticItem[];
  heatmaps_data: HeatmapGeoPoint[];
  monthly_reports: MonthlySurveillanceReport[];
}



