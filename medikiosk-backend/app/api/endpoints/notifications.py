from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user_optional
from app.schemas.common import APIResponse
from app.schemas.auth import CurrentUser
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    SimulateEventNotificationRequest,
    NotificationCreateRequest,
)
from app.services.notification_service import NotificationService


router = APIRouter()


@router.get("", response_model=APIResponse[NotificationListResponse])
def get_notifications(
    unread_only: bool = Query(False, description="Filter unread notifications only"),
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=100),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Retrieve in-app notifications for authenticated user or patient."""
    patient_id = current_user.patient_id if current_user and current_user.patient_id else None
    user_id = current_user.id if current_user and not current_user.patient_id else None
    role = current_user.role if current_user else None

    res = NotificationService.get_notifications(
        db=db,
        patient_id=patient_id,
        user_id=user_id,
        role=role,
        unread_only=unread_only,
        page=page,
        size=size,
    )
    return APIResponse(success=True, message="Notifications loaded successfully", data=res)


@router.get("/unread-count", response_model=APIResponse[UnreadCountResponse])
def get_unread_notification_count(
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Get active unread and urgent badge counts."""
    patient_id = current_user.patient_id if current_user and current_user.patient_id else None
    user_id = current_user.id if current_user and not current_user.patient_id else None

    res = NotificationService.get_unread_count(db=db, patient_id=patient_id, user_id=user_id)
    return APIResponse(success=True, message="Unread count fetched", data=res)


@router.put("/{notification_id}/read", response_model=APIResponse[NotificationResponse])
def mark_notification_read(
    notification_id: str = Path(..., description="ID of the notification to mark read"),
    db: Session = Depends(get_db),
):
    """Mark single notification as read."""
    res = NotificationService.mark_as_read(db=db, notification_id=notification_id)
    return APIResponse(success=True, message="Notification marked as read", data=res)


@router.put("/read-all", response_model=APIResponse[dict])
def mark_all_notifications_read(
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Mark all active notifications as read."""
    patient_id = current_user.patient_id if current_user and current_user.patient_id else None
    user_id = current_user.id if current_user and not current_user.patient_id else None

    count = NotificationService.mark_all_read(db=db, patient_id=patient_id, user_id=user_id)
    return APIResponse(success=True, message=f"Marked {count} notifications as read", data={"updated_count": count})


@router.post("/simulate", response_model=APIResponse[NotificationResponse], status_code=status.HTTP_201_CREATED)
def simulate_notification_event(
    req: SimulateEventNotificationRequest,
    db: Session = Depends(get_db),
):
    """Simulate and dispatch any of the 11 Patient, Doctor, or Government notification events."""
    notif = NotificationService.simulate_event(
        db=db,
        event_type=req.event_type,
        recipient_id=req.recipient_id,
        channel=req.channel,
        custom_params=req.custom_params,
    )
    return APIResponse(
        success=True,
        message=f"Event '{req.event_type}' simulated and dispatched via {req.channel.value}",
        data=NotificationResponse.model_validate(notif),
    )


@router.post("/dispatch", response_model=APIResponse[NotificationResponse], status_code=status.HTTP_201_CREATED)
def dispatch_custom_notification(
    req: NotificationCreateRequest,
    db: Session = Depends(get_db),
):
    """Dispatch custom multi-channel notification."""
    notif = NotificationService.send_notification(
        db=db,
        title=req.title,
        message=req.message,
        template_code=req.template_code,
        channel=req.channel,
        recipient_destination=req.recipient_destination,
        patient_id=req.patient_id,
        user_id=req.user_id,
        hospital_id=req.hospital_id,
        payload_json=req.payload_json,
    )
    return APIResponse(
        success=True,
        message="Notification dispatched successfully",
        data=NotificationResponse.model_validate(notif),
    )

@router.post("/sos", response_model=APIResponse[dict], status_code=status.HTTP_200_OK)
def trigger_emergency_sos_endpoint(
    db: Session = Depends(get_db),
    current_user: Optional[CurrentUser] = Depends(get_current_user_optional),
):
    """
    Trigger Patient Emergency SOS:
    Collects Location, Blood Group, Allergies, Health ID, Emergency Contacts, Recent Diagnoses,
    generates summary, and dispatches Twilio SMS, Voice call, and Email.
    """
    patient_id = current_user.patient_id if current_user and current_user.patient_id else None
    res = NotificationService.trigger_emergency_sos(db=db, patient_id=patient_id)
    return APIResponse(success=True, message="Emergency SOS dispatched across all rapid response channels", data=res)

