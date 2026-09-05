import asyncio
import json
from typing import Dict, Any, List
from datetime import datetime
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter(prefix="/sync", tags=["Real-time Synchronization Engine"])

# Live broadcast event buffer
_recent_events: List[Dict[str, Any]] = [
    {
        "id": "EVT-INIT-001",
        "type": "SYSTEM_READY",
        "role_target": "ALL",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "payload": {"message": "Real-time synchronization engine operational"},
    }
]


class BroadcastEventInput(BaseModel):
    type: str  # APPOINTMENT_BOOKED | CONSENT_UPDATED | EMERGENCY_TRIGGERED | REPORT_UPLOADED | QUEUE_UPDATED
    role_target: str = "ALL"  # PATIENT | DOCTOR | RECEPTION | ADMIN | GOVERNMENT | ALL
    hospital_id: str = "apollo-main"
    payload: Dict[str, Any]


@router.post("/dispatch", response_model=Dict[str, Any])
def dispatch_sync_event(event: BroadcastEventInput):
    """
    Dispatches a real-time event that propagates across active role dashboards.
    """
    import uuid
    evt_record = {
        "id": f"EVT-{uuid.uuid4().hex[:8].upper()}",
        "type": event.type,
        "role_target": event.role_target,
        "hospital_id": event.hospital_id,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "payload": event.payload,
    }
    _recent_events.insert(0, evt_record)
    if len(_recent_events) > 50:
        _recent_events.pop()

    return {
        "success": True,
        "message": f"Event {event.type} broadcasted to {event.role_target}",
        "event": evt_record,
    }


@router.get("/events", response_model=Dict[str, Any])
def get_recent_events(limit: int = 10):
    """
    Returns recent synchronized events for polling fallback.
    """
    return {
        "success": True,
        "count": len(_recent_events[:limit]),
        "events": _recent_events[:limit],
    }


@router.get("/stream")
async def event_stream(request: Request):
    """
    Server-Sent Events (SSE) stream for instant real-time updates without polling.
    """
    async def event_generator():
        last_index = 0
        while True:
            if await request.is_disconnected():
                break

            if len(_recent_events) > last_index:
                for evt in _recent_events[last_index:]:
                    yield f"data: {json.dumps(evt)}\n\n"
                last_index = len(_recent_events)

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
