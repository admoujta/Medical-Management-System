from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, Subscription, Tenant
from app.services.subscription_service import notify_tenant_doctors


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def suspend_expired_trials(db: Session) -> int:
    now = datetime.now(UTC)
    trial_tenants = db.scalars(select(Tenant).where(Tenant.status == "trial")).all()
    for tenant in trial_tenants:
        remaining = (_ensure_aware(tenant.trial_ends_at).date() - now.date()).days
        if 0 <= remaining <= 7:
            subscription = db.scalar(select(Subscription).where(Subscription.tenant_id == tenant.id))
            notify_tenant_doctors(
                db, tenant.id, "SUBSCRIPTION_TRIAL_EXPIRING", "Fin d’essai proche",
                f"Votre essai gratuit se termine dans {remaining} jour{'s' if remaining != 1 else ''}. Choisissez une offre pour conserver l’accès aux modules.",
                subscription.id if subscription else tenant.id,
            )
    tenants = [
        tenant
        for tenant in trial_tenants
        if _ensure_aware(tenant.trial_ends_at) < now
    ]

    expired_ids = {tenant.id for tenant in tenants}
    expired_subscriptions = db.scalars(select(Subscription).where(Subscription.status == "active", Subscription.end_date < now)).all()
    for subscription in expired_subscriptions:
        tenant = db.get(Tenant, subscription.tenant_id)
        if tenant and tenant.id not in expired_ids:
            tenants.append(tenant)
            expired_ids.add(tenant.id)

    for tenant in tenants:
        grace_days = max(0, tenant.grace_period_days)
        expiry = tenant.trial_ends_at
        subscription = db.query(Subscription).filter(Subscription.tenant_id == tenant.id).one_or_none()
        if subscription and subscription.status == "active":
            expiry = subscription.end_date
        expiry = _ensure_aware(expiry)
        grace_end = expiry + timedelta(days=grace_days)
        in_grace = grace_days > 0 and now <= grace_end
        tenant.status = "grace_period" if in_grace else "suspended"
        tenant.suspended_at = None if in_grace else now
        if subscription:
            subscription_expired = (
                subscription.status == "trial"
                and subscription.trial_ends_at is not None
                and _ensure_aware(subscription.trial_ends_at) < now
            ) or (
                subscription.status == "active"
                and _ensure_aware(subscription.end_date) < now
            )
            if subscription_expired:
                subscription.status = "past_due" if in_grace else "suspended"
                subscription.payment_status = "overdue"
                subscription.grace_period_ends_at = grace_end if in_grace else None
        notify_tenant_doctors(
            db, tenant.id,
            "SUBSCRIPTION_GRACE_PERIOD" if in_grace else "SUBSCRIPTION_SUSPENDED",
            "Abonnement en délai de grâce" if in_grace else "Abonnement suspendu",
            "Votre abonnement est arrivé à échéance. Régularisez-le depuis la page Abonnement pour conserver tous vos accès.",
            subscription.id if subscription else tenant.id,
        )
        db.add(
            AuditLog(
                tenant_id=tenant.id,
                user_id=None,
                action="tenant.grace_period" if in_grace else "tenant.suspended",
                resource_type="tenant",
                resource_id=tenant.id,
                event_metadata={"reason": "subscription_or_trial_expired", "grace_period_ends_at": grace_end.isoformat() if in_grace else None},
            )
        )

    db.commit()
    return len(tenants)
