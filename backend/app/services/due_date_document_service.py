from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Invoice, PaymentDueDate, PaymentDueDateDocument, User
from app.schemas.crud import DueDateDocumentOut
from app.services.crud_service import (
    add_operation,
    ensure_write_allowed,
    get_scoped,
    require_module_access,
    require_tenant,
)


DOCUMENT_TYPES = {"GUARANTOR_CIN", "CHEQUE", "OTHER"}


def get_due(db: Session, user: User, due_date_id: str, *, write: bool = False) -> PaymentDueDate:
    require_module_access(db, user, "payments", write=write)
    if write:
        ensure_write_allowed(user)
    return get_scoped(db, user, PaymentDueDate, due_date_id, "Échéance")


def validate_document_type(due: PaymentDueDate, document_type: str) -> str:
    normalized_type = document_type.strip().upper()
    if normalized_type not in DOCUMENT_TYPES:
        raise HTTPException(422, "Type de justificatif d’échéance invalide.")
    if due.guarantee_type == "NORMAL":
        raise HTTPException(409, "Une échéance simple ne nécessite aucun justificatif.")
    if normalized_type == "GUARANTOR_CIN" and due.guarantee_type != "GUARANTOR":
        raise HTTPException(422, "La pièce CIN est réservée à une échéance avec garant.")
    if normalized_type == "CHEQUE" and due.guarantee_type != "CHEQUE":
        raise HTTPException(422, "La copie du chèque est réservée à une échéance garantie par chèque.")
    return normalized_type


def _serialize(db: Session, rows: list[PaymentDueDateDocument]) -> list[DueDateDocumentOut]:
    user_ids = {row.uploaded_by_user_id for row in rows if row.uploaded_by_user_id}
    names = (
        dict(
            db.execute(
                select(
                    User.id,
                    func.concat(User.first_name, " ", User.last_name),
                ).where(User.id.in_(user_ids))
            ).all()
        )
        if user_ids
        else {}
    )
    return [
        DueDateDocumentOut(
            id=row.id,
            due_date_id=row.due_date_id,
            patient_id=row.patient_id,
            document_type=row.document_type,
            title=row.title,
            original_filename=row.original_filename,
            mime_type=row.mime_type,
            file_size=row.file_size,
            uploaded_by_user_id=row.uploaded_by_user_id,
            uploaded_by_name=names.get(row.uploaded_by_user_id, "Système"),
            created_at=row.created_at,
        )
        for row in rows
    ]


def create(
    db: Session,
    user: User,
    due_date_id: str,
    *,
    document_type: str,
    title: str | None,
    file_path: str,
    original_filename: str,
    mime_type: str,
    file_size: int,
) -> DueDateDocumentOut:
    due = get_due(db, user, due_date_id, write=True)
    normalized_type = validate_document_type(due, document_type)
    label = (title or "").strip() or {
        "GUARANTOR_CIN": "CIN du garant",
        "CHEQUE": "Copie du chèque",
        "OTHER": "Autre justificatif",
    }[normalized_type]
    row = PaymentDueDateDocument(
        tenant_id=require_tenant(user),
        due_date_id=due.id,
        patient_id=due.patient_id,
        document_type=normalized_type,
        title=label,
        file_path=file_path,
        original_filename=original_filename,
        mime_type=mime_type,
        file_size=file_size,
        uploaded_by_user_id=user.id,
    )
    db.add(row)
    db.flush()
    add_operation(
        db,
        user,
        "DUE_DATE_DOCUMENT_ADDED",
        invoice=db.get(Invoice, due.invoice_id),
        description=f"{label} ajouté à l’échéance du {due.due_date.isoformat()}.",
        new_value={"due_date_id": due.id, "document_type": normalized_type},
    )
    db.commit()
    db.refresh(row)
    return _serialize(db, [row])[0]


def list_for_due(db: Session, user: User, due_date_id: str) -> list[DueDateDocumentOut]:
    due = get_due(db, user, due_date_id)
    rows = list(
        db.scalars(
            select(PaymentDueDateDocument)
            .where(
                PaymentDueDateDocument.tenant_id == require_tenant(user),
                PaymentDueDateDocument.due_date_id == due.id,
            )
            .order_by(PaymentDueDateDocument.created_at.asc())
        ).all()
    )
    return _serialize(db, rows)


def get_document(db: Session, user: User, document_id: str) -> PaymentDueDateDocument:
    require_module_access(db, user, "payments")
    return get_scoped(db, user, PaymentDueDateDocument, document_id, "Justificatif d’échéance")


def delete(db: Session, user: User, document_id: str) -> None:
    require_module_access(db, user, "payments", write=True)
    ensure_write_allowed(user)
    row = get_scoped(db, user, PaymentDueDateDocument, document_id, "Justificatif d’échéance")
    path = Path(settings.upload_dir) / row.file_path
    db.delete(row)
    db.commit()
    path.unlink(missing_ok=True)
