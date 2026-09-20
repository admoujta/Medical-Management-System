from pathlib import Path
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
import csv
import io
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi import Depends
from fastapi.responses import FileResponse, Response
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.core.config import settings
from app.schemas.health import HealthResponse
from app.schemas.appointment_details import AppointmentDetailsResponse
from app.schemas.reminder import AutomaticReminderSettings, PaymentReminderBulkCreate, PaymentReminderBulkOut, PaymentReminderCreate, PaymentReminderOut
from app.schemas.patient import PatientCNSSAction, PatientCNSSCreate
from app.models.financial import PaymentDueDate, PaymentReminder
from app.models.medical import Fee, PatientProfile
from app.schemas.auth import (
    AuthMeResponse,
    DashboardStats,
    DoctorDashboardResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    PatientRegisterRequest,
    PatientRegisterResponse,
    PatientActivationInfo,
    PatientActivationRequest,
    MessageResponse,
    StaffActivationInfo,
    StaffActivationRequest,
)
from app.schemas.crud import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentPreparationOut,
    AppointmentPreparationUpdate,
    AppointmentPreparationValidate,
    AppointmentQrOut,
    AppointmentQrScanOut,
    AppointmentQrScanRequest,
    AppointmentStatusUpdate,
    AppointmentUpdate,
    BankAccountCreate,
    BankAccountOut,
    BankAccountUpdate,
    CNSSCreate,
    CNSSOut,
    CNSSUpdate,
    CollectionPageOut,
    DocumentCreate,
    DocumentCategoryCreate,
    DocumentCategoryOut,
    DocumentOut,
    DocumentUpdate,
    DueDateCreate,
    DueDateDocumentOut,
    DueDateOut,
    DueDateUpdate,
    ExpenseCreate,
    ExpenseOut,
    ExpenseSupplierCreate,
    ExpenseSupplierOut,
    SupplierProductCreate,
    SupplierProductOut,
    FeeCreate,
    FeeOut,
    FeeTypePrices,
    FeeUpdate,
    HonorairePaymentCreate,
    InvoiceCreate,
    InvoiceOut,
    MedicationCatalogOut,
    OperationHistoryOut,
    PatientCreate,
    PatientOut,
    PatientMedicalSummaryOut,
    PatientMedicalSummaryUpdate,
    PatientUpdate,
    PaymentCreate,
    PaymentDocumentCreate,
    PaymentDocumentOut,
    PaymentMethodCreate,
    PaymentMethodOut,
    PaymentMethodUpdate,
    PaymentOut,
    PaymentPageOut,
    PaymentSettings,
    PaymentUpdate,
    PermissionMatrix,
    PrescriptionCreate,
    PrescriptionOut,
    PrescriptionUpdate,
    PurchaseOrderCreate,
    PurchaseOrderOut,
    TenantStatusUpdate,
    TenantUpdate,
    UserCreate,
    UserOut,
    UserUpdate,
    VisitCreate,
    VisitOut,
    VisitUpdate,
)


def paginate_values(
    values: list,
    *,
    page: int,
    page_size: int,
    search: str | None = None,
) -> dict:
    """Paginate already-authorized composite lists while preserving full-dataset search."""
    if search and search.strip():
        needle = search.strip().casefold()
        values = [
            value
            for value in values
            if needle
            in str(
                value.model_dump(mode="json")
                if hasattr(value, "model_dump")
                else value
            ).casefold()
        ]
    total_items = len(values)
    total_pages = max(1, (total_items + page_size - 1) // page_size)
    start = (page - 1) * page_size
    return {
        "items": values[start : start + page_size],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        },
    }
from app.schemas.provisioning import SignupRequest, SignupResponse
from app.services.auth_service import activate_patient, activate_staff, authenticate_user, create_patient_invitation, get_auth_me, get_doctor_dashboard, get_patient_activation_info, get_staff_activation_info, get_staff_dashboard, refresh_session, register_patient, revoke_all_sessions, revoke_session, send_patient_invitation
from app.schemas.auth import StaffDashboardResponse
from app.services import crud_service
from app.services import payment_document_service
from app.services import schedule_service
from app.services import admin_service
from app.services import audit_log_service
from app.services import backup_service
from app.services import patient_service, subscription_service, whatsapp_consent_service, whatsapp_service
from app.services import appointment_details_service
from app.services import due_date_document_service
from app.services import financial_report_service
from app.services import patient_report_service
from app.schemas.patient import AppointmentRequest, PasswordChange, PatientPortalSettings, PatientProfileUpdate
from app.schemas.admin import AdminDashboardOut, AdminStatusUpdate, AdminSubscriptionCreate, AdminSubscriptionOut, AdminSubscriptionUpdate, AdminTenantOut, AdminTenantUpdate, BlogGalleryFromMediaCreate, BlogGalleryImageOut, BlogPostCreate, BlogPostOut, BlogPostUpdate, DoctorSupportTicketCreate, EventGalleryImageOut, EventRegistrationOut, PlatformEventCreate, PlatformEventOut, PlatformEventUpdate, PlatformMediaAssetOut, PlatformSettingsOut, PlatformSettingsUpdate, PublicBlogPostOut, PublicEventRegistrationConfirmation, PublicEventRegistrationCreate, PublicPlatformEventOut, SubscriptionPlanCreate, SubscriptionPlanOut, SubscriptionPlanUpdate, SupportReplyCreate, SupportTicketOut, SupportTicketUpdate
from app.schemas.subscription import PlanSelection, SubscriptionPaymentCreate, SubscriptionPaymentDecision, SubscriptionPaymentOut
from app.schemas.schedule import BlockedSlotCreate, BlockedSlotOut, ScheduleResponse, ScheduleUpdate, TimeOffCreate, TimeOffOut
from app.services.provisioning_service import provision_tenant
from app.models import Appointment, AuditLog, BlogGalleryImage, CabinetBankAccount, DocumentCategory, DoctorProfile, DoctorReview, EventGalleryImage, Expense, ExpenseSupplier, SupplierProduct, OperationHistory, PatientCabinetMembership, PatientNotification, PatientProfile, PlatformBlogPost, PlatformEvent, PlatformMediaAsset, PurchaseOrder, Role, SubscriptionPayment, SupportReply, SupportTicket, Tenant, User, UserNotification, WhatsAppMessageTemplate
from app.schemas.public import DoctorReviewCreate, PublicAppointmentCreate
from app.core.security import hash_password
from app.core.phone import normalize_phone
from app.services.provisioning_service import ROLE_DEFINITIONS

router = APIRouter()

ALLOWED_UPLOAD_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg", ".jfif", ".webp", ".tif", ".tiff", ".doc", ".docx"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MIME_BY_SUFFIX = {".pdf": {"application/pdf"}, ".png": {"image/png"}, ".jpg": {"image/jpeg"}, ".jpeg": {"image/jpeg"}, ".jfif": {"image/jpeg"}, ".webp": {"image/webp"}, ".tif": {"image/tiff"}, ".tiff": {"image/tiff"}, ".doc": {"application/msword", "application/octet-stream"}, ".docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"}}


def validate_document_content(suffix: str, content_type: str | None, content: bytes) -> str:
    if not content: raise HTTPException(422, "Le document est vide.")
    declared = (content_type or "application/octet-stream").lower().split(";", 1)[0]
    if declared not in MIME_BY_SUFFIX[suffix] and declared != "application/octet-stream":
        raise HTTPException(415, "Le type MIME ne correspond pas au format du fichier.")
    signatures = {
        ".pdf": content.startswith(b"%PDF-"), ".png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        ".jpg": content.startswith(b"\xff\xd8\xff"), ".jpeg": content.startswith(b"\xff\xd8\xff"), ".jfif": content.startswith(b"\xff\xd8\xff"),
        ".webp": len(content) >= 12 and content.startswith(b"RIFF") and content[8:12] == b"WEBP",
        ".tif": content.startswith((b"II*\x00", b"MM\x00*")), ".tiff": content.startswith((b"II*\x00", b"MM\x00*")),
        ".doc": content.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"), ".docx": content.startswith(b"PK\x03\x04"),
    }
    if not signatures[suffix]: raise HTTPException(415, "La signature réelle du fichier est invalide ou potentiellement dangereuse.")
    return next(iter(MIME_BY_SUFFIX[suffix] - {"application/octet-stream"}), declared)


async def save_tenant_upload(file: UploadFile, tenant_id: str) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(status_code=415, detail="Format non autorisé. Utilisez PDF, image, DOC ou DOCX.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Le fichier dépasse la taille maximale de 10 Mo.")
    validate_document_content(suffix, file.content_type, content)
    tenant_dir = Path(settings.upload_dir) / tenant_id
    tenant_dir.mkdir(parents=True, exist_ok=True)
    relative_path = Path(tenant_id) / f"{uuid4().hex}{suffix}"
    (Path(settings.upload_dir) / relative_path).write_bytes(content)
    return str(relative_path)


async def save_event_image(file: UploadFile, event_id: str) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".jfif", ".webp"}:
        raise HTTPException(415, "La galerie accepte uniquement les images PNG, JPG et WebP.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "L’image dépasse la taille maximale de 10 Mo.")
    validate_document_content(suffix, file.content_type, content)
    relative_path = Path("platform") / "events" / event_id / f"{uuid4().hex}{suffix}"
    absolute = Path(settings.upload_dir) / relative_path
    absolute.parent.mkdir(parents=True, exist_ok=True)
    absolute.write_bytes(content)
    return str(relative_path)


async def save_blog_image(file: UploadFile, post_id: str) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".jfif", ".webp"}:
        raise HTTPException(415, "La galerie accepte uniquement les images PNG, JPG et WebP.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "L’image dépasse la taille maximale de 10 Mo.")
    validate_document_content(suffix, file.content_type, content)
    relative_path = Path("platform") / "blog" / post_id / f"{uuid4().hex}{suffix}"
    absolute = Path(settings.upload_dir) / relative_path
    absolute.parent.mkdir(parents=True, exist_ok=True)
    absolute.write_bytes(content)
    return str(relative_path)


async def save_platform_media(file: UploadFile) -> tuple[str, str, int]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".jfif", ".webp"}:
        raise HTTPException(415, "La médiathèque accepte uniquement les images PNG, JPG et WebP.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "L’image dépasse la taille maximale de 10 Mo.")
    mime_type = validate_document_content(suffix, file.content_type, content)
    relative_path = Path("platform") / "media" / f"{uuid4().hex}{suffix}"
    absolute = Path(settings.upload_dir) / relative_path
    absolute.parent.mkdir(parents=True, exist_ok=True)
    absolute.write_bytes(content)
    return str(relative_path), mime_type, len(content)


async def save_patient_document_upload(file: UploadFile, tenant_id: str, patient_id: str) -> tuple[str, str, int, str, str, str]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(415, "Format non autorisé. Utilisez PDF, JPG, PNG, TIFF, DOC ou DOCX.")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Le fichier dépasse la taille maximale de 10 Mo.")
    mime_type = validate_document_content(suffix, file.content_type, content)
    relative_dir = Path("cabinets") / tenant_id / "patients" / patient_id / "documents"
    filename = f"patient_{patient_id}_document_{datetime.now(UTC).strftime('%Y%m%d%H%M%S%f')}{suffix}"
    relative_path = relative_dir / filename
    absolute = Path(settings.upload_dir) / relative_path
    absolute.parent.mkdir(parents=True, exist_ok=True)
    absolute.write_bytes(content)
    return str(relative_path), mime_type, len(content), Path(file.filename or "document").name, filename, suffix


def protected_upload_response(relative_path: str | None, download_name: str, media_type: str | None = None):
    if not relative_path:
        raise HTTPException(status_code=404, detail="Aucun fichier déposé.")
    root = Path(settings.upload_dir).resolve()
    path = (root / relative_path).resolve()
    if root not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Fichier introuvable.")
    return FileResponse(path, filename=download_name, media_type=media_type)


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="backend")


@router.get("/db-check")
def database_check(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"database": "connected"}


def public_doctor_item(db: Session, doctor: DoctorProfile) -> dict:
    reviews = list(db.scalars(select(DoctorReview).where(
        DoctorReview.doctor_id == doctor.id,
        DoctorReview.is_published.is_(True),
    ).order_by(DoctorReview.created_at.desc())).all())
    rating = round(sum(review.rating for review in reviews) / len(reviews), 1) if reviews else None
    return {
        "id": doctor.id,
        "tenant_id": doctor.tenant_id,
        "tenant_slug": doctor.tenant.slug,
        "name": f"Dr {doctor.user.first_name} {doctor.user.last_name}",
        "specialty": doctor.specialty,
        "cabinet": doctor.tenant.name,
        "city": doctor.tenant.city,
        "address": doctor.tenant.address,
        "phone": doctor.tenant.phone,
        "logo_url": f"/api/public/doctors/{doctor.id}/logo" if doctor.tenant.logo_url else None,
        "rating": rating,
        "review_count": len(reviews),
        "reviews": [{
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "author": review.patient_id[:2].upper() + "***",
            "created_at": review.created_at,
            "verified": True,
        } for review in reviews],
    }


@router.get("/public/cabinets/{cabinet_slug}/seo")
def public_cabinet_seo(cabinet_slug: str, db: Session = Depends(get_db)) -> dict:
    tenant = db.scalar(
        select(Tenant).where(
            Tenant.slug == cabinet_slug,
            Tenant.status.in_({"trial", "active"}),
        )
    )
    if not tenant:
        raise HTTPException(status_code=404, detail="Cabinet introuvable.")
    title = tenant.seo_title or f"{tenant.name} · {tenant.specialty} à {tenant.city}"
    description = tenant.seo_description or (
        f"Prenez rendez-vous avec {tenant.name}, cabinet de {tenant.specialty} "
        f"à {tenant.city}."
    )
    return {
        "slug": tenant.slug,
        "name": tenant.name,
        "specialty": tenant.specialty,
        "city": tenant.city,
        "title": title,
        "description": description,
        "keywords": tenant.seo_keywords,
        "canonical_url": tenant.seo_canonical_url,
        "social_image_url": tenant.seo_social_image_url,
        "indexable": tenant.seo_indexable,
    }


@router.get("/public/doctors")
def public_doctors(
    cabinet_slug: str | None = Query(default=None, min_length=2, max_length=180),
    db: Session = Depends(get_db),
) -> list[dict]:
    query = (
        select(DoctorProfile)
        .join(User, User.id == DoctorProfile.user_id)
        .join(Tenant, Tenant.id == DoctorProfile.tenant_id)
        .where(User.is_active.is_(True), Tenant.status.in_({"trial", "active"}))
        .order_by(Tenant.city, User.last_name, User.first_name)
    )
    if cabinet_slug:
        query = query.where(Tenant.slug == cabinet_slug)
    doctors = db.scalars(query).all()
    result = []
    for doctor in doctors:
        item = public_doctor_item(db, doctor)
        requests_enabled = not doctor.tenant.settings or doctor.tenant.settings.patient_can_request_appointment
        item["is_available"] = bool(
            requests_enabled and schedule_service.public_availability(db, doctor.id)
        )
        result.append(item)
    return result


@router.get("/public/doctors/{doctor_id}/logo")
def public_doctor_logo(doctor_id: str, db: Session = Depends(get_db)):
    doctor = db.scalar(
        select(DoctorProfile)
        .join(User, User.id == DoctorProfile.user_id)
        .join(Tenant, Tenant.id == DoctorProfile.tenant_id)
        .where(
            DoctorProfile.id == doctor_id,
            User.is_active.is_(True),
            Tenant.status.in_({"trial", "active"}),
        )
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Médecin introuvable.")
    suffix = Path(doctor.tenant.logo_url or "").suffix.lower()
    media_types = {".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".jfif":"image/jpeg",".webp":"image/webp"}
    if suffix not in media_types:
        raise HTTPException(status_code=404, detail="Photo indisponible.")
    response = protected_upload_response(doctor.tenant.logo_url, f"cabinet-{doctor.tenant.slug}{suffix}", media_types[suffix])
    response.headers["Cache-Control"] = "public, max-age=3600"
    return response


@router.get("/public/doctors/{doctor_id}/availability")
def public_doctor_availability(doctor_id: str, db: Session = Depends(get_db)) -> list[dict]:
    if not db.scalar(select(DoctorProfile.id).where(DoctorProfile.id == doctor_id)):
        raise HTTPException(status_code=404, detail="Médecin introuvable.")
    return schedule_service.public_availability(db, doctor_id)


@router.post("/public/appointments", status_code=201)
def public_appointment(payload: PublicAppointmentCreate, db: Session = Depends(get_db)) -> dict:
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.id == payload.doctor_id))
    if not doctor or not doctor.user.is_active or doctor.tenant.status not in {"trial", "active"}:
        raise HTTPException(status_code=404, detail="Médecin ou cabinet indisponible.")
    tenant = doctor.tenant
    if tenant.settings and not tenant.settings.patient_can_request_appointment:
        raise HTTPException(status_code=403, detail="Les demandes en ligne sont désactivées pour ce cabinet.")
    available_days = schedule_service.public_availability(db, doctor.id)
    selected_slot = next((slot for day in available_days if day["date"] == payload.date.isoformat()
                          for slot in day["slots"] if slot["start_time"] == payload.start_time.strftime("%H:%M")), None)
    if not selected_slot:
        raise HTTPException(status_code=409, detail="Ce créneau n’est plus disponible. Choisissez un autre créneau proposé.")
    selected_end_time = datetime.strptime(selected_slot["end_time"], "%H:%M").time()
    requested_start = datetime.combine(payload.date, payload.start_time)
    if requested_start <= datetime.now():
        raise HTTPException(status_code=400, detail="Choisissez une date et une heure à venir.")
    conflict = db.scalar(select(Appointment).where(
        Appointment.tenant_id == tenant.id, Appointment.doctor_id == doctor.id,
        Appointment.date == payload.date,
        Appointment.status.notin_({"cancelled", "rejected"}),
        Appointment.start_time < selected_end_time, Appointment.end_time > payload.start_time,
    ))
    if conflict:
        raise HTTPException(status_code=409, detail="Ce créneau est déjà réservé.")
    existing = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    account_created = existing is None
    if existing:
        patient = existing.patient_profile
        try:
            existing_phone = normalize_phone(existing.phone)
        except ValueError:
            existing_phone = existing.phone.strip() if existing.phone else None
        same_patient = (patient is not None and patient.birth_date == payload.birth_date
                        and (not existing_phone or existing_phone == payload.phone))
        if not same_patient:
            raise HTTPException(status_code=409, detail="Un compte existe déjà avec cet e-mail, mais les informations d’identité ne correspondent pas.")
        existing.first_name = payload.first_name.strip()
        existing.last_name = payload.last_name.strip()
        existing.phone = payload.phone.strip()
        patient.gender = payload.gender or patient.gender
        membership = db.scalar(select(PatientCabinetMembership).where(
            PatientCabinetMembership.patient_id == patient.id,
            PatientCabinetMembership.tenant_id == tenant.id,
        ))
        if not membership:
            db.add(PatientCabinetMembership(patient_id=patient.id,tenant_id=tenant.id,status="active"))
    else:
        patient_role = db.scalar(select(Role).where(Role.tenant_id == tenant.id, Role.code == "patient"))
        if not patient_role:
            definition = ROLE_DEFINITIONS["patient"]
            patient_role = Role(tenant_id=tenant.id, code="patient", name=definition["name"], description=definition["description"])
            db.add(patient_role); db.flush()
        patient_user = User(tenant_id=None, email=str(payload.email).lower(),
                            password_hash=hash_password(uuid4().hex + uuid4().hex),
                            first_name=payload.first_name.strip(), last_name=payload.last_name.strip(),
                            phone=payload.phone.strip(),is_active=False,account_status="pending_activation")
        db.add(patient_user); db.flush(); patient_user.roles.append(patient_role)
        patient = PatientProfile(user_id=patient_user.id, tenant_id=tenant.id, birth_date=payload.birth_date,
                                 gender=payload.gender, status="pending")
        db.add(patient); db.flush()
        db.add(PatientCabinetMembership(patient_id=patient.id,tenant_id=tenant.id,status="active"))
    # Le choix WhatsApp appartient à la création initiale du compte patient.
    # Une nouvelle demande publique pour un compte déjà existant ne doit jamais
    # écraser la décision enregistrée auparavant.
    if account_created:
        if payload.whatsapp_opt_in:
            whatsapp_consent_service.grant_consent(
                db, patient, payload.phone, "inscription_web", patient.user_id,
            )
        else:
            whatsapp_consent_service.refuse_consent(
                db, patient, "inscription_web", patient.user_id,
            )
    item = Appointment(tenant_id=tenant.id, patient_id=patient.id, doctor_id=doctor.id,
                       date=payload.date, start_time=payload.start_time, end_time=selected_end_time,
                       reason=payload.reason, status="requested")
    item.origin = 'online'
    db.add(item)
    activation_sent=False
    if account_created:
        raw_token=create_patient_invitation(db,patient.user,tenant)
        db.flush()
        send_patient_invitation(patient.user,tenant,raw_token)
        activation_sent=True
    db.commit(); db.refresh(item)
    return {"appointment_id": item.id, "cabinet_code": tenant.slug, "cabinet": tenant.name,
            "doctor": f"Dr {doctor.user.first_name} {doctor.user.last_name}", "status": item.status,
            "account_created": account_created,"activation_email_sent":activation_sent}


@router.post("/patient/doctors/{doctor_id}/reviews", status_code=201)
def create_doctor_review(doctor_id: str, payload: DoctorReviewCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    patient = current_user.patient_profile
    if not patient:
        raise HTTPException(status_code=403, detail="Seuls les patients peuvent publier un avis.")
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.id == doctor_id))
    if not doctor:
        raise HTTPException(status_code=404, detail="Médecin introuvable.")
    if patient.tenant_id != doctor.tenant_id:
        raise HTTPException(status_code=403, detail="Vous ne pouvez évaluer que votre cabinet médical.")
    completed = db.scalar(select(func.count(Appointment.id)).where(
        Appointment.patient_id == patient.id,
        Appointment.doctor_id == doctor.id,
        Appointment.status == "completed",
    ))
    if not completed:
        raise HTTPException(status_code=403, detail="Un rendez-vous terminé est requis pour publier un avis vérifié.")
    review = DoctorReview(tenant_id=doctor.tenant_id, doctor_id=doctor.id, patient_id=patient.id,
                          rating=payload.rating, comment=payload.comment.strip())
    db.add(review);db.flush()
    db.add(UserNotification(tenant_id=doctor.tenant_id,user_id=doctor.user_id,notification_type="NEW_REVIEW",title="Nouvel avis patient",message=f"Un patient a publié un avis de {payload.rating}/5.",resource_id=review.id))
    db.commit()
    return public_doctor_item(db, doctor)


@router.get("/patient/reviews")
def patient_reviews(current_user:CurrentUser,db:Session=Depends(get_db)):
    patient=current_user.patient_profile
    if not patient:raise HTTPException(403,"Accès réservé au patient.")
    reviews=db.scalars(select(DoctorReview).where(DoctorReview.tenant_id==patient.tenant_id,DoctorReview.patient_id==patient.id).order_by(DoctorReview.created_at.desc())).all()
    result=[]
    for item in reviews:
        doctor=db.scalar(select(DoctorProfile).where(DoctorProfile.id==item.doctor_id,DoctorProfile.tenant_id==patient.tenant_id))
        result.append({"id":item.id,"doctor_id":item.doctor_id,"doctor_name":f"Dr {doctor.user.first_name} {doctor.user.last_name}" if doctor else "Médecin","rating":item.rating,"comment":item.comment,"created_at":item.created_at})
    return result


@router.get("/patient/doctors/{doctor_id}/reviews")
def patient_doctor_reviews(doctor_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    patient=current_user.patient_profile
    if not patient:raise HTTPException(403,"Accès réservé au patient.")
    doctor=db.scalar(select(DoctorProfile).where(DoctorProfile.id==doctor_id,DoctorProfile.tenant_id==patient.tenant_id))
    if not doctor:raise HTTPException(404,"Médecin introuvable dans votre cabinet.")
    rows=db.scalars(select(DoctorReview).where(DoctorReview.tenant_id==patient.tenant_id,DoctorReview.doctor_id==doctor.id,DoctorReview.patient_id==patient.id).order_by(DoctorReview.created_at.desc())).all()
    return [{"id":item.id,"rating":item.rating,"comment":item.comment,"created_at":item.created_at} for item in rows]


@router.put("/patient/reviews/{review_id}")
def patient_review_update(review_id:str,payload:DoctorReviewCreate,current_user:CurrentUser,db:Session=Depends(get_db)):
    patient=current_user.patient_profile
    if not patient:raise HTTPException(403,"Accès réservé au patient.")
    review=db.scalar(select(DoctorReview).where(DoctorReview.id==review_id,DoctorReview.tenant_id==patient.tenant_id,DoctorReview.patient_id==patient.id))
    if not review:raise HTTPException(404,"Avis introuvable.")
    review.rating=payload.rating;review.comment=payload.comment.strip();review.is_published=True;db.commit();db.refresh(review)
    doctor=db.scalar(select(DoctorProfile).where(DoctorProfile.id==review.doctor_id,DoctorProfile.tenant_id==patient.tenant_id))
    return public_doctor_item(db,doctor)


@router.get("/doctor/reviews")
def doctor_reviews(current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"})
    doctor=db.scalar(select(DoctorProfile).where(DoctorProfile.user_id==current_user.id,DoctorProfile.tenant_id==current_user.tenant_id))
    if not doctor:raise HTTPException(404,"Profil médecin introuvable.")
    reviews=db.scalars(select(DoctorReview).where(DoctorReview.doctor_id==doctor.id,DoctorReview.tenant_id==current_user.tenant_id).order_by(DoctorReview.created_at.desc())).all()
    rows=[]
    for review in reviews:
        patient=db.scalar(select(PatientProfile).where(PatientProfile.id==review.patient_id,PatientProfile.tenant_id==current_user.tenant_id))
        rows.append({"id":review.id,"patient_name":f"{patient.user.first_name} {patient.user.last_name}" if patient else "Patient","rating":review.rating,"comment":review.comment,"is_published":review.is_published,"created_at":review.created_at,"verified":True})
    average=round(sum(item.rating for item in reviews)/len(reviews),1) if reviews else None
    return {"average":average,"total":len(reviews),"published":sum(1 for item in reviews if item.is_published),"distribution":{str(value):sum(1 for item in reviews if item.rating==value) for value in range(1,6)},"reviews":rows}


@router.post("/auth/register-doctor", response_model=SignupResponse, status_code=201)
def register_doctor(payload: SignupRequest, db: Session = Depends(get_db)) -> SignupResponse:
    return provision_tenant(db, payload)


@router.post("/auth/register-patient", response_model=PatientRegisterResponse, status_code=201)
def patient_signup(payload: PatientRegisterRequest, db: Session = Depends(get_db)) -> PatientRegisterResponse:
    raise HTTPException(status_code=410, detail="La création libre d’un compte patient est désactivée. Demandez un rendez-vous ou contactez votre cabinet.")


@router.get("/auth/staff-activation", response_model=StaffActivationInfo)
def auth_staff_activation_info(token: str, db: Session = Depends(get_db)) -> StaffActivationInfo:
    return get_staff_activation_info(db, token)


@router.post("/auth/staff-activation", response_model=MessageResponse)
def auth_staff_activate(payload: StaffActivationRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    return activate_staff(db, payload)


@router.get("/auth/patient-activation", response_model=PatientActivationInfo)
def auth_patient_activation_info(token: str, db: Session = Depends(get_db)) -> PatientActivationInfo:
    return get_patient_activation_info(db, token)


@router.post("/auth/patient-activation", response_model=MessageResponse)
def auth_patient_activate(payload: PatientActivationRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    return activate_patient(db, payload)


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> LoginResponse:
    return authenticate_user(
        db,
        payload,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


@router.post("/auth/refresh", response_model=LoginResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> LoginResponse:
    return refresh_session(db, payload.refresh_token)


@router.post("/auth/logout")
def logout(current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    revoke_session(db, current_user)
    return {"status": "ok"}


@router.post("/auth/logout-all")
def logout_all(current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    revoke_all_sessions(db, current_user)
    return {"status": "ok"}


@router.get("/auth/me", response_model=AuthMeResponse)
def auth_me(current_user: CurrentUser) -> AuthMeResponse:
    return get_auth_me(current_user)


@router.get("/doctor/dashboard", response_model=DoctorDashboardResponse)
def doctor_dashboard(current_user: CurrentUser, db: Session = Depends(get_db)) -> DoctorDashboardResponse:
    return get_doctor_dashboard(db, current_user)


@router.get("/doctor/cabinet")
def doctor_cabinet(current_user: CurrentUser):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    return crud_service.get_my_tenant(current_user)


@router.put("/doctor/cabinet")
def doctor_cabinet_update(payload: TenantUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.update_my_tenant(db, current_user, payload)


@router.post("/doctor/cabinet/logo")
async def doctor_cabinet_logo(current_user: CurrentUser, file: UploadFile = File(...), db: Session = Depends(get_db)):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    crud_service.ensure_write_allowed(current_user)
    if Path(file.filename or "").suffix.lower() not in {".png", ".jpg", ".jpeg", ".jfif", ".webp"}:
        raise HTTPException(status_code=415, detail="Le logo doit être une image PNG, JPG ou WebP.")
    file_url = await save_tenant_upload(file, current_user.tenant_id or "")
    return crud_service.update_my_tenant(db, current_user, TenantUpdate(logo_url=file_url))


@router.get("/doctor/cabinet/logo")
def doctor_cabinet_logo_get(current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    tenant = crud_service.get_my_tenant(current_user)
    return protected_upload_response(tenant.logo_url, f"logo-{tenant.slug}{Path(tenant.logo_url or '').suffix}")


@router.get("/medecin/statistics", response_model=DashboardStats)
def medecin_statistics(current_user: CurrentUser, db: Session = Depends(get_db)) -> DashboardStats:
    return get_doctor_dashboard(db, current_user).stats


@router.get("/staff/dashboard", response_model=StaffDashboardResponse)
def staff_dashboard(current_user: CurrentUser, db: Session = Depends(get_db)) -> StaffDashboardResponse:
    return get_staff_dashboard(db, current_user)


@router.get("/doctor/patient-settings", response_model=PatientPortalSettings)
def doctor_patient_settings(current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"})
    row=db.scalar(select(crud_service.TenantSettings).where(crud_service.TenantSettings.tenant_id==current_user.tenant_id))
    return PatientPortalSettings.model_validate(row,from_attributes=True) if row else PatientPortalSettings()


@router.put("/doctor/patient-settings", response_model=PatientPortalSettings)
def doctor_patient_settings_update(payload:PatientPortalSettings,current_user:CurrentUser,db:Session=Depends(get_db)):
    return patient_service.update_settings(db,current_user,payload)


@router.get("/doctor/reminder-settings", response_model=AutomaticReminderSettings)
def reminder_settings_get(current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"})
    row=db.scalar(select(crud_service.TenantSettings).where(crud_service.TenantSettings.tenant_id==current_user.tenant_id))
    return AutomaticReminderSettings.model_validate(row.reminder_settings if row and row.reminder_settings else {})


@router.put("/doctor/reminder-settings", response_model=AutomaticReminderSettings)
def reminder_settings_update(payload:AutomaticReminderSettings,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});crud_service.ensure_write_allowed(current_user)
    row=db.scalar(select(crud_service.TenantSettings).where(crud_service.TenantSettings.tenant_id==current_user.tenant_id))
    if not row:row=crud_service.TenantSettings(tenant_id=current_user.tenant_id);db.add(row)
    row.reminder_settings=payload.model_dump();db.commit();return payload


@router.get("/doctor/subscription")
def doctor_subscription(current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    return subscription_service.subscription_details(db, current_user)


@router.get("/cabinet/modules")
def cabinet_modules(current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN", "SECRETAIRE"})
    return {"enabled_modules": subscription_service.modules_for_user(db, current_user)}


@router.post("/doctor/subscription/select-plan")
def doctor_subscription_select_plan(payload: PlanSelection, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    return subscription_service.select_plan(db, current_user, payload.plan_id)


@router.post("/doctor/subscription/pay", response_model=SubscriptionPaymentOut, status_code=201)
def doctor_subscription_pay(payload: SubscriptionPaymentCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    return subscription_service.create_manual_payment(db, current_user, payload)


@router.get("/doctor/subscription/payments", response_model=list[SubscriptionPaymentOut])
def doctor_subscription_payments(current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    return list(db.scalars(select(SubscriptionPayment).where(SubscriptionPayment.tenant_id == current_user.tenant_id).order_by(SubscriptionPayment.created_at.desc())).all())


@router.post("/doctor/subscription/cancel-renewal")
def doctor_subscription_cancel_renewal(current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    subscription = subscription_service.tenant_subscription(db, current_user)
    subscription.auto_renew = False
    db.add(crud_service.AuditLog(tenant_id=current_user.tenant_id, user_id=current_user.id, action="subscription.auto_renew.cancelled", resource_type="subscription", resource_id=subscription.id))
    db.commit()
    return {"status": "cancelled"}


@router.get("/patient/dashboard")
def patient_dashboard(current_user:CurrentUser,db:Session=Depends(get_db)):return patient_service.dashboard(db,current_user)

@router.get("/patient/profile")
def patient_profile(current_user:CurrentUser,db:Session=Depends(get_db)):return patient_service.profile(db,current_user)

@router.put("/patient/profile")
def patient_profile_update(payload:PatientProfileUpdate,current_user:CurrentUser,db:Session=Depends(get_db)):return patient_service.update_profile(db,current_user,payload)

@router.put("/patient/change-password")
def patient_password(payload:PasswordChange,current_user:CurrentUser,db:Session=Depends(get_db)):return patient_service.change_password(db,current_user,payload)

@router.get("/patient/appointments",response_model=list[AppointmentOut]|CollectionPageOut[AppointmentOut])
def patient_appointments(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    rows=[crud_service.serialize_appointment(x) for x in patient_service.appointments(db,current_user)]
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows

@router.get("/patient/appointments/{item_id}",response_model=AppointmentOut)
def patient_appointment(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return crud_service.serialize_appointment(crud_service.get_appointment_obj(db,current_user,item_id))

@router.get("/patient/appointments/{item_id}/qr", response_model=AppointmentQrOut)
def patient_appointment_qr(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.patient_appointment_qr(db, current_user, item_id)

@router.post("/patient/appointments/request",response_model=AppointmentOut,status_code=201)
def patient_appointment_request(payload:AppointmentRequest,current_user:CurrentUser,db:Session=Depends(get_db)):return crud_service.serialize_appointment(patient_service.request_appointment(db,current_user,payload))

@router.put("/patient/appointments/{item_id}/confirm",response_model=AppointmentOut)
def patient_appointment_confirm(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return crud_service.serialize_appointment(patient_service.change_appointment_status(db,current_user,item_id,"confirmed"))

@router.put("/patient/appointments/{item_id}/cancel",response_model=AppointmentOut)
def patient_appointment_cancel(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return crud_service.serialize_appointment(patient_service.change_appointment_status(db,current_user,item_id,"cancelled"))

@router.get("/patient/visits")
def patient_visits(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    rows=patient_service.visits(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows

@router.get("/patient/visits/{item_id}")
def patient_visit(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return {"id":(x:=crud_service.get_scoped(db,current_user,crud_service.Visit,item_id,"Visite")).id,"visit_date":x.visit_date,"reason":x.reason}

@router.get("/patient/documents",response_model=list[DocumentOut]|CollectionPageOut[DocumentOut])
def patient_documents(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    rows=patient_service.documents(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows

@router.get("/patient/documents/{item_id}",response_model=DocumentOut)
def patient_document(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    item=crud_service.get_scoped(db,current_user,crud_service.MedicalDocument,item_id,"Document")
    if not item.shared_with_patient:raise HTTPException(404,"Document introuvable.")
    return item

@router.get("/patient/documents/{item_id}/download")
def patient_document_download(item_id:str,request:Request,current_user:CurrentUser,db:Session=Depends(get_db)):
    if not patient_service.settings(db,current_user).patient_can_download_documents:raise HTTPException(403,"Téléchargement désactivé par le cabinet.")
    if crud_service.is_read_only(current_user.tenant):raise HTTPException(403,"L’espace patient est temporairement indisponible.")
    item=crud_service.get_scoped(db,current_user,crud_service.MedicalDocument,item_id,"Document")
    if not item.shared_with_patient:raise HTTPException(404,"Document introuvable.")
    crud_service.record_document_access(db,current_user,item,"DOCUMENT_DOWNLOADED")
    audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="download_document",resource_type="document",resource_id=item.id,request=request)
    return protected_upload_response(item.file_url,f"{item.title}{Path(item.file_url or '').suffix}")

@router.get("/patient/prescriptions",response_model=list[PrescriptionOut]|CollectionPageOut[PrescriptionOut])
def patient_prescriptions(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    rows=patient_service.prescriptions(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows

@router.get("/patient/prescriptions/{item_id}",response_model=PrescriptionOut)
def patient_prescription(item_id:str,request:Request,current_user:CurrentUser,db:Session=Depends(get_db)):
    item=crud_service.get_scoped(db,current_user,crud_service.Prescription,item_id,"Ordonnance");audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="view_prescription",resource_type="ordonnance",resource_id=item.id,request=request);return item

@router.get("/patient/prescriptions/{item_id}/pdf")
def patient_prescription_pdf(item_id:str,request:Request,current_user:CurrentUser,db:Session=Depends(get_db)):
    item=crud_service.get_scoped(db,current_user,crud_service.Prescription,item_id,"Ordonnance")
    audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="download_prescription",resource_type="ordonnance",resource_id=item.id,request=request)
    return prescription_pdf_response(db,current_user,item,"PRESCRIPTION_DOWNLOADED",inline=True)

@router.get("/patient/cnss",response_model=list[CNSSOut]|CollectionPageOut[CNSSOut])
def patient_cnss(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    rows=patient_service.cnss(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows

@router.post("/patient/cnss",response_model=CNSSOut,status_code=201)
def patient_cnss_create(payload:PatientCNSSCreate,current_user:CurrentUser,db:Session=Depends(get_db)):
    return patient_service.create_cnss_request(db,current_user,payload)

@router.get("/patient/cnss/{item_id}",response_model=CNSSOut)
def patient_cnss_item(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    item=crud_service.get_scoped(db,current_user,crud_service.CNSSCase,item_id,"Dossier CNSS/CNOPS")
    return crud_service.serialize_cnss_items(db,[item],hide_internal_notes=True)[0]

@router.get("/patient/cnss/{item_id}/detail")
def patient_cnss_detail(item_id:str,request:Request,current_user:CurrentUser,db:Session=Depends(get_db)):
    item=crud_service.get_scoped(db,current_user,crud_service.CNSSCase,item_id,"Dossier CNSS/CNOPS")
    audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="view_cnss_file",resource_type="dossier_cnss",resource_id=item.id,request=request)
    history=db.scalars(select(crud_service.CNSSStatusHistory).where(crud_service.CNSSStatusHistory.tenant_id==item.tenant_id,crud_service.CNSSStatusHistory.cnss_case_id==item.id).order_by(crud_service.CNSSStatusHistory.changed_at.desc())).all()
    documents=db.scalars(select(crud_service.MedicalDocument).where(crud_service.MedicalDocument.tenant_id==item.tenant_id,crud_service.MedicalDocument.patient_id==item.patient_id,crud_service.MedicalDocument.cnss_case_id==item.id,crud_service.MedicalDocument.shared_with_patient.is_(True),crud_service.MedicalDocument.archived_at.is_(None))).all()
    user_ids={row.changed_by_user_id for row in history if row.changed_by_user_id}
    users={row.id:f"{row.first_name} {row.last_name}".strip() for row in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    return {
        "case":crud_service.serialize_cnss_items(db,[item],hide_internal_notes=True)[0],
        "history":[{"id":row.id,"old_status":row.old_status,"new_status":row.new_status,"comment":row.comment,"rejection_reason":row.rejection_reason,"changed_by_role":row.changed_by_role,"event_metadata":row.event_metadata,"changed_by_name":users.get(row.changed_by_user_id,"Cabinet médical"),"changed_at":row.changed_at} for row in history],
        "documents":[DocumentOut.model_validate(row,from_attributes=True) for row in documents],
    }

@router.patch("/patient/cnss/{item_id}/action",response_model=CNSSOut)
def patient_cnss_action(item_id:str,payload:PatientCNSSAction,current_user:CurrentUser,db:Session=Depends(get_db)):
    return patient_service.update_cnss_by_patient(db,current_user,item_id,payload)

@router.post("/patient/cnss/{item_id}/documents",response_model=DocumentOut,status_code=201)
async def patient_cnss_document_add(item_id:str,current_user:CurrentUser,title:str=Form(...),phase:str=Form("demande"),file:UploadFile=File(...),db:Session=Depends(get_db)):
    tenant,patient=patient_service.context(current_user)
    item=db.scalar(select(crud_service.CNSSCase).where(crud_service.CNSSCase.id==item_id,crud_service.CNSSCase.tenant_id==tenant,crud_service.CNSSCase.patient_id==patient.id))
    if not item:raise HTTPException(404,"Dossier CNSS/CNOPS introuvable.")
    file_url,mime_type,file_size,original_filename,stored_filename,extension=await save_patient_document_upload(file,tenant,patient.id)
    document=crud_service.MedicalDocument(tenant_id=tenant,patient_id=patient.id,title=title.strip() or "Justificatif CNSS/CNOPS",description=f"Pièce patient — {phase}",document_type="CNSS",file_url=file_url,mime_type=mime_type,file_size=file_size,original_filename=original_filename,stored_filename=stored_filename,extension=extension,source="espace_patient",shared_with_patient=True,cnss_case_id=item.id,created_by_user_id=current_user.id)
    db.add(document);db.commit();db.refresh(document)
    return DocumentOut.model_validate(document,from_attributes=True)

@router.get("/patient/notifications")
def patient_notifications(current_user:CurrentUser,db:Session=Depends(get_db)):
    profile=current_user.patient_profile
    if not profile: raise HTTPException(403,"Profil patient introuvable.")
    tenant_ids={profile.tenant_id,*db.scalars(select(PatientCabinetMembership.tenant_id).where(PatientCabinetMembership.patient_id==profile.id,PatientCabinetMembership.status=="active")).all()}
    rows=db.scalars(select(PatientNotification).where(PatientNotification.patient_id==profile.id,PatientNotification.tenant_id.in_(tenant_ids)).order_by(PatientNotification.created_at.desc()).limit(50)).all()
    names=dict(db.execute(select(Tenant.id,Tenant.name).where(Tenant.id.in_({row.tenant_id for row in rows}))).all()) if rows else {}
    return [{"id":row.id,"tenant_id":row.tenant_id,"cabinet_name":"FADAA Santé" if row.notification_type=="PLATFORM_EVENT" else names.get(row.tenant_id,"Cabinet médical"),"type":row.notification_type,"title":row.title,"message":row.message,"resource_id":row.resource_id,"read_at":row.read_at,"created_at":row.created_at} for row in rows]

@router.patch("/patient/notifications/read-all")
def patient_notifications_read_all(current_user:CurrentUser,db:Session=Depends(get_db)):
    profile=current_user.patient_profile
    if not profile:raise HTTPException(403,"Profil patient introuvable.")
    tenant_ids={profile.tenant_id,*db.scalars(select(PatientCabinetMembership.tenant_id).where(PatientCabinetMembership.patient_id==profile.id,PatientCabinetMembership.status=="active")).all()}
    rows=db.scalars(select(PatientNotification).where(PatientNotification.patient_id==profile.id,PatientNotification.tenant_id.in_(tenant_ids),PatientNotification.read_at.is_(None))).all()
    now=datetime.now(UTC)
    for row in rows:row.read_at=now
    db.commit();return {"updated":len(rows),"read_at":now}

@router.patch("/patient/notifications/{item_id}/read")
def patient_notification_read(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    profile=current_user.patient_profile
    if not profile:raise HTTPException(403,"Profil patient introuvable.")
    tenant_ids={profile.tenant_id,*db.scalars(select(PatientCabinetMembership.tenant_id).where(PatientCabinetMembership.patient_id==profile.id,PatientCabinetMembership.status=="active")).all()}
    row=db.scalar(select(PatientNotification).where(PatientNotification.id==item_id,PatientNotification.patient_id==profile.id,PatientNotification.tenant_id.in_(tenant_ids)))
    if not row:raise HTTPException(404,"Notification introuvable.")
    if not row.read_at:row.read_at=datetime.now(UTC);db.commit();db.refresh(row)
    return {"id":row.id,"read_at":row.read_at}
@router.get("/patient/payments",response_model=list[PaymentOut]|CollectionPageOut[PaymentOut])
def patient_payments(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    rows=patient_service.payments(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows

@router.get("/patient/honoraires",response_model=list[FeeOut]|CollectionPageOut[FeeOut])
def patient_honoraires(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    rows=patient_service.fees(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows

@router.get("/patient/receipts/{item_id}/download",response_class=FileResponse,responses={200:{"content":{"application/pdf":{}}}})
def patient_receipt(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    profile=current_user.patient_profile
    if not profile:raise HTTPException(403,"Profil patient introuvable.")
    tenant_ids={profile.tenant_id,*db.scalars(select(PatientCabinetMembership.tenant_id).where(PatientCabinetMembership.patient_id==profile.id,PatientCabinetMembership.status=="active")).all()}
    item=db.scalar(select(crud_service.Payment).where(crud_service.Payment.id==item_id,crud_service.Payment.patient_id==profile.id,crud_service.Payment.tenant_id.in_(tenant_ids)))
    if not item:raise HTTPException(404,"Paiement introuvable.")
    if not patient_service.tenant_settings(db,item.tenant_id).patient_can_view_payments:raise HTTPException(403,"Les paiements ne sont pas partagés par ce cabinet.")
    row=payment_document_service.patient_receipt(db,current_user,item)
    path=Path(settings.upload_dir)/row.file_path
    if not path.is_file():raise HTTPException(404,"Fichier du reçu introuvable.")
    return FileResponse(path,media_type="application/pdf",filename=f"{row.document_number}.pdf")

@router.get("/staff/me/permissions", response_model=PermissionMatrix)
def staff_my_permissions(current_user: CurrentUser, db: Session = Depends(get_db)) -> PermissionMatrix:
    crud_service.require_role(current_user, {"SECRETAIRE"})
    item = db.scalar(select(crud_service.StaffPermission).where(crud_service.StaffPermission.tenant_id == current_user.tenant_id, crud_service.StaffPermission.user_id == current_user.id))
    permissions = dict(item.permissions) if item else dict(crud_service.DEFAULT_STAFF_PERMISSIONS)
    if "appointments" not in permissions and "agenda" in permissions:
        permissions["appointments"] = permissions["agenda"]
    return PermissionMatrix(permissions=permissions)


def require_payment_reminder_access(db: Session, user: CurrentUser, write: bool = False) -> None:
    roles = {role.name.upper() for role in user.roles}
    if "MEDECIN_ADMIN" in roles:
        crud_service.ensure_write_allowed(user) if write else None
        return
    crud_service.require_role(user, {"SECRETAIRE"})
    crud_service.require_module_access(db, user, "whatsapp_reminders", write=write)


@router.get("/payment-reminders/summary")
def payment_reminder_summary(current_user: CurrentUser, db: Session = Depends(get_db)) -> list[dict]:
    require_payment_reminder_access(db, current_user)
    tenant_id = current_user.tenant_id
    patients = db.scalars(select(PatientProfile).where(PatientProfile.tenant_id == tenant_id, PatientProfile.status == "active")).all()
    result = []
    for patient in patients:
        fees = db.scalars(select(Fee).where(Fee.tenant_id == tenant_id, Fee.patient_id == patient.id, Fee.status != "cancelled")).all()
        remaining = sum((Decimal(str(fee.amount or 0)) - Decimal(str(fee.paid_amount or 0)) for fee in fees), Decimal("0.00"))
        if remaining <= 0:
            continue
        dues = db.scalars(select(PaymentDueDate).where(PaymentDueDate.tenant_id == tenant_id, PaymentDueDate.patient_id == patient.id, PaymentDueDate.status.not_in(("PAYEE", "ANNULEE"))).order_by(PaymentDueDate.due_date)).all()
        last = db.scalar(select(PaymentReminder).where(PaymentReminder.tenant_id == tenant_id, PaymentReminder.patient_id == patient.id).order_by(PaymentReminder.created_at.desc()).limit(1))
        overdue = sum((due.remaining_amount for due in dues if due.due_date < date.today()), Decimal("0.00"))
        result.append({
            "patient_id": patient.id,
            "patient_name": f"{patient.user.first_name} {patient.user.last_name}",
            "phone": patient.user.phone,
            "email": patient.user.email,
            "whatsapp_opt_in": patient.whatsapp_opt_in,
            "remaining_amount": float(max(Decimal("0.00"), remaining)),
            "overdue_amount": float(overdue),
            "next_due_date": dues[0].due_date.isoformat() if dues else None,
            "fee_count": sum(1 for fee in fees if Decimal(str(fee.amount or 0)) > Decimal(str(fee.paid_amount or 0))),
            "last_reminder_at": (last.sent_at or last.created_at).isoformat() if last else None,
            "last_channel": last.channel if last else None,
            "last_status": last.status if last else None,
        })
    return sorted(result, key=lambda row: (row["overdue_amount"], row["remaining_amount"]), reverse=True)


@router.get("/payment-reminders/{patient_id}", response_model=list[PaymentReminderOut])
def payment_reminder_history(patient_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    require_payment_reminder_access(db, current_user)
    patient = db.scalar(select(PatientProfile).where(PatientProfile.id == patient_id, PatientProfile.tenant_id == current_user.tenant_id))
    if not patient:
        raise HTTPException(404, "Patient introuvable.")
    return list(db.scalars(select(PaymentReminder).where(PaymentReminder.tenant_id == current_user.tenant_id, PaymentReminder.patient_id == patient_id).order_by(PaymentReminder.created_at.desc())).all())


@router.post("/payment-reminders", response_model=PaymentReminderOut, status_code=201)
def payment_reminder_create(payload: PaymentReminderCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    require_payment_reminder_access(db, current_user, write=True)
    tenant_id = current_user.tenant_id
    patient = db.scalar(select(PatientProfile).where(PatientProfile.id == payload.patient_id, PatientProfile.tenant_id == tenant_id))
    if not patient:
        raise HTTPException(404, "Patient introuvable.")
    if payload.channel == "WHATSAPP":
        whatsapp_consent_service.require_can_send(patient)
    fees = db.scalars(select(Fee).where(Fee.tenant_id == tenant_id, Fee.patient_id == patient.id, Fee.status != "cancelled")).all()
    amount_due = sum((max(Decimal("0.00"), Decimal(str(fee.amount or 0)) - Decimal(str(fee.paid_amount or 0))) for fee in fees), Decimal("0.00"))
    if amount_due <= 0:
        raise HTTPException(409, "Ce patient n’a plus de somme à régler.")
    if payload.fee_id and not any(fee.id == payload.fee_id for fee in fees):
        raise HTTPException(404, "Honoraire introuvable pour ce patient.")
    if payload.due_date_id:
        due = db.scalar(select(PaymentDueDate).where(PaymentDueDate.id == payload.due_date_id, PaymentDueDate.tenant_id == tenant_id, PaymentDueDate.patient_id == patient.id))
        if not due:
            raise HTTPException(404, "Échéance introuvable pour ce patient.")
        amount_due = due.remaining_amount
    now = datetime.now(UTC)
    scheduled_at = payload.scheduled_at
    if scheduled_at and scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=UTC)
    is_scheduled = bool(scheduled_at and scheduled_at > now)
    item = PaymentReminder(tenant_id=tenant_id, patient_id=patient.id, fee_id=payload.fee_id, due_date_id=payload.due_date_id, amount_due=amount_due, channel=payload.channel, status="PLANIFIEE" if is_scheduled else "ENVOYEE", message=payload.message.strip(), scheduled_at=scheduled_at, sent_at=None if is_scheduled else now, created_by_user_id=current_user.id)
    db.add(item); db.flush()
    if payload.channel == "ESPACE_PATIENT" and not is_scheduled:
        db.add(PatientNotification(tenant_id=tenant_id,patient_id=patient.id,notification_type="PAYMENT_REMINDER",title="Rappel de paiement",message=item.message,resource_id=item.id))
    db.commit(); db.refresh(item)
    return item


@router.post("/payment-reminders/bulk", response_model=PaymentReminderBulkOut, status_code=201)
def payment_reminder_bulk(payload: PaymentReminderBulkCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    """Create one reminder per unpaid patient, scoped strictly to the current cabinet."""
    require_payment_reminder_access(db, current_user, write=True)
    tenant_id = current_user.tenant_id
    now = datetime.now(UTC)
    duplicate_cutoff = now - timedelta(hours=24)
    patients = db.scalars(select(PatientProfile).where(PatientProfile.tenant_id == tenant_id, PatientProfile.status == "active")).all()
    created = 0
    skipped_paid = 0
    skipped_consent = 0
    skipped_duplicate = 0
    sent_count = 0
    failed_count = 0
    eligible = 0
    for patient in patients:
        fees = db.scalars(select(Fee).where(Fee.tenant_id == tenant_id, Fee.patient_id == patient.id, Fee.status != "cancelled")).all()
        amount_due = sum((max(Decimal("0.00"), Decimal(str(fee.amount or 0)) - Decimal(str(fee.paid_amount or 0))) for fee in fees), Decimal("0.00"))
        if amount_due <= 0:
            skipped_paid += 1
            continue
        eligible += 1
        phone = patient.whatsapp_phone_number or patient.user.phone
        if payload.channel == "WHATSAPP" and not whatsapp_consent_service.can_send_whatsapp(patient):
            skipped_consent += 1
            continue
        duplicate = db.scalar(select(PaymentReminder.id).where(PaymentReminder.tenant_id == tenant_id, PaymentReminder.patient_id == patient.id, PaymentReminder.channel == payload.channel, PaymentReminder.created_at >= duplicate_cutoff).limit(1))
        if duplicate:
            skipped_duplicate += 1
            continue
        patient_name = f"{patient.user.first_name} {patient.user.last_name}".strip()
        message = payload.message_template.replace("{patient}", patient_name).replace("{montant}", f"{amount_due:.2f}")
        reminder_status = "ENVOYEE"
        reminder_sent_at = now
        if payload.channel == "ESPACE_PATIENT":
            item = PaymentReminder(tenant_id=tenant_id, patient_id=patient.id, amount_due=amount_due, channel=payload.channel, status=reminder_status, message=message, sent_at=reminder_sent_at, created_by_user_id=current_user.id)
            db.add(item); db.flush()
            db.add(PatientNotification(tenant_id=tenant_id, patient_id=patient.id, notification_type="PAYMENT_REMINDER", title="Rappel de paiement", message=message, resource_id=item.id))
            sent_count += 1
        else:
            template = db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.tenant_id == tenant_id, WhatsAppMessageTemplate.type == "relance_paiement", WhatsAppMessageTemplate.language == patient.preferred_whatsapp_language, WhatsAppMessageTemplate.status == "valide").order_by(WhatsAppMessageTemplate.updated_at.desc()).limit(1))
            if not template:
                raise HTTPException(409, "Aucun modèle de relance paiement approuvé par Meta. Ouvrez WhatsApp > Modèles, soumettez le modèle puis actualisez son statut.")
            values = {"patient_name": patient_name, "rap": f"{amount_due:.2f}", "cabinet_name": current_user.tenant.name}
            cloud_message = whatsapp_service.render_template(template, message, values)
            log = whatsapp_service.send_message(db, tenant_id=tenant_id, patient=patient, content=cloud_message, message_type="relance_paiement", actor_id=current_user.id, template_id=template.id, template_values=values)
            reminder_status = "ENVOYEE" if log.status != "echec" else "ECHEC"
            reminder_sent_at = log.sent_at
            sent_count += int(log.status != "echec")
            failed_count += int(log.status == "echec")
            item = PaymentReminder(tenant_id=tenant_id, patient_id=patient.id, amount_due=amount_due, channel=payload.channel, status=reminder_status, message=cloud_message, sent_at=reminder_sent_at, created_by_user_id=current_user.id)
            db.add(item)
        created += 1
    db.commit()
    return PaymentReminderBulkOut(channel=payload.channel, eligible_count=eligible, created_count=created, skipped_paid_count=skipped_paid, skipped_consent_count=skipped_consent, skipped_duplicate_count=skipped_duplicate, sent_count=sent_count, failed_count=failed_count)


def doctor_support_out(db: Session, ticket: SupportTicket) -> dict:
    replies = db.scalars(select(SupportReply).where(SupportReply.ticket_id == ticket.id, SupportReply.internal.is_(False)).order_by(SupportReply.created_at)).all()
    return {"id":ticket.id,"subject":ticket.subject,"message":ticket.message,"status":ticket.status,"priority":ticket.priority,"created_at":ticket.created_at,"updated_at":ticket.updated_at,"replies":[{"id":reply.id,"message":reply.message,"created_at":reply.created_at,"from_support":reply.user_id != ticket.created_by} for reply in replies]}


@router.get("/doctor/support-tickets")
def doctor_support_tickets(current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"})
    return [doctor_support_out(db,item) for item in db.scalars(select(SupportTicket).where(SupportTicket.tenant_id==current_user.tenant_id,SupportTicket.created_by==current_user.id).order_by(SupportTicket.updated_at.desc())).all()]


@router.post("/doctor/support-tickets",status_code=201)
def doctor_support_create(payload:DoctorSupportTicketCreate,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});crud_service.ensure_write_allowed(current_user)
    item=SupportTicket(tenant_id=current_user.tenant_id,created_by=current_user.id,subject=payload.subject.strip(),message=payload.message.strip(),priority=payload.priority,status="open")
    db.add(item);db.commit();db.refresh(item)
    return doctor_support_out(db,item)


@router.post("/doctor/support-tickets/{item_id}/reply")
def doctor_support_reply(item_id:str,payload:SupportReplyCreate,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});crud_service.ensure_write_allowed(current_user)
    ticket=db.scalar(select(SupportTicket).where(SupportTicket.id==item_id,SupportTicket.tenant_id==current_user.tenant_id,SupportTicket.created_by==current_user.id))
    if not ticket:raise HTTPException(404,"Demande de support introuvable.")
    db.add(SupportReply(ticket_id=ticket.id,user_id=current_user.id,message=payload.message.strip(),internal=False));ticket.status="open";db.commit();db.refresh(ticket)
    return doctor_support_out(db,ticket)


@router.get("/doctor/notifications")
def doctor_notifications(current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"})
    rows=db.scalars(select(UserNotification).where(UserNotification.tenant_id==current_user.tenant_id,UserNotification.user_id==current_user.id).order_by(UserNotification.created_at.desc()).limit(50)).all()
    return [{"id":item.id,"type":item.notification_type,"title":item.title,"message":item.message,"resource_id":item.resource_id,"read_at":item.read_at,"created_at":item.created_at} for item in rows]


@router.patch("/doctor/notifications/read-all")
def doctor_notifications_read_all(current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"})
    rows=db.scalars(select(UserNotification).where(UserNotification.tenant_id==current_user.tenant_id,UserNotification.user_id==current_user.id,UserNotification.read_at.is_(None))).all()
    now=datetime.now(UTC)
    for item in rows:item.read_at=now
    db.commit();return {"status":"read","count":len(rows)}


@router.patch("/doctor/notifications/{item_id}/read")
def doctor_notification_read(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"})
    item=db.scalar(select(UserNotification).where(UserNotification.id==item_id,UserNotification.tenant_id==current_user.tenant_id,UserNotification.user_id==current_user.id))
    if not item:raise HTTPException(404,"Notification introuvable.")
    item.read_at=datetime.now(UTC);db.commit();return {"status":"read"}


@router.get("/doctor/schedule", response_model=ScheduleResponse)
def doctor_schedule(current_user: CurrentUser, db: Session = Depends(get_db)) -> ScheduleResponse:
    return schedule_service.get_schedule(db, current_user)


@router.put("/doctor/schedule", response_model=ScheduleResponse)
def doctor_schedule_update(payload: ScheduleUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> ScheduleResponse:
    return schedule_service.update_schedule(db, current_user, payload)


@router.get("/doctor/time-offs", response_model=list[TimeOffOut])
def doctor_time_offs(current_user: CurrentUser, db: Session = Depends(get_db)) -> list[TimeOffOut]:
    return schedule_service.list_time_offs(db, current_user)


@router.post("/doctor/time-offs", response_model=TimeOffOut, status_code=201)
def doctor_time_off_create(payload: TimeOffCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> TimeOffOut:
    return schedule_service.create_time_off(db, current_user, payload)


@router.delete("/doctor/time-offs/{item_id}", status_code=204)
def doctor_time_off_delete(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> None:
    schedule_service.delete_time_off(db, current_user, item_id)


@router.get("/doctor/blocked-slots", response_model=list[BlockedSlotOut])
def doctor_blocked_slots(current_user: CurrentUser, db: Session = Depends(get_db)) -> list[BlockedSlotOut]:
    return schedule_service.list_blocked_slots(db, current_user)


@router.post("/doctor/blocked-slots", response_model=BlockedSlotOut, status_code=201)
def doctor_blocked_slot_create(payload: BlockedSlotCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> BlockedSlotOut:
    return schedule_service.create_blocked_slot(db, current_user, payload)


@router.delete("/doctor/blocked-slots/{item_id}", status_code=204)
def doctor_blocked_slot_delete(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> None:
    schedule_service.delete_blocked_slot(db, current_user, item_id)


@router.get("/super-admin/dashboard", response_model=AdminDashboardOut)
def admin_dashboard(current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.dashboard(db, current_user)


@router.get("/super-admin/instances/expiring-soon", response_model=list[AdminTenantOut])
def admin_tenants_expiring(current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.expiring(db, current_user)


@router.get("/super-admin/instances/status-summary")
def admin_tenants_summary(current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.analytics(db, current_user)["tenants_by_status"]


@router.post("/super-admin/instances/check-expiration")
def admin_check_expiration(current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.check_expiration(db, current_user)


@router.get("/super-admin/instances", response_model=list[AdminTenantOut]|CollectionPageOut[AdminTenantOut])
def admin_tenants(current_user: CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db: Session = Depends(get_db)):
    rows=admin_service.list_tenants(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows


@router.get("/super-admin/instances/{tenant_id}", response_model=AdminTenantOut)
def admin_tenant_detail(tenant_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.get_tenant(db, current_user, tenant_id)


@router.put("/super-admin/instances/{tenant_id}", response_model=AdminTenantOut)
def admin_tenant_update(tenant_id: str, payload: AdminTenantUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.update_tenant(db, current_user, tenant_id, payload)


@router.put("/super-admin/instances/{tenant_id}/status", response_model=AdminTenantOut)
def admin_tenant_status(tenant_id: str, payload: AdminStatusUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.change_tenant_status(db, current_user, tenant_id, payload.status)

@router.patch("/super-admin/instances/{tenant_id}/activate",response_model=AdminTenantOut)
def super_admin_instance_activate(tenant_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.change_tenant_status(db,current_user,tenant_id,"active")
@router.patch("/super-admin/instances/{tenant_id}/suspend",response_model=AdminTenantOut)
def super_admin_instance_suspend(tenant_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.change_tenant_status(db,current_user,tenant_id,"suspended")
@router.patch("/super-admin/instances/{tenant_id}/extend-trial",response_model=AdminTenantOut)
def super_admin_instance_extend(tenant_id:str,current_user:CurrentUser,db:Session=Depends(get_db),days:int=30):return admin_service.extend_trial(db,current_user,tenant_id,days)


@router.get("/super-admin/subscriptions", response_model=list[AdminSubscriptionOut]|CollectionPageOut[AdminSubscriptionOut])
def admin_subscriptions(current_user: CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db: Session = Depends(get_db)):
    rows=admin_service.list_subscriptions(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows

@router.post("/super-admin/subscriptions",response_model=AdminSubscriptionOut,status_code=201)
def super_admin_subscription_create(payload:AdminSubscriptionCreate,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.create_subscription(db,current_user,payload)


@router.get("/super-admin/subscriptions/{item_id}", response_model=AdminSubscriptionOut)
def admin_subscription(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.get_subscription(db, current_user, item_id)


@router.put("/super-admin/subscriptions/{item_id}", response_model=AdminSubscriptionOut)
def admin_subscription_update(item_id: str, payload: AdminSubscriptionUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.update_subscription(db, current_user, item_id, payload)


@router.post("/super-admin/subscriptions/{item_id}/activate", response_model=AdminSubscriptionOut)
def admin_subscription_activate(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.update_subscription(db, current_user, item_id, AdminSubscriptionUpdate(status="active", payment_status="paid"))


@router.post("/super-admin/subscriptions/{item_id}/cancel", response_model=AdminSubscriptionOut)
def admin_subscription_cancel(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.update_subscription(db, current_user, item_id, AdminSubscriptionUpdate(status="cancelled"))

@router.patch("/super-admin/subscriptions/{item_id}/renew",response_model=AdminSubscriptionOut)
def super_admin_subscription_renew(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.renew_subscription(db,current_user,item_id)


@router.get("/super-admin/support-tickets", response_model=list[SupportTicketOut]|CollectionPageOut[SupportTicketOut])
def admin_support_tickets(current_user: CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db: Session = Depends(get_db)):
    rows=admin_service.list_tickets(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows


@router.get("/super-admin/support-tickets/{item_id}", response_model=SupportTicketOut)
def admin_support_ticket(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.get_ticket(db, current_user, item_id)


@router.put("/super-admin/support-tickets/{item_id}", response_model=SupportTicketOut)
def admin_support_update(item_id: str, payload: SupportTicketUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.update_ticket(db, current_user, item_id, payload)


@router.post("/super-admin/support-tickets/{item_id}/reply")
def admin_support_reply(item_id: str, payload: SupportReplyCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.reply_ticket(db, current_user, item_id, payload)


@router.post("/super-admin/support-tickets/{item_id}/close", response_model=SupportTicketOut)
def admin_support_close(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.update_ticket(db, current_user, item_id, SupportTicketUpdate(status="closed"))


@router.get("/super-admin/audit-logs")
def admin_system_logs(current_user: CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db: Session = Depends(get_db)):
    rows=admin_service.logs(db,current_user)
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows


def backup_out(row):
    return {"id":row.id,"tenant_id":row.tenant_id,"backup_type":row.backup_type,"status":row.status,"backup_path":row.backup_path,"size":row.size,"checksum":row.checksum,"started_at":row.started_at,"finished_at":row.finished_at,"triggered_by":row.triggered_by,"triggered_by_user_id":row.triggered_by_user_id,"error_message":row.error_message,"created_at":row.created_at}


def restore_out(row):
    return {"id":row.id,"backup_log_id":row.backup_log_id,"tenant_id":row.tenant_id,"status":row.status,"started_at":row.started_at,"finished_at":row.finished_at,"restored_by_user_id":row.restored_by_user_id,"restore_scope":row.restore_scope,"error_message":row.error_message,"verification_result":row.verification_result,"created_at":row.created_at}


@router.get("/super-admin/backups")
def super_admin_backups(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);rows=[backup_out(row) for row in db.scalars(select(backup_service.BackupLog).order_by(backup_service.BackupLog.created_at.desc()).limit(5000)).all()];return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows


@router.get("/super-admin/restores")
def super_admin_restores(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);rows=[restore_out(row) for row in db.scalars(select(backup_service.RestoreLog).order_by(backup_service.RestoreLog.created_at.desc()).limit(5000)).all()];return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows


@router.post("/super-admin/backups",status_code=201)
def super_admin_backup_create(current_user:CurrentUser,db:Session=Depends(get_db)):
    row=backup_service.create_backup(db,current_user,"manual","full")
    if row.status=="failed":raise HTTPException(500,row.error_message or "Sauvegarde échouée.")
    return backup_out(row)


@router.post("/super-admin/backups/{backup_id}/test-restore")
def super_admin_backup_test(backup_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    try:row=backup_service.test_restore(db,current_user,backup_id)
    except ValueError as exc:raise HTTPException(409,str(exc)) from exc
    return restore_out(row)


@router.get("/super-admin/backups/{backup_id}/download")
def super_admin_backup_download(backup_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);row=db.get(backup_service.BackupLog,backup_id)
    if not row or row.status!="success":raise HTTPException(404,"Sauvegarde introuvable.")
    path=backup_service._safe_path(row.backup_path);admin_service.log_action(db,current_user,"admin.backup.downloaded","backup",row.id);db.commit()
    return FileResponse(path,media_type="application/gzip",filename=path.name)


@router.get("/super-admin/analytics")
def admin_analytics(current_user: CurrentUser, db: Session = Depends(get_db)):
    return admin_service.analytics(db, current_user)

@router.get("/public/subscription-plans",response_model=list[SubscriptionPlanOut])
def public_subscription_plans(db:Session=Depends(get_db)):return subscription_service.active_plans(db)
@router.get("/public/subscription-plans/{slug}",response_model=SubscriptionPlanOut)
def public_subscription_plan(slug:str,db:Session=Depends(get_db)):return subscription_service.plan_by_slug(db,slug)

@router.get("/super-admin/subscription-plans",response_model=list[SubscriptionPlanOut])
def super_admin_subscription_plans(current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.list_plans(db,current_user)
@router.post("/super-admin/subscription-plans",response_model=SubscriptionPlanOut,status_code=201)
def super_admin_subscription_plan_create(payload:SubscriptionPlanCreate,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.create_plan(db,current_user,payload)
@router.patch("/super-admin/subscription-plans/{item_id}",response_model=SubscriptionPlanOut)
def super_admin_subscription_plan_patch(item_id:str,payload:SubscriptionPlanUpdate,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.update_plan(db,current_user,item_id,payload)
@router.delete("/super-admin/subscription-plans/{item_id}")
def super_admin_subscription_plan_disable(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.delete_plan(db,current_user,item_id)

@router.get("/super-admin/subscription-payments",response_model=list[SubscriptionPaymentOut]|CollectionPageOut[SubscriptionPaymentOut])
def super_admin_subscription_payments(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user)
    rows=list(db.scalars(select(SubscriptionPayment).order_by(SubscriptionPayment.created_at.desc())).all())
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows
@router.patch("/super-admin/subscription-payments/{item_id}/validate",response_model=SubscriptionPaymentOut)
def super_admin_subscription_payment_validate(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);payment=db.get(SubscriptionPayment,item_id)
    if not payment:raise HTTPException(404,"Paiement d’abonnement introuvable.")
    return subscription_service.mark_payment_paid(db,current_user,payment)
@router.patch("/super-admin/subscription-payments/{item_id}/reject",response_model=SubscriptionPaymentOut)
def super_admin_subscription_payment_reject(item_id:str,payload:SubscriptionPaymentDecision,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);payment=db.get(SubscriptionPayment,item_id)
    if not payment:raise HTTPException(404,"Paiement d’abonnement introuvable.")
    return subscription_service.reject_payment(db,current_user,payment,payload.reason)
@router.get("/super-admin/users")
def super_admin_users(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    rows=admin_service.main_users(db,current_user);return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows
@router.put("/super-admin/users/{item_id}/activate")
def super_admin_user_activate(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.set_user_active(db,current_user,item_id,True)
@router.put("/super-admin/users/{item_id}/disable")
def super_admin_user_disable(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.set_user_active(db,current_user,item_id,False)
@router.get("/super-admin/settings",response_model=PlatformSettingsOut)
def super_admin_settings(current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.get_settings(db,current_user)
@router.put("/super-admin/settings",response_model=PlatformSettingsOut)
def super_admin_settings_update(payload:PlatformSettingsUpdate,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.update_settings(db,current_user,payload)

@router.get("/public/events",response_model=list[PublicPlatformEventOut])
def public_events(include_past:bool=Query(default=False),db:Session=Depends(get_db)):
    return admin_service.public_events(db,include_past=include_past)

@router.get("/public/blog",response_model=list[PublicBlogPostOut])
def public_blog(db:Session=Depends(get_db)):
    return admin_service.public_blog_posts(db)

@router.get("/public/media/{asset_id}")
def public_media_image(asset_id:str,db:Session=Depends(get_db)):
    asset=db.get(PlatformMediaAsset,asset_id)
    if not asset or asset.archived_at:raise HTTPException(404,"Image introuvable.")
    root=Path(settings.upload_dir).resolve();path=(root/asset.file_url).resolve()
    if root not in path.parents or not path.is_file():raise HTTPException(404,"Image introuvable.")
    response=FileResponse(path,media_type=asset.mime_type);response.headers["Cache-Control"]="public, max-age=86400";return response

@router.get("/public/blog/gallery/{image_id}")
def public_blog_gallery_image(image_id:str,db:Session=Depends(get_db)):
    image=db.get(BlogGalleryImage,image_id)
    if not image:raise HTTPException(404,"Image introuvable.")
    post=db.get(PlatformBlogPost,image.post_id)
    if not post or post.status!="published":raise HTTPException(404,"Image introuvable.")
    suffix=Path(image.file_url).suffix.lower();media_types={".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".jfif":"image/jpeg",".webp":"image/webp"}
    root=Path(settings.upload_dir).resolve();path=(root/image.file_url).resolve()
    if root not in path.parents or not path.is_file():raise HTTPException(404,"Image introuvable.")
    response=FileResponse(path,media_type=media_types.get(suffix,"application/octet-stream"));response.headers["Cache-Control"]="public, max-age=86400";return response

@router.get("/public/blog/{slug}",response_model=PublicBlogPostOut)
def public_blog_detail(slug:str,db:Session=Depends(get_db)):
    return admin_service.public_blog_post(db,slug)

@router.get("/public/events/gallery/{image_id}")
def public_event_gallery_image(image_id:str,db:Session=Depends(get_db)):
    image=db.get(EventGalleryImage,image_id)
    if not image:raise HTTPException(404,"Image introuvable.")
    event=db.get(PlatformEvent,image.event_id)
    if not event or event.status!="published":raise HTTPException(404,"Image introuvable.")
    suffix=Path(image.file_url).suffix.lower()
    media_types={".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".jfif":"image/jpeg",".webp":"image/webp"}
    root=Path(settings.upload_dir).resolve();path=(root/image.file_url).resolve()
    if root not in path.parents or not path.is_file():raise HTTPException(404,"Image introuvable.")
    response=FileResponse(path,media_type=media_types.get(suffix,"application/octet-stream"))
    response.headers["Cache-Control"]="public, max-age=86400"
    return response

@router.post("/public/events/{event_id}/registrations",response_model=PublicEventRegistrationConfirmation,status_code=201)
def public_event_registration(event_id:str,payload:PublicEventRegistrationCreate,db:Session=Depends(get_db)):
    return admin_service.create_event_registration(db,event_id,payload)

@router.get("/public/events/{slug_or_id}",response_model=PublicPlatformEventOut)
def public_event_detail(slug_or_id:str,db:Session=Depends(get_db)):
    return admin_service.public_event(db,slug_or_id)

@router.get("/super-admin/events",response_model=list[PlatformEventOut]|CollectionPageOut[PlatformEventOut])
def super_admin_events(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),event_status:str|None=Query(default=None,alias="status"),db:Session=Depends(get_db)):
    rows=admin_service.list_events(db,current_user)
    summary={"total":len(rows),"published":sum(row["status"]=="published" for row in rows),"upcoming":sum(row["status"]=="published" and row["end_at"]>=datetime.now(UTC) for row in rows),"registrations":sum(row["registration_count"] for row in rows)}
    if event_status:rows=[row for row in rows if row["status"]==event_status]
    if page is None:return rows
    result=paginate_values(rows,page=page,page_size=page_size,search=search);result["summary"]=summary;return result

@router.get("/super-admin/blog",response_model=list[BlogPostOut]|CollectionPageOut[BlogPostOut])
def super_admin_blog(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=10,ge=1,le=100),search:str|None=Query(default=None,max_length=120),post_status:str|None=Query(default=None,alias="status"),db:Session=Depends(get_db)):
    rows=admin_service.list_blog_posts(db,current_user)
    if post_status:rows=[row for row in rows if row["status"]==post_status]
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows
@router.post("/super-admin/blog",response_model=BlogPostOut,status_code=201)
def super_admin_blog_create(payload:BlogPostCreate,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.create_blog_post(db,current_user,payload)
@router.put("/super-admin/blog/{item_id}",response_model=BlogPostOut)
def super_admin_blog_update(item_id:str,payload:BlogPostUpdate,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.update_blog_post(db,current_user,item_id,payload)
@router.delete("/super-admin/blog/{item_id}")
def super_admin_blog_archive(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.update_blog_post(db,current_user,item_id,BlogPostUpdate(status="archived"));return {"status":"archived"}

@router.get("/super-admin/media",response_model=list[PlatformMediaAssetOut]|CollectionPageOut[PlatformMediaAssetOut])
def super_admin_media_list(current_user:CurrentUser,page:int|None=Query(default=1,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user)
    assets=db.scalars(select(PlatformMediaAsset).where(PlatformMediaAsset.archived_at.is_(None)).order_by(PlatformMediaAsset.created_at.desc())).all()
    rows=[{"id":asset.id,"url":f"/api/public/media/{asset.id}","original_filename":asset.original_filename,"alt_text":asset.alt_text,"caption":asset.caption,"mime_type":asset.mime_type,"file_size":asset.file_size,"created_at":asset.created_at} for asset in assets]
    return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows

@router.post("/super-admin/media",response_model=PlatformMediaAssetOut,status_code=201)
async def super_admin_media_upload(current_user:CurrentUser,file:UploadFile=File(...),alt_text:str=Form(...),caption:str|None=Form(None),db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user)
    file_url,mime_type,file_size=await save_platform_media(file)
    asset=PlatformMediaAsset(file_url=file_url,original_filename=(file.filename or "image")[:255],alt_text=alt_text.strip() or "Image FADAA Santé",caption=caption.strip() if caption else None,mime_type=mime_type,file_size=file_size,created_by_user_id=current_user.id)
    db.add(asset);db.commit();db.refresh(asset)
    return {"id":asset.id,"url":f"/api/public/media/{asset.id}","original_filename":asset.original_filename,"alt_text":asset.alt_text,"caption":asset.caption,"mime_type":asset.mime_type,"file_size":asset.file_size,"created_at":asset.created_at}

@router.delete("/super-admin/media/{asset_id}")
def super_admin_media_archive(asset_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);asset=db.get(PlatformMediaAsset,asset_id)
    if not asset or asset.archived_at:raise HTTPException(404,"Image introuvable.")
    asset.archived_at=datetime.now(UTC);db.commit();return {"status":"archived"}

@router.post("/super-admin/blog/{post_id}/gallery/from-media",response_model=list[BlogGalleryImageOut],status_code=201)
def super_admin_blog_gallery_from_media(post_id:str,payload:BlogGalleryFromMediaCreate,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);post=db.get(PlatformBlogPost,post_id)
    if not post:raise HTTPException(404,"Article introuvable.")
    assets=list(db.scalars(select(PlatformMediaAsset).where(PlatformMediaAsset.id.in_(payload.media_asset_ids),PlatformMediaAsset.archived_at.is_(None))).all())
    if len(assets)!=len(set(payload.media_asset_ids)):raise HTTPException(422,"Une ou plusieurs images de la médiathèque sont introuvables.")
    existing=set(db.scalars(select(BlogGalleryImage.media_asset_id).where(BlogGalleryImage.post_id==post.id,BlogGalleryImage.media_asset_id.in_(payload.media_asset_ids))).all())
    if payload.is_cover_id:
        for current in db.scalars(select(BlogGalleryImage).where(BlogGalleryImage.post_id==post.id,BlogGalleryImage.is_cover.is_(True))).all():current.is_cover=False
    start=int(db.scalar(select(func.count()).select_from(BlogGalleryImage).where(BlogGalleryImage.post_id==post.id)) or 0)
    created=[]
    by_id={asset.id:asset for asset in assets}
    for asset_id in payload.media_asset_ids:
        if asset_id in existing:continue
        asset=by_id[asset_id];image=BlogGalleryImage(post_id=post.id,media_asset_id=asset.id,file_url=asset.file_url,alt_text=asset.alt_text,caption=asset.caption,display_order=start+len(created),is_cover=asset.id==payload.is_cover_id)
        db.add(image);created.append(image)
    db.commit()
    for image in created:db.refresh(image)
    return [{"id":image.id,"post_id":post.id,"url":f"/api/public/blog/gallery/{image.id}","alt_text":image.alt_text,"caption":image.caption,"display_order":image.display_order,"is_cover":image.is_cover} for image in created]

@router.post("/super-admin/blog/{post_id}/gallery",response_model=BlogGalleryImageOut,status_code=201)
async def super_admin_blog_gallery_add(post_id:str,current_user:CurrentUser,file:UploadFile=File(...),alt_text:str=Form(...),caption:str|None=Form(None),is_cover:bool=Form(False),display_order:int=Form(0),db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);post=db.get(PlatformBlogPost,post_id)
    if not post:raise HTTPException(404,"Article introuvable.")
    file_url,mime_type,file_size=await save_platform_media(file)
    asset=PlatformMediaAsset(file_url=file_url,original_filename=(file.filename or "image")[:255],alt_text=alt_text.strip() or post.title,caption=caption.strip() if caption else None,mime_type=mime_type,file_size=file_size,created_by_user_id=current_user.id);db.add(asset);db.flush()
    if is_cover:
        for existing in db.scalars(select(BlogGalleryImage).where(BlogGalleryImage.post_id==post.id,BlogGalleryImage.is_cover.is_(True))).all():existing.is_cover=False
    image=BlogGalleryImage(post_id=post.id,media_asset_id=asset.id,file_url=file_url,alt_text=asset.alt_text,caption=asset.caption,is_cover=is_cover,display_order=display_order);db.add(image);db.commit();db.refresh(image)
    return {"id":image.id,"post_id":post.id,"url":f"/api/public/blog/gallery/{image.id}","alt_text":image.alt_text,"caption":image.caption,"display_order":image.display_order,"is_cover":image.is_cover}
@router.delete("/super-admin/blog/{post_id}/gallery/{image_id}")
def super_admin_blog_gallery_delete(post_id:str,image_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);image=db.scalar(select(BlogGalleryImage).where(BlogGalleryImage.id==image_id,BlogGalleryImage.post_id==post_id))
    if not image:raise HTTPException(404,"Image introuvable.")
    root=Path(settings.upload_dir).resolve();path=(root/image.file_url).resolve();db.delete(image);db.commit()
    if root in path.parents and path.is_file():path.unlink()
    return {"status":"deleted"}
@router.get("/super-admin/events/{event_id}/registrations",response_model=list[EventRegistrationOut]|CollectionPageOut[EventRegistrationOut])
def super_admin_event_registrations(event_id:str,current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),db:Session=Depends(get_db)):
    rows=admin_service.list_event_registrations(db,current_user,event_id);return paginate_values(rows,page=page,page_size=page_size,search=search) if page is not None else rows
@router.post("/super-admin/events",response_model=PlatformEventOut,status_code=201)
def super_admin_event_create(payload:PlatformEventCreate,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.create_event(db,current_user,payload)
@router.put("/super-admin/events/{item_id}",response_model=PlatformEventOut)
def super_admin_event_update(item_id:str,payload:PlatformEventUpdate,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.update_event(db,current_user,item_id,payload)
@router.post("/super-admin/events/{event_id}/gallery/from-media",response_model=list[EventGalleryImageOut],status_code=201)
def super_admin_event_gallery_from_media(event_id:str,payload:BlogGalleryFromMediaCreate,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);event=db.get(PlatformEvent,event_id)
    if not event:raise HTTPException(404,"Événement introuvable.")
    assets=list(db.scalars(select(PlatformMediaAsset).where(PlatformMediaAsset.id.in_(payload.media_asset_ids),PlatformMediaAsset.archived_at.is_(None))).all())
    if len(assets)!=len(set(payload.media_asset_ids)):raise HTTPException(422,"Une ou plusieurs images de la médiathèque sont introuvables.")
    existing=set(db.scalars(select(EventGalleryImage.media_asset_id).where(EventGalleryImage.event_id==event.id,EventGalleryImage.media_asset_id.in_(payload.media_asset_ids))).all())
    if payload.is_cover_id:
        for current in db.scalars(select(EventGalleryImage).where(EventGalleryImage.event_id==event.id,EventGalleryImage.is_cover.is_(True))).all():current.is_cover=False
    start=int(db.scalar(select(func.count()).select_from(EventGalleryImage).where(EventGalleryImage.event_id==event.id)) or 0);created=[];by_id={asset.id:asset for asset in assets}
    for asset_id in payload.media_asset_ids:
        if asset_id in existing:continue
        asset=by_id[asset_id];image=EventGalleryImage(event_id=event.id,media_asset_id=asset.id,file_url=asset.file_url,alt_text=asset.alt_text,caption=asset.caption,display_order=start+len(created),is_cover=asset.id==payload.is_cover_id);db.add(image);created.append(image)
    db.commit()
    for image in created:db.refresh(image)
    return [{"id":image.id,"event_id":event.id,"url":f"/api/public/events/gallery/{image.id}","alt_text":image.alt_text,"caption":image.caption,"display_order":image.display_order,"is_cover":image.is_cover} for image in created]
@router.post("/super-admin/events/{event_id}/gallery",response_model=EventGalleryImageOut,status_code=201)
async def super_admin_event_gallery_add(event_id:str,current_user:CurrentUser,file:UploadFile=File(...),alt_text:str=Form(...),caption:str|None=Form(None),is_cover:bool=Form(False),display_order:int=Form(0),db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);event=db.get(PlatformEvent,event_id)
    if not event:raise HTTPException(404,"Événement introuvable.")
    file_url,mime_type,file_size=await save_platform_media(file)
    asset=PlatformMediaAsset(file_url=file_url,original_filename=(file.filename or "image")[:255],alt_text=alt_text.strip() or event.title,caption=caption.strip() if caption else None,mime_type=mime_type,file_size=file_size,created_by_user_id=current_user.id);db.add(asset);db.flush()
    if is_cover:
        for existing in db.scalars(select(EventGalleryImage).where(EventGalleryImage.event_id==event.id,EventGalleryImage.is_cover.is_(True))).all():existing.is_cover=False
    image=EventGalleryImage(event_id=event.id,media_asset_id=asset.id,file_url=file_url,alt_text=asset.alt_text,caption=asset.caption,is_cover=is_cover,display_order=display_order)
    db.add(image);db.commit();db.refresh(image)
    return {"id":image.id,"event_id":event.id,"url":f"/api/public/events/gallery/{image.id}","alt_text":image.alt_text,"caption":image.caption,"display_order":image.display_order,"is_cover":image.is_cover}
@router.delete("/super-admin/events/{event_id}/gallery/{image_id}")
def super_admin_event_gallery_delete(event_id:str,image_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);image=db.scalar(select(EventGalleryImage).where(EventGalleryImage.id==image_id,EventGalleryImage.event_id==event_id))
    if not image:raise HTTPException(404,"Image introuvable.")
    root=Path(settings.upload_dir).resolve();path=(root/image.file_url).resolve()
    db.delete(image);db.commit()
    if root in path.parents and path.is_file():path.unlink()
    return {"status":"deleted"}
@router.delete("/super-admin/events/{item_id}")
def super_admin_event_cancel(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):return admin_service.cancel_event(db,current_user,item_id)


@router.post("/users", response_model=UserOut, status_code=201)
def users_create(payload: UserCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> UserOut:
    if payload.role != "SECRETAIRE" and current_user.tenant_id:
        raise HTTPException(status_code=400, detail="Cette route permet uniquement de créer une secrétaire.")
    return crud_service.create_user(db, current_user, payload)


@router.get(
    "/users",
    response_model=list[UserOut] | CollectionPageOut[UserOut],
)
def users_list(
    current_user: CurrentUser,
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    if page is not None:
        return crud_service.paginate_users(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_by=sort_by, sort_order=sort_order,
        )
    users = crud_service.list_users(db, current_user)
    return [user for user in users if user.role == "SECRETAIRE"]


@router.get("/users/{user_id}", response_model=UserOut)
def users_get(user_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> UserOut:
    return crud_service.get_user(db, current_user, user_id)


@router.put("/users/{user_id}", response_model=UserOut)
def users_update(user_id: str, payload: UserUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> UserOut:
    return crud_service.update_user(db, current_user, user_id, payload)


@router.delete("/users/{user_id}")
def users_delete(user_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    return crud_service.disable_user(db, current_user, user_id)


@router.post("/users/{user_id}/resend-invitation")
def staff_invitation_resend(user_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    return crud_service.resend_staff_invitation(db, current_user, user_id)


@router.post("/patients", response_model=PatientOut, status_code=201)
def patients_create(payload: PatientCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> PatientOut:
    return crud_service.create_patient(db, current_user, payload)


@router.get(
    "/patients",
    response_model=list[PatientOut] | CollectionPageOut[PatientOut],
)
def patients_list(
    current_user: CurrentUser,
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    if page is not None:
        return crud_service.paginate_patients(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_by=sort_by, sort_order=sort_order, status_filter=status_filter,
        )
    return crud_service.list_patients(db, current_user)


@router.get("/patients/{patient_id}", response_model=PatientOut)
def patients_get(patient_id: str, request: Request, current_user: CurrentUser, db: Session = Depends(get_db)) -> PatientOut:
    item=crud_service.get_patient(db,current_user,patient_id)
    audit_log_service.log_access(db,current_user,patient_id=patient_id,action="view_patient_file",resource_type="patient",resource_id=patient_id,request=request)
    return item


@router.get("/patients/{patient_id}/medical-summary", response_model=PatientMedicalSummaryOut)
def patient_medical_summary_get(patient_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> PatientMedicalSummaryOut:
    return crud_service.get_patient_medical_summary(db, current_user, patient_id)


@router.put("/patients/{patient_id}/medical-summary", response_model=PatientMedicalSummaryOut)
def patient_medical_summary_update(patient_id: str, payload: PatientMedicalSummaryUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> PatientMedicalSummaryOut:
    return crud_service.update_patient_medical_summary(db, current_user, patient_id, payload)


@router.get("/patients/{patient_id}/report/{file_format}")
def patient_consolidated_report(
    patient_id: str,
    file_format: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    tenant_id = crud_service.require_tenant(current_user)
    if file_format not in {"pdf", "xlsx"}:
        raise HTTPException(404, "Format de rapport inconnu. Utilisez PDF ou Excel.")
    data = patient_report_service.patient_report_data(db, tenant_id, patient_id)
    if file_format == "pdf":
        content = patient_report_service.render_patient_pdf(data)
        media_type = "application/pdf"
    else:
        content = patient_report_service.render_patient_excel(data)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    db.add(AuditLog(
        tenant_id=tenant_id,
        user_id=current_user.id,
        action="PATIENT_REPORT_EXPORTED",
        resource_type="patient",
        resource_id=patient_id,
        event_metadata={"format": file_format},
    ))
    db.commit()
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="rapport-patient-{patient_id[:8]}.{file_format}"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/patients/{patient_id}/overview")
def patient_overview(patient_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    """Compact patient-centric dashboard payload for mobile clients."""
    patient = crud_service.get_patient_or_404(db, current_user, patient_id)
    tenant_id = crud_service.require_tenant(current_user)

    def count(model, *conditions) -> int:
        return int(db.scalar(select(func.count(model.id)).where(model.tenant_id == tenant_id, model.patient_id == patient_id, *conditions)) or 0)

    active_fee = crud_service.Fee.status != "cancelled"
    total_billed = Decimal(str(db.scalar(select(func.coalesce(func.sum(crud_service.Fee.amount), 0)).where(
        crud_service.Fee.tenant_id == tenant_id, crud_service.Fee.patient_id == patient_id, active_fee,
    )) or 0))
    total_paid = Decimal(str(db.scalar(select(func.coalesce(func.sum(crud_service.Payment.amount), 0)).where(
        crud_service.Payment.tenant_id == tenant_id, crud_service.Payment.patient_id == patient_id,
        crud_service.valid_payment_condition(),
    )) or 0))
    next_appointment = db.scalar(select(crud_service.Appointment).where(
        crud_service.Appointment.tenant_id == tenant_id,
        crud_service.Appointment.patient_id == patient_id,
        crud_service.Appointment.date >= date.today(),
        crud_service.Appointment.status.not_in(("completed", "cancelled", "rejected", "absent")),
    ).order_by(crud_service.Appointment.date, crud_service.Appointment.start_time).limit(1))
    latest_visit = db.scalar(select(crud_service.Visit).where(
        crud_service.Visit.tenant_id == tenant_id, crud_service.Visit.patient_id == patient_id,
    ).order_by(crud_service.Visit.visit_date.desc(), crud_service.Visit.created_at.desc()).limit(1))
    latest_prescription = db.scalar(select(crud_service.Prescription).where(
        crud_service.Prescription.tenant_id == tenant_id, crud_service.Prescription.patient_id == patient_id,
    ).order_by(crud_service.Prescription.created_at.desc()).limit(1))

    return {
        "patient": crud_service.serialize_patient(patient).model_dump(mode="json"),
        "summary": {
            "appointments": count(crud_service.Appointment),
            "visits": count(crud_service.Visit),
            "prescriptions": count(crud_service.Prescription),
            "honoraires": count(crud_service.Fee, active_fee),
            "payments": count(crud_service.Payment),
            "invoices": count(crud_service.Invoice),
            "documents": count(crud_service.MedicalDocument, crud_service.MedicalDocument.archived_at.is_(None)),
            "cnss_records": count(crud_service.CNSSCase),
            "total_billed": float(total_billed),
            "total_paid": float(total_paid),
            "remaining_amount": float(max(Decimal("0"), total_billed - total_paid)),
        },
        "next_appointment": crud_service.serialize_appointment(next_appointment).model_dump(mode="json") if next_appointment else None,
        "latest_visit": crud_service.serialize_visits(db, [latest_visit])[0].model_dump(mode="json") if latest_visit else None,
        "latest_prescription": crud_service.serialize_prescriptions(db, [latest_prescription])[0].model_dump(mode="json") if latest_prescription else None,
    }


@router.put("/patients/{patient_id}", response_model=PatientOut)
def patients_update(patient_id: str, payload: PatientUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> PatientOut:
    return crud_service.update_patient(db, current_user, patient_id, payload)


@router.delete("/patients/{patient_id}")
def patients_delete(patient_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    return crud_service.disable_patient(db, current_user, patient_id)


@router.post("/appointments", response_model=AppointmentOut, status_code=201)
def appointments_create(payload: AppointmentCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentOut:
    return crud_service.create_appointment(db, current_user, payload)


@router.get(
    "/appointments",
    response_model=list[AppointmentOut] | CollectionPageOut[AppointmentOut],
)
def appointments_list(
    current_user: CurrentUser,
    patient_id: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="date"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    if patient_id: crud_service.get_patient_or_404(db, current_user, patient_id)
    if page is not None:
        return crud_service.paginate_appointments(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_by=sort_by, sort_order=sort_order, status_filter=status_filter, patient_id=patient_id,
        )
    return crud_service.list_appointments(db, current_user, patient_id=patient_id)


@router.post("/appointments/qr/resolve", response_model=AppointmentQrScanOut)
def appointments_qr_resolve(
    payload: AppointmentQrScanRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> AppointmentQrScanOut:
    return crud_service.scan_appointment_qr(db, current_user, payload.code, confirm=False)


@router.post("/appointments/qr/confirm", response_model=AppointmentQrScanOut)
def appointments_qr_confirm(
    payload: AppointmentQrScanRequest,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> AppointmentQrScanOut:
    return crud_service.scan_appointment_qr(db, current_user, payload.code, confirm=True)


@router.get("/appointments/{appointment_id}", response_model=AppointmentOut)
def appointments_get(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentOut:
    return crud_service.get_appointment(db, current_user, appointment_id)


@router.get(
    "/appointments/{appointment_id}/details",
    response_model=AppointmentDetailsResponse,
    summary="Contexte opérationnel complet d’un rendez-vous",
    description=(
        "Retourne le rendez-vous et ses ressources liées. L’accès est limité au cabinet "
        "actif et aux utilisateurs autorisés. Pour un patient, les notes internes sont "
        "masquées, les documents doivent être partagés et les données financières "
        "respectent la configuration du cabinet. Les objets absents valent null et les "
        "collections absentes sont toujours des tableaux vides."
    ),
    responses={
        401: {"description": "Authentification requise."},
        403: {"description": "Utilisateur authentifié mais non autorisé."},
        404: {"description": "Rendez-vous introuvable dans le cabinet actif."},
    },
)
def appointments_details(
    appointment_id: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> AppointmentDetailsResponse:
    return appointment_details_service.get_appointment_details(
        db, current_user, appointment_id
    )


@router.put("/appointments/{appointment_id}", response_model=AppointmentOut)
def appointments_update(appointment_id: str, payload: AppointmentUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentOut:
    return crud_service.update_appointment(db, current_user, appointment_id, payload)


@router.delete("/appointments/{appointment_id}")
def appointments_delete(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    return crud_service.delete_appointment(db, current_user, appointment_id)


@router.patch("/appointments/{appointment_id}/status", response_model=AppointmentOut)
def appointments_status(appointment_id: str, payload: AppointmentStatusUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentOut:
    return crud_service.set_appointment_status(db, current_user, appointment_id, payload)


@router.get("/appointments/{appointment_id}/preparation", response_model=AppointmentPreparationOut)
def appointment_preparation_get(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentPreparationOut:
    return crud_service.get_appointment_preparation(db, current_user, appointment_id)


@router.put("/appointments/{appointment_id}/preparation", response_model=AppointmentPreparationOut)
def appointment_preparation_update(appointment_id: str, payload: AppointmentPreparationUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentPreparationOut:
    return crud_service.update_appointment_preparation(db, current_user, appointment_id, payload)


@router.post("/appointments/{appointment_id}/preparation/validate", response_model=AppointmentPreparationOut)
def appointment_preparation_validate(appointment_id: str, payload: AppointmentPreparationValidate, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentPreparationOut:
    return crud_service.validate_appointment_preparation(db, current_user, appointment_id, payload)


@router.post("/appointments/{appointment_id}/mark-arrived", response_model=AppointmentOut)
def appointments_mark_arrived(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentOut:
    return crud_service.appointment_action(db, current_user, appointment_id, "mark-arrived")


@router.post("/appointments/{appointment_id}/start", response_model=AppointmentOut)
def appointments_start(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentOut:
    return crud_service.appointment_action(db, current_user, appointment_id, "start")


@router.post("/appointments/{appointment_id}/end", response_model=AppointmentOut)
def appointments_end(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentOut:
    return crud_service.appointment_action(db, current_user, appointment_id, "end")


@router.post("/appointments/{appointment_id}/mark-absent", response_model=AppointmentOut)
def appointments_mark_absent(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentOut:
    return crud_service.appointment_action(db, current_user, appointment_id, "mark-absent")


@router.post("/appointments/{appointment_id}/cancel", response_model=AppointmentOut)
def appointments_cancel(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> AppointmentOut:
    return crud_service.update_appointment(db, current_user, appointment_id, AppointmentUpdate(status="cancelled"))


@router.get(
    "/history",
    response_model=list[OperationHistoryOut] | CollectionPageOut[OperationHistoryOut],
)
def history_list(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    patient_id: str | None = None,
    appointment_id: str | None = None,
    visit_id: str | None = None,
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
):
    if page is not None:
        return crud_service.paginate_operation_history(
            db, current_user, page=page, page_size=page_size, search=search,
            patient_id=patient_id, appointment_id=appointment_id, visit_id=visit_id,
        )
    return crud_service.list_operation_history(db, current_user, patient_id=patient_id,
                                               appointment_id=appointment_id, visit_id=visit_id)


@router.get("/appointments/{appointment_id}/history", response_model=list[OperationHistoryOut])
def appointment_history(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> list[OperationHistoryOut]:
    crud_service.get_appointment_obj(db, current_user, appointment_id)
    return crud_service.list_operation_history(db, current_user, appointment_id=appointment_id)


@router.get("/patients/{patient_id}/appointment-history", response_model=list[OperationHistoryOut])
def patient_appointment_history(patient_id: str, request:Request, current_user: CurrentUser, db: Session = Depends(get_db)) -> list[OperationHistoryOut]:
    crud_service.get_patient_or_404(db, current_user, patient_id)
    rows=crud_service.list_operation_history(db,current_user,patient_id=patient_id)
    audit_log_service.log_access(db,current_user,patient_id=patient_id,action="view_visit_history",resource_type="patient",resource_id=patient_id,request=request)
    return rows


@router.get("/history/honoraire/{fee_id}", response_model=list[OperationHistoryOut])
def fee_history(fee_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> list[OperationHistoryOut]:
    crud_service.get_scoped(db, current_user, crud_service.Fee, fee_id, "Honoraire")
    return crud_service.list_operation_history(db, current_user, fee_id=fee_id)


def serialize_access_logs(db:Session,rows):
    user_ids={row.user_id for row in rows if row.user_id};patient_ids={row.patient_id for row in rows if row.patient_id}
    users={row.id:f"{row.first_name} {row.last_name}" for row in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    profiles=db.scalars(select(PatientProfile).where(PatientProfile.id.in_(patient_ids))).all() if patient_ids else []
    patient_users={row.id:row.user_id for row in profiles};patient_user_ids=set(patient_users.values())
    patient_names={row.id:f"{row.first_name} {row.last_name}" for row in db.scalars(select(User).where(User.id.in_(patient_user_ids))).all()} if patient_user_ids else {}
    return [{"id":row.id,"user_id":row.user_id,"user_name":users.get(row.user_id,"Système" if not row.user_id else "Utilisateur supprimé"),"user_role":row.user_role or "SYSTEM","patient_id":row.patient_id,"patient_name":patient_names.get(patient_users.get(row.patient_id),"Patient supprimé") if row.patient_id else "—","action":row.action,"resource_type":row.resource_type,"resource_id":row.resource_id,"ip_address":row.ip_address,"user_agent":row.user_agent,"access_datetime":row.access_datetime or row.created_at,"details":row.details} for row in rows]


def serialize_operation_logs(db:Session,rows):
    user_ids={row.user_id for row in rows if row.user_id}; patient_ids={row.patient_id for row in rows if row.patient_id}
    users={row.id:f"{row.first_name} {row.last_name}" for row in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    profiles=db.scalars(select(PatientProfile).where(PatientProfile.id.in_(patient_ids))).all() if patient_ids else []
    patient_users={row.id:row.user_id for row in profiles}; patient_user_ids=set(patient_users.values())
    patient_names={row.id:f"{row.first_name} {row.last_name}" for row in db.scalars(select(User).where(User.id.in_(patient_user_ids))).all()} if patient_user_ids else {}
    def resource(row):
        for kind,identifier in (("appointment",row.appointment_id),("visit",row.visit_id),("fee",row.fee_id),("invoice",row.invoice_id),("payment",row.payment_id),("document",row.document_id),("prescription",row.prescription_id)):
            if identifier:return kind,identifier
        return "patient",row.patient_id
    return [{"id":f"operation:{row.id}","user_id":row.user_id,"user_name":users.get(row.user_id,"Système" if not row.user_id else "Utilisateur supprimé"),"user_role":row.performed_by_role or "SYSTEM","patient_id":row.patient_id,"patient_name":patient_names.get(patient_users.get(row.patient_id),"Patient supprimé") if row.patient_id else "—","action":row.action_type,"resource_type":resource(row)[0],"resource_id":resource(row)[1],"ip_address":None,"user_agent":None,"access_datetime":row.created_at,"details":row.description} for row in rows]


@router.get("/security/audit-logs")
def medical_audit_logs(current_user:CurrentUser,db:Session=Depends(get_db)):
    access=serialize_access_logs(db,audit_log_service.cabinet_logs(db,current_user))
    operations=db.scalars(select(crud_service.OperationHistory).where(crud_service.OperationHistory.tenant_id==current_user.tenant_id).order_by(crud_service.OperationHistory.created_at.desc()).limit(5000)).all()
    return sorted([*access,*serialize_operation_logs(db,operations)],key=lambda row:row["access_datetime"],reverse=True)[:5000]


@router.get("/patients/{patient_id}/access-logs")
def patient_access_logs(patient_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    return serialize_access_logs(db,audit_log_service.patient_logs(db,current_user,patient_id))


@router.get("/security/audit-logs/users/{user_id}")
def medical_audit_user_logs(user_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    return serialize_access_logs(db,audit_log_service.user_logs(db,current_user,user_id))


@router.get("/security/audit-logs/export")
def medical_audit_export(current_user:CurrentUser,db:Session=Depends(get_db)):
    rows=serialize_access_logs(db,audit_log_service.cabinet_logs(db,current_user));output=io.StringIO();writer=csv.writer(output);writer.writerow(["Date","Utilisateur","Rôle","Patient","Action","Ressource","Identifiant","Adresse IP"])
    for row in rows:writer.writerow([row["access_datetime"],row["user_name"],row["user_role"],row["patient_name"],row["action"],row["resource_type"],row["resource_id"],row["ip_address"]])
    return Response(content=output.getvalue(),media_type="text/csv; charset=utf-8",headers={"Content-Disposition":'attachment; filename="audit-acces-medicaux.csv"'})


@router.post("/invoices", response_model=InvoiceOut, status_code=201)
def invoices_create(payload: InvoiceCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> InvoiceOut:
    return crud_service.create_invoice(db, current_user, payload.fee_id)


@router.post("/invoices/from-honoraire/{fee_id}", response_model=InvoiceOut, status_code=201)
def invoices_from_fee(fee_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> InvoiceOut:
    return crud_service.create_invoice(db, current_user, fee_id)


@router.get(
    "/invoices",
    response_model=list[InvoiceOut] | CollectionPageOut[InvoiceOut],
)
def invoices_list(
    current_user: CurrentUser,
    patient_id: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="issued_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    if patient_id: crud_service.get_patient_or_404(db, current_user, patient_id)
    if page is not None:
        return crud_service.paginate_invoices(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_by=sort_by, sort_order=sort_order, status_filter=status_filter, patient_id=patient_id,
        )
    return crud_service.list_invoices(db, current_user, patient_id=patient_id)


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def invoices_get(invoice_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> InvoiceOut:
    return crud_service.serialize_invoice(
        db, crud_service.get_invoice(db, current_user, invoice_id)
    )


@router.get(
    "/invoices/{invoice_id}/pdf",
    response_class=FileResponse,
    summary="Afficher ou télécharger une facture PDF authentifiée",
    responses={
        200: {"content": {"application/pdf": {}}, "description": "Facture PDF."},
        401: {"description": "Authentification requise."},
        403: {"description": "Accès financier non autorisé."},
        404: {"description": "Facture introuvable dans le cabinet actif."},
    },
)
def invoice_pdf(invoice_id: str, request: Request, current_user: CurrentUser, action: str = Query(default="preview", pattern="^(preview|download|print)$"), db: Session = Depends(get_db)):
    document = payment_document_service.invoice_pdf_document(db, current_user, invoice_id)
    crud_service.record_document_access(db, current_user, document, "DOCUMENT_DOWNLOADED" if action == "download" else "DOCUMENT_VIEWED")
    audit_log_service.log_access(db,current_user,patient_id=document.patient_id,action=f"{action}_invoice",resource_type="invoice",resource_id=invoice_id,request=request)
    path = Path(settings.upload_dir) / (document.file_url or "")
    if not path.is_file(): raise HTTPException(404, "Fichier PDF introuvable.")
    filename = document.original_filename or f"{document.title}.pdf"
    disposition = "attachment" if action == "download" else "inline"
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=filename,
        content_disposition_type=disposition,
        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceOut)
def invoices_cancel(invoice_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> InvoiceOut:
    return crud_service.cancel_invoice(db, current_user, invoice_id)


@router.get("/invoices/{invoice_id}/echeances", response_model=list[DueDateOut])
def invoice_due_dates(invoice_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.due_date_list(db, current_user, invoice_id)


@router.get(
    "/echeances",
    response_model=list[DueDateOut] | CollectionPageOut[DueDateOut],
)
def due_dates_list(
    current_user: CurrentUser,
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    if page is not None:
        return crud_service.paginate_due_dates(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_order=sort_order, status_filter=status_filter,
        )
    return crud_service.all_due_dates(db, current_user)


@router.get("/echeances/{item_id}", response_model=DueDateOut)
def due_date_get(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.due_date_get(db, current_user, item_id)


@router.post(
    "/invoices/{invoice_id}/echeances",
    response_model=DueDateOut,
    status_code=status.HTTP_201_CREATED,
    summary="Créer une échéance de paiement",
    description=(
        "Crée une échéance rattachée à une facture du cabinet actif. Le patient et "
        "l’honoraire sont déduits de la facture. La somme des échéances non annulées "
        "ne peut pas dépasser le montant total facturé. L’opération exige un accès "
        "en écriture au module Paiements et est inscrite dans l’historique."
    ),
    responses={
        201: {"description": "Échéance créée avec son statut initial calculé automatiquement."},
        401: {"description": "Authentification Bearer requise."},
        403: {"description": "Permission d’écriture Paiements insuffisante."},
        404: {"description": "Facture introuvable dans le cabinet actif."},
        422: {"description": "Données invalides, garantie incomplète ou dépassement du total facturé."},
    },
)
def invoice_due_date_create(invoice_id: str, payload: DueDateCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.due_date_create(db, current_user, invoice_id, payload)


@router.put("/echeances/{item_id}", response_model=DueDateOut)
def invoice_due_date_update(item_id: str, payload: DueDateUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.due_date_update(db, current_user, item_id, payload)


@router.post("/echeances/{item_id}/cancel", response_model=DueDateOut)
def invoice_due_date_cancel(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.due_date_cancel(db, current_user, item_id)


@router.post("/echeances/{item_id}/documents", response_model=DueDateDocumentOut, status_code=201)
async def due_date_document_create(
    item_id: str,
    current_user: CurrentUser,
    document_type: str = Form(...),
    title: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    due = due_date_document_service.get_due(db, current_user, item_id, write=True)
    due_date_document_service.validate_document_type(due, document_type)
    file_path, mime_type, file_size, original_filename, _, _ = await save_patient_document_upload(
        file, due.tenant_id, due.patient_id
    )
    try:
        return due_date_document_service.create(
            db,
            current_user,
            item_id,
            document_type=document_type,
            title=title,
            file_path=file_path,
            original_filename=original_filename,
            mime_type=mime_type,
            file_size=file_size,
        )
    except Exception:
        (Path(settings.upload_dir) / file_path).unlink(missing_ok=True)
        raise


@router.get("/echeances/{item_id}/documents", response_model=list[DueDateDocumentOut])
def due_date_documents_list(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return due_date_document_service.list_for_due(db, current_user, item_id)


@router.get("/documents-echeance/{document_id}/download")
def due_date_document_download(document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    row = due_date_document_service.get_document(db, current_user, document_id)
    return protected_upload_response(row.file_path, row.original_filename, row.mime_type)


@router.get("/documents-echeance/{document_id}/preview")
def due_date_document_preview(document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    row = due_date_document_service.get_document(db, current_user, document_id)
    response = protected_upload_response(row.file_path, row.original_filename, row.mime_type)
    response.headers["Content-Disposition"] = f'inline; filename="{row.original_filename}"'
    return response


@router.delete("/documents-echeance/{document_id}", status_code=204)
def due_date_document_delete(document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    due_date_document_service.delete(db, current_user, document_id)
    return Response(status_code=204)


@router.get("/payment-methods", response_model=list[PaymentMethodOut])
def payment_methods_list(current_user: CurrentUser, db: Session = Depends(get_db), main_type: str | None = None, active: bool | None = None):
    return crud_service.payment_method_list(db, current_user, main_type, active)


@router.post("/payment-methods", response_model=PaymentMethodOut, status_code=201)
def payment_methods_create(payload: PaymentMethodCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.payment_method_create(db, current_user, payload)


@router.put("/payment-methods/{item_id}", response_model=PaymentMethodOut)
def payment_methods_update(item_id: str, payload: PaymentMethodUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.payment_method_update(db, current_user, item_id, payload)


@router.get("/bank-accounts", response_model=list[BankAccountOut])
def bank_accounts_list(current_user: CurrentUser, db: Session = Depends(get_db), active: bool | None = None):
    return crud_service.bank_account_list(db, current_user, active)


@router.post("/bank-accounts", response_model=BankAccountOut, status_code=201)
def bank_accounts_create(payload: BankAccountCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.bank_account_create(db, current_user, payload)


@router.put("/bank-accounts/{item_id}", response_model=BankAccountOut)
def bank_accounts_update(item_id: str, payload: BankAccountUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.bank_account_update(db, current_user, item_id, payload)


@router.post("/visits", response_model=VisitOut, status_code=201)
def visits_create(payload: VisitCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> VisitOut:
    return crud_service.create_visit(db, current_user, payload)


@router.post("/visits/from-appointment/{appointment_id}", response_model=VisitOut, status_code=201)
def visits_from_appointment(appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> VisitOut:
    appointment = crud_service.get_appointment_obj(db, current_user, appointment_id)
    return crud_service.create_visit(db, current_user, VisitCreate(patient_id=appointment.patient_id,
        doctor_id=appointment.doctor_id, appointment_id=appointment.id, visit_date=appointment.date,
        reason=appointment.reason, notes=appointment.notes))


@router.get(
    "/visits",
    response_model=list[VisitOut] | CollectionPageOut[VisitOut],
)
def visits_list(
    current_user: CurrentUser,
    patient_id: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="visit_date"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    if patient_id: crud_service.get_patient_or_404(db, current_user, patient_id)
    if page is not None:
        return crud_service.paginate_visits(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_by=sort_by, sort_order=sort_order, status_filter=status_filter, patient_id=patient_id,
        )
    return crud_service.list_visits(db, current_user, patient_id=patient_id)


@router.get("/visits/{visit_id}", response_model=VisitOut)
def visits_get(visit_id: str, request:Request, current_user: CurrentUser, db: Session = Depends(get_db)) -> VisitOut:
    crud_service.require_module_access(db, current_user, "visits")
    item = crud_service.get_scoped(db, current_user, crud_service.Visit, visit_id, "Visite")
    audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="view_visit_history",resource_type="visite",resource_id=item.id,request=request)
    return crud_service.serialize_visits(db, [item])[0]


@router.put("/visits/{visit_id}", response_model=VisitOut)
def visits_update(visit_id: str, payload: VisitUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> VisitOut:
    return crud_service.update_visit(db, current_user, visit_id, payload)


@router.delete("/visits/{visit_id}")
def visits_delete(visit_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    return crud_service.delete_item(db, current_user, crud_service.Visit, visit_id, "visits", "Visite")


@router.post("/honoraires", response_model=FeeOut, status_code=201)
def honoraires_create(payload: FeeCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> FeeOut:
    return crud_service.create_fee(db, current_user, payload)


@router.get(
    "/honoraires",
    response_model=list[FeeOut] | CollectionPageOut[FeeOut],
)
def honoraires_list(
    current_user: CurrentUser,
    patient_id: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    if patient_id: crud_service.get_patient_or_404(db, current_user, patient_id)
    if page is not None:
        return crud_service.paginate_fees(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_by=sort_by, sort_order=sort_order, status_filter=status_filter, patient_id=patient_id,
        )
    return crud_service.list_fees(db, current_user, patient_id=patient_id)


@router.get("/honoraires/{fee_id}", response_model=FeeOut)
def honoraires_get(fee_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> FeeOut:
    crud_service.require_module_access(db, current_user, "honoraires")
    item = crud_service.get_scoped(db, current_user, crud_service.Fee, fee_id, "Honoraire")
    return crud_service.serialize_fee(db, item)


@router.put("/honoraires/{fee_id}", response_model=FeeOut)
def honoraires_update(fee_id: str, payload: FeeUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> FeeOut:
    return crud_service.update_fee(db, current_user, fee_id, payload)


@router.get("/doctor/fee-settings", response_model=FeeTypePrices)
def fee_settings_get(current_user: CurrentUser, db: Session = Depends(get_db)) -> FeeTypePrices:
    crud_service.require_module_access(db, current_user, "honoraires")
    row = db.scalar(select(crud_service.TenantSettings).where(crud_service.TenantSettings.tenant_id == crud_service.require_tenant(current_user)))
    stored = row.fee_type_prices if row and row.fee_type_prices else {"CONSULTATION": 300, "ACTE": 0, "SOIN": 0, "TRAITEMENT": 0, "AUTRE": 0}
    if "prices" in stored:
        return FeeTypePrices(prices=stored["prices"], tax_rates=stored.get("tax_rates", {}))
    return FeeTypePrices(prices=stored, tax_rates={key: 0 for key in stored})


@router.put("/doctor/fee-settings", response_model=FeeTypePrices)
def fee_settings_update(payload: FeeTypePrices, current_user: CurrentUser, db: Session = Depends(get_db)) -> FeeTypePrices:
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    crud_service.ensure_write_allowed(current_user)
    tenant_id = crud_service.require_tenant(current_user)
    row = db.scalar(select(crud_service.TenantSettings).where(crud_service.TenantSettings.tenant_id == tenant_id))
    if not row:
        row = crud_service.TenantSettings(tenant_id=tenant_id)
        db.add(row)
    row.fee_type_prices = {"prices": payload.prices, "tax_rates": payload.tax_rates}
    db.commit()
    return payload


@router.get("/doctor/payment-settings", response_model=PaymentSettings)
def payment_settings_get(current_user: CurrentUser, db: Session = Depends(get_db)) -> PaymentSettings:
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    tenant_id = crud_service.require_tenant(current_user)
    row = db.scalar(select(crud_service.TenantSettings).where(crud_service.TenantSettings.tenant_id == tenant_id))
    return PaymentSettings.model_validate(row.payment_settings if row and row.payment_settings else {
        "methods": ["cash", "card", "transfer", "cheque", "other"],
        "settlement_types": ["immediate", "partial", "single_due", "installment"]})


@router.put("/doctor/payment-settings", response_model=PaymentSettings)
def payment_settings_update(payload: PaymentSettings, current_user: CurrentUser, db: Session = Depends(get_db)) -> PaymentSettings:
    crud_service.require_role(current_user, {"MEDECIN_ADMIN"})
    crud_service.ensure_write_allowed(current_user)
    tenant_id = crud_service.require_tenant(current_user)
    row = db.scalar(select(crud_service.TenantSettings).where(crud_service.TenantSettings.tenant_id == tenant_id))
    if not row:
        row = crud_service.TenantSettings(tenant_id=tenant_id)
        db.add(row)
    row.payment_settings = payload.model_dump()
    db.commit()
    return payload


@router.delete("/honoraires/{fee_id}")
def honoraires_delete(fee_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    return crud_service.delete_fee(db, current_user, fee_id)


@router.post("/honoraires/{fee_id}/rendez-vous/{appointment_id}", response_model=FeeOut)
def honoraires_link_appointment(fee_id: str, appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> FeeOut:
    return crud_service.set_fee_link(db, current_user, fee_id, appointment_id, "appointment", True)


@router.delete("/honoraires/{fee_id}/rendez-vous/{appointment_id}", response_model=FeeOut)
def honoraires_unlink_appointment(fee_id: str, appointment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> FeeOut:
    return crud_service.set_fee_link(db, current_user, fee_id, appointment_id, "appointment", False)


@router.post("/honoraires/{fee_id}/visites/{visit_id}", response_model=FeeOut)
def honoraires_link_visit(fee_id: str, visit_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> FeeOut:
    return crud_service.set_fee_link(db, current_user, fee_id, visit_id, "visit", True)


@router.delete("/honoraires/{fee_id}/visites/{visit_id}", response_model=FeeOut)
def honoraires_unlink_visit(fee_id: str, visit_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> FeeOut:
    return crud_service.set_fee_link(db, current_user, fee_id, visit_id, "visit", False)


@router.post("/honoraires/{fee_id}/paiements", response_model=PaymentOut, status_code=201)
def honoraires_add_payment(fee_id: str, payload: HonorairePaymentCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> PaymentOut:
    fee = crud_service.get_scoped(db, current_user, crud_service.Fee, fee_id, "Honoraire")
    return crud_service.create_payment(db, current_user, PaymentCreate(patient_id=fee.patient_id, fee_id=fee.id, **payload.model_dump()))


@router.get("/honoraires/{fee_id}/paiements", response_model=list[PaymentOut])
def honoraires_payments(fee_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> list[PaymentOut]:
    return crud_service.list_fee_payments(db, current_user, fee_id)


@router.get("/honoraires/{fee_id}/resume")
def honoraires_summary(fee_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    return crud_service.fee_summary(db, current_user, fee_id)


@router.get("/patients/{patient_id}/situation-financiere")
def patient_financial_situation(patient_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    return crud_service.patient_financial_situation(db, current_user, patient_id)


@router.post("/payments", response_model=PaymentOut, status_code=201)
def payments_create(payload: PaymentCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> PaymentOut:
    return crud_service.create_payment(db, current_user, payload)


@router.post("/payments/{payment_id}/cheque-documents")
async def payment_cheque_documents_upload(
    payment_id: str,
    current_user: CurrentUser,
    cheque_file: UploadFile = File(...),
    owner_cin_file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    crud_service.require_module_access(db, current_user, "payments", write=True)
    crud_service.ensure_write_allowed(current_user)
    payment = crud_service.get_scoped(db, current_user, crud_service.Payment, payment_id, "Paiement")
    if payment.method != "cheque":
        raise HTTPException(409, "Les justificatifs sont réservés aux paiements par chèque.")
    saved: list[str] = []
    try:
        cheque = await save_patient_document_upload(cheque_file, payment.tenant_id, payment.patient_id)
        saved.append(cheque[0])
        owner_cin = await save_patient_document_upload(owner_cin_file, payment.tenant_id, payment.patient_id)
        saved.append(owner_cin[0])
        payment.cheque_copy_path, payment.cheque_copy_mime_type, _, payment.cheque_copy_filename, _, _ = cheque
        payment.cheque_owner_cin_path, payment.cheque_owner_cin_mime_type, _, payment.cheque_owner_cin_filename, _, _ = owner_cin
        db.commit()
        return {"complete": True}
    except Exception:
        db.rollback()
        for file_path in saved:
            (Path(settings.upload_dir) / file_path).unlink(missing_ok=True)
        raise


@router.get("/payments/{payment_id}/cheque-documents/{document_type}/preview")
def payment_cheque_document_preview(
    payment_id: str,
    document_type: str,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    crud_service.require_module_access(db, current_user, "payments")
    payment = crud_service.get_scoped(db, current_user, crud_service.Payment, payment_id, "Paiement")
    values = {
        "CHEQUE": (payment.cheque_copy_path, payment.cheque_copy_filename, payment.cheque_copy_mime_type),
        "OWNER_CIN": (payment.cheque_owner_cin_path, payment.cheque_owner_cin_filename, payment.cheque_owner_cin_mime_type),
    }
    selected = values.get(document_type.upper())
    if not selected or not selected[0]:
        raise HTTPException(404, "Justificatif du chèque introuvable.")
    response = protected_upload_response(selected[0], selected[1] or "document", selected[2])
    response.headers["Content-Disposition"] = f'inline; filename="{selected[1] or "document"}"'
    return response


@router.get(
    "/payments",
    response_model=list[PaymentOut] | PaymentPageOut,
)
def payments_list(
    current_user: CurrentUser,
    patient_id: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    method: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if patient_id: crud_service.get_patient_or_404(db, current_user, patient_id)
    if page is None:return crud_service.list_payments(db,current_user,patient_id=patient_id)
    return crud_service.paginate_payments(db,current_user,page=page,page_size=page_size,search=search,sort_by=sort_by,sort_order=sort_order,status_filter=status_filter,method=method,patient_id=patient_id)


@router.get("/payments/{payment_id}", response_model=PaymentOut)
def payments_get(payment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> PaymentOut:
    crud_service.require_module_access(db, current_user, "payments")
    item = crud_service.get_scoped(db, current_user, crud_service.Payment, payment_id, "Paiement")
    return crud_service.serialize_payments(db,[item])[0]


@router.put("/payments/{payment_id}", response_model=PaymentOut)
def payments_update(payment_id: str, payload: PaymentUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> PaymentOut:
    return crud_service.update_payment(db, current_user, payment_id, payload)


@router.delete("/payments/{payment_id}")
def payments_delete(payment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    return crud_service.delete_payment(db, current_user, payment_id)


def require_finance_tenant(user: CurrentUser, write: bool = False) -> str:
    crud_service.require_role(user, {"MEDECIN_ADMIN", "SECRETAIRE"})
    if write:
        crud_service.ensure_write_allowed(user)
    return crud_service.require_tenant(user)


@router.get("/finance/reports/monthly/{file_format}")
def finance_monthly_report(
    file_format: str,
    current_user: CurrentUser,
    year: int = Query(ge=2000, le=2100),
    month: int = Query(ge=1, le=12),
    db: Session = Depends(get_db),
):
    tenant_id = require_finance_tenant(current_user)
    crud_service.require_module_access(db, current_user, "payments")
    if file_format not in {"pdf", "xlsx"}:
        raise HTTPException(404, "Format de rapport inconnu. Utilisez PDF ou Excel.")
    data = financial_report_service.monthly_financial_data(db, tenant_id, year, month)
    if file_format == "pdf":
        content = financial_report_service.render_monthly_pdf(data)
        media_type = "application/pdf"
    else:
        content = financial_report_service.render_monthly_excel(data)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    filename = f"rapport-financier-{year}-{month:02d}.{file_format}"
    db.add(AuditLog(
        tenant_id=tenant_id,
        user_id=current_user.id,
        action="FINANCIAL_REPORT_EXPORTED",
        resource_type="financial_report",
        resource_id=f"{year}-{month:02d}-{file_format}",
    ))
    db.commit()
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/expense-suppliers", response_model=list[ExpenseSupplierOut])
def expense_suppliers_list(current_user: CurrentUser, db: Session = Depends(get_db)):
    tenant_id = require_finance_tenant(current_user)
    return list(db.scalars(select(ExpenseSupplier).where(ExpenseSupplier.tenant_id == tenant_id, ExpenseSupplier.is_active.is_(True)).order_by(ExpenseSupplier.name)).all())


@router.post("/expense-suppliers", response_model=ExpenseSupplierOut, status_code=201)
def expense_suppliers_create(payload: ExpenseSupplierCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    tenant_id = require_finance_tenant(current_user, write=True)
    if db.scalar(select(ExpenseSupplier.id).where(ExpenseSupplier.tenant_id == tenant_id, func.lower(ExpenseSupplier.name) == payload.name.strip().lower())):
        raise HTTPException(409, "Ce fournisseur existe déjà.")
    row = ExpenseSupplier(tenant_id=tenant_id, **payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.get("/supplier-products", response_model=list[SupplierProductOut])
def supplier_products_list(current_user: CurrentUser, db: Session = Depends(get_db), supplier_id: str | None = None):
    tenant_id = require_finance_tenant(current_user)
    query = select(SupplierProduct).where(SupplierProduct.tenant_id == tenant_id, SupplierProduct.is_active.is_(True))
    if supplier_id:
        query = query.where(SupplierProduct.supplier_id == supplier_id)
    return list(db.scalars(query.order_by(SupplierProduct.name)).all())


@router.post("/supplier-products", response_model=SupplierProductOut, status_code=201)
def supplier_products_create(payload: SupplierProductCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    tenant_id = require_finance_tenant(current_user, write=True)
    supplier = db.scalar(select(ExpenseSupplier).where(ExpenseSupplier.id == payload.supplier_id, ExpenseSupplier.tenant_id == tenant_id))
    if not supplier:
        raise HTTPException(404, "Fournisseur introuvable.")
    row = SupplierProduct(tenant_id=tenant_id, **payload.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return row


@router.get(
    "/expenses",
    response_model=list[ExpenseOut] | CollectionPageOut[ExpenseOut],
)
def expenses_list(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
):
    tenant_id = require_finance_tenant(current_user)
    query = select(Expense).where(Expense.tenant_id == tenant_id)
    if date_from:
        query = query.where(Expense.expense_date >= date_from)
    if date_to:
        query = query.where(Expense.expense_date <= date_to)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(or_(
            Expense.label.ilike(pattern), Expense.category.ilike(pattern),
            Expense.supplier.ilike(pattern), Expense.reference.ilike(pattern),
        ))
    if page is not None:
        sort_columns = {
            "created_at": Expense.created_at,
            "date": Expense.expense_date,
            "amount": Expense.amount,
        }
        result = crud_service.paginate_query(
            db, query, page=page, page_size=page_size,
            sort_column=sort_columns.get(sort_by, Expense.created_at),
            sort_order=sort_order, serializer=lambda rows: rows,
        )
        total = db.scalar(select(func.coalesce(func.sum(Expense.amount), 0)).where(Expense.tenant_id == tenant_id)) or 0
        result["summary"] = {"total_amount": float(total)}
        return result
    return list(db.scalars(query.order_by(Expense.expense_date.desc(), Expense.created_at.desc())).all())


@router.post("/expenses", response_model=ExpenseOut, status_code=201)
def expenses_create(payload: ExpenseCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    tenant_id = require_finance_tenant(current_user, write=True)
    data = payload.model_dump(mode="json")
    if payload.bank_account_id:
        bank_account=db.scalar(select(CabinetBankAccount).where(CabinetBankAccount.id==payload.bank_account_id,CabinetBankAccount.tenant_id==tenant_id,CabinetBankAccount.is_active.is_(True)))
        if not bank_account:raise HTTPException(422,"Choisissez un compte bancaire actif du cabinet.")
    if payload.supplier_id:
        supplier = db.scalar(select(ExpenseSupplier).where(ExpenseSupplier.id == payload.supplier_id, ExpenseSupplier.tenant_id == tenant_id, ExpenseSupplier.is_active.is_(True)))
        if not supplier:
            raise HTTPException(422, "Choisissez un fournisseur actif du cabinet.")
        product_ids = {line.product_id for line in payload.items}
        valid_ids = set(db.scalars(select(SupplierProduct.id).where(SupplierProduct.tenant_id == tenant_id, SupplierProduct.supplier_id == supplier.id, SupplierProduct.id.in_(product_ids))).all()) if product_ids else set()
        if valid_ids != product_ids:
            raise HTTPException(422, "Un produit ne correspond pas au fournisseur sélectionné.")
        data["supplier"] = supplier.name
    row = Expense(tenant_id=tenant_id, created_by_user_id=current_user.id, **data)
    db.add(row)
    db.flush()
    db.add(AuditLog(tenant_id=tenant_id, user_id=current_user.id, action="EXPENSE_CREATED", resource_type="expense", resource_id=row.id))
    db.commit()
    db.refresh(row)
    return row


@router.put("/expenses/{item_id}", response_model=ExpenseOut)
def expenses_update(item_id: str, payload: ExpenseCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    tenant_id = require_finance_tenant(current_user, write=True)
    row = db.scalar(select(Expense).where(Expense.id == item_id, Expense.tenant_id == tenant_id))
    if not row:
        raise HTTPException(404, "Dépense introuvable.")
    if payload.bank_account_id:
        bank_account=db.scalar(select(CabinetBankAccount).where(CabinetBankAccount.id==payload.bank_account_id,CabinetBankAccount.tenant_id==tenant_id,CabinetBankAccount.is_active.is_(True)))
        if not bank_account:raise HTTPException(422,"Choisissez un compte bancaire actif du cabinet.")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.add(AuditLog(tenant_id=tenant_id, user_id=current_user.id, action="EXPENSE_UPDATED", resource_type="expense", resource_id=row.id))
    db.commit()
    db.refresh(row)
    return row


@router.delete("/expenses/{item_id}")
def expenses_delete(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    tenant_id = require_finance_tenant(current_user, write=True)
    row = db.scalar(select(Expense).where(Expense.id == item_id, Expense.tenant_id == tenant_id))
    if not row:
        raise HTTPException(404, "Dépense introuvable.")
    db.delete(row)
    db.add(AuditLog(tenant_id=tenant_id, user_id=current_user.id, action="EXPENSE_DELETED", resource_type="expense", resource_id=item_id))
    db.commit()
    return {"message": "Dépense supprimée."}


@router.get(
    "/purchase-orders",
    response_model=list[PurchaseOrderOut] | CollectionPageOut[PurchaseOrderOut],
)
def purchase_orders_list(
    current_user: CurrentUser,
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    tenant_id = require_finance_tenant(current_user)
    query = select(PurchaseOrder).where(PurchaseOrder.tenant_id == tenant_id)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(or_(
            PurchaseOrder.order_number.ilike(pattern),
            PurchaseOrder.supplier.ilike(pattern),
            PurchaseOrder.description.ilike(pattern),
        ))
    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)
    if page is not None:
        sort_columns = {
            "created_at": PurchaseOrder.created_at,
            "date": PurchaseOrder.order_date,
            "amount": PurchaseOrder.amount,
            "status": PurchaseOrder.status,
        }
        result = crud_service.paginate_query(
            db, query, page=page, page_size=page_size,
            sort_column=sort_columns.get(sort_by, PurchaseOrder.created_at),
            sort_order=sort_order, serializer=lambda rows: rows,
        )
        total = db.scalar(select(func.coalesce(func.sum(PurchaseOrder.amount), 0)).where(PurchaseOrder.tenant_id == tenant_id)) or 0
        result["summary"] = {"total_amount": float(total)}
        return result
    return list(db.scalars(query.order_by(PurchaseOrder.order_date.desc(), PurchaseOrder.created_at.desc())).all())


@router.post("/purchase-orders", response_model=PurchaseOrderOut, status_code=201)
def purchase_orders_create(payload: PurchaseOrderCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    tenant_id = require_finance_tenant(current_user, write=True)
    count = db.scalar(select(func.count()).select_from(PurchaseOrder).where(PurchaseOrder.tenant_id == tenant_id)) or 0
    number = f"BC-{datetime.now(UTC).year}-{count + 1:05d}"
    row = PurchaseOrder(tenant_id=tenant_id, order_number=number, created_by_user_id=current_user.id, **payload.model_dump())
    db.add(row)
    db.flush()
    db.add(AuditLog(tenant_id=tenant_id, user_id=current_user.id, action="PURCHASE_ORDER_CREATED", resource_type="purchase_order", resource_id=row.id))
    db.commit()
    db.refresh(row)
    return row


@router.put("/purchase-orders/{item_id}", response_model=PurchaseOrderOut)
def purchase_orders_update(item_id: str, payload: PurchaseOrderCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    tenant_id = require_finance_tenant(current_user, write=True)
    row = db.scalar(select(PurchaseOrder).where(PurchaseOrder.id == item_id, PurchaseOrder.tenant_id == tenant_id))
    if not row:
        raise HTTPException(404, "Bon de commande introuvable.")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    db.add(AuditLog(tenant_id=tenant_id, user_id=current_user.id, action="PURCHASE_ORDER_UPDATED", resource_type="purchase_order", resource_id=row.id))
    db.commit()
    db.refresh(row)
    return row


@router.delete("/purchase-orders/{item_id}")
def purchase_orders_delete(item_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    tenant_id = require_finance_tenant(current_user, write=True)
    row = db.scalar(select(PurchaseOrder).where(PurchaseOrder.id == item_id, PurchaseOrder.tenant_id == tenant_id))
    if not row:
        raise HTTPException(404, "Bon de commande introuvable.")
    db.delete(row)
    db.add(AuditLog(tenant_id=tenant_id, user_id=current_user.id, action="PURCHASE_ORDER_DELETED", resource_type="purchase_order", resource_id=item_id))
    db.commit()
    return {"message": "Bon de commande supprimé."}


@router.post("/paiements/{payment_id}/documents", response_model=PaymentDocumentOut, status_code=201)
def payment_documents_create(payment_id: str, payload: PaymentDocumentCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    return payment_document_service.generate(db, current_user, payment_id, payload.document_type)


@router.get("/paiements/{payment_id}/documents", response_model=list[PaymentDocumentOut])
def payment_documents_list(payment_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return payment_document_service.list_for_payment(db, current_user, payment_id)


@router.get("/documents-paiement/{document_id}/download")
def payment_document_download(document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    row = payment_document_service.get_document(db, current_user, document_id)
    path = Path(settings.upload_dir) / row.file_path
    if not path.is_file(): raise HTTPException(404, "Fichier PDF introuvable.")
    return FileResponse(path, media_type="application/pdf", filename=f"{row.document_number}.pdf")


@router.get("/documents-paiement/{document_id}/preview")
def payment_document_preview(document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    row = payment_document_service.get_document(db, current_user, document_id)
    path = Path(settings.upload_dir) / row.file_path
    if not path.is_file(): raise HTTPException(404, "Fichier PDF introuvable.")
    return FileResponse(path, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{row.document_number}.pdf"'})


@router.post("/cnss", response_model=CNSSOut, status_code=201)
def cnss_create(payload: CNSSCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> CNSSOut:
    return crud_service.create_cnss(db, current_user, payload)


@router.post("/cnss/upload", response_model=CNSSOut, status_code=201)
async def cnss_upload(
    current_user: CurrentUser,
    patient_id: str = Form(...),
    reference: str | None = Form(None),
    status_value: str = Form("REQUESTED", alias="status"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> CNSSOut:
    crud_service.require_module_access(db, current_user, "cnss", write=True)
    crud_service.ensure_write_allowed(current_user)
    crud_service.get_patient_or_404(db, current_user, patient_id)
    file_url = await save_tenant_upload(file, current_user.tenant_id or "")
    return crud_service.create_cnss(db, current_user, CNSSCreate(patient_id=patient_id, reference=reference, status=status_value, file_url=file_url))


@router.get(
    "/cnss",
    response_model=list[CNSSOut] | CollectionPageOut[CNSSOut],
)
def cnss_list(
    current_user: CurrentUser,
    patient_id: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    status_filter: str | None = Query(default=None, alias="status"),
    doctor_id: str | None = Query(default=None),
    cabinet_name: str | None = Query(default=None, max_length=160),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if patient_id: crud_service.get_patient_or_404(db, current_user, patient_id)
    if page is not None:
        return crud_service.paginate_cnss(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_by=sort_by, sort_order=sort_order, status_filter=status_filter,
            doctor_id=doctor_id, cabinet_name=cabinet_name,
            date_from=date_from, date_to=date_to, patient_id=patient_id,
        )
    return crud_service.list_cnss(db, current_user, patient_id=patient_id)


@router.get("/cnss/stats")
def cnss_stats(current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "cnss")
    rows = db.scalars(select(crud_service.CNSSCase).where(crud_service.CNSSCase.tenant_id == current_user.tenant_id)).all()
    statuses = ("REQUESTED","PROCESSING","READY_FOR_PICKUP","DELIVERED_TO_PATIENT","SUBMITTED_TO_CNSS","APPROVED","REJECTED")
    counts = {status: sum(1 for row in rows if row.status == status) for status in statuses}
    return {
        **counts,
        "total_amount": float(sum((Decimal(str(row.total_amount or 0)) for row in rows), Decimal("0"))),
        "total_estimated": float(sum((Decimal(str(row.estimated_reimbursable_amount or 0)) for row in rows), Decimal("0"))),
        "total_reimbursed": float(sum((Decimal(str(row.reimbursed_amount or 0)) for row in rows), Decimal("0"))),
    }


@router.get("/cnss/{cnss_id}/history")
def cnss_history(cnss_id: str, request:Request, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "cnss")
    item=crud_service.get_scoped(db, current_user, crud_service.CNSSCase, cnss_id, "Dossier CNSS/CNOPS")
    audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="view_cnss_file",resource_type="dossier_cnss",resource_id=item.id,request=request)
    rows = db.scalars(select(crud_service.CNSSStatusHistory).where(crud_service.CNSSStatusHistory.tenant_id == current_user.tenant_id, crud_service.CNSSStatusHistory.cnss_case_id == cnss_id).order_by(crud_service.CNSSStatusHistory.changed_at.desc())).all()
    user_ids={row.changed_by_user_id for row in rows if row.changed_by_user_id}
    users={row.id:f"{row.first_name} {row.last_name}".strip() for row in db.scalars(select(crud_service.User).where(crud_service.User.id.in_(user_ids))).all()} if user_ids else {}
    return [{"id":row.id,"old_status":row.old_status,"new_status":row.new_status,"comment":row.comment,"rejection_reason":row.rejection_reason,"changed_by_role":row.changed_by_role,"event_metadata":row.event_metadata,"changed_at":row.changed_at,"changed_by_user_id":row.changed_by_user_id,"changed_by_name":users.get(row.changed_by_user_id,"Système")} for row in rows]


@router.get("/cnss/{cnss_id}/documents", response_model=list[DocumentOut])
def cnss_documents(cnss_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "cnss")
    item = crud_service.get_scoped(db, current_user, crud_service.CNSSCase, cnss_id, "Dossier CNSS/CNOPS")
    rows = db.scalars(select(crud_service.MedicalDocument).where(crud_service.MedicalDocument.tenant_id == current_user.tenant_id, crud_service.MedicalDocument.patient_id == item.patient_id, crud_service.MedicalDocument.cnss_case_id == cnss_id, crud_service.MedicalDocument.archived_at.is_(None)).order_by(crud_service.MedicalDocument.created_at.desc())).all()
    user_ids={row.created_by_user_id for row in rows if row.created_by_user_id}
    users={row.id:f"{row.first_name} {row.last_name}".strip() for row in db.scalars(select(crud_service.User).where(crud_service.User.id.in_(user_ids))).all()} if user_ids else {}
    return [DocumentOut.model_validate(row, from_attributes=True).model_copy(update={"created_by_name":users.get(row.created_by_user_id,"Système")}) for row in rows]


@router.patch("/cnss/{cnss_id}/status", response_model=CNSSOut)
def cnss_status_update(cnss_id: str, payload: CNSSUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    if payload.status is None: raise HTTPException(422, "Le nouveau statut est obligatoire.")
    return crud_service.update_cnss(db, current_user, cnss_id, payload)


@router.get("/cnss/{cnss_id}", response_model=CNSSOut)
def cnss_get(cnss_id: str, request:Request, current_user: CurrentUser, db: Session = Depends(get_db)) -> CNSSOut:
    crud_service.require_module_access(db, current_user, "cnss")
    item = crud_service.get_scoped(db, current_user, crud_service.CNSSCase, cnss_id, "Dossier CNSS/CNOPS")
    audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="view_cnss_file",resource_type="dossier_cnss",resource_id=item.id,request=request)
    return CNSSOut.model_validate(item, from_attributes=True)


@router.put("/cnss/{cnss_id}", response_model=CNSSOut)
def cnss_update(cnss_id: str, payload: CNSSUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> CNSSOut:
    return crud_service.update_cnss(db, current_user, cnss_id, payload)


@router.delete("/cnss/{cnss_id}")
def cnss_delete(cnss_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    crud_service.require_module_access(db, current_user, "cnss", write=True)
    crud_service.get_scoped(db, current_user, crud_service.CNSSCase, cnss_id, "Dossier CNSS/CNOPS")
    raise HTTPException(
        status_code=409,
        detail="Un dossier CNSS/CNOPS suivi ne peut pas être supprimé afin de conserver son historique.",
    )


@router.get("/cnss/{cnss_id}/download")
def cnss_download(cnss_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "cnss")
    item = crud_service.get_scoped(db, current_user, crud_service.CNSSCase, cnss_id, "Dossier CNSS/CNOPS")
    suffix = Path(item.file_url or "").suffix
    return protected_upload_response(item.file_url, f"cnss-{item.reference or item.id}{suffix}")


@router.get("/medications/catalog/specialties", response_model=list[str])
def medications_specialties(current_user: CurrentUser, db: Session = Depends(get_db)) -> list[str]:
    return crud_service.medication_specialties(db, current_user)


@router.get("/medications/catalog", response_model=list[MedicationCatalogOut])
def medications_catalog(
    current_user: CurrentUser,
    q: str | None = Query(default=None, max_length=120),
    specialty: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[MedicationCatalogOut]:
    return crud_service.search_medications(db,current_user,query_text=q,specialty=specialty,limit=limit)


@router.post("/prescriptions", response_model=PrescriptionOut, status_code=201)
def prescriptions_create(payload: PrescriptionCreate, current_user: CurrentUser, db: Session = Depends(get_db)) -> PrescriptionOut:
    return crud_service.create_prescription(db, current_user, payload)


@router.get(
    "/prescriptions",
    response_model=list[PrescriptionOut] | CollectionPageOut[PrescriptionOut],
)
def prescriptions_list(
    current_user: CurrentUser,
    patient_id: str | None = Query(default=None),
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    if patient_id: crud_service.get_patient_or_404(db, current_user, patient_id)
    if page is not None:
        return crud_service.paginate_prescriptions(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_by=sort_by, sort_order=sort_order, patient_id=patient_id,
        )
    return crud_service.list_prescriptions(db, current_user, patient_id=patient_id)


@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
def prescriptions_get(prescription_id: str, request:Request, current_user: CurrentUser, db: Session = Depends(get_db)) -> PrescriptionOut:
    crud_service.require_module_access(db, current_user, "prescriptions")
    item = crud_service.get_scoped(db, current_user, crud_service.Prescription, prescription_id, "Ordonnance")
    audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="view_prescription",resource_type="ordonnance",resource_id=item.id,request=request)
    return crud_service.serialize_prescriptions(db, [item])[0]


@router.put("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
def prescriptions_update(prescription_id: str, payload: PrescriptionUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> PrescriptionOut:
    return crud_service.update_prescription(db, current_user, prescription_id, payload)


@router.delete("/prescriptions/{prescription_id}")
def prescriptions_delete(prescription_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    return crud_service.delete_item(db, current_user, crud_service.Prescription, prescription_id, "prescriptions", "Ordonnance")


@router.get("/prescriptions/{prescription_id}/pdf")
def prescriptions_pdf(prescription_id: str, current_user: CurrentUser, action: str = "preview", db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "prescriptions")
    item = crud_service.get_scoped(db, current_user, crud_service.Prescription, prescription_id, "Ordonnance")
    event = "PRESCRIPTION_PRINTED" if action == "print" else "PRESCRIPTION_DOWNLOADED" if action == "download" else "PRESCRIPTION_VIEWED"
    return prescription_pdf_response(db,current_user,item,event,inline=action != "download")


def prescription_pdf_response(db: Session, user, item, event: str, inline: bool):
    document = db.get(crud_service.MedicalDocument, item.pdf_document_id) if item.pdf_document_id else None
    tenant = db.get(crud_service.Tenant, item.tenant_id)
    theme_marker = f"Thème {(tenant.primary_color if tenant and tenant.primary_color else '#0f766e').upper()}"
    if not document or theme_marker not in (document.description or ""):
        from app.services.prescription_document_service import generate_and_archive
        document = generate_and_archive(db,item,user)
    crud_service.add_operation(db,user,event,prescription=item,document=document,description=f"Ordonnance {item.prescription_number} {'imprimée' if event == 'PRESCRIPTION_PRINTED' else 'téléchargée' if event == 'PRESCRIPTION_DOWNLOADED' else 'consultée'}.")
    db.commit()
    response=protected_upload_response(document.file_url,document.original_filename or f"ordonnance_{item.prescription_number}.pdf")
    if inline: response.headers["Content-Disposition"] = f'inline; filename="{document.original_filename or item.prescription_number + ".pdf"}"'
    return response


async def save_document_for_patient(patient_id: str, source: str, current_user: CurrentUser, title: str, document_type: str, shared_with_patient: bool, file: UploadFile, db: Session, description: str | None = None, document_date: date | None = None, confidential: bool = False, category_id: str | None = None, doctor_id: str | None = None, appointment_id: str | None = None, visit_id: str | None = None) -> DocumentOut:
    crud_service.require_module_access(db, current_user, "documents", write=True); crud_service.ensure_write_allowed(current_user)
    crud_service.get_patient_or_404(db, current_user, patient_id)
    file_url, mime_type, file_size, original_filename, stored_filename, extension = await save_patient_document_upload(file, current_user.tenant_id or "", patient_id)
    return crud_service.create_document(db, current_user, DocumentCreate(patient_id=patient_id, title=title, document_type=document_type, file_url=file_url, mime_type=mime_type, file_size=file_size, original_filename=original_filename, stored_filename=stored_filename, extension=extension, source=source, scanned_at=datetime.now(UTC) if source == "scanner" else None, shared_with_patient=shared_with_patient, description=description, document_date=document_date, confidential=confidential, category_id=category_id, doctor_id=doctor_id, appointment_id=appointment_id, visit_id=visit_id))


@router.post("/cnss/{cnss_id}/documents", response_model=DocumentOut, status_code=201)
async def cnss_document_add(cnss_id: str, current_user: CurrentUser, title: str = Form(...), document_type: str = Form("CNSS"), shared_with_patient: bool = Form(False), description: str | None = Form(None), document_date: date | None = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "cnss", write=True)
    crud_service.ensure_write_allowed(current_user)
    if len(title.strip()) < 2: raise HTTPException(422, "Le nom du document doit contenir au moins 2 caractères.")
    case = crud_service.get_scoped(db, current_user, crud_service.CNSSCase, cnss_id, "Dossier CNSS/CNOPS")
    file_url,mime_type,file_size,original_filename,stored_filename,extension=await save_patient_document_upload(file,current_user.tenant_id or "",case.patient_id)
    document=crud_service.MedicalDocument(tenant_id=current_user.tenant_id,patient_id=case.patient_id,title=title.strip(),description=description,document_date=document_date,document_type=document_type,file_url=file_url,mime_type=mime_type,file_size=file_size,original_filename=original_filename,stored_filename=stored_filename,extension=extension,source="upload_manuel",shared_with_patient=shared_with_patient,cnss_case_id=case.id,created_by_user_id=current_user.id)
    db.add(document);db.commit();db.refresh(document)
    return DocumentOut.model_validate(document,from_attributes=True)


@router.delete("/cnss/{cnss_id}/documents/{document_id}")
def cnss_document_delete(cnss_id: str, document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "cnss", write=True)
    crud_service.ensure_write_allowed(current_user)
    case = crud_service.get_scoped(db, current_user, crud_service.CNSSCase, cnss_id, "Dossier CNSS/CNOPS")
    document = crud_service.get_scoped(db, current_user, crud_service.MedicalDocument, document_id, "Document")
    if document.cnss_case_id != case.id or document.patient_id != case.patient_id:
        raise HTTPException(404, "Document CNSS/CNOPS introuvable.")
    document.status = "ARCHIVE"
    document.archived_at = datetime.now(UTC)
    document.updated_by_user_id = current_user.id
    db.commit()
    return {"message": "Document CNSS/CNOPS archivé avec succès."}


def get_cnss_document(db:Session,user,cnss_id:str,document_id:str):
    crud_service.require_module_access(db,user,"cnss")
    case=crud_service.get_scoped(db,user,crud_service.CNSSCase,cnss_id,"Dossier CNSS/CNOPS")
    document=crud_service.get_scoped(db,user,crud_service.MedicalDocument,document_id,"Document")
    if document.cnss_case_id!=case.id or document.patient_id!=case.patient_id or document.archived_at is not None:
        raise HTTPException(404,"Document CNSS/CNOPS introuvable.")
    return document


@router.get("/cnss/{cnss_id}/documents/{document_id}/preview")
def cnss_document_preview(cnss_id:str,document_id:str,request:Request,current_user:CurrentUser,db:Session=Depends(get_db)):
    document=get_cnss_document(db,current_user,cnss_id,document_id)
    crud_service.record_document_access(db,current_user,document,"DOCUMENT_VIEWED")
    audit_log_service.log_access(db,current_user,patient_id=document.patient_id,action="view_medical_document",resource_type="document_cnss",resource_id=document.id,request=request)
    suffix=document.extension or Path(document.file_url or "").suffix
    filename=document.original_filename or (f"{document.title}{suffix}" if suffix else document.title)
    response=protected_upload_response(document.file_url,filename,media_type=document.mime_type)
    response.headers["Content-Disposition"]=f'inline; filename="{filename}"'
    return response


@router.get("/cnss/{cnss_id}/documents/{document_id}/download")
def cnss_document_download(cnss_id:str,document_id:str,request:Request,current_user:CurrentUser,db:Session=Depends(get_db)):
    document=get_cnss_document(db,current_user,cnss_id,document_id)
    crud_service.record_document_access(db,current_user,document,"DOCUMENT_DOWNLOADED")
    audit_log_service.log_access(db,current_user,patient_id=document.patient_id,action="download_document",resource_type="document_cnss",resource_id=document.id,request=request)
    return protected_upload_response(document.file_url,document.original_filename or document.title,media_type=document.mime_type)


@router.post("/doctor/patients/{patient_id}/documents", response_model=DocumentOut, status_code=201)
async def patient_document_upload(patient_id: str, current_user: CurrentUser, title: str = Form(...), document_type: str = Form(...), shared_with_patient: bool = Form(False), description: str | None = Form(None), document_date: date | None = Form(None), confidential: bool = Form(False), category_id: str | None = Form(None), doctor_id: str | None = Form(None), appointment_id: str | None = Form(None), visit_id: str | None = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await save_document_for_patient(patient_id, "upload_manuel", current_user, title, document_type, shared_with_patient, file, db, description, document_date, confidential, category_id, doctor_id, appointment_id, visit_id)


@router.post("/doctor/patients/{patient_id}/documents/scan", response_model=DocumentOut, status_code=201)
async def patient_document_scan(patient_id: str, current_user: CurrentUser, title: str = Form(...), document_type: str = Form(...), shared_with_patient: bool = Form(False), description: str | None = Form(None), document_date: date | None = Form(None), confidential: bool = Form(False), category_id: str | None = Form(None), doctor_id: str | None = Form(None), appointment_id: str | None = Form(None), visit_id: str | None = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await save_document_for_patient(patient_id, "scanner", current_user, title, document_type, shared_with_patient, file, db, description, document_date, confidential, category_id, doctor_id, appointment_id, visit_id)


@router.get("/doctor/patients/{patient_id}/documents", response_model=list[DocumentOut])
def patient_documents_list(patient_id: str, current_user: CurrentUser, include_archived: bool = False, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "documents"); crud_service.get_patient_or_404(db, current_user, patient_id)
    return [item for item in crud_service.list_documents(db, current_user, include_archived) if item.patient_id == patient_id]


@router.get(
    "/doctor/documents",
    response_model=list[DocumentOut] | CollectionPageOut[DocumentOut],
)
@router.get(
    "/documents",
    response_model=list[DocumentOut] | CollectionPageOut[DocumentOut],
)
def documents_list(
    current_user: CurrentUser,
    patient_id: str | None = Query(default=None),
    include_archived: bool = False,
    page: int | None = Query(default=None, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    document_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    if patient_id: crud_service.get_patient_or_404(db, current_user, patient_id)
    if page is not None:
        return crud_service.paginate_documents(
            db, current_user, page=page, page_size=page_size, search=search,
            sort_by=sort_by, sort_order=sort_order,
            include_archived=include_archived, document_type=document_type,
            patient_id=patient_id,
        )
    return crud_service.list_documents(db, current_user, include_archived, patient_id=patient_id)


@router.get("/doctor/documents/categories", response_model=list[DocumentCategoryOut])
def document_categories_list(current_user: CurrentUser, include_inactive: bool = False, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "documents")
    query = select(DocumentCategory).where((DocumentCategory.tenant_id.is_(None)) | (DocumentCategory.tenant_id == current_user.tenant_id))
    if not include_inactive: query = query.where(DocumentCategory.is_active.is_(True))
    return list(db.scalars(query.order_by(DocumentCategory.display_order, DocumentCategory.name)).all())


@router.post("/doctor/documents/categories", response_model=DocumentCategoryOut, status_code=201)
def document_categories_create(payload: DocumentCategoryCreate, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "documents", admin=True); crud_service.ensure_write_allowed(current_user)
    if db.scalar(select(DocumentCategory).where(DocumentCategory.tenant_id == current_user.tenant_id, DocumentCategory.code == payload.code)):
        raise HTTPException(409, "Cette catégorie existe déjà dans le cabinet.")
    item = DocumentCategory(tenant_id=current_user.tenant_id, **payload.model_dump()); db.add(item); db.commit(); db.refresh(item); return item


@router.get("/doctor/documents/{document_id}", response_model=DocumentOut)
def documents_get(document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> DocumentOut:
    crud_service.require_module_access(db, current_user, "documents")
    item = crud_service.get_scoped(db, current_user, crud_service.MedicalDocument, document_id, "Document")
    return DocumentOut.model_validate(item, from_attributes=True)


@router.put("/doctor/documents/{document_id}", response_model=DocumentOut)
def documents_update(document_id: str, payload: DocumentUpdate, current_user: CurrentUser, db: Session = Depends(get_db)) -> DocumentOut:
    return crud_service.update_document(db, current_user, document_id, payload)


@router.delete("/doctor/documents/{document_id}")
def documents_delete(document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> dict[str, str]:
    return crud_service.delete_document(db, current_user, document_id)


@router.post("/doctor/documents/{document_id}/restore", response_model=DocumentOut)
def documents_restore(document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    return crud_service.restore_document(db, current_user, document_id)


@router.post("/doctor/documents/{document_id}/versions", response_model=DocumentOut, status_code=201)
async def document_new_version(document_id: str, current_user: CurrentUser, file: UploadFile = File(...), comment: str | None = Form(None), db: Session = Depends(get_db)):
    parent = crud_service.get_scoped(db, current_user, crud_service.MedicalDocument, document_id, "Document")
    file_url, mime_type, file_size, original_filename, stored_filename, extension = await save_patient_document_upload(file, current_user.tenant_id or "", parent.patient_id)
    root_id = parent.parent_document_id or parent.id
    versions = list(db.scalars(select(crud_service.MedicalDocument).where(crud_service.MedicalDocument.tenant_id == current_user.tenant_id, (crud_service.MedicalDocument.id == root_id) | (crud_service.MedicalDocument.parent_document_id == root_id))).all())
    payload = DocumentCreate(patient_id=parent.patient_id, title=parent.title, document_type=parent.document_type, file_url=file_url, shared_with_patient=parent.shared_with_patient, visit_id=parent.visit_id, doctor_id=parent.doctor_id, appointment_id=parent.appointment_id, fee_id=parent.fee_id, invoice_id=parent.invoice_id, cnss_case_id=parent.cnss_case_id, category_id=parent.category_id, description=comment or parent.description, original_filename=original_filename, stored_filename=stored_filename, extension=extension, mime_type=mime_type, file_size=file_size, source="upload_manuel", confidential=parent.confidential, document_date=parent.document_date, version=max(item.version for item in versions) + 1, parent_document_id=root_id)
    item = crud_service.create_document(db, current_user, payload)
    return crud_service.serialize_prescriptions(db,[item])[0]


@router.get("/doctor/documents/{document_id}/history", response_model=list[OperationHistoryOut])
def document_history(document_id: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "documents")
    crud_service.get_scoped(db, current_user, crud_service.MedicalDocument, document_id, "Document")
    return list(db.scalars(select(OperationHistory).where(OperationHistory.tenant_id == current_user.tenant_id, OperationHistory.document_id == document_id).order_by(OperationHistory.created_at.desc())).all())


@router.get("/doctor/documents/{document_id}/download")
def documents_download(document_id: str, request:Request, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "documents")
    item = crud_service.get_scoped(db, current_user, crud_service.MedicalDocument, document_id, "Document")
    crud_service.record_document_access(db, current_user, item, "DOCUMENT_DOWNLOADED")
    audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="download_document",resource_type="document",resource_id=item.id,request=request)
    suffix = Path(item.file_url or "").suffix
    return protected_upload_response(item.file_url, f"{item.title}{suffix}")


@router.get("/doctor/documents/{document_id}/preview")
def documents_preview(document_id: str, request:Request, current_user: CurrentUser, db: Session = Depends(get_db)):
    crud_service.require_module_access(db, current_user, "documents")
    item = crud_service.get_scoped(db, current_user, crud_service.MedicalDocument, document_id, "Document")
    crud_service.record_document_access(db, current_user, item, "DOCUMENT_VIEWED")
    audit_log_service.log_access(db,current_user,patient_id=item.patient_id,action="view_medical_document",resource_type="document",resource_id=item.id,request=request)
    suffix = item.extension or Path(item.file_url or "").suffix
    filename = f"{item.title}{suffix}" if suffix and not item.title.lower().endswith(suffix.lower()) else item.title
    media_type = item.mime_type or ("application/pdf" if suffix.lower() == ".pdf" else None)
    response = protected_upload_response(item.file_url, filename, media_type=media_type)
    response.headers["Content-Disposition"] = f'inline; filename="{filename}"'
    return response


@router.get("/users/{staff_id}/permissions", response_model=PermissionMatrix)
def staff_permissions_get(staff_id: str, current_user: CurrentUser, db: Session = Depends(get_db)) -> PermissionMatrix:
    return crud_service.get_staff_permissions(db, current_user, staff_id)


@router.put("/users/{staff_id}/permissions", response_model=PermissionMatrix)
def staff_permissions_update(staff_id: str, payload: PermissionMatrix, current_user: CurrentUser, db: Session = Depends(get_db)) -> PermissionMatrix:
    return crud_service.update_staff_permissions(db, current_user, staff_id, payload)
