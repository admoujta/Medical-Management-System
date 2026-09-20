"""backfill subscription trial dates

Revision ID: 20260724_0056
Revises: 20260724_0055
"""
from alembic import op

revision = "20260724_0056"
down_revision = "20260724_0055"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        UPDATE subscriptions AS subscription
        SET trial_started_at = COALESCE(subscription.trial_started_at, tenant.trial_started_at),
            trial_ends_at = COALESCE(subscription.trial_ends_at, tenant.trial_ends_at)
        FROM tenants AS tenant
        WHERE subscription.tenant_id = tenant.id
          AND (subscription.trial_started_at IS NULL OR subscription.trial_ends_at IS NULL)
        """
    )


def downgrade():
    # Les dates complétées sont des données métier valides et restent conservées.
    pass
