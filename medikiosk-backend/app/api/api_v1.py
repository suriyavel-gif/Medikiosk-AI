from fastapi import APIRouter
from app.api.endpoints import (
    auth,
    patients,
    reception,
    doctors,
    consent,
    prescriptions,
    reports,
    audit,
    analytics,
    kiosk,
    ai,
    notifications,
    emergency,
    hospitals,
    sync,
    maps,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(reception.router)
api_router.include_router(doctors.router)
api_router.include_router(consent.router)
api_router.include_router(prescriptions.router)
api_router.include_router(reports.router)
api_router.include_router(audit.router)
api_router.include_router(analytics.router)
api_router.include_router(kiosk.router)
api_router.include_router(emergency.router)
api_router.include_router(hospitals.router)
api_router.include_router(sync.router)
api_router.include_router(maps.router)
api_router.include_router(ai.router, prefix="/ai", tags=["Google Gemini AI"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notification Service"])
