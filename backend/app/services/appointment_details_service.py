from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import (
    Appointment,
    CNSSCase,
    CNSSStatusHistory,
    DoctorProfile,
    Fee,
    HonoraireAppointment,
    HonoraireVisit,
    Invoice,
    MedicalDocument,
    OperationHistory,
    PatientProfile,
    Payment,
    Prescription,
    TenantSettings,
    User,
    Visit,
)
from app.schemas.appointment_details import (
    AppointmentDetailsActivity,
    AppointmentDetailsActor,
    AppointmentDetailsAppointment,
    AppointmentDetailsCabinet,
    AppointmentDetailsCNSS,
    AppointmentDetailsDoctor,
    AppointmentDetailsDocument,
    AppointmentDetailsFee,
    AppointmentDetailsPatient,
    AppointmentDetailsPayment,
    AppointmentDetailsPrescription,
    AppointmentDetailsResponse,
    AppointmentDetailsVisit,
)
from app.services import crud_service


MONEY_STEP = Decimal("0.01")
PATIENT_ACTIVITY_PREFIXES = (
    "APPOINTMENT_",
    "CONSULTATION_",
    "VISIT_",
    "PRESCRIPTION_",
    "DOCUMENT_",
    "CNSS_",
    "PAYMENT_",
)


def money(value: object) -> Decimal:
    return Decimal(str(value or 0)).quantize(MONEY_STEP, rounding=ROUND_HALF_UP)


def actual_duration_seconds(
    stored_duration: int | None,
    started_at: datetime | None,
    ended_at: datetime | None,
) -> int | None:
    if stored_duration is not None:
        return max(0, stored_duration)
    if started_at is None or ended_at is None:
        return None
    return max(0, int((ended_at - started_at).total_seconds()))


def payment_counts_as_paid(payment: Payment) -> bool:
    return payment.status not in {"ANNULE", "REMBOURSE", "ECHEC", "FAILED", "REVERSED", "CANCELLED"} and (
        payment.method != "cheque" or payment.cheque_status == "ENCAISSE"
    )


def honoraire_totals(
    total_amount: object,
    payments: list[Payment],
) -> tuple[Decimal, Decimal, Decimal]:
    total = money(total_amount)
    paid = money(
        sum(
            (money(payment.amount) for payment in payments if payment_counts_as_paid(payment)),
            Decimal("0.00"),
        )
    )
    return total, paid, money(max(Decimal("0.00"), total - paid))


def _actor(user_id: str | None, users: dict[str, User]) -> AppointmentDetailsActor:
    user = users.get(user_id or "")
    if not user:
        return AppointmentDetailsActor(id=None, full_name="Système")
    return AppointmentDetailsActor(id=user.id, full_name=f"{user.first_name} {user.last_name}".strip())


def _load_appointment(db: Session, user: User, appointment_id: str) -> tuple[Appointment, bool]:
    tenant_id = crud_service.require_tenant(user)
    appointment = db.scalar(
        select(Appointment)
        .options(
            joinedload(Appointment.patient).joinedload(PatientProfile.user),
            joinedload(Appointment.doctor).joinedload(DoctorProfile.user),
            joinedload(Appointment.tenant),
        )
        .where(Appointment.id == appointment_id, Appointment.tenant_id == tenant_id)
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Rendez-vous introuvable.")

    is_patient = crud_service.role_code(user) == "PATIENT"
    if is_patient:
        patient = user.patient_profile or db.scalar(
            select(PatientProfile).where(PatientProfile.user_id == user.id)
        )
        if not patient or appointment.patient_id != patient.id:
            raise HTTPException(status_code=404, detail="Rendez-vous introuvable.")
    else:
        crud_service.require_module_access(db, user, "appointments")
    return appointment, is_patient


def get_appointment_details(
    db: Session,
    user: User,
    appointment_id: str,
) -> AppointmentDetailsResponse:
    appointment, is_patient = _load_appointment(db, user, appointment_id)
    tenant_id = appointment.tenant_id
    is_doctor = crud_service.role_code(user) == "MEDECIN_ADMIN"
    can_view_visits = is_patient or is_doctor or crud_service.has_module_access(db, user, "visits")
    can_view_fees = is_patient or is_doctor or crud_service.has_module_access(db, user, "honoraires")
    can_view_payments = is_patient or is_doctor or crud_service.has_module_access(db, user, "payments")
    can_view_prescriptions = is_patient or is_doctor or crud_service.has_module_access(db, user, "prescriptions")
    can_view_documents = is_patient or is_doctor or crud_service.has_module_access(db, user, "documents")
    can_view_cnss = is_patient or is_doctor or crud_service.has_module_access(db, user, "cnss")

    visit = db.scalar(
        select(Visit).where(
            Visit.tenant_id == tenant_id,
            Visit.appointment_id == appointment.id,
        )
    )
    visit_ids = {visit.id} if visit else set()

    fee_ids = set(
        db.scalars(
            select(HonoraireAppointment.fee_id).where(
                HonoraireAppointment.tenant_id == tenant_id,
                HonoraireAppointment.appointment_id == appointment.id,
            )
        ).all()
    )
    if visit_ids:
        fee_ids.update(
            db.scalars(
                select(HonoraireVisit.fee_id).where(
                    HonoraireVisit.tenant_id == tenant_id,
                    HonoraireVisit.visit_id.in_(visit_ids),
                )
            ).all()
        )

    prescription_scope = [Prescription.appointment_id == appointment.id]
    if visit_ids:
        prescription_scope.append(Prescription.visit_id.in_(visit_ids))
    prescriptions = list(
        db.scalars(
            select(Prescription)
            .where(Prescription.tenant_id == tenant_id, or_(*prescription_scope))
            .order_by(Prescription.created_at.asc())
        ).all()
    )

    cnss_scope = [CNSSCase.appointment_id == appointment.id]
    if visit_ids:
        cnss_scope.append(CNSSCase.visit_id.in_(visit_ids))
    if fee_ids:
        cnss_scope.append(CNSSCase.fee_id.in_(fee_ids))
    cnss_records = list(
        db.scalars(
            select(CNSSCase)
            .where(CNSSCase.tenant_id == tenant_id, or_(*cnss_scope))
            .order_by(CNSSCase.created_at.asc())
        ).all()
    )
    fee_ids.update(item.fee_id for item in cnss_records if item.fee_id)

    fees = list(
        db.scalars(
            select(Fee)
            .where(Fee.tenant_id == tenant_id, Fee.id.in_(fee_ids))
            .order_by(Fee.created_at.asc())
        ).all()
    ) if fee_ids else []
    payments = list(
        db.scalars(
            select(Payment)
            .where(Payment.tenant_id == tenant_id, Payment.fee_id.in_(fee_ids))
            .order_by(Payment.paid_at.asc())
        ).all()
    ) if fee_ids else []
    invoice_ids = set(
        db.scalars(
            select(Invoice.id).where(
                Invoice.tenant_id == tenant_id,
                Invoice.fee_id.in_(fee_ids),
            )
        ).all()
    ) if fee_ids else set()
    cnss_ids = {item.id for item in cnss_records}
    cnss_history = list(
        db.scalars(
            select(CNSSStatusHistory)
            .where(
                CNSSStatusHistory.tenant_id == tenant_id,
                CNSSStatusHistory.cnss_case_id.in_(cnss_ids),
            )
            .order_by(CNSSStatusHistory.changed_at.asc())
        ).all()
    ) if cnss_ids else []

    document_scope = [MedicalDocument.appointment_id == appointment.id]
    if visit_ids:
        document_scope.append(MedicalDocument.visit_id.in_(visit_ids))
    if fee_ids:
        document_scope.append(MedicalDocument.fee_id.in_(fee_ids))
    if invoice_ids:
        document_scope.append(MedicalDocument.invoice_id.in_(invoice_ids))
    if cnss_ids:
        document_scope.append(MedicalDocument.cnss_case_id.in_(cnss_ids))
    prescription_document_ids = {
        item.pdf_document_id for item in prescriptions if item.pdf_document_id
    }
    if prescription_document_ids:
        document_scope.append(MedicalDocument.id.in_(prescription_document_ids))
    document_query = select(MedicalDocument).where(
        MedicalDocument.tenant_id == tenant_id,
        MedicalDocument.status != "ARCHIVE",
        or_(*document_scope),
    )
    if is_patient:
        document_query = document_query.where(
            MedicalDocument.shared_with_patient.is_(True),
            MedicalDocument.confidential.is_(False),
        )
    documents = (
        list(db.scalars(document_query.order_by(MedicalDocument.created_at.asc())).all())
        if can_view_documents
        else []
    )

    payment_ids = {item.id for item in payments}
    prescription_ids = {item.id for item in prescriptions}
    document_ids = {item.id for item in documents}
    history_scope = [OperationHistory.appointment_id == appointment.id]
    if visit_ids:
        history_scope.append(OperationHistory.visit_id.in_(visit_ids))
    if fee_ids:
        history_scope.append(OperationHistory.fee_id.in_(fee_ids))
    if payment_ids:
        history_scope.append(OperationHistory.payment_id.in_(payment_ids))
    if prescription_ids:
        history_scope.append(OperationHistory.prescription_id.in_(prescription_ids))
    if document_ids:
        history_scope.append(OperationHistory.document_id.in_(document_ids))
    operation_history = list(
        db.scalars(
            select(OperationHistory)
            .where(OperationHistory.tenant_id == tenant_id, or_(*history_scope))
            .order_by(OperationHistory.created_at.asc())
        ).all()
    )

    doctor_ids = {item.doctor_id for item in prescriptions if item.doctor_id}
    prescription_doctors = {
        item.id: item
        for item in db.scalars(
            select(DoctorProfile)
            .options(joinedload(DoctorProfile.user))
            .where(DoctorProfile.tenant_id == tenant_id, DoctorProfile.id.in_(doctor_ids))
        ).all()
    } if doctor_ids else {}

    user_ids = {
        item.created_by_user_id for item in payments if item.created_by_user_id
    } | {
        item.created_by_user_id for item in documents if item.created_by_user_id
    } | {
        item.user_id for item in operation_history if item.user_id
    } | {
        item.changed_by_user_id for item in cnss_history if item.changed_by_user_id
    }
    users = {
        item.id: item
        for item in db.scalars(
            select(User).where(User.id.in_(user_ids))
        ).all()
    } if user_ids else {}

    settings = db.scalar(
        select(TenantSettings).where(TenantSettings.tenant_id == tenant_id)
    ) if is_patient else None
    patient_financial_enabled = (
        not is_patient or settings is None or settings.patient_can_view_payments
    )
    show_fees = can_view_fees and patient_financial_enabled
    show_payments = can_view_payments and patient_financial_enabled

    payments_by_fee: dict[str, list[Payment]] = {}
    for payment in payments:
        payments_by_fee.setdefault(payment.fee_id, []).append(payment)

    fee_output = []
    for fee in fees:
        total, paid, remaining = honoraire_totals(
            fee.amount,
            payments_by_fee.get(fee.id, []),
        )
        fee_output.append(
            AppointmentDetailsFee(
                id=fee.id,
                label=fee.title,
                description=fee.description,
                status=fee.status,
                total_amount=total,
                paid_amount=paid,
                remaining_amount=remaining,
                created_at=fee.created_at,
                updated_at=fee.updated_at,
            )
        )

    cnss_dates: dict[str, dict[str, datetime | None]] = {
        item.id: {"ready": None, "submitted": None} for item in cnss_records
    }
    for event in cnss_history:
        if event.new_status == "READY_FOR_PICKUP" and cnss_dates[event.cnss_case_id]["ready"] is None:
            cnss_dates[event.cnss_case_id]["ready"] = event.changed_at
        if event.new_status == "SUBMITTED_TO_CNSS" and cnss_dates[event.cnss_case_id]["submitted"] is None:
            cnss_dates[event.cnss_case_id]["submitted"] = event.changed_at

    activities: list[AppointmentDetailsActivity] = []
    for event in operation_history:
        if is_patient and not event.action_type.startswith(PATIENT_ACTIVITY_PREFIXES):
            continue
        if is_patient and not show_payments and event.action_type.startswith("PAYMENT_"):
            continue
        if not is_patient and not is_doctor:
            action = event.action_type
            if action.startswith(("VISIT_", "CONSULTATION_")) and not can_view_visits:
                continue
            if action.startswith(("FEE_", "HONORAIRE_", "INVOICE_", "DUE_DATE_")) and not can_view_fees:
                continue
            if action.startswith("PAYMENT_") and not can_view_payments:
                continue
            if action.startswith("PRESCRIPTION_") and not can_view_prescriptions:
                continue
            if action.startswith("DOCUMENT_") and not can_view_documents:
                continue
            if action.startswith("CNSS_") and not can_view_cnss:
                continue
        previous_value = event.old_value if event.old_value is not None else event.old_status
        new_value = event.new_value if event.new_value is not None else event.new_status
        if is_patient:
            previous_value = event.old_status
            new_value = event.new_status
        activities.append(
            AppointmentDetailsActivity(
                id=event.id,
                event_type=event.action_type,
                previous_value=previous_value,
                new_value=new_value,
                description=None if is_patient else event.description,
                occurred_at=event.created_at,
                date=event.created_at.date(),
                time=event.created_at.timetz(),
                responsible_user=_actor(event.user_id, users),
            )
        )
    for event in (cnss_history if can_view_cnss else []):
        activities.append(
            AppointmentDetailsActivity(
                id=event.id,
                event_type="CNSS_STATUS_CHANGED",
                previous_value=event.old_status,
                new_value=event.new_status,
                description=event.comment or event.rejection_reason,
                occurred_at=event.changed_at,
                date=event.changed_at.date(),
                time=event.changed_at.timetz(),
                responsible_user=_actor(event.changed_by_user_id, users),
            )
        )
    activities.sort(key=lambda item: item.occurred_at)

    patient_user = appointment.patient.user
    doctor_user = appointment.doctor.user
    response = AppointmentDetailsResponse(
        appointment=AppointmentDetailsAppointment(
            id=appointment.id,
            date=appointment.date,
            start_time=appointment.start_time,
            end_time=appointment.end_time,
            actual_start_time=appointment.actual_start_time,
            actual_end_time=appointment.actual_end_time,
            duration_seconds=actual_duration_seconds(
                appointment.duration_seconds,
                appointment.actual_start_time,
                appointment.actual_end_time,
            ),
            reason=appointment.reason,
            notes=None if is_patient else appointment.notes,
            status=appointment.status,
        ),
        patient=AppointmentDetailsPatient(
            id=appointment.patient.id,
            full_name=f"{patient_user.first_name} {patient_user.last_name}".strip(),
            phone=patient_user.phone,
            email=patient_user.email,
            gender=appointment.patient.gender,
            birth_date=appointment.patient.birth_date,
            address=appointment.patient.address,
            account_status=patient_user.account_status,
        ),
        doctor=AppointmentDetailsDoctor(
            id=appointment.doctor.id,
            full_name=f"{doctor_user.first_name} {doctor_user.last_name}".strip(),
            specialty=appointment.doctor.specialty,
            phone=appointment.doctor.professional_phone or doctor_user.phone,
            email=appointment.doctor.professional_email or doctor_user.email,
        ),
        cabinet=AppointmentDetailsCabinet(
            id=appointment.tenant.id,
            name=appointment.tenant.name,
            address=appointment.tenant.address,
            phone=appointment.tenant.phone,
            email=None,
        ),
        visit=AppointmentDetailsVisit(
            id=visit.id,
            status=visit.status,
            visit_date=visit.visit_date,
            started_at=visit.actual_start_time,
            completed_at=visit.actual_end_time,
            duration_seconds=actual_duration_seconds(
                visit.duration_seconds,
                visit.actual_start_time,
                visit.actual_end_time,
            ),
            notes=None if is_patient else visit.notes,
            created_at=visit.created_at,
            updated_at=None,
        ) if visit and can_view_visits else None,
        honoraires=fee_output if show_fees else [],
        payments=[
            AppointmentDetailsPayment(
                id=item.id,
                honoraire_id=item.fee_id,
                amount=money(item.amount),
                payment_method=item.method,
                status=item.status,
                payment_date=item.paid_at,
                reference=item.reference,
                created_at=item.paid_at,
                created_by=_actor(item.created_by_user_id, users),
            )
            for item in payments
        ] if show_payments else [],
        prescriptions=[
            AppointmentDetailsPrescription(
                id=item.id,
                prescription_date=item.consultation_date or item.created_at.date(),
                doctor=AppointmentDetailsActor(
                    id=doctor.id if doctor else None,
                    full_name=(
                        f"{doctor.user.first_name} {doctor.user.last_name}".strip()
                        if doctor else "Médecin"
                    ),
                ),
                summary=item.content,
                items=item.items or [],
                created_at=item.created_at,
            )
            for item in prescriptions if can_view_prescriptions
            for doctor in [prescription_doctors.get(item.doctor_id)]
        ],
        documents=[
            AppointmentDetailsDocument(
                id=item.id,
                name=item.title,
                document_type=item.document_type,
                description=item.description,
                download_url=(
                    f"/api/patient/documents/{item.id}/download"
                    if is_patient
                    else f"/api/doctor/documents/{item.id}/download"
                ) if item.file_url else None,
                uploaded_at=item.created_at,
                uploaded_by=_actor(item.created_by_user_id, users),
            )
            for item in documents
        ],
        cnss_records=[
            AppointmentDetailsCNSS(
                id=item.id,
                status=item.status,
                request_date=item.created_at,
                ready_date=cnss_dates[item.id]["ready"],
                delivered_date=item.delivery_confirmed_at,
                submitted_date=cnss_dates[item.id]["submitted"],
                decision_date=item.decision_date,
                rejection_reason=item.rejection_reason,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
            for item in cnss_records if can_view_cnss
        ],
        activity_history=activities,
    )
    return response
