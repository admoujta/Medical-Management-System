import calendar
from datetime import UTC, date, datetime, timedelta
import hashlib
import io
import secrets
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from fastapi import HTTPException, status
import qrcode
import qrcode.image.svg
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.core.config import settings
from app.services.email_service import EmailDeliveryError, send_staff_activation_email
from app.services import whatsapp_consent_service
from app.models import (
    Appointment,
    AppointmentPreparation,
    AuthSession,
    AuditLog,
    CabinetBankAccount,
    CNSSCase,
    CNSSStatusHistory,
    DoctorProfile,
    DocumentCategory,
    Fee,
    HonoraireAppointment,
    HonoraireVisit,
    Invoice,
    MedicalDocument,
    MedicationCatalog,
    OperationHistory,
    PatientCabinetMembership,
    PatientMedicalSummary,
    PatientProfile,
    PatientNotification,
    Payment,
    PaymentDueDate,
    PaymentMethod,
    Prescription,
    Role,
    StaffInvitation,
    StaffPermission,
    Subscription,
    Tenant,
    TenantSettings,
    User,
    Visit,
)
from app.schemas.crud import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentPreparationOut,
    AppointmentPreparationUpdate,
    AppointmentPreparationValidate,
    AppointmentQrOut,
    AppointmentQrScanOut,
    AppointmentStatusUpdate,
    AppointmentUpdate,
    BankAccountCreate,
    BankAccountOut,
    BankAccountUpdate,
    CNSSCreate,
    CNSSOut,
    CNSSUpdate,
    DocumentCreate,
    DocumentOut,
    DocumentUpdate,
    FeeCreate,
    FeeOut,
    FeeUpdate,
    InvoiceOut,
    MedicationCatalogOut,
    OperationHistoryOut,
    PatientCreate,
    PatientOut,
    PatientMedicalSummaryOut,
    PatientMedicalSummaryUpdate,
    PatientUpdate,
    PaymentCreate,
    DueDateCreate,
    DueDateOut,
    DueDateUpdate,
    PaymentMethodCreate,
    PaymentMethodOut,
    PaymentMethodUpdate,
    PaymentOut,
    PaymentUpdate,
    PermissionMatrix,
    PrescriptionCreate,
    PrescriptionOut,
    PrescriptionUpdate,
    TenantStatusUpdate,
    TenantUpdate,
    UserCreate,
    UserOut,
    UserUpdate,
    VisitCreate,
    VisitOut,
    VisitUpdate,
)

WRITE_LEVELS = {"write", "admin"}
READ_LEVELS = {"read", "write", "admin"}
ROLE_ALIASES = {
    "doctor_admin": "MEDECIN_ADMIN",
    "secretary": "SECRETAIRE",
    "patient": "PATIENT",
    "platform_super_admin": "SUPER_ADMIN_IRMA",
    "SUPER_ADMIN": "SUPER_ADMIN_IRMA",
}
ROLE_TO_INTERNAL = {
    "MEDECIN_ADMIN": "doctor_admin",
    "SECRETAIRE": "secretary",
    "PATIENT": "patient",
}
DEFAULT_STAFF_PERMISSIONS = {
    "appointments": "write",
    "patients": "write",
    "visits": "read",
    "honoraires": "read",
    "payments": "write",
    "documents": "none",
    "cnss": "read",
    "prescriptions": "none",
    "whatsapp_reminders": "none",
    "manage_staff": "none",
}
ALLOWED_STAFF_PERMISSION_MODULES = frozenset(DEFAULT_STAFF_PERMISSIONS)

APPOINTMENT_TRANSITIONS = {
    "requested": {"planned", "confirmed", "rejected", "cancelled"},
    "planned": {"confirmed", "waiting", "present", "absent", "cancelled"},
    "confirmed": {"waiting", "in_progress", "present", "absent", "cancelled"},
    "waiting": {"in_progress", "absent", "cancelled"},
    "in_progress": {"completed"},
    "present": {"in_progress", "completed"},
    "absent": set(),
    "completed": set(),
    # Une annulation peut être corrigée par le cabinet. La remise en activité
    # repasse obligatoirement par un état planifié ou confirmé.
    "cancelled": {"planned", "confirmed"},
    "rejected": set(),
}

CNSS_CABINET_TRANSITIONS = {
    "REQUESTED": {"PROCESSING"},
    "PROCESSING": {"READY_FOR_PICKUP"},
    "READY_FOR_PICKUP": {"DELIVERED_TO_PATIENT"},
    "DELIVERED_TO_PATIENT": set(),
    "SUBMITTED_TO_CNSS": set(),
    "APPROVED": set(),
    "REJECTED": set(),
}


def role_code(user: User) -> str | None:
    raw = user.roles[0].code if user.roles else None
    return ROLE_ALIASES.get(raw or "", raw)


def require_tenant(user: User) -> str:
    tenant_id = getattr(user, "active_tenant_id", None) or user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Utilisateur sans cabinet.")
    return tenant_id


def is_read_only(tenant: Tenant | None) -> bool:
    if not tenant:
        return False
    if tenant.status in {"expired", "suspended"}:
        return True
    return tenant.status == "trial" and tenant.trial_ends_at < datetime.now(UTC)


def ensure_write_allowed(user: User) -> None:
    if is_read_only(user.tenant):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Le cabinet est actuellement suspendu. Veuillez contacter le médecin administrateur." if role_code(user) == "SECRETAIRE" else "Votre période d’essai est expirée. Veuillez activer votre abonnement pour continuer.",
        )


def require_role(user: User, allowed: set[str]) -> str:
    current = role_code(user)
    if current not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès non autorisé.")
    return current


def has_module_access(db: Session, user: User, module: str, write: bool = False, admin: bool = False) -> bool:
    current = role_code(user)
    if current == "MEDECIN_ADMIN":
        return True
    if current == "PATIENT":
        return False
    if current != "SECRETAIRE":
        return False

    staff_permission = db.scalar(select(StaffPermission).where(StaffPermission.tenant_id == require_tenant(user), StaffPermission.user_id == user.id))
    permissions = staff_permission.permissions if staff_permission else DEFAULT_STAFF_PERMISSIONS
    level = permissions.get(module, permissions.get("agenda", "none") if module == "appointments" else "none")
    allowed_levels = {"admin"} if admin else WRITE_LEVELS if write else READ_LEVELS
    return level in allowed_levels


def require_module_access(db: Session, user: User, module: str, write: bool = False, admin: bool = False) -> None:
    current = require_role(user, {"MEDECIN_ADMIN", "SECRETAIRE", "PATIENT"})
    if current == "PATIENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Utilisez exclusivement les ressources de votre espace patient.")
    if not has_module_access(db, user, module, write=write, admin=admin):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission insuffisante.")


def patient_scope_filter(query, user: User):
    if role_code(user) != "PATIENT":
        return query
    profile = user.patient_profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil patient introuvable.")
    return query.where(PatientProfile.id == profile.id)


def paginate_query(
    db: Session,
    query,
    *,
    page: int,
    page_size: int,
    sort_column,
    sort_order: str,
    serializer,
) -> dict:
    """Apply counting, ordering and slicing to an already scoped SQL query."""
    total_items = int(
        db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        or 0
    )
    ordering = sort_column.asc() if sort_order == "asc" else sort_column.desc()
    rows = list(
        db.scalars(
            query.order_by(ordering)
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    total_pages = max(1, (total_items + page_size - 1) // page_size)
    return {
        "items": serializer(rows),
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        },
    }


def get_patient_or_404(db: Session, user: User, patient_id: str) -> PatientProfile:
    tenant_id=require_tenant(user)
    membership=select(PatientCabinetMembership.patient_id).where(PatientCabinetMembership.tenant_id==tenant_id,PatientCabinetMembership.status=="active")
    patient = db.scalar(select(PatientProfile).where(PatientProfile.id == patient_id,or_(PatientProfile.tenant_id==tenant_id,PatientProfile.id.in_(membership))))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable.")
    if role_code(user) == "PATIENT" and user.patient_profile and user.patient_profile.id != patient.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès patient non autorisé.")
    return patient


def get_doctor_id(db: Session, user: User, doctor_id: str | None = None) -> str:
    if doctor_id:
        doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.id == doctor_id, DoctorProfile.tenant_id == require_tenant(user)))
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Médecin introuvable.")
        return doctor.id
    if user.doctor_profile:
        return user.doctor_profile.id
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.tenant_id == require_tenant(user)))
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucun médecin trouvé pour ce cabinet.")
    return doctor.id


def serialize_user(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        tenant_id=user.tenant_id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        phone=user.phone,
        role=role_code(user),
        is_active=user.is_active,
        account_status=user.account_status,
        staff_level=user.staff_level,
        created_at=user.created_at,
    )


def _staff_permissions(db: Session, user: User) -> dict[str, str]:
    row = db.scalar(select(StaffPermission).where(StaffPermission.tenant_id == user.tenant_id, StaffPermission.user_id == user.id))
    return {**DEFAULT_STAFF_PERMISSIONS, **(row.permissions if row else {})}


def _require_staff_manager(db: Session, user: User) -> None:
    if role_code(user) == "MEDECIN_ADMIN":
        return
    permissions = _staff_permissions(db, user)
    if role_code(user) != "SECRETAIRE" or user.staff_level != "manager" or permissions.get("manage_staff") != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé au médecin ou à une secrétaire responsable.")


def _require_manageable_staff(db: Session, actor: User, target: User) -> None:
    _require_staff_manager(db, actor)
    if target.id == actor.id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas modifier votre propre compte.")
    if role_code(target) != "SECRETAIRE" or target.staff_level == "manager":
        raise HTTPException(status_code=403, detail="Vous pouvez gérer uniquement les secrétaires ordinaires.")


def _validate_delegated_permissions(db: Session, actor: User, requested: dict[str, str]) -> None:
    unknown_modules = set(requested) - ALLOWED_STAFF_PERMISSION_MODULES
    if unknown_modules:
        raise HTTPException(
            status_code=422,
            detail=f"Module de permission non autorisé : {', '.join(sorted(unknown_modules))}.",
        )
    if role_code(actor) == "MEDECIN_ADMIN":
        return
    own = _staff_permissions(db, actor)
    ranks = {"none": 0, "read": 1, "write": 2, "admin": 3}
    if requested.get("manage_staff", "none") != "none":
        raise HTTPException(status_code=403, detail="Une responsable ne peut pas déléguer la gestion de l’équipe.")
    for module, level in requested.items():
        if ranks[level] > ranks.get(own.get(module, "none"), 0):
            raise HTTPException(status_code=403, detail=f"Vous ne pouvez pas attribuer davantage d’accès que vous sur le module {module}.")


def _new_staff_invitation(db: Session, actor: User, created: User) -> str:
    token = secrets.token_urlsafe(48)
    db.add(StaffInvitation(
        tenant_id=created.tenant_id,
        user_id=created.id,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        expires_at=datetime.now(UTC) + timedelta(hours=48),
        created_by_id=actor.id,
    ))
    return token


def serialize_patient(patient: PatientProfile) -> PatientOut:
    return PatientOut(
        id=patient.id,
        user_id=patient.user_id,
        first_name=patient.user.first_name,
        last_name=patient.user.last_name,
        email=None if patient.user.email.endswith("@local.fadaa") else patient.user.email,
        phone=patient.user.phone,
        birth_date=patient.birth_date,
        gender=patient.gender,
        address=patient.address,
        status=patient.status,
        account_status=patient.user.account_status,
        whatsapp_opt_in=patient.whatsapp_opt_in,
        whatsapp_consent_status=patient.whatsapp_consent_status,
        whatsapp_consent_at=patient.whatsapp_consent_at,
        whatsapp_opt_out_at=patient.whatsapp_opt_out_at,
        preferred_whatsapp_language=patient.preferred_whatsapp_language,
        created_at=patient.created_at,
        cin=patient.cin,
        cin_document_url=patient.cin_document_url,
    )


def serialize_appointment(appointment: Appointment) -> AppointmentOut:
    doctor = appointment.doctor
    tenant = appointment.tenant
    return AppointmentOut(
        id=appointment.id,
        patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id,
        patient_name=f"{appointment.patient.user.first_name} {appointment.patient.user.last_name}",
        date=appointment.date,
        start_time=appointment.start_time,
        end_time=appointment.end_time,
        reason=appointment.reason,
        notes=appointment.notes,
        status=appointment.status,
        origin=appointment.origin,
        actual_start_time=appointment.actual_start_time,
        actual_end_time=appointment.actual_end_time,
        duration_seconds=appointment.duration_seconds,
        qr_scanned_at=appointment.qr_scanned_at,
        reminder_enabled=appointment.reminder_enabled,
        reminder_offset_minutes=appointment.reminder_offset_minutes,
        reminder_channels=appointment.reminder_channels,
        doctor_name=f"Dr {doctor.user.first_name} {doctor.user.last_name}" if doctor and doctor.user else None,
        doctor_specialty=doctor.specialty if doctor else None,
        cabinet_name=tenant.name if tenant else None,
        cabinet_address=tenant.address if tenant else None,
        cabinet_city=tenant.city if tenant else None,
        cabinet_phone=tenant.phone if tenant else None,
    )


def get_my_tenant(user: User) -> Tenant:
    if not user.tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabinet introuvable.")
    return user.tenant


def update_my_tenant(db: Session, user: User, payload: TenantUpdate) -> Tenant:
    require_role(user, {"MEDECIN_ADMIN"})
    ensure_write_allowed(user)
    tenant = get_my_tenant(user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)
    db.commit()
    db.refresh(tenant)
    return tenant


def list_admin_tenants(db: Session, user: User) -> list[Tenant]:
    require_role(user, {"SUPER_ADMIN_IRMA"})
    return list(db.scalars(select(Tenant).order_by(Tenant.created_at.desc())).all())


def update_tenant_status(db: Session, user: User, tenant_id: str, payload: TenantStatusUpdate) -> Tenant:
    require_role(user, {"SUPER_ADMIN_IRMA"})
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cabinet introuvable.")
    tenant.status = payload.status
    db.commit()
    db.refresh(tenant)
    return tenant


def create_user(db: Session, user: User, payload: UserCreate) -> UserOut:
    _require_staff_manager(db, user)
    ensure_write_allowed(user)
    normalized_email = str(payload.email).lower()
    if db.scalar(select(User).where(func.lower(User.email) == normalized_email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email déjà utilisé.")

    internal_role = ROLE_TO_INTERNAL[payload.role]
    role = db.scalar(select(Role).where(Role.tenant_id == user.tenant_id, Role.code == internal_role))
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rôle introuvable.")

    if role_code(user) == "SECRETAIRE" and payload.staff_level != "standard":
        raise HTTPException(status_code=403, detail="Une responsable peut inviter uniquement une secrétaire ordinaire.")
    staff_permissions = {**DEFAULT_STAFF_PERMISSIONS, **(payload.permissions or {})}
    _validate_delegated_permissions(db, user, staff_permissions)
    if payload.staff_level == "manager":
        staff_permissions["manage_staff"] = "admin"

    created = User(
        tenant_id=require_tenant(user),
        email=normalized_email,
        password_hash=hash_password(secrets.token_urlsafe(48)),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        is_active=False,
        account_status="pending_activation",
        staff_level=payload.staff_level,
    )
    db.add(created)
    db.flush()
    created.roles.append(role)
    if payload.role == "SECRETAIRE":
        # Une secrétaire appartient au cabinet, pas à une liste de patients.
        # En héritant du tenant du médecin, elle voit automatiquement tous les
        # patients actuels et futurs du cabinet dès que le module est autorisé.
        db.add(
            StaffPermission(
                tenant_id=user.tenant_id,
                user_id=created.id,
                permissions=staff_permissions,
            )
        )
    token = _new_staff_invitation(db, user, created)
    db.add(AuditLog(tenant_id=user.tenant_id, user_id=user.id, action="STAFF_INVITED", resource_type="user", resource_id=created.id, event_metadata={"staff_level": payload.staff_level}))
    activation_url = f"{settings.public_frontend_url.rstrip('/')}/activate-staff/{token}"
    doctor_profile = db.scalar(select(DoctorProfile).where(DoctorProfile.tenant_id == require_tenant(user)))
    doctor_user = db.get(User, doctor_profile.user_id) if doctor_profile else None
    doctor_name = f"Dr {doctor_user.first_name} {doctor_user.last_name}" if doctor_user else f"{user.first_name} {user.last_name}"
    doctor_email = doctor_profile.professional_email if doctor_profile else user.email
    try:
        send_staff_activation_email(
            created.email,
            f"{created.first_name} {created.last_name}",
            user.tenant.name,
            activation_url,
            doctor_name=doctor_name,
            doctor_email=doctor_email,
        )
    except EmailDeliveryError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    db.commit()
    db.refresh(created)
    return serialize_user(created)


def list_users(db: Session, user: User) -> list[UserOut]:
    _require_staff_manager(db, user)
    users = db.scalars(select(User).where(User.tenant_id == require_tenant(user)).order_by(User.created_at.desc())).all()
    return [serialize_user(item) for item in users]


def paginate_users(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
) -> dict:
    _require_staff_manager(db, user)
    query = select(User).where(User.tenant_id == require_tenant(user))
    secretary_role = select(Role.id).where(
        Role.tenant_id == require_tenant(user), Role.code == "secretary"
    )
    query = query.where(User.roles.any(Role.id.in_(secretary_role)))
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
            )
        )
    sort_columns = {
        "created_at": User.created_at,
        "name": User.last_name,
        "status": User.account_status,
    }
    result = paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=sort_columns.get(sort_by, User.created_at),
        sort_order=sort_order,
        serializer=lambda rows: [serialize_user(row) for row in rows],
    )
    return result


def get_user(db: Session, user: User, user_id: str) -> UserOut:
    _require_staff_manager(db, user)
    item = db.scalar(select(User).where(User.id == user_id, User.tenant_id == require_tenant(user)))
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
    return serialize_user(item)


def update_user(db: Session, user: User, user_id: str, payload: UserUpdate) -> UserOut:
    _require_staff_manager(db, user)
    ensure_write_allowed(user)
    item = db.scalar(select(User).where(User.id == user_id, User.tenant_id == require_tenant(user)))
    if item and role_code(user) == "SECRETAIRE":
        _require_manageable_staff(db, user, item)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")
    changes = payload.model_dump(exclude_unset=True)
    disabling = changes.get("is_active") is False and item.is_active
    for field, value in changes.items():
        setattr(item, field, value)
    if disabling:
        item.auth_version += 1
        item.account_status = "suspended"
        db.query(AuthSession).filter(
            AuthSession.user_id == item.id,
            AuthSession.revoked_at.is_(None),
        ).update({AuthSession.revoked_at: datetime.now(UTC)}, synchronize_session=False)
    db.commit()
    db.refresh(item)
    return serialize_user(item)


def disable_user(db: Session, user: User, user_id: str) -> dict[str, str]:
    _require_staff_manager(db, user)
    ensure_write_allowed(user)
    item = db.scalar(select(User).where(User.id == user_id, User.tenant_id == require_tenant(user)))
    if not item or role_code(item) != "SECRETAIRE":
        raise HTTPException(status_code=404, detail="Secrétaire introuvable.")
    if role_code(user) == "SECRETAIRE":
        _require_manageable_staff(db, user, item)
    item.is_active = False
    item.account_status = "suspended"
    item.auth_version += 1
    db.query(AuthSession).filter(
        AuthSession.user_id == item.id,
        AuthSession.revoked_at.is_(None),
    ).update({AuthSession.revoked_at: datetime.now(UTC)}, synchronize_session=False)
    db.add(AuditLog(tenant_id=user.tenant_id, user_id=user.id, action="STAFF_SUSPENDED", resource_type="user", resource_id=item.id))
    db.commit()
    return {"status": "disabled"}


def create_patient(db: Session, user: User, payload: PatientCreate) -> PatientOut:
    require_module_access(db, user, "patients", write=True)
    ensure_write_allowed(user)
    tenant_settings = db.scalar(select(TenantSettings).where(TenantSettings.tenant_id == require_tenant(user)))
    if tenant_settings and tenant_settings.patient_cin_required and not payload.cin:
        raise HTTPException(status_code=422, detail="La CIN du patient est obligatoire pour ce cabinet.")
    if tenant_settings and tenant_settings.patient_cin_document_required and not payload.cin_document_url:
        raise HTTPException(status_code=422, detail="Le document CIN est obligatoire pour ce cabinet.")
    if not payload.email:
        raise HTTPException(status_code=422, detail="L’adresse e-mail du patient est obligatoire pour créer et activer son espace.")
    existing_user = db.scalar(select(User).where(func.lower(User.email) == str(payload.email).lower()))
    if existing_user:
        if not existing_user.patient_profile:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette adresse e-mail appartient à un autre type de compte.")
        profile=existing_user.patient_profile
        membership=db.scalar(select(PatientCabinetMembership).where(
            PatientCabinetMembership.patient_id==profile.id,
            PatientCabinetMembership.tenant_id==require_tenant(user),
        ))
        if membership:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce patient est déjà rattaché à votre cabinet.")
        db.add(PatientCabinetMembership(patient_id=profile.id,tenant_id=require_tenant(user),status="active"))
        db.commit();db.refresh(profile)
        return serialize_patient(profile)
    patient_user = User(
        tenant_id=None,
        email=str(payload.email).lower(),
        password_hash=hash_password(uuid4().hex),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        is_active=False,
        account_status="pending_activation",
    )
    db.add(patient_user)
    db.flush()
    patient_role = db.scalar(select(Role).where(Role.tenant_id == user.tenant_id, Role.code == "patient"))
    if not patient_role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rôle patient introuvable dans ce cabinet.")
    patient_user.roles.append(patient_role)
    profile = PatientProfile(
        tenant_id=user.tenant_id,
        user_id=patient_user.id,
        birth_date=payload.birth_date,
        gender=payload.gender,
        address=payload.address,
        status="pending",
        whatsapp_opt_in=False,
        whatsapp_consent_status="pending",
        preferred_whatsapp_language=payload.preferred_whatsapp_language,
        cin=payload.cin,
        cin_document_url=payload.cin_document_url,
    )
    db.add(profile)
    db.flush()
    db.add(PatientCabinetMembership(patient_id=profile.id,tenant_id=require_tenant(user),status="active"))
    from app.services.auth_service import create_patient_invitation, send_patient_invitation
    raw_token=create_patient_invitation(db,patient_user,user.tenant,user.id)
    db.flush()
    send_patient_invitation(patient_user,user.tenant,raw_token)
    db.commit()
    db.refresh(profile)
    return serialize_patient(profile)


def list_patients(db: Session, user: User) -> list[PatientOut]:
    require_module_access(db, user, "patients")
    tenant_id=require_tenant(user)
    membership=select(PatientCabinetMembership.patient_id).where(PatientCabinetMembership.tenant_id==tenant_id,PatientCabinetMembership.status=="active")
    query = select(PatientProfile).where(or_(PatientProfile.tenant_id==tenant_id,PatientProfile.id.in_(membership))).order_by(PatientProfile.created_at.desc())
    rows = db.scalars(patient_scope_filter(query, user)).all()
    return [serialize_patient(item) for item in rows]


def paginate_patients(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    status_filter: str | None = None,
) -> dict:
    require_module_access(db, user, "patients")
    tenant_id = require_tenant(user)
    membership = select(PatientCabinetMembership.patient_id).where(
        PatientCabinetMembership.tenant_id == tenant_id,
        PatientCabinetMembership.status == "active",
    )
    query = (
        select(PatientProfile)
        .join(User, User.id == PatientProfile.user_id)
        .where(
            or_(
                PatientProfile.tenant_id == tenant_id,
                PatientProfile.id.in_(membership),
            )
        )
    )
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
                PatientProfile.cin.ilike(pattern),
            )
        )
    if status_filter:
        query = query.where(PatientProfile.status == status_filter)
    query = patient_scope_filter(query, user)
    sort_columns = {
        "created_at": PatientProfile.created_at,
        "name": User.last_name,
        "status": PatientProfile.status,
    }
    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=sort_columns.get(sort_by, PatientProfile.created_at),
        sort_order=sort_order,
        serializer=lambda rows: [serialize_patient(row) for row in rows],
    )
    patient_ids = [item.id for item in result["items"]]
    appointment_counts = (
        dict(
            db.execute(
                select(Appointment.patient_id, func.count(Appointment.id))
                .where(Appointment.patient_id.in_(patient_ids))
                .group_by(Appointment.patient_id)
            ).all()
        )
        if patient_ids
        else {}
    )
    result["items"] = [
        item.model_copy(
            update={"appointment_count": int(appointment_counts.get(item.id, 0))}
        )
        for item in result["items"]
    ]
    summary_query = select(
        func.count(PatientProfile.id),
        func.count(PatientProfile.id).filter(PatientProfile.status == "active"),
        func.count(PatientProfile.id).filter(PatientProfile.status == "pending"),
        func.count(PatientProfile.id).filter(PatientProfile.status == "disabled"),
    ).where(
        or_(
            PatientProfile.tenant_id == tenant_id,
            PatientProfile.id.in_(membership),
        )
    )
    if role_code(user) == "PATIENT" and user.patient_profile:
        summary_query = summary_query.where(
            PatientProfile.id == user.patient_profile.id
        )
    total, active, pending, disabled = db.execute(summary_query).one()
    result["summary"] = {
        "total": int(total or 0),
        "active": int(active or 0),
        "pending": int(pending or 0),
        "disabled": int(disabled or 0),
    }
    return result


def get_patient(db: Session, user: User, patient_id: str) -> PatientOut:
    require_module_access(db, user, "patients")
    return serialize_patient(get_patient_or_404(db, user, patient_id))


def update_patient(db: Session, user: User, patient_id: str, payload: PatientUpdate) -> PatientOut:
    require_module_access(db, user, "patients", write=True)
    ensure_write_allowed(user)
    patient = get_patient_or_404(db, user, patient_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("email") and data["email"] != patient.user.email:
        existing = db.scalar(select(User).where(User.email == data["email"], User.id != patient.user_id))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email déjà utilisé.")
    for field in ("first_name", "last_name", "phone", "email"):
        if field in data:
            setattr(patient.user, field, data[field])
    for field in ("birth_date", "gender", "address", "status", "cin", "cin_document_url", "preferred_whatsapp_language"):
        if field in data:
            setattr(patient, field, data[field])
    if "whatsapp_opt_in" in data:
        if data["whatsapp_opt_in"]:
            whatsapp_consent_service.grant_consent(
                db, patient, patient.user.phone, "accueil_cabinet", user.id,
                patient.preferred_whatsapp_language,
            )
        elif patient.whatsapp_consent_status == "accepted":
            whatsapp_consent_service.withdraw_consent(db, patient, user.id, "Retrait enregistré depuis la fiche patient.")
        else:
            whatsapp_consent_service.refuse_consent(db, patient, "accueil_cabinet", user.id)
    else:
        db.commit()
    db.refresh(patient)
    return serialize_patient(patient)


def get_patient_medical_summary(db: Session, user: User, patient_id: str) -> PatientMedicalSummaryOut:
    require_module_access(db, user, "patients")
    get_patient_or_404(db, user, patient_id)
    summary = db.scalar(select(PatientMedicalSummary).where(
        PatientMedicalSummary.tenant_id == require_tenant(user),
        PatientMedicalSummary.patient_id == patient_id,
    ))
    if not summary:
        return PatientMedicalSummaryOut(patient_id=patient_id)
    return PatientMedicalSummaryOut(
        patient_id=patient_id,
        primary_condition=summary.primary_condition,
        active_conditions=summary.active_conditions or [],
        allergies=summary.allergies or [],
        current_treatments=summary.current_treatments or [],
        next_step=summary.next_step,
        updated_at=summary.updated_at,
        updated_by_user_id=summary.updated_by_user_id,
    )


def update_patient_medical_summary(db: Session, user: User, patient_id: str, payload: PatientMedicalSummaryUpdate) -> PatientMedicalSummaryOut:
    require_module_access(db, user, "patients", write=True)
    ensure_write_allowed(user)
    get_patient_or_404(db, user, patient_id)
    tenant_id = require_tenant(user)
    summary = db.scalar(select(PatientMedicalSummary).where(
        PatientMedicalSummary.tenant_id == tenant_id,
        PatientMedicalSummary.patient_id == patient_id,
    ))
    if not summary:
        summary = PatientMedicalSummary(tenant_id=tenant_id, patient_id=patient_id)
        db.add(summary)
    data = payload.model_dump()
    for key in ("primary_condition", "next_step"):
        value = data[key]
        data[key] = value.strip() if value and value.strip() else None
    for key in ("active_conditions", "allergies", "current_treatments"):
        data[key] = list(dict.fromkeys(item.strip() for item in data[key] if item.strip()))
    for field, value in data.items():
        setattr(summary, field, value)
    summary.updated_by_user_id = user.id
    db.add(OperationHistory(
        tenant_id=tenant_id,
        user_id=user.id,
        patient_id=patient_id,
        action_type="PATIENT_MEDICAL_SUMMARY_UPDATED",
        description="Synthèse médicale du patient mise à jour.",
        performed_by_role=role_code(user),
    ))
    db.commit()
    db.refresh(summary)
    return get_patient_medical_summary(db, user, patient_id)


def disable_patient(db: Session, user: User, patient_id: str) -> dict[str, str]:
    if role_code(user) == "SECRETAIRE":
        require_module_access(db, user, "patients", admin=True)
    update_patient(db, user, patient_id, PatientUpdate(status="disabled"))
    return {"status": "disabled"}


def create_appointment(db: Session, user: User, payload: AppointmentCreate) -> AppointmentOut:
    require_module_access(db, user, "appointments", write=True)
    ensure_write_allowed(user)
    get_patient_or_404(db, user, payload.patient_id)
    doctor_id = get_doctor_id(db, user, payload.doctor_id)
    from app.services.schedule_service import validate_availability
    validate_availability(db, user, doctor_id, payload.date, payload.start_time, payload.end_time)
    conflict = db.scalar(
        select(Appointment).where(
            Appointment.tenant_id == require_tenant(user),
            Appointment.doctor_id == doctor_id,
            Appointment.date == payload.date,
            Appointment.status != "cancelled",
            Appointment.start_time < payload.end_time,
            Appointment.end_time > payload.start_time,
        )
    )
    if conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce créneau chevauche déjà un rendez-vous du médecin.")
    appointment = Appointment(
        tenant_id=require_tenant(user),
        patient_id=payload.patient_id,
        doctor_id=doctor_id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        reason=payload.reason,
        notes=payload.notes,
        status=payload.status,
        reminder_enabled=payload.reminder_enabled,
        reminder_offset_minutes=payload.reminder_offset_minutes,
        reminder_channels=payload.reminder_channels,
    )
    db.add(appointment)
    db.flush()
    add_operation(db, user, "APPOINTMENT_CREATED", appointment=appointment,
                  new_value={"patient_id": appointment.patient_id, "doctor_id": appointment.doctor_id,
                             "status": appointment.status, "date": str(appointment.date),
                             "start_time": str(appointment.start_time), "end_time": str(appointment.end_time),
                             "reason": appointment.reason, "notes": appointment.notes})
    db.commit()
    db.refresh(appointment)
    return serialize_appointment(appointment)


def list_appointments(db: Session, user: User, patient_id: str | None = None) -> list[AppointmentOut]:
    require_module_access(db, user, "appointments")
    query = select(Appointment).join(PatientProfile).where(Appointment.tenant_id == require_tenant(user)).order_by(Appointment.date.desc())
    if patient_id: query = query.where(Appointment.patient_id == patient_id)
    rows = db.scalars(patient_scope_filter(query, user)).all()
    return [serialize_appointment(item) for item in rows]


def paginate_appointments(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    status_filter: str | None = None,
    patient_id: str | None = None,
) -> dict:
    require_module_access(db, user, "appointments")
    query = (
        select(Appointment)
        .join(PatientProfile)
        .join(User, User.id == PatientProfile.user_id)
        .where(Appointment.tenant_id == require_tenant(user))
    )
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                Appointment.reason.ilike(pattern),
                Appointment.notes.ilike(pattern),
            )
        )
    if status_filter:
        query = query.where(Appointment.status == status_filter)
    if patient_id: query = query.where(Appointment.patient_id == patient_id)
    query = patient_scope_filter(query, user)
    sort_columns = {
        "created_at": Appointment.created_at,
        "date": Appointment.date,
        "status": Appointment.status,
        "patient_name": User.last_name,
    }
    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=sort_columns.get(sort_by, Appointment.date),
        sort_order=sort_order,
        serializer=lambda rows: [serialize_appointment(row) for row in rows],
    )


def get_appointment_obj(db: Session, user: User, appointment_id: str) -> Appointment:
    appointment = db.scalar(select(Appointment).where(Appointment.id == appointment_id, Appointment.tenant_id == require_tenant(user)))
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable.")
    if role_code(user) == "PATIENT" and user.patient_profile and appointment.patient_id != user.patient_profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès rendez-vous non autorisé.")
    return appointment


def get_appointment(db: Session, user: User, appointment_id: str) -> AppointmentOut:
    require_module_access(db, user, "appointments")
    return serialize_appointment(get_appointment_obj(db, user, appointment_id))


def _qr_payload(token: str) -> str:
    return f"FADAA-RDV:{token}"


def _qr_token_from_code(code: str) -> str:
    value = code.strip()
    if value.startswith("FADAA-RDV:"):
        value = value.removeprefix("FADAA-RDV:")
    if not value or len(value) > 64:
        raise HTTPException(status_code=422, detail="QR de rendez-vous invalide.")
    return value


def patient_appointment_qr(db: Session, user: User, appointment_id: str) -> AppointmentQrOut:
    require_role(user, {"PATIENT"})
    appointment = get_appointment_obj(db, user, appointment_id)
    if not appointment.qr_token:
        appointment.qr_token = secrets.token_urlsafe(32)
        db.commit()
        db.refresh(appointment)
    payload = _qr_payload(appointment.qr_token)
    image = qrcode.make(
        payload,
        image_factory=qrcode.image.svg.SvgPathImage,
        box_size=8,
        border=2,
    )
    buffer = io.BytesIO()
    image.save(buffer)
    doctor = appointment.doctor
    return AppointmentQrOut(
        appointment_id=appointment.id,
        qr_payload=payload,
        qr_svg=buffer.getvalue().decode("utf-8"),
        patient_name=f"{appointment.patient.user.first_name} {appointment.patient.user.last_name}",
        doctor_name=f"Dr {doctor.user.first_name} {doctor.user.last_name}" if doctor and doctor.user else None,
        date=appointment.date,
        start_time=appointment.start_time,
        end_time=appointment.end_time,
        status=appointment.status,
        active=appointment.status not in {"cancelled", "rejected", "absent", "completed"},
        scanned_at=appointment.qr_scanned_at,
    )


def scan_appointment_qr(
    db: Session,
    user: User,
    code: str,
    *,
    confirm: bool,
) -> AppointmentQrScanOut:
    require_role(user, {"MEDECIN_ADMIN"})
    require_module_access(db, user, "appointments", write=confirm)
    if confirm:
        ensure_write_allowed(user)
    token = _qr_token_from_code(code)
    appointment = db.scalar(
        select(Appointment).where(
            Appointment.qr_token == token,
            Appointment.tenant_id == require_tenant(user),
        )
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Ce QR ne correspond à aucun rendez-vous de votre cabinet.")
    if user.doctor_profile and appointment.doctor_id != user.doctor_profile.id:
        raise HTTPException(status_code=403, detail="Ce rendez-vous est attribué à un autre médecin.")
    if appointment.status in {"cancelled", "rejected", "absent"}:
        raise HTTPException(status_code=422, detail="Ce rendez-vous est annulé, refusé ou marqué absent.")

    already_confirmed = appointment.qr_scanned_at is not None
    if confirm:
        if appointment.status == "requested":
            raise HTTPException(status_code=422, detail="La demande doit d’abord être acceptée par le cabinet.")
        old_status = appointment.status
        if appointment.status in {"planned", "confirmed"}:
            appointment.status = "waiting"
        if appointment.qr_scanned_at is None:
            appointment.qr_scanned_at = datetime.now(UTC)
            appointment.qr_scanned_by_user_id = user.id
            add_operation(
                db,
                user,
                "APPOINTMENT_QR_CONFIRMED",
                appointment=appointment,
                old_value={"status": old_status},
                new_value={
                    "status": appointment.status,
                    "scheduled_date": str(appointment.date),
                    "scheduled_start_time": str(appointment.start_time),
                    "qr_scanned_at": appointment.qr_scanned_at.isoformat(),
                },
                description="Présence confirmée par scan du QR du rendez-vous.",
            )
        db.commit()
        db.refresh(appointment)

    return AppointmentQrScanOut(
        appointment=serialize_appointment(appointment),
        scheduled_label=f"{appointment.date.strftime('%d/%m/%Y')} · {appointment.start_time.strftime('%H:%M')}–{appointment.end_time.strftime('%H:%M')}",
        scanned_at=appointment.qr_scanned_at,
        already_confirmed=already_confirmed,
    )


def update_appointment(db: Session, user: User, appointment_id: str, payload: AppointmentUpdate) -> AppointmentOut:
    require_module_access(db, user, "appointments", write=True)
    ensure_write_allowed(user)
    appointment = get_appointment_obj(db, user, appointment_id)
    tracked_fields = ("patient_id", "doctor_id", "status", "date", "start_time", "end_time", "reason", "notes", "reminder_enabled", "reminder_offset_minutes", "reminder_channels")
    old_value = {field: str(getattr(appointment, field)) if field in {"date", "start_time", "end_time"} else getattr(appointment, field) for field in tracked_fields}
    data = payload.model_dump(exclude_unset=True)
    if "patient_id" in data and data["patient_id"]:
        get_patient_or_404(db, user, data["patient_id"])
    if "doctor_id" in data and data["doctor_id"]:
        data["doctor_id"] = get_doctor_id(db, user, data["doctor_id"])
    effective_date = data.get("date", appointment.date)
    effective_start = data.get("start_time", appointment.start_time)
    effective_end = data.get("end_time", appointment.end_time)
    effective_doctor = data.get("doctor_id", appointment.doctor_id)
    effective_status = data.get("status", appointment.status)
    if effective_status != appointment.status and effective_status not in APPOINTMENT_TRANSITIONS.get(appointment.status, set()):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Transition de statut non autorisée : {appointment.status} → {effective_status}.")
    # Les anciennes demandes pouvaient contenir une heure de fin incohérente.
    # Un refus ne doit jamais être bloqué par le créneau ; lors d'une
    # acceptation, on normalise automatiquement la durée à 30 minutes.
    if appointment.status == "requested" and effective_status == "planned" and effective_end <= effective_start:
        effective_end = (datetime.combine(effective_date, effective_start) + timedelta(minutes=30)).time()
        data["end_time"] = effective_end
    if effective_status != "rejected" and effective_end <= effective_start:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="L’heure de fin doit être après l’heure de début.")
    schedule_changed = bool({"date", "start_time", "end_time", "doctor_id"}.intersection(data))
    # Lors de la restauration d'un rendez-vous annulé, revérifier aussi les
    # disponibilités même si la date et les heures n'ont pas changé.
    if effective_status not in {"cancelled", "requested", "rejected"} and (schedule_changed or appointment.status in {"cancelled", "requested"}):
        from app.services.schedule_service import validate_availability
        validate_availability(db, user, effective_doctor, effective_date, effective_start, effective_end, appointment.id)
    if effective_status not in {"cancelled", "requested", "rejected"}:
        conflict = db.scalar(
            select(Appointment).where(
                Appointment.id != appointment.id,
                Appointment.tenant_id == require_tenant(user),
                Appointment.doctor_id == effective_doctor,
                Appointment.date == effective_date,
                Appointment.status.notin_({"cancelled", "requested", "rejected"}),
                Appointment.start_time < effective_end,
                Appointment.end_time > effective_start,
            )
        )
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce créneau chevauche déjà un rendez-vous du médecin.")
    for field, value in data.items():
        setattr(appointment, field, value)
    action = "APPOINTMENT_REJECTED" if appointment.status == "rejected" else "APPOINTMENT_ACCEPTED" if old_value["status"] == "requested" and appointment.status == "planned" else "APPOINTMENT_CANCELLED" if appointment.status == "cancelled" else "APPOINTMENT_CONFIRMED" if appointment.status == "confirmed" else "PATIENT_MARKED_ABSENT" if appointment.status == "absent" else "APPOINTMENT_UPDATED"
    add_operation(db, user, action, appointment=appointment, old_value=old_value,
                  new_value={field: str(getattr(appointment, field)) if field in {"date", "start_time", "end_time"} else getattr(appointment, field) for field in tracked_fields})
    db.commit()
    db.refresh(appointment)
    return serialize_appointment(appointment)


def delete_appointment(db: Session, user: User, appointment_id: str) -> dict[str, str]:
    require_module_access(db, user, "appointments", admin=True)
    ensure_write_allowed(user)
    appointment = get_appointment_obj(db, user, appointment_id)
    if appointment.status in {"completed", "cancelled"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Ce rendez-vous ne peut plus être annulé.")
    old_status = appointment.status
    appointment.status = "cancelled"
    add_operation(db, user, "APPOINTMENT_CANCELLED", appointment=appointment,
                  old_value={"status": old_status}, new_value={"status": "cancelled"})
    db.commit()
    return {"status": "cancelled"}


def set_appointment_status(db: Session, user: User, appointment_id: str, payload: AppointmentStatusUpdate) -> AppointmentOut:
    return update_appointment(db, user, appointment_id, AppointmentUpdate(status=payload.status))


def add_operation(db: Session, user: User, action_type: str, *, appointment: Appointment | None = None,
                  visit: Visit | None = None, fee: Fee | None = None, invoice: Invoice | None = None,
                  payment: Payment | None = None, document: MedicalDocument | None = None, prescription: Prescription | None = None, old_value: dict | None = None,
                  new_value: dict | None = None, description: str | None = None) -> None:
    related_appointment = appointment
    if not related_appointment and visit and visit.appointment_id:
        related_appointment = db.get(Appointment, visit.appointment_id)
    if not related_appointment and fee:
        related_appointment = db.scalar(
            select(Appointment).join(Visit, Visit.appointment_id == Appointment.id)
            .join(HonoraireVisit, HonoraireVisit.visit_id == Visit.id)
            .where(HonoraireVisit.fee_id == fee.id)
        )
    subject = appointment or visit or fee or invoice or payment or document or prescription
    old_status = old_value.get("status") if old_value else None
    new_status = new_value.get("status") if new_value else None
    if description is None:
        description = {
            "VISIT_CREATED": "Visite créée automatiquement depuis le rendez-vous.",
            "CONSULTATION_STARTED": "Le chronomètre de la consultation a démarré.",
            "CONSULTATION_ENDED": "Consultation terminée et durée réelle calculée.",
        }.get(action_type)
    db.add(OperationHistory(
        tenant_id=require_tenant(user), user_id=user.id,
        patient_id=subject.patient_id if subject else None,
        doctor_id=getattr(related_appointment or visit or fee or prescription, "doctor_id", None),
        appointment_id=related_appointment.id if related_appointment else None,
        visit_id=visit.id if visit else None, fee_id=fee.id if fee else None,
        invoice_id=invoice.id if invoice else None, payment_id=payment.id if payment else None,
        document_id=document.id if document else None,
        prescription_id=prescription.id if prescription else None,
        action_type=action_type, old_status=old_status, new_status=new_status,
        description=description, performed_by_role=role_code(user),
        old_value=old_value, new_value=new_value,
    ))


def _preparation_out(preparation: AppointmentPreparation | None, appointment: Appointment) -> AppointmentPreparationOut:
    if not preparation:
        return AppointmentPreparationOut(appointment_id=appointment.id, patient_id=appointment.patient_id)
    return AppointmentPreparationOut(
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        chief_complaint=preparation.chief_complaint,
        reported_allergies=preparation.reported_allergies or [],
        reported_treatments=preparation.reported_treatments or [],
        blood_pressure=preparation.blood_pressure,
        temperature=preparation.temperature,
        weight=preparation.weight,
        height=preparation.height,
        reception_notes=preparation.reception_notes,
        doctor_diagnosis=preparation.doctor_diagnosis,
        next_step=preparation.next_step,
        status=preparation.status,
        recorded_by_user_id=preparation.recorded_by_user_id,
        validated_by_user_id=preparation.validated_by_user_id,
        validated_at=preparation.validated_at,
        updated_at=preparation.updated_at,
    )


def get_appointment_preparation(db: Session, user: User, appointment_id: str) -> AppointmentPreparationOut:
    appointment = get_appointment_obj(db, user, appointment_id)
    preparation = db.scalar(select(AppointmentPreparation).where(
        AppointmentPreparation.tenant_id == require_tenant(user),
        AppointmentPreparation.appointment_id == appointment.id,
    ))
    return _preparation_out(preparation, appointment)


def update_appointment_preparation(db: Session, user: User, appointment_id: str, payload: AppointmentPreparationUpdate) -> AppointmentPreparationOut:
    require_module_access(db, user, "appointments", write=True)
    ensure_write_allowed(user)
    appointment = get_appointment_obj(db, user, appointment_id)
    tenant_id = require_tenant(user)
    preparation = db.scalar(select(AppointmentPreparation).where(AppointmentPreparation.tenant_id == tenant_id, AppointmentPreparation.appointment_id == appointment.id))
    if not preparation:
        preparation = AppointmentPreparation(tenant_id=tenant_id, appointment_id=appointment.id, patient_id=appointment.patient_id)
        db.add(preparation)
    data = payload.model_dump()
    for key in ("chief_complaint", "blood_pressure", "temperature", "weight", "height", "reception_notes"):
        value = data[key]
        data[key] = value.strip() if value and value.strip() else None
    for key in ("reported_allergies", "reported_treatments"):
        data[key] = list(dict.fromkeys(item.strip() for item in data[key] if item.strip()))
    for field, value in data.items():
        setattr(preparation, field, value)
    preparation.recorded_by_user_id = user.id
    preparation.validated_by_user_id = None
    preparation.validated_at = None
    db.add(OperationHistory(tenant_id=tenant_id, user_id=user.id, patient_id=appointment.patient_id, appointment_id=appointment.id, action_type="APPOINTMENT_PREPARATION_READY" if preparation.status == "ready" else "APPOINTMENT_PREPARATION_SAVED", description="Préparation de la visite prête pour le médecin." if preparation.status == "ready" else "Brouillon de préparation de la visite enregistré.", performed_by_role=role_code(user)))
    db.commit()
    db.refresh(preparation)
    return _preparation_out(preparation, appointment)


def validate_appointment_preparation(db: Session, user: User, appointment_id: str, payload: AppointmentPreparationValidate) -> AppointmentPreparationOut:
    require_role(user, {"MEDECIN_ADMIN"})
    ensure_write_allowed(user)
    appointment = get_appointment_obj(db, user, appointment_id)
    tenant_id = require_tenant(user)
    preparation = db.scalar(select(AppointmentPreparation).where(AppointmentPreparation.tenant_id == tenant_id, AppointmentPreparation.appointment_id == appointment.id))
    if not preparation:
        preparation = AppointmentPreparation(tenant_id=tenant_id, appointment_id=appointment.id, patient_id=appointment.patient_id)
        db.add(preparation)
    preparation.chief_complaint = payload.chief_complaint.strip() if payload.chief_complaint else None
    preparation.reported_allergies = list(dict.fromkeys(item.strip() for item in payload.reported_allergies if item.strip()))
    preparation.reported_treatments = list(dict.fromkeys(item.strip() for item in payload.reported_treatments if item.strip()))
    preparation.doctor_diagnosis = payload.doctor_diagnosis.strip()
    preparation.next_step = payload.next_step.strip() if payload.next_step else None
    preparation.status = "validated"
    preparation.validated_by_user_id = user.id
    preparation.validated_at = datetime.now(UTC)
    if payload.update_medical_summary:
        summary = db.scalar(select(PatientMedicalSummary).where(PatientMedicalSummary.tenant_id == tenant_id, PatientMedicalSummary.patient_id == appointment.patient_id))
        if not summary:
            summary = PatientMedicalSummary(tenant_id=tenant_id, patient_id=appointment.patient_id)
            db.add(summary)
        summary.primary_condition = preparation.doctor_diagnosis
        summary.active_conditions = list(dict.fromkeys([*(summary.active_conditions or []), preparation.doctor_diagnosis]))
        summary.allergies = list(dict.fromkeys([*(summary.allergies or []), *preparation.reported_allergies]))
        summary.current_treatments = list(dict.fromkeys([*(summary.current_treatments or []), *preparation.reported_treatments]))
        summary.next_step = preparation.next_step
        summary.updated_by_user_id = user.id
    db.add(OperationHistory(tenant_id=tenant_id, user_id=user.id, patient_id=appointment.patient_id, appointment_id=appointment.id, action_type="APPOINTMENT_PREPARATION_VALIDATED", description="Préparation vérifiée par le médecin et synthèse médicale mise à jour." if payload.update_medical_summary else "Préparation vérifiée par le médecin.", performed_by_role=role_code(user)))
    db.commit()
    db.refresh(preparation)
    return _preparation_out(preparation, appointment)


def appointment_action(db: Session, user: User, appointment_id: str, action: str) -> AppointmentOut:
    """Execute a guarded appointment workflow action in one transaction."""
    require_module_access(db, user, "appointments", write=True)
    ensure_write_allowed(user)
    appointment = get_appointment_obj(db, user, appointment_id)
    now = datetime.now(UTC)
    old_status = appointment.status

    if action == "mark-arrived":
        if appointment.status not in {"planned", "confirmed"}:
            raise HTTPException(status_code=422, detail="Seul un rendez-vous planifié ou confirmé peut être marqué arrivé.")
        appointment.status = "waiting"
        history_action = "PATIENT_ARRIVED"
    elif action == "start":
        if appointment.status not in {"confirmed", "waiting", "present"}:
            raise HTTPException(status_code=422, detail="La consultation ne peut pas être démarrée dans cet état.")
        appointment.status = "in_progress"
        appointment.actual_start_time = now
        appointment.actual_end_time = None
        appointment.duration_seconds = None
        appointment.started_by_user_id = user.id
        history_action = "CONSULTATION_STARTED"
    elif action == "end":
        if appointment.status != "in_progress" or not appointment.actual_start_time:
            raise HTTPException(status_code=422, detail="Aucune consultation en cours à terminer.")
        appointment.actual_end_time = now
        appointment.duration_seconds = max(0, int((now - appointment.actual_start_time).total_seconds()))
        appointment.ended_by_user_id = user.id
        appointment.status = "completed"
        visit = db.scalar(select(Visit).where(Visit.appointment_id == appointment.id))
        if not visit:
            visit = Visit(
                tenant_id=appointment.tenant_id, patient_id=appointment.patient_id,
                doctor_id=appointment.doctor_id, appointment_id=appointment.id,
                visit_date=appointment.date, status="completed", reason=appointment.reason,
                notes=appointment.notes, actual_start_time=appointment.actual_start_time,
                actual_end_time=appointment.actual_end_time, duration_seconds=appointment.duration_seconds,
                created_by_user_id=user.id,
            )
            db.add(visit)
            db.flush()
            add_operation(db, user, "VISIT_CREATED", appointment=appointment, visit=visit,
                          new_value={"status": "completed", "duration_seconds": visit.duration_seconds})
        history_action = "CONSULTATION_ENDED"
    elif action == "mark-absent":
        if appointment.status not in {"planned", "confirmed", "waiting"}:
            raise HTTPException(status_code=422, detail="Ce rendez-vous ne peut pas être marqué absent dans cet état.")
        appointment.status = "absent"
        history_action = "PATIENT_MARKED_ABSENT"
    else:
        raise HTTPException(status_code=404, detail="Action de rendez-vous inconnue.")

    add_operation(db, user, history_action, appointment=appointment,
                  old_value={"status": old_status},
                  new_value={"status": appointment.status, "duration_seconds": appointment.duration_seconds})
    db.commit()
    db.refresh(appointment)
    return serialize_appointment(appointment)


def list_operation_history(db: Session, user: User, *, patient_id: str | None = None,
                           appointment_id: str | None = None, visit_id: str | None = None,
                           fee_id: str | None = None) -> list[OperationHistoryOut]:
    require_module_access(db, user, "appointments")
    query = select(OperationHistory).where(OperationHistory.tenant_id == require_tenant(user))
    if role_code(user) == "PATIENT" and user.patient_profile:
        query = query.where(OperationHistory.patient_id == user.patient_profile.id)
    elif patient_id:
        query = query.where(OperationHistory.patient_id == patient_id)
    if appointment_id:
        visit_ids = select(Visit.id).where(Visit.appointment_id == appointment_id)
        fee_ids = select(HonoraireVisit.fee_id).where(HonoraireVisit.visit_id.in_(visit_ids))
        invoice_ids = select(Invoice.id).where(Invoice.fee_id.in_(fee_ids))
        payment_ids = select(Payment.id).where(Payment.fee_id.in_(fee_ids))
        query = query.where(or_(OperationHistory.appointment_id == appointment_id,
                                OperationHistory.visit_id.in_(visit_ids),
                                OperationHistory.fee_id.in_(fee_ids),
                                OperationHistory.invoice_id.in_(invoice_ids),
                                OperationHistory.payment_id.in_(payment_ids)))
    if visit_id:
        query = query.where(OperationHistory.visit_id == visit_id)
    if fee_id:
        query = query.where(OperationHistory.fee_id == fee_id)
    rows = db.scalars(query.order_by(OperationHistory.created_at.desc())).all()
    user_ids = {row.user_id for row in rows if row.user_id}
    actors = {actor.id: f"{actor.first_name} {actor.last_name}" for actor in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    return [OperationHistoryOut.model_validate(row, from_attributes=True).model_copy(
        update={"performed_by_name": actors.get(row.user_id)}) for row in rows]


def paginate_operation_history(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
    patient_id: str | None = None,
    appointment_id: str | None = None,
    visit_id: str | None = None,
    fee_id: str | None = None,
) -> dict:
    require_module_access(db, user, "appointments")
    query = select(OperationHistory).where(
        OperationHistory.tenant_id == require_tenant(user)
    )
    if role_code(user) == "PATIENT" and user.patient_profile:
        query = query.where(
            OperationHistory.patient_id == user.patient_profile.id
        )
    elif patient_id:
        query = query.where(OperationHistory.patient_id == patient_id)
    if appointment_id:
        visit_ids = select(Visit.id).where(Visit.appointment_id == appointment_id)
        fee_ids = select(HonoraireVisit.fee_id).where(
            HonoraireVisit.visit_id.in_(visit_ids)
        )
        invoice_ids = select(Invoice.id).where(Invoice.fee_id.in_(fee_ids))
        payment_ids = select(Payment.id).where(Payment.fee_id.in_(fee_ids))
        query = query.where(
            or_(
                OperationHistory.appointment_id == appointment_id,
                OperationHistory.visit_id.in_(visit_ids),
                OperationHistory.fee_id.in_(fee_ids),
                OperationHistory.invoice_id.in_(invoice_ids),
                OperationHistory.payment_id.in_(payment_ids),
            )
        )
    if visit_id:
        query = query.where(OperationHistory.visit_id == visit_id)
    if fee_id:
        query = query.where(OperationHistory.fee_id == fee_id)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                OperationHistory.action_type.ilike(pattern),
                OperationHistory.description.ilike(pattern),
            )
        )

    def serialize(rows: list[OperationHistory]) -> list[OperationHistoryOut]:
        user_ids = {row.user_id for row in rows if row.user_id}
        actors = (
            {
                actor.id: f"{actor.first_name} {actor.last_name}"
                for actor in db.scalars(
                    select(User).where(User.id.in_(user_ids))
                ).all()
            }
            if user_ids
            else {}
        )
        return [
            OperationHistoryOut.model_validate(
                row, from_attributes=True
            ).model_copy(update={"performed_by_name": actors.get(row.user_id)})
            for row in rows
        ]

    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=OperationHistory.created_at,
        sort_order="desc",
        serializer=serialize,
    )


def create_visit(db: Session, user: User, payload: VisitCreate) -> VisitOut:
    require_module_access(db, user, "visits", write=True)
    ensure_write_allowed(user)
    get_patient_or_404(db, user, payload.patient_id)
    appointment = None
    doctor_id = get_doctor_id(db, user, payload.doctor_id)
    if payload.appointment_id:
        appointment = get_appointment_obj(db, user, payload.appointment_id)
        if appointment.patient_id != payload.patient_id:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Le rendez-vous et la visite doivent appartenir au même patient.")
        if appointment.status not in {"confirmed", "waiting", "in_progress", "present", "completed"}:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Une visite peut être créée uniquement pour un rendez-vous confirmé, présent ou terminé.")
        if db.scalar(select(Visit).where(Visit.appointment_id == appointment.id)):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Une visite existe déjà pour ce rendez-vous.")
        doctor_id = appointment.doctor_id
    visit = Visit(
        tenant_id=require_tenant(user),
        patient_id=payload.patient_id,
        doctor_id=doctor_id,
        appointment_id=payload.appointment_id,
        visit_date=payload.visit_date,
        status="completed",
        attendance_status=payload.attendance_status,
        reason=payload.reason,
        notes=payload.notes,
    )
    db.add(visit)
    db.flush()
    add_operation(db, user, "VISIT_CREATED", appointment=appointment, visit=visit,
                  new_value={"status": visit.status, "attendance_status": visit.attendance_status,
                             "visit_date": str(visit.visit_date)})
    if appointment:
        appointment.status = "completed"
    db.commit()
    db.refresh(visit)
    return serialize_visits(db, [visit])[0]


def list_visits(db: Session, user: User, patient_id: str | None = None) -> list[VisitOut]:
    require_module_access(db, user, "visits")
    query = select(Visit).join(PatientProfile).where(Visit.tenant_id == require_tenant(user)).order_by(Visit.visit_date.desc())
    if patient_id: query = query.where(Visit.patient_id == patient_id)
    return serialize_visits(
        db, list(db.scalars(patient_scope_filter(query, user)).all())
    )


def serialize_visits(db: Session, rows: list[Visit]) -> list[VisitOut]:
    if not rows:
        return []
    patient_ids = {row.patient_id for row in rows}
    doctor_ids = {row.doctor_id for row in rows if row.doctor_id}
    patient_names = dict(
        db.execute(
            select(
                PatientProfile.id,
                func.concat(User.first_name, " ", User.last_name),
            )
            .join(User, User.id == PatientProfile.user_id)
            .where(PatientProfile.id.in_(patient_ids))
        ).all()
    )
    doctor_names = (
        dict(
            db.execute(
                select(
                    DoctorProfile.id,
                    func.concat("Dr ", User.first_name, " ", User.last_name),
                )
                .join(User, User.id == DoctorProfile.user_id)
                .where(DoctorProfile.id.in_(doctor_ids))
            ).all()
        )
        if doctor_ids
        else {}
    )
    return [
        VisitOut.model_validate(row, from_attributes=True).model_copy(
            update={
                "patient_name": patient_names.get(row.patient_id),
                "doctor_name": doctor_names.get(row.doctor_id),
            }
        )
        for row in rows
    ]


def paginate_visits(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    status_filter: str | None = None,
    patient_id: str | None = None,
) -> dict:
    require_module_access(db, user, "visits")
    query = (
        select(Visit)
        .join(PatientProfile)
        .join(User, User.id == PatientProfile.user_id)
        .where(Visit.tenant_id == require_tenant(user))
    )
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                Visit.reason.ilike(pattern),
                Visit.notes.ilike(pattern),
            )
        )
    if status_filter:
        query = query.where(Visit.status == status_filter)
    if patient_id: query = query.where(Visit.patient_id == patient_id)
    query = patient_scope_filter(query, user)
    sort_columns = {
        "created_at": Visit.created_at,
        "visit_date": Visit.visit_date,
        "status": Visit.status,
        "patient_name": User.last_name,
    }
    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=sort_columns.get(sort_by, Visit.visit_date),
        sort_order=sort_order,
        serializer=lambda rows: serialize_visits(db, rows),
    )


def get_scoped(db: Session, user: User, model, item_id: str, label: str):
    item = db.scalar(select(model).where(model.id == item_id, model.tenant_id == require_tenant(user)))
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} introuvable.")
    patient_id = getattr(item, "patient_id", None)
    if role_code(user) == "PATIENT" and user.patient_profile and patient_id != user.patient_profile.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès non autorisé.")
    return item


def update_visit(db: Session, user: User, visit_id: str, payload: VisitUpdate) -> VisitOut:
    require_module_access(db, user, "visits", write=True)
    ensure_write_allowed(user)
    visit = get_scoped(db, user, Visit, visit_id, "Visite")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(visit, field, value)
    db.commit()
    db.refresh(visit)
    return serialize_visits(db, [visit])[0]


def delete_item(db: Session, user: User, model, item_id: str, module: str, label: str) -> dict[str, str]:
    require_module_access(db, user, module, admin=True)
    ensure_write_allowed(user)
    item = get_scoped(db, user, model, item_id, label)
    db.delete(item)
    db.commit()
    return {"status": "deleted"}


def _fee_tax_values(amount_ht, tax_rate) -> tuple[Decimal, Decimal]:
    ht = Decimal(str(amount_ht)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    rate = Decimal(str(tax_rate)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if ht <= 0 or rate < 0 or rate > 100:
        raise HTTPException(status_code=422, detail="Le montant HT doit être positif et le taux de TVA compris entre 0 et 100 %.")
    return ht, rate


def _fee_totals(amount_ht: Decimal, tax_rate: Decimal) -> tuple[Decimal, Decimal]:
    tax_amount = (amount_ht * tax_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return tax_amount, amount_ht + tax_amount


def create_fee(db: Session, user: User, payload: FeeCreate) -> FeeOut:
    require_module_access(db, user, "honoraires", write=True)
    ensure_write_allowed(user)
    get_patient_or_404(db, user, payload.patient_id)
    data = payload.model_dump(exclude={"appointment_ids", "visit_ids"})
    amount_ht = data.pop("amount_ht", None)
    legacy_amount = data.pop("amount", None)
    if amount_ht is None and legacy_amount is None:
        raise HTTPException(status_code=422, detail="Le montant HT est obligatoire.")
    amount_ht, tax_rate = _fee_tax_values(amount_ht if amount_ht is not None else legacy_amount, data.pop("tax_rate", 0))
    tax_amount, amount_ttc = _fee_totals(amount_ht, tax_rate)
    data.update(amount_ht=amount_ht, tax_rate=tax_rate, tax_amount=tax_amount, amount=amount_ttc)
    if not data.get("doctor_id"):
        data["doctor_id"] = get_doctor_id(db, user, None)
    fee = Fee(tenant_id=require_tenant(user), created_by_user_id=user.id, **data)
    db.add(fee)
    db.flush()
    for appointment_id in payload.appointment_ids:
        appointment = get_scoped(db, user, Appointment, appointment_id, "Rendez-vous")
        if appointment.patient_id != fee.patient_id:
            raise HTTPException(status_code=422, detail="Tous les rendez-vous de l’honoraire doivent appartenir au même patient.")
        db.add(HonoraireAppointment(tenant_id=fee.tenant_id, fee_id=fee.id, appointment_id=appointment.id))
    for visit_id in payload.visit_ids:
        visit = get_scoped(db, user, Visit, visit_id, "Visite")
        if visit.patient_id != fee.patient_id:
            raise HTTPException(status_code=422, detail="Toutes les visites de l’honoraire doivent appartenir au même patient.")
        db.add(HonoraireVisit(tenant_id=fee.tenant_id, fee_id=fee.id, visit_id=visit.id))
    add_operation(db, user, "FEE_CREATED", fee=fee, new_value={"amount": float(fee.amount), "appointment_ids": payload.appointment_ids, "visit_ids": payload.visit_ids})
    db.commit()
    db.refresh(fee)
    return serialize_fee(db, fee)


def serialize_fee(db: Session, fee: Fee) -> FeeOut:
    appointment_ids = list(db.scalars(select(HonoraireAppointment.appointment_id).where(HonoraireAppointment.tenant_id == fee.tenant_id, HonoraireAppointment.fee_id == fee.id)).all())
    visit_ids = list(db.scalars(select(HonoraireVisit.visit_id).where(HonoraireVisit.fee_id == fee.id)).all())
    patient_name=db.scalar(select(func.concat(User.first_name," ",User.last_name)).join(PatientProfile,PatientProfile.user_id==User.id).where(PatientProfile.id==fee.patient_id))
    doctor_name=db.scalar(select(func.concat("Dr ",User.first_name," ",User.last_name)).join(DoctorProfile,DoctorProfile.user_id==User.id).where(DoctorProfile.id==fee.doctor_id)) if fee.doctor_id else None
    return FeeOut(id=fee.id, patient_id=fee.patient_id, doctor_id=fee.doctor_id,patient_name=patient_name,doctor_name=doctor_name,
                  title=fee.title, description=fee.description, fee_type=fee.fee_type,
                  amount=float(fee.amount), amount_ht=float(fee.amount_ht), tax_rate=float(fee.tax_rate),
                  tax_amount=float(fee.tax_amount), paid_amount=float(fee.paid_amount),
                  remaining_amount=max(0, float(fee.amount) - float(fee.paid_amount)), status=fee.status,
                  due_date=fee.due_date, created_at=fee.created_at, updated_at=fee.updated_at,
                  appointment_ids=appointment_ids, visit_ids=visit_ids)


def list_fees(db: Session, user: User, patient_id: str | None = None) -> list[FeeOut]:
    require_module_access(db, user, "honoraires")
    query = select(Fee).join(PatientProfile).where(Fee.tenant_id == require_tenant(user)).order_by(Fee.created_at.desc())
    if patient_id: query = query.where(Fee.patient_id == patient_id)
    rows = db.scalars(patient_scope_filter(query, user)).all()
    return [serialize_fee(db, item) for item in rows]


def paginate_fees(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    status_filter: str | None = None,
    patient_id: str | None = None,
) -> dict:
    require_module_access(db, user, "honoraires")
    query = (
        select(Fee)
        .join(PatientProfile)
        .join(User, User.id == PatientProfile.user_id)
        .where(Fee.tenant_id == require_tenant(user))
    )
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                Fee.title.ilike(pattern),
                Fee.description.ilike(pattern),
            )
        )
    if status_filter:
        query = query.where(Fee.status == status_filter)
    if patient_id: query = query.where(Fee.patient_id == patient_id)
    query = patient_scope_filter(query, user)
    sort_columns = {
        "created_at": Fee.created_at,
        "amount": Fee.amount,
        "status": Fee.status,
        "patient_name": User.last_name,
    }
    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=sort_columns.get(sort_by, Fee.created_at),
        sort_order=sort_order,
        serializer=lambda rows: [serialize_fee(db, row) for row in rows],
    )


def update_fee(db: Session, user: User, fee_id: str, payload: FeeUpdate) -> FeeOut:
    require_module_access(db, user, "honoraires", write=True)
    ensure_write_allowed(user)
    fee = get_scoped(db, user, Fee, fee_id, "Honoraire")
    old_value = {"amount": float(fee.amount), "status": fee.status}
    changes = payload.model_dump(exclude_unset=True)
    requested_ht = changes.pop("amount_ht", None)
    legacy_amount = changes.pop("amount", None)
    requested_rate = changes.pop("tax_rate", None)
    if requested_ht is not None or legacy_amount is not None or requested_rate is not None:
        amount_ht, tax_rate = _fee_tax_values(
            requested_ht if requested_ht is not None else legacy_amount if legacy_amount is not None else fee.amount_ht,
            requested_rate if requested_rate is not None else fee.tax_rate,
        )
        tax_amount, amount_ttc = _fee_totals(amount_ht, tax_rate)
        if amount_ttc < float(fee.paid_amount):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Le montant TTC ne peut pas être inférieur aux paiements déjà enregistrés.")
        fee.amount_ht, fee.tax_rate, fee.tax_amount, fee.amount = amount_ht, tax_rate, tax_amount, amount_ttc
    for field, value in changes.items():
        setattr(fee, field, value)
    if fee.status not in {"draft", "cancelled"}:
        fee.status = "paid" if float(fee.paid_amount) >= float(fee.amount) else "partially_paid" if float(fee.paid_amount) > 0 else "in_progress"
    add_operation(db, user, "FEE_UPDATED", fee=fee, old_value=old_value,
                  new_value={"amount": float(fee.amount), "status": fee.status})
    db.commit()
    db.refresh(fee)
    return serialize_fee(db, fee)


def delete_fee(db: Session, user: User, fee_id: str) -> dict[str, str]:
    require_module_access(db, user, "honoraires", admin=True)
    ensure_write_allowed(user)
    fee = get_scoped(db, user, Fee, fee_id, "Honoraire")
    if db.scalar(select(Payment.id).where(Payment.fee_id == fee.id).limit(1)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Impossible de supprimer un honoraire qui possède des paiements.")
    db.delete(fee)
    db.commit()
    return {"status": "deleted"}


def set_fee_link(db: Session, user: User, fee_id: str, item_id: str, kind: str, attach: bool) -> FeeOut:
    require_module_access(db, user, "honoraires", write=True)
    ensure_write_allowed(user)
    fee = get_scoped(db, user, Fee, fee_id, "Honoraire")
    if kind == "appointment":
        item = get_scoped(db, user, Appointment, item_id, "Rendez-vous")
        link_model, item_field = HonoraireAppointment, "appointment_id"
    else:
        item = get_scoped(db, user, Visit, item_id, "Visite")
        link_model, item_field = HonoraireVisit, "visit_id"
    if item.patient_id != fee.patient_id:
        raise HTTPException(status_code=422, detail="L’élément lié doit appartenir au même patient que l’honoraire.")
    query = select(link_model).where(link_model.tenant_id == fee.tenant_id, link_model.fee_id == fee.id, getattr(link_model, item_field) == item.id)
    link = db.scalar(query)
    if attach and not link:
        db.add(link_model(tenant_id=fee.tenant_id, fee_id=fee.id, **{item_field: item.id}))
    elif not attach and link:
        db.delete(link)
    db.commit()
    db.refresh(fee)
    return serialize_fee(db, fee)


def list_fee_payments(db: Session, user: User, fee_id: str) -> list[PaymentOut]:
    require_module_access(db, user, "payments")
    fee = get_scoped(db, user, Fee, fee_id, "Honoraire")
    rows = db.scalars(select(Payment).where(Payment.tenant_id == fee.tenant_id, Payment.fee_id == fee.id).order_by(Payment.paid_at.desc())).all()
    return serialize_payments(db,list(rows))


def fee_summary(db: Session, user: User, fee_id: str) -> dict:
    require_module_access(db, user, "honoraires")
    fee = get_scoped(db, user, Fee, fee_id, "Honoraire")
    serialized = serialize_fee(db, fee)
    return {"honoraire": serialized.model_dump(), "montant_total": float(fee.amount),
            "montant_paye": float(fee.paid_amount),
            "rap": max(0, float(fee.amount) - float(fee.paid_amount)), "statut": fee.status}


def patient_financial_situation(db: Session, user: User, patient_id: str) -> dict:
    require_module_access(db, user, "honoraires")
    patient = get_patient_or_404(db, user, patient_id)
    fees = db.scalars(select(Fee).where(Fee.tenant_id == require_tenant(user), Fee.patient_id == patient.id).order_by(Fee.created_at.desc())).all()
    total = sum(float(fee.amount) for fee in fees if fee.status != "cancelled")
    paid = sum(float(fee.paid_amount) for fee in fees if fee.status != "cancelled")
    return {"patient_id": patient.id, "montant_total": total, "montant_paye": paid,
            "rap": max(0, total - paid), "honoraires": [serialize_fee(db, fee).model_dump() for fee in fees]}


def serialize_invoices(db: Session, rows: list[Invoice]) -> list[InvoiceOut]:
    if not rows:
        return []
    patient_ids = {row.patient_id for row in rows}
    doctor_ids = {row.doctor_id for row in rows if row.doctor_id}
    patient_names = dict(
        db.execute(
            select(
                PatientProfile.id,
                func.concat(User.first_name, " ", User.last_name),
            )
            .join(User, User.id == PatientProfile.user_id)
            .where(PatientProfile.id.in_(patient_ids))
        ).all()
    )
    doctor_names = (
        dict(
            db.execute(
                select(
                    DoctorProfile.id,
                    func.concat("Dr ", User.first_name, " ", User.last_name),
                )
                .join(User, User.id == DoctorProfile.user_id)
                .where(DoctorProfile.id.in_(doctor_ids))
            ).all()
        )
        if doctor_ids
        else {}
    )
    return [
        InvoiceOut(
            id=row.id,
            patient_id=row.patient_id,
            patient_name=patient_names.get(row.patient_id),
            fee_id=row.fee_id,
            invoice_number=row.invoice_number,
            amount_total=float(row.amount_total),
            amount_paid=float(row.amount_paid),
            amount_due=float(row.amount_due),
            status=row.status,
            issued_at=row.issued_at,
            doctor_id=row.doctor_id,
            doctor_name=doctor_names.get(row.doctor_id),
            due_date=row.due_date,
            comment=row.comment,
            updated_at=row.updated_at,
        )
        for row in rows
    ]


def serialize_invoice(db: Session, invoice: Invoice) -> InvoiceOut:
    return serialize_invoices(db, [invoice])[0]


def create_invoice(db: Session, user: User, fee_id: str) -> InvoiceOut:
    require_module_access(db, user, "payments", write=True)
    ensure_write_allowed(user)
    fee = get_scoped(db, user, Fee, fee_id, "Honoraire")
    existing = db.scalar(select(Invoice).where(Invoice.tenant_id == require_tenant(user), Invoice.fee_id == fee.id))
    if existing:
        return serialize_invoice(db, existing)
    sequence = int(db.scalar(select(func.count(Invoice.id)).where(Invoice.tenant_id == require_tenant(user))) or 0) + 1
    invoice = Invoice(tenant_id=require_tenant(user), patient_id=fee.patient_id, doctor_id=fee.doctor_id, fee_id=fee.id,
                      invoice_number=f"FAC-{datetime.now(UTC).year}-{sequence:06d}",
                      amount_total=fee.amount, amount_paid=fee.paid_amount,
                      amount_due=float(fee.amount) - float(fee.paid_amount),
                      status="PAID" if fee.status == "paid" else "PARTIALLY_PAID" if fee.status == "partially_paid" else "UNPAID",
                      created_by_user_id=user.id)
    db.add(invoice)
    db.flush()
    add_operation(db, user, "INVOICE_CREATED", fee=fee, invoice=invoice,
                  new_value={"invoice_number": invoice.invoice_number, "amount_total": float(invoice.amount_total)})
    db.commit()
    db.refresh(invoice)
    return serialize_invoice(db, invoice)


def list_invoices(db: Session, user: User, patient_id: str | None = None) -> list[InvoiceOut]:
    require_module_access(db, user, "payments")
    query = select(Invoice).where(Invoice.tenant_id == require_tenant(user))
    if role_code(user) == "PATIENT" and user.patient_profile:
        query = query.where(Invoice.patient_id == user.patient_profile.id)
    if patient_id: query = query.where(Invoice.patient_id == patient_id)
    return serialize_invoices(
        db, list(db.scalars(query.order_by(Invoice.issued_at.desc())).all())
    )


def paginate_invoices(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    status_filter: str | None = None,
    patient_id: str | None = None,
) -> dict:
    require_module_access(db, user, "payments")
    query = (
        select(Invoice)
        .join(PatientProfile)
        .join(User, User.id == PatientProfile.user_id)
        .where(Invoice.tenant_id == require_tenant(user))
    )
    if role_code(user) == "PATIENT" and user.patient_profile:
        query = query.where(Invoice.patient_id == user.patient_profile.id)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                Invoice.invoice_number.ilike(pattern),
                Invoice.comment.ilike(pattern),
            )
        )
    if status_filter:
        query = query.where(Invoice.status == status_filter)
    if patient_id: query = query.where(Invoice.patient_id == patient_id)
    sort_columns = {
        "created_at": Invoice.issued_at,
        "issued_at": Invoice.issued_at,
        "amount": Invoice.amount_total,
        "status": Invoice.status,
        "patient_name": User.last_name,
    }
    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=sort_columns.get(sort_by, Invoice.issued_at),
        sort_order=sort_order,
        serializer=lambda rows: serialize_invoices(db, rows),
    )


def get_invoice(db: Session, user: User, invoice_id: str) -> Invoice:
    require_module_access(db, user, "payments")
    return get_scoped(db, user, Invoice, invoice_id, "Facture")


def cancel_invoice(db: Session, user: User, invoice_id: str) -> InvoiceOut:
    require_module_access(db, user, "payments", write=True)
    ensure_write_allowed(user)
    invoice = get_invoice(db, user, invoice_id)
    if float(invoice.amount_paid) > 0:
        raise HTTPException(status_code=409, detail="Une facture ayant des paiements ne peut pas être annulée.")
    old_status = invoice.status
    invoice.status = "CANCELLED"
    add_operation(db, user, "INVOICE_CANCELLED", invoice=invoice,
                  old_value={"status": old_status}, new_value={"status": invoice.status})
    db.commit()
    db.refresh(invoice)
    return serialize_invoice(db, invoice)


def create_payment(db: Session, user: User, payload: PaymentCreate) -> PaymentOut:
    require_module_access(db, user, "payments", write=True)
    ensure_write_allowed(user)
    ensure_default_payment_methods(db, user)
    get_patient_or_404(db, user, payload.patient_id)
    fee = get_scoped(db, user, Fee, payload.fee_id, "Honoraire")
    if fee.patient_id != payload.patient_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Le paiement et l’honoraire doivent appartenir au même patient.")
    if fee.status == "cancelled":
        raise HTTPException(status_code=409, detail="Un paiement ne peut pas être ajouté à un honoraire annulé.")
    if float(fee.paid_amount) + payload.amount > float(fee.amount):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Le paiement dépasse le reste à payer de cet honoraire.")
    invoice = None
    if payload.invoice_id:
        invoice = get_scoped(db, user, Invoice, payload.invoice_id, "Facture")
        if invoice.patient_id != payload.patient_id:
            raise HTTPException(status_code=422, detail="Le paiement et la facture doivent appartenir au même patient.")
        if payload.fee_id and invoice.fee_id != payload.fee_id:
            raise HTTPException(status_code=422, detail="La facture ne correspond pas à l’honoraire sélectionné.")
    if invoice is None:
        invoice = db.scalar(select(Invoice).where(Invoice.tenant_id == require_tenant(user), Invoice.fee_id == fee.id))
    if invoice is None:
        create_invoice(db, user, fee.id)
        invoice = db.scalar(select(Invoice).where(Invoice.tenant_id == require_tenant(user), Invoice.fee_id == fee.id))
    payment_data = payload.model_dump()
    # A received cheque can have no destination yet. Never persist an empty
    # string into the bank-account foreign key.
    payment_data["bank_account_id"] = payment_data.get("bank_account_id") or None
    payment_data["invoice_id"] = invoice.id
    payment_data["doctor_id"] = fee.doctor_id
    due_row = None
    if payload.due_date_id:
        due_row = get_scoped(db, user, PaymentDueDate, payload.due_date_id, "Échéance")
        if due_row.invoice_id != invoice.id:
            raise HTTPException(status_code=422, detail="L’échéance ne correspond pas à la facture de cet honoraire.")
        if due_row.status == "ANNULEE":
            raise HTTPException(status_code=409, detail="Une échéance annulée ne peut pas être réglée.")
        committed = Decimal(str(db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.due_date_id == due_row.id, Payment.status.not_in({"ANNULE", "REMBOURSE"}))) or 0))
        if committed + Decimal(str(payload.amount)) > Decimal(due_row.amount):
            raise HTTPException(status_code=422, detail="Le paiement dépasse le reste à régler de cette échéance.")
    if payload.payment_method_id:
        method_row = get_scoped(db, user, PaymentMethod, payload.payment_method_id, "Mode de règlement")
        if not method_row.is_active:
            raise HTTPException(status_code=422, detail="Ce mode de règlement est inactif.")
        payment_data["method"] = method_row.code
    else:
        method_row = db.scalar(select(PaymentMethod).where(PaymentMethod.tenant_id == require_tenant(user), PaymentMethod.code == payload.method, PaymentMethod.is_active.is_(True)))
        if method_row is None:
            raise HTTPException(status_code=422, detail="Choisissez un mode de paiement actif dans la configuration.")
        payment_data["payment_method_id"] = method_row.id
    if payment_data["method"] == "cash":
        payment_data["bank_account_id"] = None
    else:
        if payment_data["method"] != "cheque" and not payload.bank_account_id:
            raise HTTPException(422, "Choisissez le compte bancaire du cabinet concerné par cette transaction.")
        if payload.bank_account_id:
            bank_account = get_scoped(db, user, CabinetBankAccount, payload.bank_account_id, "Compte bancaire")
            if not bank_account.is_active:
                raise HTTPException(422, "Le compte bancaire sélectionné est inactif.")
    payment_data["status"] = "PAYE"
    if payload.payment_type == "installment" and payload.due_date and payload.installment_count:
        payment_data["installment_schedule"] = build_installment_schedule(payload.amount, payload.due_date, payload.installment_count)
    payment = Payment(tenant_id=require_tenant(user), created_by_user_id=user.id, **payment_data)
    db.add(payment)
    db.flush()
    recalculate_fee(db, fee)
    allocate_invoice_due_dates(db, invoice)
    add_operation(db, user, "PAYMENT_CREATED", fee=fee, payment=payment,
                  new_value={"amount": float(payment.amount), "method": payment.method})
    add_operation(db, user, "RAP_RECALCULATED", fee=fee, payment=payment,
                  new_value={"remaining_amount": max(0, float(fee.amount) - float(fee.paid_amount))})
    db.commit()
    db.refresh(payment)
    return serialize_payments(db,[payment])[0]


def build_installment_schedule(amount: float, first_due_date: date, count: int) -> list[dict]:
    total_cents = int((Decimal(str(amount)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    base_cents, remainder = divmod(total_cents, count)
    schedule: list[dict] = []
    for index in range(count):
        month_index = first_due_date.month - 1 + index
        year = first_due_date.year + month_index // 12
        month = month_index % 12 + 1
        day = min(first_due_date.day, calendar.monthrange(year, month)[1])
        installment_amount = base_cents + (1 if index < remainder else 0)
        schedule.append({
            "number": index + 1,
            "due_date": date(year, month, day).isoformat(),
            "amount": installment_amount / 100,
            "status": "scheduled",
        })
    return schedule


def serialize_payments(db: Session, rows: list[Payment]) -> list[PaymentOut]:
    if not rows:
        return []
    patient_ids = {row.patient_id for row in rows}
    doctor_ids = {row.doctor_id for row in rows if row.doctor_id}
    fee_ids = {row.fee_id for row in rows if row.fee_id}
    bank_account_ids = {row.bank_account_id for row in rows if row.bank_account_id}
    patient_names = dict(
        db.execute(
            select(
                PatientProfile.id,
                func.concat(User.first_name, " ", User.last_name),
            )
            .join(User, User.id == PatientProfile.user_id)
            .where(PatientProfile.id.in_(patient_ids))
        ).all()
    )
    doctor_names = (
        dict(
            db.execute(
                select(
                    DoctorProfile.id,
                    func.concat("Dr ", User.first_name, " ", User.last_name),
                )
                .join(User, User.id == DoctorProfile.user_id)
                .where(DoctorProfile.id.in_(doctor_ids))
            ).all()
        )
        if doctor_ids
        else {}
    )
    fee_titles = (
        dict(db.execute(select(Fee.id, Fee.title).where(Fee.id.in_(fee_ids))).all())
        if fee_ids
        else {}
    )
    bank_accounts = {
        row.id: row
        for row in db.scalars(
            select(CabinetBankAccount).where(CabinetBankAccount.id.in_(bank_account_ids))
        ).all()
    } if bank_account_ids else {}
    return [
        PaymentOut.model_validate(row, from_attributes=True).model_copy(
            update={
                "patient_name": patient_names.get(row.patient_id),
                "doctor_name": doctor_names.get(row.doctor_id),
                "fee_title": fee_titles.get(row.fee_id),
                "bank_account_label": bank_accounts[row.bank_account_id].label if row.bank_account_id in bank_accounts else None,
                "bank_name": bank_accounts[row.bank_account_id].bank_name if row.bank_account_id in bank_accounts else None,
                "cheque_documents_complete": bool(row.cheque_copy_path and row.cheque_owner_cin_path),
            }
        )
        for row in rows
    ]


def list_payments(db: Session, user: User, patient_id: str | None = None) -> list[PaymentOut]:
    require_module_access(db, user, "payments")
    query = select(Payment).join(PatientProfile).where(Payment.tenant_id == require_tenant(user)).order_by(Payment.paid_at.desc())
    if patient_id: query = query.where(Payment.patient_id == patient_id)
    return serialize_payments(db,list(db.scalars(patient_scope_filter(query, user)).all()))


def paginate_payments(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    status_filter: str | None = None,
    method: str | None = None,
    patient_id: str | None = None,
) -> dict:
    require_module_access(db, user, "payments")
    tenant_id = require_tenant(user)
    conditions = [Payment.tenant_id == tenant_id]
    query = (
        select(Payment)
        .join(PatientProfile)
        .join(User, User.id == PatientProfile.user_id)
    )
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        conditions.append(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                Payment.reference.ilike(pattern),
                Payment.method.ilike(pattern),
            )
        )
    if status_filter:
        conditions.append(Payment.status == status_filter)
    if method:
        conditions.append(Payment.method == method)
    if patient_id:
        conditions.append(Payment.patient_id == patient_id)
    query = patient_scope_filter(query.where(*conditions), user)
    total = int(
        db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
        or 0
    )
    sort_columns = {
        "created_at": Payment.paid_at,
        "paid_at": Payment.paid_at,
        "amount": Payment.amount,
        "status": Payment.status,
    }
    column = sort_columns.get(sort_by, Payment.paid_at)
    ordering = column.asc() if sort_order == "asc" else column.desc()
    rows = list(
        db.scalars(
            query.order_by(ordering)
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    collected_query = (
        select(func.coalesce(func.sum(Payment.amount), 0))
        .join(PatientProfile)
        .where(Payment.tenant_id == tenant_id, valid_payment_condition())
    )
    collected = float(
        db.scalar(patient_scope_filter(collected_query, user)) or 0
    )
    collected_count_query = (
        select(func.count(Payment.id))
        .join(PatientProfile)
        .where(Payment.tenant_id == tenant_id, valid_payment_condition())
    )
    collected_count = int(
        db.scalar(patient_scope_filter(collected_count_query, user)) or 0
    )
    return {
        "items": serialize_payments(db, rows),
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        },
        "summary": {
            "collected_payments": collected,
            "collected_count": collected_count,
        },
    }


def update_payment(db: Session, user: User, payment_id: str, payload: PaymentUpdate) -> PaymentOut:
    require_module_access(db, user, "payments", write=True)
    ensure_write_allowed(user)
    payment = get_scoped(db, user, Payment, payment_id, "Paiement")
    if payment.status in {"ANNULE","REMBOURSE"}:
        raise HTTPException(409,"Un paiement annulé ou remboursé ne peut plus être modifié.")
    old_value = {"amount": float(payment.amount), "method": payment.method}
    fee = get_scoped(db, user, Fee, payment.fee_id, "Honoraire") if payment.fee_id else None
    target_due_id = payload.due_date_id if "due_date_id" in payload.model_fields_set else payment.due_date_id
    target_amount = Decimal(str(payload.amount if payload.amount is not None else payment.amount))
    if target_due_id:
        due_row = get_scoped(db, user, PaymentDueDate, target_due_id, "Échéance")
        invoice = get_scoped(db, user, Invoice, payment.invoice_id, "Facture") if payment.invoice_id else None
        if not invoice or due_row.invoice_id != invoice.id:
            raise HTTPException(status_code=422, detail="L’échéance ne correspond pas à la facture de ce paiement.")
        if due_row.status == "ANNULEE":
            raise HTTPException(status_code=409, detail="Une échéance annulée ne peut pas être réglée.")
        committed = Decimal(str(db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.due_date_id == due_row.id, Payment.id != payment.id, Payment.status.not_in({"ANNULE", "REMBOURSE"}))) or 0))
        if committed + target_amount > Decimal(due_row.amount):
            raise HTTPException(status_code=422, detail="Le paiement dépasse le reste à régler de cette échéance.")
    if fee and payload.amount is not None:
        paid_without_current = float(db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.fee_id == fee.id, Payment.id != payment.id, valid_payment_condition())) or 0)
        if paid_without_current + payload.amount > float(fee.amount):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Le paiement dépasse le reste à payer de cet honoraire.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "bank_account_id":
            value = value or None
        setattr(payment, field, value)
    if payment.method == "cheque":
        if payment.cheque_status == "DEPOSE":
            if not payment.cheque_deposit_date or not payment.bank_account_id:
                raise HTTPException(422, "Indiquez la date de dépôt et le compte bancaire du cabinet.")
            payment.cheque_collection_method = "DEPOT_BANCAIRE"
        elif payment.cheque_status == "ENCAISSE":
            if not payment.cheque_collection_method:
                raise HTTPException(422, "Indiquez si le chèque a été encaissé en espèces ou par dépôt bancaire.")
            if payment.cheque_collection_method == "DEPOT_BANCAIRE" and not payment.bank_account_id:
                raise HTTPException(422, "Choisissez le compte bancaire crédité.")
            if not payment.cheque_cashing_date:
                raise HTTPException(422, "La date d’encaissement réelle est obligatoire.")
            payment.cheque_rejection_reason = None
            payment.cheque_rejected_at = None
        elif payment.cheque_status == "REJETE":
            if not (payment.cheque_rejection_reason or "").strip():
                raise HTTPException(422, "Le motif du rejet est obligatoire.")
            payment.cheque_rejected_at = payment.cheque_rejected_at or date.today()
            payment.cheque_cashing_date = None
        elif payment.cheque_status == "RECU":
            payment.cheque_deposit_date = None
            payment.cheque_cashing_date = None
            payment.cheque_collection_method = None
            payment.cheque_rejection_reason = None
            payment.cheque_rejected_at = None
    if payment.method == "cash":
        payment.bank_account_id = None
    else:
        if payment.method != "cheque" and not payment.bank_account_id:
            raise HTTPException(422, "Choisissez le compte bancaire du cabinet concerné par cette transaction.")
        if payment.bank_account_id:
            bank_account = get_scoped(db, user, CabinetBankAccount, payment.bank_account_id, "Compte bancaire")
            if not bank_account.is_active:
                raise HTTPException(422, "Le compte bancaire sélectionné est inactif.")
    if payment.payment_type == "installment" and payment.due_date and payment.installment_count:
        payment.installment_schedule = build_installment_schedule(float(payment.amount), payment.due_date, payment.installment_count)
    elif payment.payment_type != "installment":
        payment.installment_count = None
        payment.installment_schedule = None
    db.flush()
    if fee:
        recalculate_fee(db, fee)
        invoice = db.scalar(select(Invoice).where(Invoice.fee_id == fee.id))
        if invoice: allocate_invoice_due_dates(db, invoice)
    add_operation(db, user, "PAYMENT_UPDATED", fee=fee, payment=payment, old_value=old_value,
                  new_value={"amount": float(payment.amount), "method": payment.method})
    db.commit()
    db.refresh(payment)
    return serialize_payments(db,[payment])[0]


def valid_payment_condition():
    return and_(Payment.status.not_in({"ANNULE", "REMBOURSE"}), or_(Payment.method != "cheque", Payment.cheque_status == "ENCAISSE"))


def recalculate_fee(db: Session, fee: Fee) -> None:
    paid_amount = float(db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.fee_id == fee.id, valid_payment_condition())) or 0)
    fee.paid_amount = paid_amount
    if fee.status not in {"draft", "cancelled"}:
        fee.status = "paid" if paid_amount >= float(fee.amount) else "partially_paid" if paid_amount > 0 else "in_progress"
    invoice = db.scalar(select(Invoice).where(Invoice.fee_id == fee.id))
    if invoice:
        invoice.amount_paid = paid_amount
        invoice.amount_due = max(0, float(invoice.amount_total) - paid_amount)
        invoice.status = "PAYEE" if invoice.amount_due == 0 else "EN_RETARD" if invoice.due_date and invoice.due_date < date.today() else "PARTIELLEMENT_PAYEE" if paid_amount > 0 else "EMISE"


def delete_payment(db: Session, user: User, payment_id: str) -> dict[str, str]:
    require_module_access(db, user, "payments", admin=True)
    ensure_write_allowed(user)
    payment = get_scoped(db, user, Payment, payment_id, "Paiement")
    if payment.status=="ANNULE":raise HTTPException(409,"Ce paiement est déjà annulé.")
    if payment.status=="REMBOURSE":raise HTTPException(409,"Un paiement remboursé ne peut pas être annulé.")
    fee = get_scoped(db, user, Fee, payment.fee_id, "Honoraire") if payment.fee_id else None
    old_status = payment.status
    payment.status = "ANNULE"
    db.flush()
    if fee:
        recalculate_fee(db, fee)
        invoice = db.scalar(select(Invoice).where(Invoice.fee_id == fee.id))
        if invoice: allocate_invoice_due_dates(db, invoice)
    add_operation(db, user, "PAYMENT_CANCELLED", fee=fee, payment=payment,
                  old_value={"status": old_status, "amount": float(payment.amount)}, new_value={"status": "ANNULE"})
    db.commit()
    return {"status": "cancelled"}


def ensure_default_payment_methods(db: Session, user: User) -> None:
    tenant_id = require_tenant(user)
    existing = set(db.scalars(select(PaymentMethod.code).where(PaymentMethod.tenant_id == tenant_id)).all())
    defaults = [
        ("Espèces", "cash", "ESPECE", None),
        ("Chèque", "cheque", "BANQUE", "CHEQUE"),
        ("Carte bancaire", "card", "BANQUE", "CARTE"),
        ("Virement bancaire", "transfer", "BANQUE", "VIREMENT"),
    ]
    created = False
    for name, code, main_type, subtype in defaults:
        if code not in existing:
            db.add(PaymentMethod(tenant_id=tenant_id, name=name, code=code, main_type=main_type, subtype=subtype, is_active=True))
            created = True
    if created:
        db.commit()


def payment_method_list(db: Session, user: User, main_type: str | None = None, active: bool | None = None) -> list[PaymentMethodOut]:
    require_module_access(db, user, "payments")
    ensure_default_payment_methods(db, user)
    query = select(PaymentMethod).where(PaymentMethod.tenant_id == require_tenant(user))
    if main_type:
        query = query.where(PaymentMethod.main_type == main_type)
    if active is not None:
        query = query.where(PaymentMethod.is_active == active)
    return [PaymentMethodOut.model_validate(row, from_attributes=True) for row in db.scalars(query.order_by(PaymentMethod.name)).all()]


def payment_method_create(db: Session, user: User, payload: PaymentMethodCreate) -> PaymentMethodOut:
    require_module_access(db, user, "payments", admin=True); ensure_write_allowed(user)
    row = PaymentMethod(tenant_id=require_tenant(user), **payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return PaymentMethodOut.model_validate(row, from_attributes=True)


def payment_method_update(db: Session, user: User, item_id: str, payload: PaymentMethodUpdate) -> PaymentMethodOut:
    require_module_access(db, user, "payments", admin=True); ensure_write_allowed(user)
    row = get_scoped(db, user, PaymentMethod, item_id, "Mode de règlement")
    for field, value in payload.model_dump(exclude_unset=True).items(): setattr(row, field, value)
    db.commit(); db.refresh(row)
    return PaymentMethodOut.model_validate(row, from_attributes=True)


def bank_account_list(db: Session, user: User, active: bool | None = None) -> list[BankAccountOut]:
    require_module_access(db, user, "payments")
    query = select(CabinetBankAccount).where(CabinetBankAccount.tenant_id == require_tenant(user))
    if active is not None:
        query = query.where(CabinetBankAccount.is_active.is_(active))
    rows = db.scalars(query.order_by(CabinetBankAccount.is_default.desc(), CabinetBankAccount.label)).all()
    return [BankAccountOut.model_validate(row, from_attributes=True) for row in rows]


def bank_account_create(db: Session, user: User, payload: BankAccountCreate) -> BankAccountOut:
    require_module_access(db, user, "payments", admin=True)
    ensure_write_allowed(user)
    data = payload.model_dump()
    data["rib"] = data["rib"].replace(" ", "").upper()
    data["iban"] = data["iban"].replace(" ", "").upper() if data.get("iban") else None
    if data["is_default"]:
        db.query(CabinetBankAccount).filter(CabinetBankAccount.tenant_id == require_tenant(user)).update({"is_default": False})
    row = CabinetBankAccount(tenant_id=require_tenant(user), **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return BankAccountOut.model_validate(row, from_attributes=True)


def bank_account_update(db: Session, user: User, item_id: str, payload: BankAccountUpdate) -> BankAccountOut:
    require_module_access(db, user, "payments", admin=True)
    ensure_write_allowed(user)
    row = get_scoped(db, user, CabinetBankAccount, item_id, "Compte bancaire")
    data = payload.model_dump(exclude_unset=True)
    if "rib" in data and data["rib"]:
        data["rib"] = data["rib"].replace(" ", "").upper()
    if "iban" in data and data["iban"]:
        data["iban"] = data["iban"].replace(" ", "").upper()
    if data.get("is_default"):
        db.query(CabinetBankAccount).filter(
            CabinetBankAccount.tenant_id == require_tenant(user),
            CabinetBankAccount.id != row.id,
        ).update({"is_default": False})
        data["is_active"] = True
    for field, value in data.items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return BankAccountOut.model_validate(row, from_attributes=True)


def refresh_due_status(row: PaymentDueDate) -> None:
    if row.status == "ANNULEE": return
    amount, paid = Decimal(row.amount or 0), Decimal(row.paid_amount or 0)
    row.status = "PAYEE" if paid >= amount else "EN_RETARD" if row.due_date < date.today() else "PARTIELLEMENT_PAYEE" if paid > 0 else "EN_ATTENTE" if row.due_date == date.today() else "A_VENIR"


def allocate_invoice_due_dates(db: Session, invoice: Invoice) -> None:
    for row in db.scalars(select(PaymentDueDate).where(PaymentDueDate.invoice_id == invoice.id).order_by(PaymentDueDate.due_date, PaymentDueDate.created_at)).all():
        if row.status == "ANNULEE": continue
        row.paid_amount = Decimal(str(db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.due_date_id == row.id, valid_payment_condition())) or 0))
        refresh_due_status(row)


def due_date_create(db: Session, user: User, invoice_id: str, payload: DueDateCreate) -> DueDateOut:
    require_module_access(db, user, "payments", write=True); ensure_write_allowed(user)
    invoice = get_invoice(db, user, invoice_id)
    scheduled = Decimal(str(db.scalar(select(func.coalesce(func.sum(PaymentDueDate.amount), 0)).where(PaymentDueDate.invoice_id == invoice.id, PaymentDueDate.status != "ANNULEE")) or 0))
    if scheduled + payload.amount > Decimal(invoice.amount_total): raise HTTPException(422, "La somme des échéances dépasse le total de la facture.")
    row = PaymentDueDate(tenant_id=require_tenant(user), invoice_id=invoice.id, patient_id=invoice.patient_id, fee_id=invoice.fee_id, created_by_user_id=user.id, **payload.model_dump())
    refresh_due_status(row); db.add(row); db.flush(); allocate_invoice_due_dates(db, invoice)
    add_operation(db, user, "DUE_DATE_CREATED", invoice=invoice, new_value={"amount": float(row.amount), "due_date": row.due_date.isoformat()})
    db.commit(); db.refresh(row); return DueDateOut.model_validate(row, from_attributes=True)


def due_date_list(db: Session, user: User, invoice_id: str) -> list[DueDateOut]:
    invoice = get_invoice(db, user, invoice_id)
    rows = db.scalars(select(PaymentDueDate).where(PaymentDueDate.tenant_id == require_tenant(user), PaymentDueDate.invoice_id == invoice.id).order_by(PaymentDueDate.due_date)).all()
    for row in rows: refresh_due_status(row)
    db.commit()
    return [DueDateOut.model_validate(row, from_attributes=True) for row in rows]


def all_due_dates(db: Session, user: User) -> list[DueDateOut]:
    require_module_access(db, user, "payments")
    query = select(PaymentDueDate).where(PaymentDueDate.tenant_id == require_tenant(user)).order_by(PaymentDueDate.due_date)
    rows = db.scalars(query).all()
    for row in rows: refresh_due_status(row)
    db.commit()
    return [DueDateOut.model_validate(row, from_attributes=True) for row in rows]


def paginate_due_dates(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_order: str,
    status_filter: str | None = None,
) -> dict:
    require_module_access(db, user, "payments")
    query = select(PaymentDueDate).where(
        PaymentDueDate.tenant_id == require_tenant(user)
    )
    if status_filter:
        query = query.where(PaymentDueDate.status == status_filter)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(PaymentDueDate.comment.ilike(pattern))
    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=PaymentDueDate.due_date,
        sort_order=sort_order,
        serializer=lambda rows: [
            DueDateOut.model_validate(row, from_attributes=True) for row in rows
        ],
    )


def due_date_update(db: Session, user: User, item_id: str, payload: DueDateUpdate) -> DueDateOut:
    require_module_access(db, user, "payments", write=True); ensure_write_allowed(user)
    row = get_scoped(db, user, PaymentDueDate, item_id, "Échéance"); invoice = get_invoice(db, user, row.invoice_id)
    old = {"amount": float(row.amount), "due_date": row.due_date.isoformat(), "status": row.status}
    if payload.amount is not None:
        other_scheduled = Decimal(str(db.scalar(select(func.coalesce(func.sum(PaymentDueDate.amount), 0)).where(PaymentDueDate.invoice_id == invoice.id, PaymentDueDate.id != row.id, PaymentDueDate.status != "ANNULEE")) or 0))
        if other_scheduled + payload.amount > Decimal(invoice.amount_total):
            raise HTTPException(422, "La somme des échéances dépasse le total de la facture.")
        if payload.amount < Decimal(row.paid_amount):
            raise HTTPException(422, "Le montant prévu ne peut pas être inférieur au montant déjà payé.")
    for field, value in payload.model_dump(exclude_unset=True).items(): setattr(row, field, value)
    row.updated_by_user_id = user.id
    refresh_due_status(row); allocate_invoice_due_dates(db, invoice)
    add_operation(db, user, "DUE_DATE_UPDATED", invoice=invoice, old_value=old, new_value={"amount": float(row.amount), "due_date": row.due_date.isoformat(), "status": row.status})
    db.commit(); db.refresh(row); return DueDateOut.model_validate(row, from_attributes=True)


def due_date_get(db: Session, user: User, item_id: str) -> DueDateOut:
    require_module_access(db, user, "payments")
    row = get_scoped(db, user, PaymentDueDate, item_id, "Échéance")
    refresh_due_status(row); db.commit(); db.refresh(row)
    return DueDateOut.model_validate(row, from_attributes=True)


def due_date_cancel(db: Session, user: User, item_id: str) -> DueDateOut:
    require_module_access(db, user, "payments", write=True); ensure_write_allowed(user)
    row = get_scoped(db, user, PaymentDueDate, item_id, "Échéance")
    if Decimal(row.paid_amount) > 0:
        raise HTTPException(409, "Une échéance ayant des paiements valides ne peut pas être annulée.")
    old_status = row.status; row.status = "ANNULEE"; row.updated_by_user_id = user.id
    invoice = get_invoice(db, user, row.invoice_id)
    add_operation(db, user, "DUE_DATE_CANCELLED", invoice=invoice, old_value={"status": old_status}, new_value={"status": "ANNULEE"})
    db.commit(); db.refresh(row)
    return DueDateOut.model_validate(row, from_attributes=True)


def create_cnss(db: Session, user: User, payload: CNSSCreate) -> CNSSOut:
    require_module_access(db, user, "cnss", write=True)
    ensure_write_allowed(user)
    get_patient_or_404(db, user, payload.patient_id)
    if payload.fee_id:
        fee = get_scoped(db, user, Fee, payload.fee_id, "Honoraire")
        if fee.patient_id != payload.patient_id: raise HTTPException(422, "L’honoraire ne correspond pas au patient.")
    if payload.visit_id:
        visit = get_scoped(db, user, Visit, payload.visit_id, "Visite")
        if visit.patient_id != payload.patient_id: raise HTTPException(422, "La visite ne correspond pas au patient.")
    if payload.appointment_id:
        appointment = get_scoped(db, user, Appointment, payload.appointment_id, "Rendez-vous")
        if appointment.patient_id != payload.patient_id: raise HTTPException(422, "Le rendez-vous ne correspond pas au patient.")
    data = payload.model_dump()
    data["total_amount"] = data.get("total_amount") if data.get("total_amount") is not None else data["requested_amount"]
    data["estimated_reimbursable_amount"] = data.get("estimated_reimbursable_amount") if data.get("estimated_reimbursable_amount") is not None else data["requested_amount"]
    data["status"] = "REQUESTED"
    data["deposit_deadline"] = data.get("deposit_deadline") or (date.today() + timedelta(days=30))
    item = CNSSCase(tenant_id=require_tenant(user), created_by_user_id=user.id, **data)
    db.add(item)
    db.flush()
    db.add(CNSSStatusHistory(tenant_id=item.tenant_id, cnss_case_id=item.id, old_status=None, new_status=item.status, changed_by_user_id=user.id, changed_by_role=role_code(user), comment="Demande CNSS/CNOPS créée par le cabinet.",event_metadata={"appointment_id":item.appointment_id,"visit_id":item.visit_id,"fee_id":item.fee_id}))
    db.commit()
    db.refresh(item)
    return CNSSOut.model_validate(item, from_attributes=True)


def serialize_cnss_items(db: Session, items: list[CNSSCase], *, hide_internal_notes: bool = False) -> list[CNSSOut]:
    if not items: return []
    patient_ids = {item.patient_id for item in items}
    case_ids = {item.id for item in items}
    tenant_ids = {item.tenant_id for item in items}
    fee_ids = {item.fee_id for item in items if item.fee_id}
    visit_ids = {item.visit_id for item in items if item.visit_id}
    appointment_ids = {item.appointment_id for item in items if item.appointment_id}
    names = {
        patient_id: f"{first_name} {last_name}".strip()
        for patient_id, first_name, last_name in db.execute(
            select(PatientProfile.id, User.first_name, User.last_name)
            .join(User, User.id == PatientProfile.user_id)
            .where(PatientProfile.id.in_(patient_ids))
        ).all()
    }
    fees = {row.id: row for row in db.scalars(select(Fee).where(Fee.id.in_(fee_ids))).all()} if fee_ids else {}
    visits = {row.id: row for row in db.scalars(select(Visit).where(Visit.id.in_(visit_ids))).all()} if visit_ids else {}
    appointments = {row.id: row for row in db.scalars(select(Appointment).where(Appointment.id.in_(appointment_ids))).all()} if appointment_ids else {}
    doctor_ids = {
        doctor_id
        for item in items
        if (doctor_id := (
            appointments[item.appointment_id].doctor_id if item.appointment_id in appointments
            else visits[item.visit_id].doctor_id if item.visit_id in visits
            else fees[item.fee_id].doctor_id if item.fee_id in fees
            else None
        ))
    }
    doctor_names = {
        doctor_id: f"Dr {first_name} {last_name}".strip()
        for doctor_id, first_name, last_name in db.execute(
            select(DoctorProfile.id, User.first_name, User.last_name)
            .join(User, User.id == DoctorProfile.user_id)
            .where(DoctorProfile.id.in_(doctor_ids))
        ).all()
    } if doctor_ids else {}
    cabinet_names = dict(db.execute(select(Tenant.id, Tenant.name).where(Tenant.id.in_(tenant_ids))).all())
    document_counts = dict(db.execute(
        select(MedicalDocument.cnss_case_id, func.count(MedicalDocument.id))
        .where(MedicalDocument.tenant_id.in_(tenant_ids), MedicalDocument.cnss_case_id.in_(case_ids), MedicalDocument.archived_at.is_(None))
        .group_by(MedicalDocument.cnss_case_id)
    ).all())
    result = []
    for item in items:
        appointment = appointments.get(item.appointment_id)
        visit = visits.get(item.visit_id)
        fee = fees.get(item.fee_id)
        doctor_id = appointment.doctor_id if appointment else visit.doctor_id if visit else fee.doctor_id if fee else None
        linked_item_label = (
            f"Rendez-vous du {appointment.date.strftime('%d/%m/%Y')} · {appointment.reason or 'Consultation'}"
            if appointment else
            f"Visite du {visit.visit_date.strftime('%d/%m/%Y')} · {visit.reason or 'Consultation'}"
            if visit else
            f"Acte / honoraire · {fee.title}"
            if fee else None
        )
        result.append(CNSSOut.model_validate(item, from_attributes=True).model_copy(update={
            "patient_name": names.get(item.patient_id),
            "cabinet_name": cabinet_names.get(item.tenant_id),
            "doctor_id": doctor_id,
            "doctor_name": doctor_names.get(doctor_id),
            "linked_item_label": linked_item_label,
            "internal_notes": None if hide_internal_notes else item.internal_notes,
            "document_count": int(document_counts.get(item.id, 0)),
        }))
    return result


def list_cnss(db: Session, user: User, patient_id: str | None = None) -> list[CNSSOut]:
    require_module_access(db, user, "cnss")
    query = select(CNSSCase).join(PatientProfile).where(CNSSCase.tenant_id == require_tenant(user)).order_by(CNSSCase.created_at.desc())
    if patient_id: query = query.where(CNSSCase.patient_id == patient_id)
    items = list(db.scalars(patient_scope_filter(query, user)).all())
    return serialize_cnss_items(db, items)


def paginate_cnss(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    status_filter: str | None = None,
    doctor_id: str | None = None,
    cabinet_name: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    patient_id: str | None = None,
) -> dict:
    require_module_access(db, user, "cnss")
    query = (
        select(CNSSCase)
        .join(PatientProfile)
        .join(User, User.id == PatientProfile.user_id)
        .join(Tenant, Tenant.id == CNSSCase.tenant_id)
        .where(CNSSCase.tenant_id == require_tenant(user))
    )
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                CNSSCase.reference.ilike(pattern),
                CNSSCase.label.ilike(pattern),
            )
        )
    if status_filter:
        query = query.where(CNSSCase.status == status_filter)
    if doctor_id:
        query = query.where(CNSSCase.doctor_id == doctor_id)
    if cabinet_name:
        query = query.where(Tenant.name == cabinet_name)
    if date_from:
        query = query.where(func.date(CNSSCase.created_at) >= date_from)
    if date_to:
        query = query.where(func.date(CNSSCase.created_at) <= date_to)
    if patient_id: query = query.where(CNSSCase.patient_id == patient_id)
    query = patient_scope_filter(query, user)
    sort_columns = {
        "created_at": CNSSCase.created_at,
        "amount": CNSSCase.total_amount,
        "status": CNSSCase.status,
        "patient_name": User.last_name,
    }
    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=sort_columns.get(sort_by, CNSSCase.created_at),
        sort_order=sort_order,
        serializer=lambda rows: serialize_cnss_items(db, rows),
    )


def update_cnss(db: Session, user: User, item_id: str, payload: CNSSUpdate) -> CNSSOut:
    require_module_access(db, user, "cnss", write=True)
    ensure_write_allowed(user)
    item = get_scoped(db, user, CNSSCase, item_id, "Dossier CNSS/CNOPS")
    data = payload.model_dump(exclude_unset=True)
    status_comment = data.pop("status_comment", None)
    correction_reason = data.pop("correction_reason", None)
    if data.get("fee_id"):
        fee = get_scoped(db, user, Fee, data["fee_id"], "Honoraire")
        if fee.patient_id != item.patient_id: raise HTTPException(422, "L’honoraire ne correspond pas au patient.")
    if data.get("visit_id"):
        visit = get_scoped(db, user, Visit, data["visit_id"], "Visite")
        if visit.patient_id != item.patient_id: raise HTTPException(422, "La visite ne correspond pas au patient.")
    if data.get("appointment_id"):
        appointment = get_scoped(db, user, Appointment, data["appointment_id"], "Rendez-vous")
        if appointment.patient_id != item.patient_id: raise HTTPException(422, "Le rendez-vous ne correspond pas au patient.")
    old_status = item.status
    new_status = data.get("status", old_status)
    order={"REQUESTED":0,"PROCESSING":1,"READY_FOR_PICKUP":2,"DELIVERED_TO_PATIENT":3,"SUBMITTED_TO_CNSS":4,"APPROVED":5,"REJECTED":5}
    correction=new_status!=old_status and order.get(new_status,-1)<order.get(old_status,-1)
    if correction:
        if role_code(user)!="MEDECIN_ADMIN":raise HTTPException(403,"La correction d’un statut est réservée au médecin administrateur.")
        if not (correction_reason or "").strip():raise HTTPException(422,"Le motif de correction est obligatoire.")
    elif new_status != old_status and new_status not in CNSS_CABINET_TRANSITIONS.get(old_status, set()):
        raise HTTPException(409, f"Transition CNSS/CNOPS impossible : {old_status} → {new_status}.")
    if new_status=="DELIVERED_TO_PATIENT" and old_status=="READY_FOR_PICKUP":
        data["delivery_confirmed_at"]=datetime.now(UTC);item.delivery_confirmed_by_user_id=user.id
    total_amount = Decimal(str(data.get("total_amount", item.total_amount or item.requested_amount or 0)))
    reimbursed_amount = Decimal(str(data.get("reimbursed_amount", item.reimbursed_amount or 0)))
    if reimbursed_amount > total_amount:
        raise HTTPException(422, "Le montant remboursé ne peut pas dépasser le montant total du dossier.")
    if "requested_amount" in data and "estimated_reimbursable_amount" not in data:
        data["estimated_reimbursable_amount"] = data["requested_amount"]
    for field, value in data.items():
        setattr(item, field, value)
    item.updated_by_user_id = user.id
    if new_status != old_status:
        event_comment=(correction_reason or "").strip() if correction else status_comment
        db.add(CNSSStatusHistory(tenant_id=item.tenant_id, cnss_case_id=item.id, old_status=old_status, new_status=new_status, changed_by_user_id=user.id,changed_by_role=role_code(user),comment=event_comment,event_metadata={"correction":correction,"delivery_confirmed_at":str(data.get("delivery_confirmed_at")) if data.get("delivery_confirmed_at") else None}))
        labels={"PROCESSING":"en cours de préparation","READY_FOR_PICKUP":"disponible au cabinet","DELIVERED_TO_PATIENT":"remis au patient"}
        if new_status in labels:
            db.add(PatientNotification(tenant_id=item.tenant_id, patient_id=item.patient_id, notification_type="CNSS_STATUS", title="Mise à jour de votre dossier CNSS/CNOPS", message=f"Votre dossier CNSS/CNOPS « {item.label} » est maintenant {labels[new_status]}.", resource_id=item.id))
    db.commit()
    db.refresh(item)
    return CNSSOut.model_validate(item, from_attributes=True)


def search_medications(
    db: Session,
    user: User,
    *,
    query_text: str | None = None,
    specialty: str | None = None,
    limit: int = 50,
) -> list[MedicationCatalogOut]:
    require_module_access(db, user, "prescriptions")
    tenant_id = require_tenant(user)
    query = select(MedicationCatalog).where(
        MedicationCatalog.is_active.is_(True),
        or_(MedicationCatalog.tenant_id.is_(None), MedicationCatalog.tenant_id == tenant_id),
    ).order_by(MedicationCatalog.name).limit(500)
    if query_text and query_text.strip():
        pattern = f"%{query_text.strip()}%"
        query = query.where(or_(
            MedicationCatalog.name.ilike(pattern),
            MedicationCatalog.generic_name.ilike(pattern),
            MedicationCatalog.external_code.ilike(pattern),
        ))
    rows = list(db.scalars(query).all())
    if specialty and specialty.strip():
        normalized = specialty.strip().casefold()
        rows = [
            row for row in rows
            if not row.specialties or any(
                normalized in str(value).casefold() or str(value).casefold() in normalized
                for value in row.specialties
            )
        ]
    return [MedicationCatalogOut.model_validate(row) for row in rows[:limit]]


def medication_specialties(db: Session, user: User) -> list[str]:
    require_module_access(db, user, "prescriptions")
    tenant_id = require_tenant(user)
    rows = db.scalars(select(MedicationCatalog.specialties).where(
        MedicationCatalog.is_active.is_(True),
        or_(MedicationCatalog.tenant_id.is_(None), MedicationCatalog.tenant_id == tenant_id),
    )).all()
    return sorted({str(value).strip() for values in rows if values for value in values if str(value).strip()})


def normalize_prescription_items(db: Session, user: User, items) -> list[dict] | None:
    if items is None:
        return None
    tenant_id = require_tenant(user)
    normalized = []
    for row in items:
        data = row.model_dump()
        catalog_id = data.get("catalog_medication_id")
        if catalog_id:
            medication = db.scalar(select(MedicationCatalog).where(
                MedicationCatalog.id == catalog_id,
                MedicationCatalog.is_active.is_(True),
                or_(MedicationCatalog.tenant_id.is_(None), MedicationCatalog.tenant_id == tenant_id),
            ))
            if not medication:
                raise HTTPException(422, "Le médicament sélectionné est introuvable ou inactif.")
            data["medication_source"] = "catalog"
            data["medication"] = medication.name
            data["dosage"] = data.get("dosage") or medication.default_dosage or medication.strength
            data["form"] = data.get("form") or medication.form
            data["route"] = data.get("route") or medication.route
            data["frequency"] = data.get("frequency") or medication.default_frequency
            data["duration"] = data.get("duration") or medication.default_duration
            data["instructions"] = data.get("instructions") or medication.default_instructions
            data["catalog_snapshot"] = {
                "id": medication.id,
                "source": medication.source,
                "external_code": medication.external_code,
                "name": medication.name,
                "generic_name": medication.generic_name,
                "strength": medication.strength,
                "specialties": medication.specialties,
                "captured_at": datetime.now(UTC).isoformat(),
            }
        else:
            data["medication_source"] = "custom"
            data["catalog_snapshot"] = None
        normalized.append(data)
    return normalized


def create_prescription(db: Session, user: User, payload: PrescriptionCreate) -> PrescriptionOut:
    require_module_access(db, user, "prescriptions", write=True)
    ensure_write_allowed(user)
    get_patient_or_404(db, user, payload.patient_id)
    if payload.appointment_id:
        appointment = get_scoped(db, user, Appointment, payload.appointment_id, "Rendez-vous")
        if appointment.patient_id != payload.patient_id: raise HTTPException(422, "Le rendez-vous ne correspond pas au patient.")
    if payload.visit_id:
        visit = get_scoped(db, user, Visit, payload.visit_id, "Visite")
        if visit.patient_id != payload.patient_id: raise HTTPException(422, "La visite ne correspond pas au patient.")
    data = payload.model_dump(); requested_doctor_id = data.pop("doctor_id", None); data["items"] = normalize_prescription_items(db,user,payload.items)
    item = Prescription(tenant_id=require_tenant(user), prescription_number=f"ORD-{datetime.now(UTC).strftime('%Y%m%d')}-{uuid4().hex[:8].upper()}", **data, doctor_id=get_doctor_id(db, user, requested_doctor_id))
    db.add(item)
    db.flush()
    from app.services.prescription_document_service import generate_and_archive
    document = generate_and_archive(db, item, user)
    add_operation(db, user, "PRESCRIPTION_CREATED", prescription=item, document=document, description=f"Ordonnance {item.prescription_number} créée et archivée dans le dossier patient.", new_value={"number": item.prescription_number, "pdf_document_id": document.id})
    db.commit()
    db.refresh(item)
    return serialize_prescriptions(db,[item])[0]


def list_prescriptions(db: Session, user: User, patient_id: str | None = None) -> list[PrescriptionOut]:
    require_module_access(db, user, "prescriptions")
    query = select(Prescription).join(PatientProfile).where(Prescription.tenant_id == require_tenant(user)).order_by(Prescription.created_at.desc())
    if patient_id: query = query.where(Prescription.patient_id == patient_id)
    return serialize_prescriptions(db,list(db.scalars(patient_scope_filter(query, user)).all()))


def paginate_prescriptions(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    patient_id: str | None = None,
) -> dict:
    require_module_access(db, user, "prescriptions")
    query = (
        select(Prescription)
        .join(PatientProfile)
        .join(User, User.id == PatientProfile.user_id)
        .where(Prescription.tenant_id == require_tenant(user))
    )
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                Prescription.prescription_number.ilike(pattern),
                Prescription.content.ilike(pattern),
            )
        )
    if patient_id: query = query.where(Prescription.patient_id == patient_id)
    query = patient_scope_filter(query, user)
    sort_columns = {
        "created_at": Prescription.created_at,
        "patient_name": User.last_name,
    }
    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=sort_columns.get(sort_by, Prescription.created_at),
        sort_order=sort_order,
        serializer=lambda rows: serialize_prescriptions(db, rows),
    )


def serialize_prescriptions(db:Session,rows:list[Prescription])->list[PrescriptionOut]:
    if not rows:return []
    patient_ids={row.patient_id for row in rows};doctor_ids={row.doctor_id for row in rows}
    patient_names=dict(db.execute(select(PatientProfile.id,func.concat(User.first_name," ",User.last_name)).join(User,User.id==PatientProfile.user_id).where(PatientProfile.id.in_(patient_ids))).all())
    doctor_names=dict(db.execute(select(DoctorProfile.id,func.concat("Dr ",User.first_name," ",User.last_name)).join(User,User.id==DoctorProfile.user_id).where(DoctorProfile.id.in_(doctor_ids))).all())
    return [PrescriptionOut.model_validate(row,from_attributes=True).model_copy(update={"patient_name":patient_names.get(row.patient_id),"doctor_name":doctor_names.get(row.doctor_id)}) for row in rows]


def update_prescription(db: Session, user: User, item_id: str, payload: PrescriptionUpdate) -> PrescriptionOut:
    require_module_access(db, user, "prescriptions", write=True)
    ensure_write_allowed(user)
    item = get_scoped(db, user, Prescription, item_id, "Ordonnance")
    old_value = {"content": item.content, "items": item.items, "pdf_document_id": item.pdf_document_id}
    data = payload.model_dump(exclude_unset=True)
    if "items" in data: data["items"] = normalize_prescription_items(db,user,payload.items)
    for field, value in data.items():
        setattr(item, field, value)
    item.updated_by_user_id = user.id
    from app.services.prescription_document_service import generate_and_archive
    document = generate_and_archive(db, item, user)
    add_operation(db, user, "PRESCRIPTION_UPDATED", prescription=item, document=document, description=f"Ordonnance {item.prescription_number} modifiée ; une nouvelle version PDF a été archivée.", old_value=old_value, new_value={"content": item.content, "items": item.items, "pdf_document_id": document.id})
    db.commit()
    db.refresh(item)
    return serialize_prescriptions(db,[item])[0]


def create_document(db: Session, user: User, payload: DocumentCreate) -> DocumentOut:
    require_module_access(db, user, "documents", write=True)
    ensure_write_allowed(user)
    get_patient_or_404(db, user, payload.patient_id)
    if payload.doctor_id:
        get_scoped(db, user, DoctorProfile, payload.doctor_id, "Médecin")
    if payload.appointment_id:
        appointment = get_scoped(db, user, Appointment, payload.appointment_id, "Rendez-vous")
        if appointment.patient_id != payload.patient_id: raise HTTPException(422, "Le rendez-vous ne correspond pas au patient.")
    if payload.visit_id:
        visit = get_scoped(db, user, Visit, payload.visit_id, "Visite")
        if visit.patient_id != payload.patient_id: raise HTTPException(422, "La visite ne correspond pas au patient.")
    if payload.fee_id:
        fee = get_scoped(db, user, Fee, payload.fee_id, "Honoraire")
        if fee.patient_id != payload.patient_id: raise HTTPException(422, "L’honoraire ne correspond pas au patient.")
    if payload.invoice_id:
        invoice = get_scoped(db, user, Invoice, payload.invoice_id, "Facture")
        if invoice.patient_id != payload.patient_id: raise HTTPException(422, "La facture ne correspond pas au patient.")
    if payload.cnss_case_id:
        case = get_scoped(db, user, CNSSCase, payload.cnss_case_id, "Dossier CNSS/CNOPS")
        if case.patient_id != payload.patient_id: raise HTTPException(422, "Le dossier CNSS/CNOPS ne correspond pas au patient.")
    if payload.category_id:
        category = db.scalar(select(DocumentCategory).where(DocumentCategory.id == payload.category_id, or_(DocumentCategory.tenant_id.is_(None), DocumentCategory.tenant_id == require_tenant(user)), DocumentCategory.is_active.is_(True)))
        if not category: raise HTTPException(422, "La catégorie documentaire est invalide ou inactive.")
    if payload.parent_document_id:
        parent = get_scoped(db, user, MedicalDocument, payload.parent_document_id, "Document parent")
        if parent.patient_id != payload.patient_id: raise HTTPException(422, "La version précédente ne correspond pas au patient.")
    item = MedicalDocument(tenant_id=require_tenant(user), created_by_user_id=user.id, **payload.model_dump())
    db.add(item)
    db.flush()
    add_operation(db, user, "DOCUMENT_CREATED", document=item,
                  description=f"Document « {item.title} » ajouté au dossier patient.",
                  new_value={"title": item.title, "document_type": item.document_type, "version": item.version,
                             "source": item.source, "shared_with_patient": item.shared_with_patient})
    db.commit()
    db.refresh(item)
    return serialize_documents(db, [item])[0]


def list_documents(db: Session, user: User, include_archived: bool = False, patient_id: str | None = None) -> list[DocumentOut]:
    require_module_access(db, user, "documents")
    query = select(MedicalDocument).join(PatientProfile).where(MedicalDocument.tenant_id == require_tenant(user))
    if not include_archived: query = query.where(MedicalDocument.archived_at.is_(None))
    if patient_id: query = query.where(MedicalDocument.patient_id == patient_id)
    query = query.order_by(MedicalDocument.created_at.desc())
    return serialize_documents(
        db, list(db.scalars(patient_scope_filter(query, user)).all())
    )


def serialize_documents(
    db: Session, rows: list[MedicalDocument]
) -> list[DocumentOut]:
    if not rows:
        return []
    patient_ids = {row.patient_id for row in rows}
    doctor_ids = {row.doctor_id for row in rows if row.doctor_id}
    patient_names = dict(
        db.execute(
            select(
                PatientProfile.id,
                func.concat(User.first_name, " ", User.last_name),
            )
            .join(User, User.id == PatientProfile.user_id)
            .where(PatientProfile.id.in_(patient_ids))
        ).all()
    )
    doctor_names = (
        dict(
            db.execute(
                select(
                    DoctorProfile.id,
                    func.concat("Dr ", User.first_name, " ", User.last_name),
                )
                .join(User, User.id == DoctorProfile.user_id)
                .where(DoctorProfile.id.in_(doctor_ids))
            ).all()
        )
        if doctor_ids
        else {}
    )
    return [
        DocumentOut.model_validate(row, from_attributes=True).model_copy(
            update={
                "patient_name": patient_names.get(row.patient_id),
                "doctor_name": doctor_names.get(row.doctor_id),
            }
        )
        for row in rows
    ]


def paginate_documents(
    db: Session,
    user: User,
    *,
    page: int,
    page_size: int,
    search: str | None,
    sort_by: str,
    sort_order: str,
    include_archived: bool = False,
    document_type: str | None = None,
    patient_id: str | None = None,
) -> dict:
    require_module_access(db, user, "documents")
    query = (
        select(MedicalDocument)
        .join(PatientProfile)
        .join(User, User.id == PatientProfile.user_id)
        .where(MedicalDocument.tenant_id == require_tenant(user))
    )
    if not include_archived:
        query = query.where(MedicalDocument.archived_at.is_(None))
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                MedicalDocument.title.ilike(pattern),
                MedicalDocument.description.ilike(pattern),
                MedicalDocument.original_filename.ilike(pattern),
            )
        )
    if document_type:
        query = query.where(MedicalDocument.document_type == document_type)
    if patient_id:
        query = query.where(MedicalDocument.patient_id == patient_id)
    query = patient_scope_filter(query, user)
    sort_columns = {
        "created_at": MedicalDocument.created_at,
        "document_date": MedicalDocument.document_date,
        "title": MedicalDocument.title,
        "patient_name": User.last_name,
    }
    return paginate_query(
        db,
        query,
        page=page,
        page_size=page_size,
        sort_column=sort_columns.get(sort_by, MedicalDocument.created_at),
        sort_order=sort_order,
        serializer=lambda items: serialize_documents(db, items),
    )


def update_document(db: Session, user: User, item_id: str, payload: DocumentUpdate) -> DocumentOut:
    require_module_access(db, user, "documents", write=True)
    ensure_write_allowed(user)
    item = get_scoped(db, user, MedicalDocument, item_id, "Document")
    old_value = {"title": item.title, "document_type": item.document_type,
                 "shared_with_patient": item.shared_with_patient}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    item.updated_by_user_id = user.id
    add_operation(db, user, "DOCUMENT_UPDATED", document=item,
                  description=f"Document « {item.title} » modifié.", old_value=old_value,
                  new_value={"title": item.title, "document_type": item.document_type,
                             "shared_with_patient": item.shared_with_patient})
    db.commit()
    db.refresh(item)
    return serialize_documents(db, [item])[0]


def record_document_access(db: Session, user: User, item: MedicalDocument, action: str) -> None:
    add_operation(db, user, action, document=item,
                  description=f"Document « {item.title} » {'consulté' if action == 'DOCUMENT_VIEWED' else 'téléchargé'}.",
                  new_value={"title": item.title, "document_type": item.document_type})
    db.commit()


def delete_document(db: Session, user: User, item_id: str) -> dict[str, str]:
    require_module_access(db, user, "documents", admin=True)
    ensure_write_allowed(user)
    item = get_scoped(db, user, MedicalDocument, item_id, "Document")
    item.archived_at = datetime.now(UTC); item.status = "ARCHIVE"; item.updated_by_user_id = user.id
    add_operation(db, user, "DOCUMENT_ARCHIVED", document=item,
                  description=f"Document « {item.title} » archivé.",
                  old_value={"title": item.title, "document_type": item.document_type,
                             "shared_with_patient": item.shared_with_patient})
    db.commit()
    return {"status": "archived"}


def restore_document(db: Session, user: User, item_id: str) -> DocumentOut:
    require_module_access(db, user, "documents", admin=True); ensure_write_allowed(user)
    item = get_scoped(db, user, MedicalDocument, item_id, "Document")
    item.archived_at = None; item.status = "ACTIF"; item.updated_by_user_id = user.id
    add_operation(db, user, "DOCUMENT_RESTORED", document=item, description=f"Document « {item.title} » restauré.")
    db.commit(); db.refresh(item)
    return serialize_documents(db, [item])[0]


def get_staff_permissions(db: Session, user: User, staff_id: str) -> PermissionMatrix:
    _require_staff_manager(db, user)
    staff = db.scalar(select(User).where(User.id == staff_id, User.tenant_id == require_tenant(user)))
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secrétaire introuvable.")
    if role_code(staff) != "SECRETAIRE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cet utilisateur n’est pas une secrétaire.")
    if role_code(user) == "SECRETAIRE":
        _require_manageable_staff(db, user, staff)
    row = db.scalar(select(StaffPermission).where(StaffPermission.tenant_id == user.tenant_id, StaffPermission.user_id == staff_id))
    return PermissionMatrix(permissions=row.permissions if row else DEFAULT_STAFF_PERMISSIONS)


def update_staff_permissions(db: Session, user: User, staff_id: str, payload: PermissionMatrix) -> PermissionMatrix:
    _require_staff_manager(db, user)
    ensure_write_allowed(user)
    staff = db.scalar(select(User).where(User.id == staff_id, User.tenant_id == require_tenant(user)))
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secrétaire introuvable.")
    if role_code(staff) != "SECRETAIRE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cet utilisateur n’est pas une secrétaire.")
    if role_code(user) == "SECRETAIRE":
        _require_manageable_staff(db, user, staff)
    permissions = {**DEFAULT_STAFF_PERMISSIONS, **payload.permissions}
    _validate_delegated_permissions(db, user, permissions)
    row = db.scalar(select(StaffPermission).where(StaffPermission.tenant_id == user.tenant_id, StaffPermission.user_id == staff_id))
    if row:
        row.permissions = permissions
    else:
        db.add(StaffPermission(tenant_id=user.tenant_id, user_id=staff_id, permissions=permissions))
    db.add(AuditLog(tenant_id=user.tenant_id, user_id=user.id, action="STAFF_PERMISSIONS_UPDATED", resource_type="user", resource_id=staff_id, event_metadata={"permissions": permissions}))
    db.commit()
    return PermissionMatrix(permissions=permissions)


def resend_staff_invitation(db: Session, actor: User, staff_id: str) -> dict[str, str]:
    _require_staff_manager(db, actor)
    staff = db.scalar(select(User).where(User.id == staff_id, User.tenant_id == require_tenant(actor)))
    if not staff or role_code(staff) != "SECRETAIRE":
        raise HTTPException(status_code=404, detail="Secrétaire introuvable.")
    if role_code(actor) == "SECRETAIRE":
        _require_manageable_staff(db, actor, staff)
    if staff.account_status != "pending_activation":
        raise HTTPException(status_code=409, detail="Ce compte est déjà activé ou désactivé.")
    previous = db.scalar(select(StaffInvitation).where(StaffInvitation.user_id == staff.id))
    if previous:
        db.delete(previous)
        db.flush()
    token = _new_staff_invitation(db, actor, staff)
    url = f"{settings.public_frontend_url.rstrip('/')}/activate-staff/{token}"
    doctor_profile = db.scalar(select(DoctorProfile).where(DoctorProfile.tenant_id == require_tenant(actor)))
    doctor_user = db.get(User, doctor_profile.user_id) if doctor_profile else None
    doctor_name = f"Dr {doctor_user.first_name} {doctor_user.last_name}" if doctor_user else f"{actor.first_name} {actor.last_name}"
    doctor_email = doctor_profile.professional_email if doctor_profile else actor.email
    try:
        send_staff_activation_email(
            staff.email,
            f"{staff.first_name} {staff.last_name}",
            actor.tenant.name,
            url,
            doctor_name=doctor_name,
            doctor_email=doctor_email,
        )
    except EmailDeliveryError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    db.add(AuditLog(tenant_id=actor.tenant_id, user_id=actor.id, action="STAFF_INVITATION_RESENT", resource_type="user", resource_id=staff.id))
    db.commit()
    return {"status": "sent"}
