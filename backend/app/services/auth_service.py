from datetime import UTC, date, datetime, time, timedelta
import hashlib
import secrets

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models import Appointment, AuditLog, AuthSession, CNSSCase, Fee, PatientCabinetMembership, PatientInvitation, PatientProfile, Payment, Role, StaffInvitation, StaffPermission, Tenant, User, Visit
from app.schemas.auth import (
    AuthUser,
    AuthMeResponse,
    DashboardStats,
    DoctorDashboardResponse,
    LatestPatient,
    LoginRequest,
    LoginResponse,
    PatientRegisterRequest,
    PatientRegisterResponse,
    PatientActivationInfo,
    PatientActivationRequest,
    StaffActivationInfo,
    StaffActivationRequest,
    StaffDashboardResponse,
    StaffRecentPayment,
    TenantSummary,
    UpcomingAppointment,
)
from app.services.provisioning_service import ROLE_DEFINITIONS, _password_is_strong
from app.core.config import settings
from app.services.email_service import send_patient_activation_email

ROLE_REDIRECTS = {
    "MEDECIN_ADMIN": "/doctor/dashboard",
    "SECRETAIRE": "/staff/dashboard",
    "PATIENT": "/patient/dashboard",
    "SUPER_ADMIN_IRMA": "/super-admin/dashboard",
}

PUBLIC_ROLE_CODES = {
    "doctor_admin": "MEDECIN_ADMIN",
    "secretary": "SECRETAIRE",
    "patient": "PATIENT",
    "platform_super_admin": "SUPER_ADMIN_IRMA",
    "SUPER_ADMIN": "SUPER_ADMIN_IRMA",
}

INTERNAL_MEDECIN_ROLES = {"doctor_admin", "MEDECIN_ADMIN"}


def _normalize_slug(value: str) -> str:
    return value.strip().lower()


def _tenant_read_only_notice(tenant: Tenant | None) -> tuple[bool, str | None]:
    if not tenant:
        return False, None
    if tenant.status in {"expired", "suspended"}:
        return True, "Votre essai gratuit est expiré. Veuillez activer votre abonnement pour continuer."
    if tenant.status == "trial" and tenant.trial_ends_at < datetime.now(UTC):
        return True, "Votre essai gratuit est expiré. Veuillez activer votre abonnement pour continuer."
    return False, None


def _public_role(role_code: str | None) -> str | None:
    if not role_code:
        return None
    return PUBLIC_ROLE_CODES.get(role_code, role_code)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def authenticate_user(
    db: Session,
    payload: LoginRequest,
    *,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> LoginResponse:
    user = db.scalar(select(User).where(func.lower(User.email) == str(payload.email).lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect.")

    if not user.is_active:
        detail = "Veuillez d’abord activer votre compte avec le lien reçu par email." if user.account_status == "pending_activation" else "Ce compte est désactivé."
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    role_code = user.roles[0].code if user.roles else None
    public_role = _public_role(role_code)
    requested_role = "SUPER_ADMIN_IRMA" if payload.role == "SUPER_ADMIN" else (payload.role or public_role)
    if public_role != requested_role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce compte ne correspond pas à l’espace sélectionné.")

    tenant = user.tenant
    selected_tenant_id = user.tenant_id
    if requested_role == "PATIENT":
        if not user.patient_profile:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Aucun profil patient n’est associé à ce compte.")
        memberships = list(db.scalars(select(PatientCabinetMembership).where(
            PatientCabinetMembership.patient_id == user.patient_profile.id,
            PatientCabinetMembership.status == "active",
        ).order_by(PatientCabinetMembership.created_at.desc())).all())
        if payload.cabinet_code:
            selected_tenant = db.scalar(select(Tenant).where(Tenant.slug == _normalize_slug(payload.cabinet_code)))
            selected = next((item for item in memberships if selected_tenant and item.tenant_id == selected_tenant.id), None)
            if not selected:
                raise HTTPException(status_code=403, detail="Ce compte patient n’est pas rattaché à ce cabinet.")
        else:
            selected = memberships[0] if memberships else None
        if not selected:
            raise HTTPException(status_code=403, detail="Ce compte patient n’est rattaché à aucun cabinet actif.")
        selected_tenant_id = selected.tenant_id
        tenant = db.get(Tenant, selected_tenant_id)
    if requested_role == "SUPER_ADMIN_IRMA":
        if tenant is not None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce compte n’est pas un administrateur de la plateforme.")
    elif requested_role in {"MEDECIN_ADMIN", "SECRETAIRE"}:
        if not tenant:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce compte n’est rattaché à aucun cabinet.")
    elif not tenant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce compte patient n’est rattaché à aucun cabinet.")

    if requested_role == "PATIENT" and (not user.patient_profile or user.patient_profile.status != "active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Votre compte patient est en attente de validation par le cabinet.")
    if requested_role == "PATIENT" and tenant and tenant.settings and not tenant.settings.patient_portal_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="L’espace patient est désactivé pour ce cabinet.")

    read_only, _ = _tenant_read_only_notice(tenant)
    if requested_role == "PATIENT" and read_only:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="L’espace patient est temporairement indisponible. Veuillez contacter votre cabinet médical.")

    session = AuthSession(
        user_id=user.id,
        tenant_id=selected_tenant_id,
        expires_at=datetime.now(UTC) + timedelta(days=14),
        device_name=(payload.device_name or "").strip() or None,
        user_agent=(user_agent or "")[:500] or None,
        ip_address=(ip_address or "")[:64] or None,
    )
    db.add(session)
    db.flush()
    token_extra = {"role": public_role, "auth_version": user.auth_version, "session_id": session.id}
    token = create_access_token(subject=user.id, tenant_id=selected_tenant_id, extra=token_extra)
    refresh_token = create_refresh_token(subject=user.id, tenant_id=selected_tenant_id, extra={**token_extra, "refresh_version": session.refresh_version})
    session.refresh_token_hash = _token_hash(refresh_token)
    db.commit()
    return LoginResponse(
        access_token=token,
        refresh_token=refresh_token,
        tenant_id=selected_tenant_id,
        user_id=user.id,
        full_name=f"{user.first_name} {user.last_name}",
        role=public_role,
        tenant_status=tenant.status if tenant else None,
        redirect_to=ROLE_REDIRECTS.get(public_role or "", "/login"),
    )


def refresh_session(db: Session, refresh_token: str) -> LoginResponse:
    from app.core.security import decode_token

    payload = decode_token(refresh_token)
    if not payload or payload.get("token_type") != "refresh" or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jeton de renouvellement invalide.")
    user = db.scalar(select(User).where(User.id == payload["sub"]))
    session_id = payload.get("session_id")
    session = db.scalar(select(AuthSession).where(
        AuthSession.id == session_id,
        AuthSession.user_id == payload["sub"],
        AuthSession.revoked_at.is_(None),
        AuthSession.expires_at > datetime.now(UTC),
    ).with_for_update()) if session_id else None
    if (
        not user
        or not user.is_active
        or payload.get("auth_version") != user.auth_version
        or not session
        or payload.get("refresh_version") != session.refresh_version
        or (session.refresh_token_hash is not None and session.refresh_token_hash != _token_hash(refresh_token))
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expirée ou révoquée.")
    public_role = _public_role(user.roles[0].code if user.roles else None)
    token_tenant_id = payload.get("tenant_id")
    if public_role == "PATIENT":
        membership = db.scalar(select(PatientCabinetMembership).where(
            PatientCabinetMembership.patient_id == user.patient_profile.id,
            PatientCabinetMembership.tenant_id == token_tenant_id,
            PatientCabinetMembership.status == "active",
        )) if user.patient_profile else None
        if not membership:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Rattachement cabinet non autorisé.")
    elif user.tenant_id != token_tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant non autorisé.")
    if not public_role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Aucun rôle actif pour ce compte.")
    tenant = db.get(Tenant, token_tenant_id) if token_tenant_id else user.tenant
    if public_role == "PATIENT":
        if not user.patient_profile or user.patient_profile.status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Votre compte patient n’est pas actif.")
        if not tenant or (tenant.settings and not tenant.settings.patient_portal_enabled) or _tenant_read_only_notice(tenant)[0]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="L’espace patient est temporairement indisponible.")
    if session.tenant_id != token_tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant de session non autorisé.")
    session.refresh_version += 1
    session.last_used_at = datetime.now(UTC)
    extra = {"role": public_role, "auth_version": user.auth_version, "session_id": session.id}
    next_refresh_token = create_refresh_token(user.id, token_tenant_id, {**extra, "refresh_version": session.refresh_version})
    session.refresh_token_hash = _token_hash(next_refresh_token)
    db.commit()
    return LoginResponse(
        access_token=create_access_token(user.id, token_tenant_id, extra),
        refresh_token=next_refresh_token,
        tenant_id=token_tenant_id,
        user_id=user.id,
        full_name=f"{user.first_name} {user.last_name}",
        role=public_role,
        tenant_status=tenant.status if tenant else None,
        redirect_to=ROLE_REDIRECTS.get(public_role, "/login"),
    )


def revoke_session(db: Session, user: User) -> None:
    session_id = getattr(user, "active_session_id", None)
    if not session_id:
        return
    session = db.scalar(select(AuthSession).where(AuthSession.id == session_id, AuthSession.user_id == user.id))
    if session and session.revoked_at is None:
        session.revoked_at = datetime.now(UTC)
    db.commit()


def revoke_all_sessions(db: Session, user: User) -> None:
    """Revoke every device/browser session owned by the current user."""
    now = datetime.now(UTC)
    db.query(AuthSession).filter(
        AuthSession.user_id == user.id,
        AuthSession.revoked_at.is_(None),
    ).update({AuthSession.revoked_at: now}, synchronize_session=False)
    db.commit()


def register_patient(db: Session, payload: PatientRegisterRequest) -> PatientRegisterResponse:
    if not payload.accept_terms or not payload.accept_privacy:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vous devez accepter les conditions et la politique de confidentialité.")
    if payload.password != payload.password_confirmation:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La confirmation du mot de passe ne correspond pas.")
    if not _password_is_strong(payload.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe doit contenir 10 caractères, une majuscule, une minuscule et un chiffre.",
        )

    tenant = db.scalar(select(Tenant).where(Tenant.slug == _normalize_slug(payload.cabinet_code)))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Code cabinet introuvable.")

    read_only, notice = _tenant_read_only_notice(tenant)
    if read_only:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=notice)

    patient_role = db.scalar(select(Role).where(Role.tenant_id == tenant.id, Role.code == "patient"))
    if not patient_role:
        definition = ROLE_DEFINITIONS["patient"]
        patient_role = Role(
            tenant_id=tenant.id,
            code="patient",
            name=definition["name"],
            description=definition["description"],
        )
        db.add(patient_role)
        db.flush()

    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user:
        profile = existing_user.patient_profile
        if not profile or existing_user.tenant_id != tenant.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un utilisateur avec cet email existe déjà.")
        if profile.birth_date != payload.birth_date or (existing_user.phone and existing_user.phone != payload.phone):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Les informations ne correspondent pas à la fiche créée par le cabinet.")
        existing_user.password_hash = hash_password(payload.password)
        existing_user.first_name = payload.first_name
        existing_user.last_name = payload.last_name
        existing_user.phone = payload.phone
        profile.gender = payload.gender or profile.gender
        profile.address = payload.address or profile.address
        requires_validation = not tenant.settings or tenant.settings.patient_requires_validation
        profile.status = "pending" if requires_validation else "active"
        if patient_role not in existing_user.roles:
            existing_user.roles.append(patient_role)
        db.commit()
        message = "Votre demande a été envoyée au cabinet pour validation." if requires_validation else "Votre fiche patient a été activée pour le portail."
        return PatientRegisterResponse(message=message,tenant_id=tenant.id,patient_user_id=existing_user.id,status=profile.status)

    patient = User(
        tenant_id=tenant.id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
    )
    db.add(patient)
    db.flush()
    patient.roles.append(patient_role)

    profile = PatientProfile(
        user_id=patient.id,
        tenant_id=tenant.id,
        birth_date=payload.birth_date,
        gender=payload.gender,
        address=payload.address,
        status="pending" if not tenant.settings or tenant.settings.patient_requires_validation else "active",
    )
    db.add(profile)
    db.commit()
    db.refresh(patient)

    message = "Compte patient créé. Il sera activé après validation du cabinet." if profile.status == "pending" else "Compte patient créé et activé."
    return PatientRegisterResponse(
        message=message,
        tenant_id=tenant.id,
        patient_user_id=patient.id,
        status=profile.status,
    )


def get_auth_me(user: User) -> AuthMeResponse:
    role_code = user.roles[0].code if user.roles else None
    read_only, notice = _tenant_read_only_notice(user.tenant)
    return AuthMeResponse(
        user=AuthUser(
            id=user.id,
            full_name=f"{user.first_name} {user.last_name}",
            email=user.email,
            role=_public_role(role_code),
        ),
        tenant=TenantSummary(
            id=user.tenant.id,
            name=user.tenant.name,
            slug=user.tenant.slug,
            status=user.tenant.status,
            trial_ends_at=user.tenant.trial_ends_at,
            primary_color=user.tenant.primary_color,
        )
        if user.tenant
        else None,
        read_only=read_only,
        notice=notice,
    )


def get_doctor_dashboard(db: Session, user: User) -> DoctorDashboardResponse:
    role_code = user.roles[0].code if user.roles else None
    if role_code not in INTERNAL_MEDECIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès non autorisé.")
    if not user.tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabinet introuvable.")

    tenant = user.tenant
    today = date.today()
    month_start = today.replace(day=1)
    month_start_datetime = datetime.combine(month_start, time.min, tzinfo=UTC)

    appointments_today = db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tenant.id, Appointment.date == today)
    ) or 0
    patients_registered = db.scalar(
        select(func.count()).select_from(PatientProfile).where(PatientProfile.tenant_id == tenant.id)
    ) or 0
    visits_this_month = db.scalar(
        select(func.count())
        .select_from(Visit)
        .where(Visit.tenant_id == tenant.id, Visit.visit_date >= month_start)
    ) or 0
    confirmed_appointments = db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tenant.id, Appointment.status == "confirmed")
    ) or 0
    absent_appointments = db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.tenant_id == tenant.id, Appointment.status == "absent")
    ) or 0
    amount_collected = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.tenant_id == tenant.id, Payment.paid_at >= month_start_datetime)
    ) or 0
    total_unpaid = db.scalar(
        select(func.coalesce(func.sum(Fee.amount - Fee.paid_amount), 0)).where(Fee.tenant_id == tenant.id, Fee.status != "paid")
    ) or 0
    pending_cnss = db.scalar(
        select(func.count()).select_from(CNSSCase).where(CNSSCase.tenant_id == tenant.id, CNSSCase.status.in_(["REQUESTED", "PROCESSING", "READY_FOR_PICKUP", "DELIVERED_TO_PATIENT", "SUBMITTED_TO_CNSS"]))
    ) or 0

    upcoming_rows = db.scalars(
        select(Appointment)
        .where(Appointment.tenant_id == tenant.id, Appointment.date >= today)
        .order_by(Appointment.date, Appointment.start_time)
        .limit(6)
    ).all()
    today_rows = db.scalars(
        select(Appointment)
        .where(Appointment.tenant_id == tenant.id, Appointment.date == today)
        .order_by(Appointment.start_time)
    ).all()
    latest_rows = db.scalars(
        select(Appointment)
        .where(Appointment.tenant_id == tenant.id)
        .order_by(Appointment.created_at.desc())
        .limit(5)
    ).all()
    latest_patients = db.scalars(
        select(PatientProfile)
        .where(PatientProfile.tenant_id == tenant.id)
        .order_by(PatientProfile.created_at.desc())
        .limit(5)
    ).all()

    read_only, notice = _tenant_read_only_notice(tenant)
    return DoctorDashboardResponse(
        user=AuthUser(
            id=user.id,
            full_name=f"{user.first_name} {user.last_name}",
            email=user.email,
            role=_public_role(role_code),
        ),
        tenant=TenantSummary(
            id=tenant.id,
            name=tenant.name,
            slug=tenant.slug,
            status=tenant.status,
            trial_ends_at=tenant.trial_ends_at,
            primary_color=tenant.primary_color,
        ),
        stats=DashboardStats(
            appointments_today=appointments_today,
            patients_registered=patients_registered,
            visits_this_month=visits_this_month,
            confirmed_appointments=confirmed_appointments,
            absent_appointments=absent_appointments,
            amount_collected=float(amount_collected),
            total_unpaid=float(total_unpaid),
            pending_cnss=pending_cnss,
        ),
        today_appointments=[
            UpcomingAppointment(
                id=appointment.id,
                patient_id=appointment.patient_id,
                patient_name=f'{appointment.patient.user.first_name} {appointment.patient.user.last_name}',
                date=appointment.date,
                start_time=appointment.start_time,
                end_time=appointment.end_time,
                reason=appointment.reason,
                status=appointment.status,
            )
            for appointment in today_rows
        ],
        upcoming_appointments=[
            UpcomingAppointment(
                id=appointment.id,
                patient_id=appointment.patient_id,
                patient_name=f"{appointment.patient.user.first_name} {appointment.patient.user.last_name}",
                date=appointment.date,
                start_time=appointment.start_time,
                end_time=appointment.end_time,
                reason=appointment.reason,
                status=appointment.status,
            )
            for appointment in upcoming_rows
        ],
        latest_appointments=[
            UpcomingAppointment(
                id=appointment.id,
                patient_id=appointment.patient_id,
                patient_name=f"{appointment.patient.user.first_name} {appointment.patient.user.last_name}",
                date=appointment.date,
                start_time=appointment.start_time,
                end_time=appointment.end_time,
                reason=appointment.reason,
                status=appointment.status,
            )
            for appointment in latest_rows
        ],
        latest_patients=[
            LatestPatient(
                id=patient.id,
                full_name=f"{patient.user.first_name} {patient.user.last_name}",
                email=None if patient.user.email.endswith("@local.fadaa") else patient.user.email,
                phone=patient.user.phone,
                status=patient.status,
                created_at=patient.created_at,
            )
            for patient in latest_patients
        ],
        read_only=read_only,
        notice=notice,
    )


def get_staff_dashboard(db: Session, user: User) -> StaffDashboardResponse:
    role_code = user.roles[0].code if user.roles else None
    if role_code not in {"secretary", "SECRETAIRE"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Espace réservé au personnel du cabinet.")
    if not user.tenant:
        raise HTTPException(status_code=404, detail="Cabinet introuvable.")
    staff = db.scalar(select(StaffPermission).where(StaffPermission.tenant_id == user.tenant_id, StaffPermission.user_id == user.id))
    if staff:
        permissions = dict(staff.permissions)
    else:
        from app.services.crud_service import DEFAULT_STAFF_PERMISSIONS
        permissions = dict(DEFAULT_STAFF_PERMISSIONS)
    if "appointments" not in permissions and "agenda" in permissions:
        permissions = {**permissions, "appointments": permissions["agenda"]}
    today = date.today()
    appointments_allowed = permissions.get("appointments", "none") in {"read", "write", "admin"}
    patients_allowed = permissions.get("patients", "none") in {"read", "write", "admin"}
    payments_allowed = permissions.get("payments", "none") in {"read", "write", "admin"}
    today_appointments = db.scalars(select(Appointment).where(Appointment.tenant_id == user.tenant_id, Appointment.date == today).order_by(Appointment.start_time)).all() if appointments_allowed else []
    upcoming = db.scalars(select(Appointment).where(Appointment.tenant_id == user.tenant_id, Appointment.date >= today).order_by(Appointment.date, Appointment.start_time).limit(6)).all() if appointments_allowed else []
    patients = db.scalars(select(PatientProfile).where(PatientProfile.tenant_id == user.tenant_id).order_by(PatientProfile.created_at.desc()).limit(5)).all() if patients_allowed else []
    payments = db.scalars(select(Payment).where(Payment.tenant_id == user.tenant_id).order_by(Payment.paid_at.desc()).limit(5)).all() if payments_allowed else []
    count_today = (db.scalar(select(func.count()).select_from(Appointment).where(Appointment.tenant_id == user.tenant_id, Appointment.date == today)) or 0) if appointments_allowed else 0
    read_only, notice = _tenant_read_only_notice(user.tenant)
    return StaffDashboardResponse(
        user=AuthUser(id=user.id, full_name=f"{user.first_name} {user.last_name}", email=user.email, role="SECRETAIRE"),
        tenant=TenantSummary(id=user.tenant.id, name=user.tenant.name, slug=user.tenant.slug, status=user.tenant.status, trial_ends_at=user.tenant.trial_ends_at, primary_color=user.tenant.primary_color),
        permissions=permissions, appointments_today=count_today,
        today_appointments=[UpcomingAppointment(id=a.id, patient_id=a.patient_id, patient_name=f"{a.patient.user.first_name} {a.patient.user.last_name}", date=a.date, start_time=a.start_time, end_time=a.end_time, reason=a.reason, status=a.status) for a in today_appointments],
        upcoming_appointments=[UpcomingAppointment(id=a.id, patient_id=a.patient_id, patient_name=f"{a.patient.user.first_name} {a.patient.user.last_name}", date=a.date, start_time=a.start_time, end_time=a.end_time, reason=a.reason, status=a.status) for a in upcoming],
        recent_patients=[LatestPatient(id=p.id, full_name=f"{p.user.first_name} {p.user.last_name}", email=None if p.user.email.endswith("@local.fadaa") else p.user.email, phone=p.user.phone, status=p.status, created_at=p.created_at) for p in patients],
        recent_payments=[StaffRecentPayment(id=p.id, patient_name=f"{p.patient.user.first_name} {p.patient.user.last_name}", amount=float(p.amount), method=p.method, paid_at=p.paid_at) for p in payments],
        read_only=read_only, notice=notice,
    )


def _invitation_from_token(db: Session, token: str) -> StaffInvitation:
    invitation = db.scalar(select(StaffInvitation).where(StaffInvitation.token_hash == hashlib.sha256(token.encode()).hexdigest()))
    if not invitation or invitation.used_at or invitation.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=410, detail="Ce lien d’activation est invalide ou expiré.")
    return invitation


def get_staff_activation_info(db: Session, token: str) -> StaffActivationInfo:
    invitation = _invitation_from_token(db, token)
    user = db.get(User, invitation.user_id)
    if not user or user.account_status != "pending_activation":
        raise HTTPException(status_code=409, detail="Ce compte a déjà été activé ou désactivé.")
    return StaffActivationInfo(full_name=f"{user.first_name} {user.last_name}", email=user.email, cabinet_name=user.tenant.name, expires_at=invitation.expires_at)


def activate_staff(db: Session, payload: StaffActivationRequest) -> dict[str, str]:
    if payload.password != payload.password_confirmation:
        raise HTTPException(status_code=400, detail="La confirmation du mot de passe ne correspond pas.")
    if not _password_is_strong(payload.password):
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir 10 caractères, une majuscule, une minuscule et un chiffre.")
    invitation = _invitation_from_token(db, payload.token)
    user = db.get(User, invitation.user_id)
    if not user or user.account_status != "pending_activation":
        raise HTTPException(status_code=409, detail="Ce compte ne peut plus être activé.")
    user.password_hash = hash_password(payload.password)
    user.is_active = True
    user.account_status = "active"
    invitation.used_at = datetime.now(UTC)
    db.add(AuditLog(tenant_id=user.tenant_id, user_id=user.id, action="STAFF_ACTIVATED", resource_type="user", resource_id=user.id))
    db.commit()
    return {"message": "Compte activé. Vous pouvez maintenant vous connecter."}


def create_patient_invitation(
    db: Session, user: User, tenant: Tenant, created_by_id: str | None = None,
) -> str:
    db.query(PatientInvitation).filter(
        PatientInvitation.user_id == user.id,
        PatientInvitation.used_at.is_(None),
    ).delete(synchronize_session=False)
    raw_token = secrets.token_urlsafe(48)
    db.add(PatientInvitation(
        tenant_id=tenant.id,
        user_id=user.id,
        token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
        expires_at=datetime.now(UTC) + timedelta(hours=48),
        created_by_id=created_by_id,
    ))
    return raw_token


def send_patient_invitation(user: User, tenant: Tenant, raw_token: str) -> None:
    activation_url = f"{settings.public_frontend_url.rstrip('/')}/activate-patient/{raw_token}"
    send_patient_activation_email(
        user.email, f"{user.first_name} {user.last_name}", tenant.name, activation_url,
    )


def _patient_invitation_from_token(db: Session, token: str) -> PatientInvitation:
    item = db.scalar(select(PatientInvitation).where(
        PatientInvitation.token_hash == hashlib.sha256(token.encode()).hexdigest(),
    ))
    if not item or item.used_at or item.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=410, detail="Ce lien d’activation patient est invalide ou expiré.")
    return item


def get_patient_activation_info(db: Session, token: str) -> PatientActivationInfo:
    invitation = _patient_invitation_from_token(db, token)
    user = db.get(User, invitation.user_id)
    tenant = db.get(Tenant, invitation.tenant_id)
    if not user or user.account_status != "pending_activation" or not tenant:
        raise HTTPException(status_code=409, detail="Ce compte patient a déjà été activé ou désactivé.")
    return PatientActivationInfo(
        full_name=f"{user.first_name} {user.last_name}",
        email=user.email,
        cabinet_name=tenant.name,
        expires_at=invitation.expires_at,
    )


def activate_patient(db: Session, payload: PatientActivationRequest) -> dict[str, str]:
    if payload.password != payload.password_confirmation:
        raise HTTPException(status_code=400, detail="La confirmation du mot de passe ne correspond pas.")
    if not _password_is_strong(payload.password):
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir 10 caractères, une majuscule, une minuscule et un chiffre.")
    invitation = _patient_invitation_from_token(db, payload.token)
    user = db.get(User, invitation.user_id)
    if not user or user.account_status != "pending_activation":
        raise HTTPException(status_code=409, detail="Ce compte patient ne peut plus être activé.")
    user.password_hash = hash_password(payload.password)
    user.is_active = True
    user.account_status = "active"
    user.tenant_id = None
    if user.patient_profile:
        user.patient_profile.status = "active"
    invitation.used_at = datetime.now(UTC)
    db.add(AuditLog(tenant_id=invitation.tenant_id, user_id=user.id, action="PATIENT_ACTIVATED", resource_type="user", resource_id=user.id))
    db.commit()
    return {"message": "Votre espace patient est activé. Vous pouvez maintenant vous connecter."}
