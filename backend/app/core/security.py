from datetime import UTC, datetime, timedelta
from typing import Any

from jose import jwt
from jose import JWTError
from passlib.context import CryptContext

from app.core.config import settings

ALGORITHM = "HS256"
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return password_context.verify(plain_password, password_hash)


def create_access_token(subject: str, tenant_id: str | None, extra: dict[str, Any] | None = None) -> str:
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": subject, "exp": expires_at, "token_type": "access"}
    if tenant_id:
        payload["tenant_id"] = tenant_id
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(subject: str, tenant_id: str | None, extra: dict[str, Any] | None = None) -> str:
    expires_at = datetime.now(UTC) + timedelta(days=14)
    payload: dict[str, Any] = {"sub": subject, "exp": expires_at, "token_type": "refresh"}
    if tenant_id:
        payload["tenant_id"] = tenant_id
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
