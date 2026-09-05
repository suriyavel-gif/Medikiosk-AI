import uuid
import random
import string
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
from jose import jwt, JWTError
import bcrypt
from app.core.config import settings


def random_uuid_hex() -> str:
    return uuid.uuid4().hex

# Ephemeral in-memory OTP cache for simulation (phone_number -> {otp, expires_at})
_otp_store: Dict[str, Dict[str, Any]] = {}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    try:
        # Truncate to 72 bytes as required by bcrypt
        plain_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generate bcrypt hash for a plain password."""
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")



def create_access_token(subject: Union[str, Any], roles: list, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    """Generate signed JWT Access Token with role claims and unique jti."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(subject),
        "roles": roles,
        "type": "access",
        "jti": random_uuid_hex(),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra_claims:
        to_encode.update(extra_claims)
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(subject: Union[str, Any], roles: list) -> str:
    """Generate signed JWT Refresh Token with unique jti."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": str(subject),
        "roles": roles,
        "type": "refresh",
        "jti": random_uuid_hex(),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt



def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token payload."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid or expired JWT token: {str(e)}")


def generate_otp(phone: str, length: int = 6) -> str:
    """Generate and cache simulated OTP for patient login."""
    if settings.ALLOW_MASTER_OTP and settings.MASTER_OTP:
        otp = settings.MASTER_OTP
    else:
        otp = "".join(random.choices(string.digits, k=length))
    
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    _otp_store[phone] = {
        "otp": otp,
        "expires_at": expires_at,
        "attempts": 0
    }
    return otp


def verify_otp(phone: str, otp_entered: str) -> bool:
    """Validate OTP entered by patient against cache or master OTP."""
    if settings.ALLOW_MASTER_OTP and otp_entered == settings.MASTER_OTP:
        return True
        
    record = _otp_store.get(phone)
    if not record:
        return False
    
    if datetime.now(timezone.utc) > record["expires_at"]:
        del _otp_store[phone]
        return False
        
    if record["otp"] == otp_entered:
        del _otp_store[phone]
        return True
        
    record["attempts"] += 1
    if record["attempts"] >= 5:
        del _otp_store[phone]
        
    return False


def hash_token(token: str) -> str:
    """Compute SHA-256 hash of a token for secure storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
