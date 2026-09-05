import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import AuditLog, AuditActionEnum


class AuditService:
    @staticmethod
    def _compute_hash(prev_hash: str, payload_str: str) -> str:
        """Compute tamper-evident SHA-256 chain hash."""
        return hashlib.sha256(f"{prev_hash}:{payload_str}".encode("utf-8")).hexdigest()

    @staticmethod
    def log_event(
        db: Session,
        action: AuditActionEnum,
        target_table: str,
        target_record_id: Optional[str] = None,
        actor_user_id: Optional[str] = None,
        actor_role: str = "SYSTEM",
        actor_name: Optional[str] = None,
        hospital_id: Optional[str] = None,
        client_ip: str = "127.0.0.1",
        user_agent: Optional[str] = None,
        description: Optional[str] = None,
        previous_state: Optional[Dict[str, Any]] = None,
        new_state: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Record an immutable, tamper-evident audit log entry."""
        # Find latest audit entry hash
        latest = db.query(AuditLog).order_by(AuditLog.created_at.desc()).first()
        prev_hash = latest.tamper_hash_chain if latest else "GENESIS_BLOCK_MEDIKIOSK_2026"

        payload_repr = f"{action.value}|{target_table}|{target_record_id}|{actor_user_id}|{datetime.now(timezone.utc).isoformat()}"
        tamper_hash = AuditService._compute_hash(prev_hash, payload_repr)

        audit_entry = AuditLog(
            hospital_id=hospital_id,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_name=actor_name,
            action=action,
            target_table=target_table,
            target_record_id=target_record_id,
            client_ip=client_ip,
            user_agent=user_agent,
            description=description,
            previous_state_json=previous_state,
            new_state_json=new_state,
            tamper_hash_chain=tamper_hash,
            created_at=datetime.now(timezone.utc),
        )

        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
