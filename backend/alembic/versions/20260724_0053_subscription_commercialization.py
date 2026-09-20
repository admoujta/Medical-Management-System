"""subscription commercialization foundation

Revision ID: 20260724_0053
Revises: 20260723_0052
"""
from alembic import op
import sqlalchemy as sa

revision = "20260724_0053"
down_revision = "20260723_0052"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    plan_columns = {column["name"] for column in inspector.get_columns("subscription_plans")}
    for name, column in [
        ("slug", sa.Column("slug", sa.String(120), nullable=True)),
        ("description", sa.Column("description", sa.Text(), nullable=True)),
        ("currency", sa.Column("currency", sa.String(3), nullable=False, server_default="MAD")),
        ("billing_interval", sa.Column("billing_interval", sa.String(20), nullable=False, server_default="monthly")),
        ("trial_days", sa.Column("trial_days", sa.Integer(), nullable=False, server_default="30")),
        ("max_doctors", sa.Column("max_doctors", sa.Integer(), nullable=True)),
        ("max_secretaries", sa.Column("max_secretaries", sa.Integer(), nullable=True)),
        ("max_patients", sa.Column("max_patients", sa.Integer(), nullable=True)),
        ("whatsapp_enabled", sa.Column("whatsapp_enabled", sa.Boolean(), nullable=False, server_default=sa.false())),
        ("cnss_enabled", sa.Column("cnss_enabled", sa.Boolean(), nullable=False, server_default=sa.false())),
        ("statistics_enabled", sa.Column("statistics_enabled", sa.Boolean(), nullable=False, server_default=sa.false())),
        ("is_featured", sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false())),
        ("display_order", sa.Column("display_order", sa.Integer(), nullable=False, server_default="0")),
    ]:
        if name not in plan_columns:
            op.add_column("subscription_plans", column)
    plan_uniques = {item["name"] for item in inspector.get_unique_constraints("subscription_plans")}
    plan_indexes = {item["name"] for item in inspector.get_indexes("subscription_plans")}
    if "uq_subscription_plan_slug" not in plan_uniques:
        op.create_unique_constraint("uq_subscription_plan_slug", "subscription_plans", ["slug"])
    if "ix_subscription_plans_slug" not in plan_indexes:
        op.create_index("ix_subscription_plans_slug", "subscription_plans", ["slug"])

    subscription_columns = {column["name"] for column in inspector.get_columns("subscriptions")}
    for name, column in [
        ("trial_started_at", sa.Column("trial_started_at", sa.DateTime(timezone=True), nullable=True)),
        ("trial_ends_at", sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True)),
        ("grace_period_ends_at", sa.Column("grace_period_ends_at", sa.DateTime(timezone=True), nullable=True)),
        ("cancelled_at", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True)),
        ("cancellation_reason", sa.Column("cancellation_reason", sa.Text(), nullable=True)),
        ("auto_renew", sa.Column("auto_renew", sa.Boolean(), nullable=False, server_default=sa.true())),
        ("payment_provider", sa.Column("payment_provider", sa.String(60), nullable=True)),
        ("provider_subscription_id", sa.Column("provider_subscription_id", sa.String(180), nullable=True)),
    ]:
        if name not in subscription_columns:
            op.add_column("subscriptions", column)
    subscription_uniques = {item["name"] for item in inspector.get_unique_constraints("subscriptions")}
    if "uq_subscription_provider_id" not in subscription_uniques:
        op.create_unique_constraint("uq_subscription_provider_id", "subscriptions", ["provider_subscription_id"])

    tables = set(inspector.get_table_names())
    if "subscription_payments" not in tables:
        op.create_table(
        "subscription_payments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("subscription_id", sa.String(36), sa.ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("plan_id", sa.String(36), sa.ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False, index=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="MAD"),
        sa.Column("payment_method", sa.String(24), nullable=False),
        sa.Column("payment_provider", sa.String(60), nullable=True),
        sa.Column("provider_payment_id", sa.String(180), nullable=True, unique=True),
        sa.Column("transaction_reference", sa.String(180), nullable=True, index=True),
        sa.Column("proof_url", sa.String(500), nullable=True),
        sa.Column("status", sa.String(24), nullable=False, server_default="pending", index=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("validated_by_super_admin_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
    if "subscription_reminder_logs" not in tables:
        op.create_table(
        "subscription_reminder_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("subscription_id", sa.String(36), sa.ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("reminder_type", sa.String(40), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("subscription_id", "reminder_type", "channel", "scheduled_for", name="uq_subscription_reminder"),
        )


def downgrade():
    op.drop_table("subscription_reminder_logs")
    op.drop_table("subscription_payments")
    op.drop_constraint("uq_subscription_provider_id", "subscriptions", type_="unique")
    for name in ["provider_subscription_id", "payment_provider", "auto_renew", "cancellation_reason", "cancelled_at", "grace_period_ends_at", "trial_ends_at", "trial_started_at"]:
        op.drop_column("subscriptions", name)
    op.drop_index("ix_subscription_plans_slug", table_name="subscription_plans")
    op.drop_constraint("uq_subscription_plan_slug", "subscription_plans", type_="unique")
    for name in ["display_order", "is_featured", "statistics_enabled", "cnss_enabled", "whatsapp_enabled", "max_patients", "max_secretaries", "max_doctors", "trial_days", "billing_interval", "currency", "description", "slug"]:
        op.drop_column("subscription_plans", name)
