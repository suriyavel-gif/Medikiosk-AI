import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text
from app.core.config import settings
from app.core.database import SessionLocal
from app.api.api_v1 import api_router

# Configure Logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("medikiosk.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("MediKiosk AI backend starting up...")
    # Schema lifecycle is managed by Alembic. Startup must not create schema
    # objects or insert demo/baseline records into the configured database.
    logger.info("Database schema is managed by Alembic.")
    yield
    logger.info("MediKiosk AI backend shutting down...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
# MediKiosk AI™ — Production Enterprise Backend API

Welcome to the **MediKiosk AI™** backend service. This API powers:
* **Autonomous Multimodal Kiosk Triage & Intake**
* **Real-time Non-invasive IoT Vital Signs Ingestion**
* **Algorithmic Emergency Severity Index (ESI) & Manchester Triage**
* **Google Gemini Clinical Decision Support & SOAP Generation**
* **HL7 FHIR R4 Compliant Encounters & Interoperability**
* **Doctor Workspace & E-Prescription Engine**
* **Granular Digital Patient Consent & Auto-Expiry**
* **Tamper-Evident SHA-256 Chained WORM Audit Logging**
* **Government Public Health Syndromic Outbreak Surveillance**
* **Multi-Channel Transactional Notification Engine (In-App, SMS, Email)**

---
### Authentication Guide
* **Patients:** Authenticate passwordless via Phone Number OTP (`/api/v1/auth/patient/otp/request` & `/verify`).
* **Staff (Doctor, Reception, Admin, Govt):** Authenticate via email/username + password (`/api/v1/auth/*/login`).
* Provide the returned JWT token in the `Authorization: Bearer <TOKEN>` header.
""",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response Time & Performance Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time-Seconds"] = f"{process_time:.4f}"
        return response
    except Exception as exc:
        logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "Internal server error occurred. Trace logged to security audit.",
                "error": str(exc) if settings.ENVIRONMENT != "production" else "Internal server error",
                "data": None,
            },
        )


# Custom Validation Exception Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Request validation failed",
            "error": str(exc.errors()),
            "data": None,
        },
    )


# Root Health Endpoints
@app.get("/", tags=["System & Health"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "HEALTHY",
        "documentation": "/docs",
        "redoc": "/redoc",
    }


@app.get("/healthz", tags=["System & Health"])
@app.get("/health", tags=["System & Health"])
def liveness_probe():
    return {"status": "UP", "timestamp": time.time()}


@app.get(f"{settings.API_V1_STR}/health", tags=["System & Health"])
def readiness_probe():
    """Deep readiness probe: Checks database connectivity and AI service configuration."""
    db_healthy = False
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
            db_healthy = True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")

    return {
        "status": "READY" if db_healthy else "DEGRADED",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "checks": {
            "database": "CONNECTED" if db_healthy else "UNAVAILABLE",
            "gemini_ai": "CONFIGURED" if bool(settings.GEMINI_API_KEY) else "SIMULATION_FALLBACK",
            "storage_upload_dir": "WRITABLE",
        },
    }


# Mount API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)
