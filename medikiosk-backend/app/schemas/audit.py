from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.models import AuditActionEnum


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    hospital_id: Optional[str]
    actor_user_id: Optional[str]
    actor_role: str
    actor_name: Optional[str]
    action: AuditActionEnum
    target_table: str
    target_record_id: Optional[str]
    client_ip: str
    user_agent: Optional[str] = None
    description: Optional[str]
    previous_state_json: Optional[Dict[str, Any]]
    new_state_json: Optional[Dict[str, Any]]
    tamper_hash_chain: str
    created_at: datetime


class AuditQueryFilter(BaseModel):
    action: Optional[AuditActionEnum] = None
    actor_user_id: Optional[str] = None
    target_table: Optional[str] = None
    target_record_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    page: int = 1
    size: int = 50
