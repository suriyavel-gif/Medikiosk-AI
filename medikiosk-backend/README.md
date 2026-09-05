# MediKiosk AI™ — Production Enterprise Backend

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg?logo=postgresql)](https://www.postgresql.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00.svg)](https://www.sqlalchemy.org)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-4285F4.svg?logo=google)](https://ai.google.dev/)
[![Compliance](https://img.shields.io/badge/Compliance-HIPAA%20%7C%20HL7%20FHIR%20R4%20%7C%20ABDM-blue.svg)]()

Production-grade, clean architecture backend for **MediKiosk AI™** — autonomous clinical intake, physical medical IoT triage, multilingual conversational AI, doctor workspace, electronic prescribing, granular digital consent, and tamper-evident audit logging.

---

## 1. System Architecture

The backend follows **Clean Architecture** patterns:

```
medikiosk-backend/
├── app/
│   ├── api/
│   │   ├── api_v1.py                 # API Router Aggregator
│   │   └── endpoints/
│   │       ├── auth.py               # Multi-Role & Passwordless OTP Auth
│   │       ├── patients.py           # Patient Portal & Timeline Records
│   │       ├── reception.py          # OPD Registration & Queue Dispatch
│   │       ├── doctors.py            # Clinical Queue, Diagnosis & Consultation
│   │       ├── consent.py            # Granular Consent Lifecycle & Revocation
│   │       ├── prescriptions.py      # Formulary & E-Prescription Engine
│   │       ├── reports.py            # Diagnostic Uploads, OCR & AI Summary
│   │       ├── audit.py              # Tamper-Evident SHA-256 Chained Logs
│   │       ├── analytics.py          # Public Health & Hospital Dashboards
│   │       └── kiosk.py              # Autonomous Kiosk Intake & IoT Stream
│   ├── core/
│   │   ├── config.py                 # Pydantic Settings & Environment
│   │   ├── database.py               # Engine, Connection Pool & Sessions
│   │   ├── security.py               # JWT Tokens, Passwords & Nonces
│   │   └── dependencies.py           # Auth & RBAC Dependency Injection
│   ├── models/
│   │   └── models.py                 # SQLAlchemy 2.0 ORM Models
│   ├── schemas/                      # Pydantic Validation Models
│   ├── services/                     # Business Logic & AI Orchestration
│   └── utils/
│       └── seed_data.py              # Master Formulary & Demo Hospital Seed
├── tests/
│   └── test_backend.py               # End-to-End Automated Test Suite
├── alembic/                          # Schema Migrations
├── requirements.txt                  # Production Dependencies
└── run.py                            # Server Launch Script
```

---

## 2. Default Seeded Credentials for Testing

| Role | Username / Email | Password / OTP | Description |
| :--- | :--- | :--- | :--- |
| **Patient** | Phone: `9876543210` | OTP: `123456` | Mr. Vikram Malhotra (MRN-2026-10001) |
| **Doctor (Cardiology)** | `dr.sharma@medikiosk.ai` | `Doctor@123` | Dr. Rajesh Sharma, MD (DM Cardiology) |
| **Doctor (Internal Med)** | `dr.anita@medikiosk.ai` | `Doctor@123` | Dr. Anita Desai, MD (Internal Med) |
| **Receptionist** | `reception@medikiosk.ai` | `Reception@123` | Pooja Verma (OPD Desk) |
| **Hospital Admin** | `admin@medikiosk.ai` | `Admin@123` | Dr. Harish Rao (Medical Director) |
| **Government Admin** | `govt.health@medikiosk.ai` | `Govt@123` | Dr. S. K. Murthy (State Epidemiologist) |

---

## 3. Quick Start & Execution

### 3.1 Setup Environment & Run
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run Database & Server (Auto-creates tables and seeds master data)
python run.py
```

### 3.2 Access Interactive Documentation
* **Swagger UI (Interactive API Tester):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Redoc Specification:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
* **OpenAPI 3.1 JSON:** [http://127.0.0.1:8000/api/v1/openapi.json](http://127.0.0.1:8000/api/v1/openapi.json)

### 3.3 Run Automated Test Suite
```bash
python -m pytest tests/test_backend.py -v
```

---

## 4. Complete API Directory

### 4.1 Authentication & RBAC (`/api/v1/auth`)
* `POST /auth/patient/otp/request` — Dispatch passwordless OTP to patient mobile
* `POST /auth/patient/otp/verify` — Verify OTP and issue JWT access/refresh tokens
* `POST /auth/patient/register` — Register a new patient
* `POST /auth/doctor/login` — Authenticate consulting physician
* `POST /auth/reception/login` — Authenticate front desk operator
* `POST /auth/hospital-admin/login` — Authenticate hospital super admin
* `POST /auth/government-admin/login` — Authenticate state public health admin
* `POST /auth/refresh` — Renew JWT access token
* `GET /auth/me` — Retrieve current user profile and RBAC claims

### 4.2 Patient Portal (`/api/v1/patients`)
* `GET /patients/profile` — Get patient profile
* `PUT /patients/profile` — Update patient demographics
* `POST /patients/medical-history` — Record chronic condition, allergy, or surgical history
* `GET /patients/timeline` — Longitudinal chronological clinical timeline
* `GET /patients/prescriptions` — View prescriptions and individualized dosage schedules
* `GET /patients/ai-intake-history` — View past MediKiosk AI intake sessions & SOAP notes
* `GET /patients/consent-history` — View digital consent grant and revocation history
* `GET /patients/doctor-access-logs` — Audit log of all doctor accesses to patient records

### 4.3 Reception & Queue Management (`/api/v1/reception`)
* `GET /reception/patients/search` — Search patients by Phone, MRN, National ID, or Name
* `POST /reception/visits/register` — Register today's visit and generate priority queue token
* `POST /reception/visits/assign-doctor` — Assign or reassign doctor to an active visit
* `GET /reception/queue/today` — Live OPD queue status prioritized by clinical urgency

### 4.4 Doctor Workspace & EHR (`/api/v1/doctors`)
* `GET /doctors/queue/today` — View active patient queue prioritized by ESI score
* `POST /doctors/access/request` — Request patient digital consent for record access
* `GET /doctors/patients/{patient_id}/timeline` — View patient timeline (**Auto Audit Log: `DOCTOR_VIEW_RECORD`**)
* `POST /doctors/diagnosis` — Add clinical diagnosis (**Auto Audit Log: `DOCTOR_UPDATE_RECORD`**)
* `POST /doctors/prescriptions` — Generate electronic prescription
* `POST /doctors/consultation/close` — Complete encounter & **Auto-Expire Active Consent**

### 4.5 Digital Consent Protocol (`/api/v1/consent`)
* `POST /consent/request` — Doctor submits access request
* `POST /consent/action` — Patient executes `APPROVE`, `REJECT`, or `REVOKE` (**Auto Audit Logged**)
* `GET /consent/patient/{patient_id}` — View all consent artifacts for a patient

### 4.6 Pharmacy & E-Prescriptions (`/api/v1/prescriptions`)
* `POST /prescriptions` — Create prescription with medication items and intake instructions
* `GET /prescriptions/{prescription_id}` — Get prescription details and scheduled time slots
* `GET /prescriptions/medicines/search` — Search hospital master formulary
* `POST /prescriptions/medicines` — Add drug to formulary (Hospital Admin)
* `PUT /prescriptions/schedules/{schedule_id}/adherence` — Patient logs medication intake

### 4.7 Medical Reports & OCR (`/api/v1/reports`)
* `POST /reports/upload` — Upload diagnostic lab report or radiology image (SHA-256 verified)
* `POST /reports/ocr/trigger` — Trigger Gemini Vision OCR & biological entity extraction
* `POST /reports/summary/trigger` — Trigger AI clinical summary generation
* `GET /reports/{report_id}` — View report metadata and extracted OCR entities
* `GET /reports/{report_id}/download` — Download report file (**Auto Audit Log: `DOCTOR_DOWNLOAD_REPORT`**)

### 4.8 Kiosk Autonomous Intake & Triage (`/api/v1/kiosk`)
* `POST /kiosk/intake/evaluate` — Physical Kiosk submits IoT vitals + voice transcript $\rightarrow$ executes Gemini ESI Triage $\rightarrow$ compiles structured SOAP note $\rightarrow$ assigns queue token or engages Emergency Bypass.

### 4.9 Audit & Compliance Logs (`/api/v1/audit`)
* `GET /audit/logs` — Query immutable, SHA-256 chained audit logs (Hospital Admin / Govt Admin)

### 4.10 Public Health & Hospital Analytics (`/api/v1/analytics`)
* `GET /analytics/government/syndromic` — Real-time syndromic outbreak surveillance feed
* `GET /analytics/hospital/{hospital_id}` — OPD throughput, average wait times, and kiosk fleet health
