from app.schemas.common import APIResponse, PaginatedResponse
from app.schemas.auth import PatientOTPRequest, PatientOTPVerify, PatientRegisterRequest, StaffLoginRequest, TokenResponse, CurrentUser
from app.schemas.patient import PatientProfileResponse, PatientProfileUpdateRequest, PatientTimelineResponse, MedicalHistoryCreateRequest
from app.schemas.reception import RegisterVisitRequest, PatientSearchQuery, QueueTokenResponse, TodayQueueResponse
from app.schemas.doctor import (
    DoctorQueuePatientItem,
    AddDiagnosisRequest,
    CloseConsultationRequest,
    OrderLabTestsRequest,
    LabTestOrderResponse,
)

from app.schemas.consent import ConsentRequestCreate, ConsentActionRequest, ConsentDetailResponse
from app.schemas.prescription import PrescriptionCreateRequest, PrescriptionDetailResponse, MedicineCreateRequest
from app.schemas.medical_report import MedicalReportResponse, TriggerOCRRequest, TriggerAISummaryRequest
from app.schemas.audit import AuditLogResponse, AuditQueryFilter
from app.schemas.analytics import GovernmentSyndromicCluster, HospitalDashboardMetrics
from app.schemas.kiosk import KioskIntakeSessionRequest, KioskTriageResultResponse
from app.schemas.ai import (
    IntakeChatRequest,
    IntakeChatResponse,
    IntakeSynthesizeRequest,
    IntakeSynthesizeResponse,
    OCRAnalysisRequest,
    OCRAnalysisResponse,
    DoctorCopilotSummarizeRequest,
    DoctorCopilotSummaryResponse,
    PatientAssistantChatRequest,
    PatientAssistantChatResponse,
    PrescriptionExplainRequest,
    PrescriptionExplainResponse,
    DrugInteractionCheckRequest,
    DrugInteractionCheckResponse,
)
from app.schemas.notification import (
    NotificationCreateRequest,
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    SimulateEventNotificationRequest,
)

