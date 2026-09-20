from typing import Annotated
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.core.tenant import require_tenant_id
from app.models import AuthSession, PatientCabinetMembership, User

DbSession = Annotated[Session, Depends(get_db)]
TenantId = Annotated[str, Depends(require_tenant_id)]
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise.")
    payload = decode_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide.")
    if payload.get("token_type") == "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Un jeton de rafraîchissement ne peut pas être utilisé pour accéder à cette ressource.")
    user = db.scalar(select(User).where(User.id == payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Compte introuvable ou désactivé.")
    if payload.get("auth_version") != user.auth_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expirée ou révoquée.")
    session_id = payload.get("session_id")
    session = db.scalar(select(AuthSession).where(
        AuthSession.id == session_id,
        AuthSession.user_id == user.id,
        AuthSession.revoked_at.is_(None),
        AuthSession.expires_at > datetime.now(UTC),
    )) if session_id else None
    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expirée ou révoquée.")
    token_tenant_id = payload.get("tenant_id")
    if user.tenant_id and token_tenant_id != user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant non autorisé.")
    if not user.tenant_id and token_tenant_id:
        membership = db.scalar(select(PatientCabinetMembership.id).where(
            PatientCabinetMembership.patient_id == user.patient_profile.id,
            PatientCabinetMembership.tenant_id == token_tenant_id,
            PatientCabinetMembership.status == "active",
        )) if user.patient_profile else None
        if not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rattachement cabinet non autorisé.")
    if session.tenant_id != token_tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant de session non autorisé.")
    user.active_tenant_id = token_tenant_id
    user.active_session_id = session.id
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
