from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from app.models.models import GenderEnum


class GovernmentSyndromicCluster(BaseModel):
    reporting_date: date
    district_code: str
    state_province: str
    syndromic_category: str
    total_cases: int
    emergency_cases: int
    age_breakdown: Dict[str, int]
    gender_breakdown: Dict[str, int]
    anomaly_detected: bool
    risk_level: str  # "NORMAL", "ELEVATED", "CRITICAL_OUTBREAK"


class HospitalDashboardMetrics(BaseModel):
    hospital_id: str
    hospital_name: str
    date: date
    total_opd_intakes: int
    triage_breakdown: Dict[str, int]
    average_wait_time_minutes: float
    average_consultation_time_minutes: float
    active_doctors_count: int
    emergency_bypasses_count: int
    kiosk_fleet_uptime_percentage: float
    department_load_distribution: List[Dict[str, Any]]


class DiseaseTrendPoint(BaseModel):
    period: str
    respiratory_ili: int
    febrile_vector_borne: int
    gastroenteritis: int
    cardiovascular: int
    diabetes_metabolic: int
    hypertension: int


class TopDiseaseItem(BaseModel):
    rank: int
    icd10_code: str
    disease_name: str
    category: str
    total_cases: int
    prevalence_pct: float
    change_from_last_month: float
    severity_ratio: float


class HospitalPerformanceItem(BaseModel):
    hospital_id: str
    hospital_name: str
    district: str
    daily_footfall: int
    bed_occupancy_pct: float
    avg_door_to_doc_minutes: float
    emergency_escalations: int
    kiosk_count: int
    performance_score: float


class DoctorSpecialtyStatistic(BaseModel):
    specialty: str
    total_physicians: int
    total_consultations_completed: int
    avg_duration_minutes: float
    prescription_compliance_pct: float
    antibiotic_prescribed_pct: float


class MedicineUsageItem(BaseModel):
    medicine_name: str
    generic_name: str
    therapeutic_class: str
    total_prescribed_units: int
    is_antibiotic: bool
    is_essential_drug: bool
    stock_status: str


class DistrictStatisticItem(BaseModel):
    district_code: str
    district_name: str
    population_millions: float
    total_cases: int
    incidence_per_100k: float
    risk_level: str
    anomaly_detected: bool
    active_kiosks: int
    avg_wait_time_minutes: float


class HeatmapGeoPoint(BaseModel):
    district_code: str
    district_name: str
    lat: float
    lng: float
    syndromic_intensity: float  # 0.0 to 1.0
    case_density: int
    outbreak_risk_score: int  # 1 to 100


class MonthlySurveillanceReport(BaseModel):
    month: str
    total_consultations: int
    top_syndrome: str
    outbreak_anomalies_resolved: int
    antimicrobial_compliance_pct: float
    report_download_url: str


class GovernmentDashboardOverviewResponse(BaseModel):
    summary_kpis: Dict[str, Any]
    disease_trends: List[DiseaseTrendPoint]
    top_diseases: List[TopDiseaseItem]
    hospital_performance: List[HospitalPerformanceItem]
    doctor_statistics: List[DoctorSpecialtyStatistic]
    average_waiting_time: Dict[str, Any]
    consultations_summary: Dict[str, Any]
    medicine_usage: List[MedicineUsageItem]
    district_statistics: List[DistrictStatisticItem]
    heatmaps_data: List[HeatmapGeoPoint]
    monthly_reports: List[MonthlySurveillanceReport]
