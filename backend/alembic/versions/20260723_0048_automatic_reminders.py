"""automatic appointment, payment and CNSS reminders

Revision ID: 20260723_0048
Revises: 20260722_0047
"""

from alembic import op
import sqlalchemy as sa


revision = "20260723_0048"
down_revision = "20260722_0047"
branch_labels = None
depends_on = None


def upgrade():
    # Existing tenants receive an empty object. Pydantic applies the professional
    # J-1 defaults on read, and the first save persists the complete structure.
    op.add_column("tenant_settings", sa.Column(
        "reminder_settings", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")
    ))
    op.add_column("appointments", sa.Column("reminder_enabled", sa.Boolean(), nullable=True))
    op.add_column("appointments", sa.Column("reminder_offset_minutes", sa.Integer(), nullable=True))
    op.add_column("appointments", sa.Column("reminder_channels", sa.JSON(), nullable=True))
    op.create_table(
        "automatic_reminder_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(32), nullable=False),
        sa.Column("entity_id", sa.String(36), nullable=False),
        sa.Column("rule_key", sa.String(100), nullable=False),
        sa.Column("channel", sa.String(24), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="EN_ATTENTE"),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("error_message", sa.Text()),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "rule_key", "entity_type", "entity_id", "channel", name="uq_auto_reminder_delivery"),
    )
    op.create_index("ix_automatic_reminder_logs_tenant_id", "automatic_reminder_logs", ["tenant_id"])
    op.create_index("ix_automatic_reminder_logs_patient_id", "automatic_reminder_logs", ["patient_id"])
    op.create_index("ix_auto_reminder_tenant_created", "automatic_reminder_logs", ["tenant_id", "created_at"])


def downgrade():
    op.drop_table("automatic_reminder_logs")
    op.drop_column("appointments", "reminder_channels")
    op.drop_column("appointments", "reminder_offset_minutes")
    op.drop_column("appointments", "reminder_enabled")
    op.drop_column("tenant_settings", "reminder_settings")
