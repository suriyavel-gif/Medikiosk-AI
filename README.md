# MediKiosk AI

MediKiosk AI is an AI-powered healthcare kiosk and patient dossier platform designed to support patient intake, clinical triage, appointments, medical records, and healthcare workflow management.

## Overview

The platform provides a unified interface for patients, doctors, and reception staff. It combines AI-assisted patient intake with persistent healthcare data stored in a MySQL database.

## Key Features

### AI Clinical Intake & Triage
- Conversational AI-based patient intake
- Symptom and complaint collection
- Preliminary clinical assessment
- Triage risk classification
- Persistent AI intake reports
- Patient-specific report history

### Patient Management
- Patient profile management
- Medical history
- Patient timeline
- Notifications
- Prescriptions
- Medical reports
- Consent management

### Appointment Management
- Appointment scheduling
- Doctor and department selection
- Persistent appointment records
- Appointment confirmation

### Doctor Workflow
- Doctor dashboard
- Patient queue
- Clinical information access
- Patient-related workflow support

### Reception Workflow
- Patient reception workflow
- Queue management
- Appointment-related operations

### Emergency Support
- Emergency SOS interface
- Emergency notification workflow

## Technology Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic

### Database
- MySQL / MariaDB
- phpMyAdmin for database administration

### AI
- Google Gemini API

## Project Structure

```text
Medikiosk-AI/
│
├── medikiosk-backend/
│   ├── app/
│   ├── alembic/
│   ├── requirements.txt
│   └── .env
│
├── medikiosk-frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── .gitignore
