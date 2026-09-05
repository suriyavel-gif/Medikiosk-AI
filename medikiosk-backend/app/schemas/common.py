from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel, ConfigDict
from datetime import datetime

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[T] = None
    error: Optional[str] = None


class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    size: int
    items: List[T]


class AuditLogEntrySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action: str
    actor_user_id: Optional[str]
    actor_role: str
    actor_name: Optional[str]
    target_table: str
    target_record_id: Optional[str]
    description: Optional[str]
    client_ip: str
    created_at: datetime
