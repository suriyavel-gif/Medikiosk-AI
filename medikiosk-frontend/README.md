# MediKiosk AI™ — Production Next.js 14 Frontend

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![React Query](https://img.shields.io/badge/React_Query-TanStack-FF4154.svg?logo=react-query)](https://tanstack.com/query)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-11.0-EA4C89.svg?logo=framer)](https://www.framer.com/motion/)

Production-grade medical intelligence and autonomous triage portal for **MediKiosk AI™**, fully connected with the FastAPI enterprise backend.

---

## 1. Frontend Architecture & Modules

```
medikiosk-frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout with Providers, Toaster & Navbar
│   │   ├── page.tsx                  # Interactive Multi-Role Hub & Ecosystem Landing
│   │   ├── globals.css               # Clinical theme, glassmorphism, scrollbars
│   │   ├── patient/
│   │   │   ├── login/page.tsx        # Passwordless Mobile OTP Login & Registration
│   │   │   ├── dashboard/page.tsx    # Patient Portal Hub & IoT Baseline Vitals
│   │   │   ├── intake/page.tsx       # Autonomous Kiosk AI Intake & Triage Simulator
│   │   │   ├── reports/page.tsx      # Diagnostic Report Upload & Gemini Vision OCR
│   │   │   ├── timeline/page.tsx     # Longitudinal Clinical Medical Timeline
│   │   │   ├── prescriptions/page.tsx# Electronic Prescriptions & Dosages
│   │   │   ├── reminders/page.tsx    # Medication Adherence Tracker & Reminders
│   │   │   ├── consent/page.tsx      # Sovereign Digital Consent Manager
│   │   │   ├── access-logs/page.tsx  # Doctor Access Audit Trail (SHA-256)
│   │   │   └── profile/page.tsx      # Patient Demographics & Health Profile
│   │   ├── doctor/
│   │   │   ├── login/page.tsx        # Physician Credentials Login
│   │   │   └── dashboard/page.tsx    # Priority Triage Queue & Clinical EHR Workspace
│   │   ├── reception/
│   │   │   ├── login/page.tsx        # Receptionist Desk Login
│   │   │   └── dashboard/page.tsx    # Walk-in Registration & Queue Dispatch
│   │   ├── admin/
│   │   │   ├── login/page.tsx        # Hospital Director Login
│   │   │   └── dashboard/page.tsx    # Roster Management, Fleet Telemetry & Audit Logs
│   │   └── government/
│   │       ├── login/page.tsx        # Public Health Epidemiologist Login
│   │       └── dashboard/page.tsx    # Syndromic Outbreak Heatmaps & Disease Trends
│   ├── components/
│   │   ├── Navbar.tsx                # Dynamic Header with Live Demo Account Switcher
│   │   ├── providers.tsx             # TanStack Query & AuthProvider wrapper
│   │   └── ui/
│   │       ├── TriageBadge.tsx       # Color-coded ESI 1 to 5 Clinical Badges
│   │       ├── VitalsCard.tsx        # IoT Medical Instrumentation Vitals Card
│   │       ├── LoadingSkeleton.tsx   # Healthcare Shimmer Skeletons
│   │       └── Modal.tsx             # Framer Motion Animated Modals
│   └── lib/
│       ├── api.ts                    # Axios Client with Bearer Tokens & API endpoints
│       ├── auth-context.tsx          # Session State, LocalStorage & Auto-reauth
│       └── types.ts                  # Comprehensive TypeScript DTO Interfaces
├── tailwind.config.ts                # Medical Color Palette, ESI Colors & Dark Mode
└── package.json
```

---

## 2. Quick Persona Live Demo Accounts

Every page is equipped with seamless live API authentication against the backend:

| Role | Username / Email | Password / OTP | Demo Person |
| :--- | :--- | :--- | :--- |
| **Patient** | Phone: `9876543210` | OTP: `123456` | Mr. Vikram Malhotra (MRN-2026-10001) |
| **Doctor** | `dr.sharma@medikiosk.ai` | `Doctor@123` | Dr. Rajesh Sharma, MD (DM Cardiology) |
| **Receptionist** | `reception@medikiosk.ai` | `Reception@123` | Pooja Verma (OPD Desk) |
| **Hospital Admin** | `admin@medikiosk.ai` | `Admin@123` | Dr. Harish Rao (Medical Director) |
| **Govt Admin** | `govt.health@medikiosk.ai` | `Govt@123` | Dr. S. K. Murthy (State Epidemiologist) |

---

## 3. How to Run the Frontend

```bash
# 1. Navigate to frontend directory
cd d:\medikiosk-frontend

# 2. Start the development server (runs on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
