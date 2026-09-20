import calendar
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, Role, Subscription, SubscriptionPayment, SubscriptionPlan, Tenant, User, UserNotification
from app.core.subscription_modules import ALL_SUBSCRIPTION_MODULES, SUBSCRIPTION_MODULE_LABELS


def add_months(value: datetime, months: int) -> datetime:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    return value.replace(year=year, month=month, day=min(value.day, calendar.monthrange(year, month)[1]))


def active_plans(db: Session) -> list[SubscriptionPlan]:
    return list(db.scalars(select(SubscriptionPlan).where(SubscriptionPlan.is_active.is_(True)).order_by(SubscriptionPlan.display_order, SubscriptionPlan.price)).all())


def plan_by_slug(db: Session, slug: str) -> SubscriptionPlan:
    plan = db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.slug == slug, SubscriptionPlan.is_active.is_(True)))
    if not plan:
        raise HTTPException(404, "Offre introuvable.")
    return plan


def tenant_subscription(db: Session, user: User) -> Subscription:
    if not user.tenant_id:
        raise HTTPException(403, "Compte sans cabinet.")
    subscription = db.scalar(select(Subscription).where(Subscription.tenant_id == user.tenant_id))
    if not subscription:
        raise HTTPException(404, "Abonnement introuvable.")
    return subscription


def modules_for_user(db: Session, user: User) -> list[str]:
    subscription = tenant_subscription(db, user)
    plan = db.get(SubscriptionPlan, subscription.plan_id) if subscription.plan_id else None
    # Les anciens abonnements et essais restent pleinement fonctionnels jusqu'à
    # ce qu'une offre avec une matrice explicite leur soit attribuée.
    if not plan or not plan.enabled_modules:
        return list(ALL_SUBSCRIPTION_MODULES)
    return [module for module in plan.enabled_modules if module in ALL_SUBSCRIPTION_MODULES]


def require_module(db: Session, user: User, module: str) -> None:
    if module not in modules_for_user(db, user):
        label = SUBSCRIPTION_MODULE_LABELS.get(module, module)
        raise HTTPException(403, f"Le module « {label} » n’est pas inclus dans l’abonnement du cabinet.")


def notify_tenant_doctors(db: Session, tenant_id: str, notification_type: str, title: str, message: str, resource_id: str | None) -> None:
    recipients = db.scalars(
        select(User).where(
            User.tenant_id == tenant_id,
            User.is_active.is_(True),
            User.roles.any(Role.code == "doctor_admin"),
        )
    ).all()
    for recipient in recipients:
        exists = db.scalar(
            select(UserNotification.id).where(
                UserNotification.user_id == recipient.id,
                UserNotification.notification_type == notification_type,
                UserNotification.resource_id == resource_id,
            )
        )
        if not exists:
            db.add(UserNotification(
                tenant_id=tenant_id, user_id=recipient.id, notification_type=notification_type,
                title=title, message=message, resource_id=resource_id,
            ))


def subscription_details(db: Session, user: User) -> dict:
    subscription = tenant_subscription(db, user)
    tenant = db.get(Tenant, subscription.tenant_id)
    plan = db.get(SubscriptionPlan, subscription.plan_id) if subscription.plan_id else None
    now = datetime.now(UTC)
    trial_started_at = subscription.trial_started_at or tenant.trial_started_at
    trial_ends_at = subscription.trial_ends_at or tenant.trial_ends_at
    end = trial_ends_at if subscription.status == "trial" else subscription.end_date
    end_aware = end.replace(tzinfo=UTC) if end.tzinfo is None else end
    return {
        "id": subscription.id, "tenant_id": subscription.tenant_id, "plan_id": subscription.plan_id,
        "plan_name": plan.name if plan else subscription.plan_name, "status": subscription.status,
        "instance_status": tenant.status, "start_date": subscription.start_date, "end_date": subscription.end_date,
        "trial_started_at": trial_started_at, "trial_ends_at": trial_ends_at,
        "grace_period_ends_at": subscription.grace_period_ends_at, "current_period_start": subscription.start_date,
        "current_period_end": subscription.end_date, "next_due_date": subscription.next_due_date,
        "amount": subscription.amount, "currency": plan.currency if plan else "MAD",
        "billing_interval": plan.billing_interval if plan else "monthly", "payment_status": subscription.payment_status,
        "auto_renew": subscription.auto_renew, "days_remaining": max(0, (end_aware.date() - now.date()).days),
        "enabled_modules": modules_for_user(db, user),
    }


def select_plan(db: Session, user: User, plan_id: str) -> dict:
    subscription = tenant_subscription(db, user)
    plan = db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id, SubscriptionPlan.is_active.is_(True)))
    if not plan:
        raise HTTPException(404, "Offre active introuvable.")
    subscription.plan_id = plan.id
    subscription.plan_name = plan.name
    subscription.amount = plan.price
    db.add(AuditLog(tenant_id=user.tenant_id, user_id=user.id, action="subscription.plan.selected", resource_type="subscription", resource_id=subscription.id, event_metadata={"plan_id": plan.id}))
    db.commit()
    return subscription_details(db, user)


def create_manual_payment(db: Session, user: User, payload) -> SubscriptionPayment:
    subscription = tenant_subscription(db, user)
    plan = db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.id == payload.plan_id, SubscriptionPlan.is_active.is_(True)))
    if not plan:
        raise HTTPException(404, "Offre active introuvable.")
    if payload.payment_method == "card":
        raise HTTPException(409, "Le paiement en ligne sera disponible après configuration d’un prestataire.")
    if payload.payment_method in {"bank_transfer", "cheque"} and not (payload.transaction_reference or "").strip():
        raise HTTPException(422, "La référence du virement ou du chèque est obligatoire.")
    pending = db.scalar(
        select(SubscriptionPayment).where(
            SubscriptionPayment.subscription_id == subscription.id,
            SubscriptionPayment.plan_id == plan.id,
            SubscriptionPayment.status.in_({"pending", "processing"}),
        )
    )
    if pending:
        raise HTTPException(409, "Un paiement pour cette offre est déjà en attente de validation.")
    payment = SubscriptionPayment(
        tenant_id=user.tenant_id, subscription_id=subscription.id, plan_id=plan.id,
        amount=Decimal(plan.price), currency=plan.currency, payment_method=payload.payment_method,
        transaction_reference=payload.transaction_reference, proof_url=payload.proof_url,
        status="pending", created_by_user_id=user.id,
    )
    db.add(payment)
    subscription.plan_id, subscription.plan_name, subscription.amount = plan.id, plan.name, plan.price
    subscription.payment_status = "pending"
    if subscription.status not in {"trial", "active"}:
        subscription.status = "pending_payment"
    db.flush()
    db.add(AuditLog(tenant_id=user.tenant_id, user_id=user.id, action="subscription.payment.declared", resource_type="subscription_payment", resource_id=payment.id, event_metadata={"method": payment.payment_method}))
    db.commit(); db.refresh(payment)
    return payment


def mark_payment_paid(db: Session, admin: User, payment: SubscriptionPayment) -> SubscriptionPayment:
    if payment.status == "paid":
        return payment
    if payment.status not in {"pending", "processing"}:
        raise HTTPException(409, "Ce paiement ne peut plus être validé.")
    subscription = db.get(Subscription, payment.subscription_id)
    tenant = db.get(Tenant, payment.tenant_id)
    plan = db.get(SubscriptionPlan, payment.plan_id)
    if not subscription or not tenant or not plan:
        raise HTTPException(409, "Données d’abonnement incomplètes.")
    now = datetime.now(UTC)
    period_start = max(now, subscription.end_date if subscription.status == "active" else now)
    if period_start.tzinfo is None: period_start = period_start.replace(tzinfo=UTC)
    period_end = add_months(period_start, plan.duration_months)
    payment.status, payment.paid_at = "paid", now
    payment.period_start, payment.period_end = period_start, period_end
    payment.validated_by_super_admin_id = admin.id
    subscription.status, subscription.payment_status = "active", "paid"
    subscription.start_date, subscription.end_date, subscription.next_due_date = period_start, period_end, period_end
    subscription.grace_period_ends_at = None
    tenant.status, tenant.suspended_at = "active", None
    notify_tenant_doctors(
        db, tenant.id, "SUBSCRIPTION_PAYMENT_VALIDATED", "Abonnement activé",
        f"Le paiement de l’offre {plan.name} a été validé. Votre abonnement est maintenant actif.",
        payment.id,
    )
    db.add(AuditLog(tenant_id=tenant.id, user_id=admin.id, action="subscription.payment.validated", resource_type="subscription_payment", resource_id=payment.id))
    db.commit(); db.refresh(payment)
    return payment


def reject_payment(db: Session, admin: User, payment: SubscriptionPayment, reason: str | None) -> SubscriptionPayment:
    if payment.status != "pending":
        raise HTTPException(409, "Seul un paiement en attente peut être refusé.")
    payment.status, payment.failed_at = "failed", datetime.now(UTC)
    payment.failure_reason, payment.validated_by_super_admin_id = reason or "Paiement refusé par la plateforme.", admin.id
    subscription = db.get(Subscription, payment.subscription_id)
    if subscription:
        subscription.payment_status = "failed"
        if subscription.status == "pending_payment":
            subscription.status = "suspended"
    notify_tenant_doctors(
        db, payment.tenant_id, "SUBSCRIPTION_PAYMENT_REJECTED", "Paiement d’abonnement refusé",
        reason or "Le paiement déclaré n’a pas pu être validé. Consultez votre abonnement pour le régulariser.",
        payment.id,
    )
    db.add(AuditLog(tenant_id=payment.tenant_id, user_id=admin.id, action="subscription.payment.rejected", resource_type="subscription_payment", resource_id=payment.id))
    db.commit(); db.refresh(payment)
    return payment
