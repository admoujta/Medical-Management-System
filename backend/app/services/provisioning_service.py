from datetime import UTC, datetime, time, timedelta
import hashlib
import re
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, hash_password
from app.models import AuthSession, AuditLog, DoctorProfile, DoctorSchedule, DoctorScheduleConfig, Permission, Role, Subscription, SubscriptionPlan, Tenant, TenantSettings, User
from app.schemas.provisioning import SignupRequest, SignupResponse

MODULES = [
    "appointments",
    "patients",
    "visits",
    "honoraires",
    "payments",
    "cnss",
    "prescriptions",
    "documents",
    "whatsapp_reminders",
    "settings",
    "users_permissions",
]

TRIAL_DAYS = 30

ROLE_DEFINITIONS = {
    "doctor_admin": {
        "name": "MEDECIN_ADMIN",
        "description": "Acces complet au cabinet, aux reglages et a la gestion des utilisateurs.",
        "permissions": {module: "admin" for module in MODULES},
    },
    "secretary": {
        "name": "SECRETAIRE",
        "description": "Gestion de l'accueil, des rendez-vous, des patients et du suivi administratif.",
        "permissions": {
            "appointments": "write",
            "patients": "write",
            "visits": "read",
            "honoraires": "read",
            "cnss": "write",
            "prescriptions": "none",
            "documents": "write",
            "payments": "write",
            "whatsapp_reminders": "none",
            "settings": "none",
        },
    },
    "patient": {
        "name": "PATIENT",
        "description": "Espace personnel patient: rendez-vous, documents et historique visible.",
        "permissions": {
            "appointments": "read",
            "patients": "read",
            "visits": "read",
            "honoraires": "read",
            "cnss": "read",
            "prescriptions": "read",
            "documents": "read",
            "settings": "none",
        },
    },
    "platform_super_admin": {
        "name": "SUPER_ADMIN",
        "description": "Support plateforme et cycle de vie SaaS, sans acces aux donnees medicales.",
        "permissions": {module: "none" for module in MODULES},
    },
}


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or f"cabinet-{uuid4().hex[:8]}"


def _password_is_strong(password: str) -> bool:
    checks = [
        len(password) >= 10,
        bool(re.search(r"[A-Z]", password)),
        bool(re.search(r"[a-z]", password)),
        bool(re.search(r"\d", password)),
    ]
    return all(checks)


def provision_tenant(db: Session, payload: SignupRequest) -> SignupResponse:
    if not payload.accept_terms:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Terms must be accepted.")
    if not payload.accept_privacy:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Privacy policy must be accepted.")
    if payload.password_confirmation is not None and payload.password != payload.password_confirmation:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password confirmation does not match.")
    if not _password_is_strong(payload.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least 10 characters, one uppercase letter, one lowercase letter and one digit.",
        )

    existing_user = db.scalar(select(User).where(User.email == payload.admin_username))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists.")

    base_slug = _slugify(payload.instance_slug or payload.cabinet_name)
    slug = base_slug
    suffix = 2
    while db.scalar(select(Tenant).where(Tenant.slug == slug)):
        if payload.instance_slug:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce nom d’instance est déjà utilisé.")
        slug = f"{base_slug}-{suffix}"
        suffix += 1

    now = datetime.now(UTC)
    selected_plan = db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.slug == payload.plan_slug, SubscriptionPlan.is_active.is_(True))) if payload.plan_slug else None
    if payload.plan_slug and not selected_plan:
        raise HTTPException(status_code=404, detail="L’offre sélectionnée n’est plus disponible.")
    trial_days = selected_plan.trial_days if selected_plan else TRIAL_DAYS
    tenant = Tenant(
        name=payload.cabinet_name,
        slug=slug,
        status="trial",
        specialty=payload.specialty,
        city=payload.city,
        address=payload.address,
        phone=payload.cabinet_phone or payload.phone,
        primary_color=payload.primary_color,
        logo_url=payload.logo_url,
        trial_started_at=now,
        trial_ends_at=now + timedelta(days=trial_days),
    )
    db.add(tenant)
    db.flush()

    admin = User(
        tenant_id=tenant.id,
        email=payload.admin_username,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
    )
    db.add(admin)
    db.flush()

    roles: dict[str, Role] = {}
    permissions: list[Permission] = []
    for role_code, definition in ROLE_DEFINITIONS.items():
        role = Role(
            tenant_id=tenant.id,
            name=definition["name"],
            code=role_code,
            description=definition["description"],
        )
        db.add(role)
        db.flush()
        roles[role_code] = role
        permissions.extend(
            Permission(
                tenant_id=tenant.id,
                role_id=role.id,
                module=module,
                access_level=definition["permissions"].get(module, "none"),
            )
            for module in MODULES
        )

    assigned_role = roles[payload.initial_role]
    admin.roles.append(assigned_role)
    doctor = DoctorProfile(tenant_id=tenant.id, user_id=admin.id, specialty=payload.specialty,
                            professional_email=payload.email)
    db.add(doctor)
    db.flush()
    start_time = time.fromisoformat(payload.work_start_time)
    end_time = time.fromisoformat(payload.work_end_time)
    break_start = time.fromisoformat(payload.break_start_time) if payload.break_start_time else None
    break_end = time.fromisoformat(payload.break_end_time) if payload.break_end_time else None
    selected_days = set(payload.working_days)
    db.add_all([DoctorSchedule(tenant_id=tenant.id, doctor_id=doctor.id, weekday=weekday,
                               is_working=weekday in selected_days,
                               start_time=start_time if weekday in selected_days else None,
                               end_time=end_time if weekday in selected_days else None,
                               break_start_time=break_start if weekday in selected_days else None,
                               break_end_time=break_end if weekday in selected_days else None)
                for weekday in range(7)])
    db.add(DoctorScheduleConfig(tenant_id=tenant.id, doctor_id=doctor.id,
                                default_duration_minutes=payload.consultation_duration_minutes))
    db.add_all(permissions)
    db.add(TenantSettings(tenant_id=tenant.id))
    db.add(Subscription(
        tenant_id=tenant.id, plan_id=selected_plan.id if selected_plan else None,
        plan_name=selected_plan.name if selected_plan else "FADAA Cabinet", status="trial",
        start_date=tenant.trial_started_at, end_date=tenant.trial_ends_at,
        trial_started_at=tenant.trial_started_at, trial_ends_at=tenant.trial_ends_at,
        amount=selected_plan.price if selected_plan else 0, payment_status="pending",
    ))
    db.add(
        AuditLog(
            tenant_id=tenant.id,
            user_id=admin.id,
            action="tenant.provisioned",
            resource_type="tenant",
            resource_id=tenant.id,
            event_metadata={"source": "public_signup", "trial_days": trial_days, "initial_role": payload.initial_role, "plan_id": selected_plan.id if selected_plan else None},
        )
    )
    db.commit()
    db.refresh(tenant)
    db.refresh(admin)

    session = AuthSession(
        user_id=admin.id,
        tenant_id=tenant.id,
        device_name="Inscription web",
        expires_at=datetime.now(UTC) + timedelta(days=14),
    )
    db.add(session)
    db.flush()
    token_extra = {"role": "MEDECIN_ADMIN", "auth_version": admin.auth_version, "session_id": session.id}
    token = create_access_token(subject=admin.id, tenant_id=tenant.id, extra=token_extra)
    refresh_token = create_refresh_token(subject=admin.id, tenant_id=tenant.id, extra={**token_extra, "refresh_version": session.refresh_version})
    session.refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    db.commit()
    return SignupResponse(
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        trial_ends_at=tenant.trial_ends_at,
        admin_user_id=admin.id,
        assigned_role="MEDECIN_ADMIN",
        access_token=token,
        refresh_token=refresh_token,
    )
