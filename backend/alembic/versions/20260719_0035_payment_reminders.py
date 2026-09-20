"""patient payment reminders

Revision ID: 20260719_0035
Revises: 20260718_0034
"""
from alembic import op
import sqlalchemy as sa

revision = "20260719_0035"
down_revision = "20260718_0034"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "payment_reminders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fee_id", sa.String(36), sa.ForeignKey("fees.id", ondelete="SET NULL")),
        sa.Column("due_date_id", sa.String(36), sa.ForeignKey("payment_due_dates.id", ondelete="SET NULL")),
        sa.Column("amount_due", sa.Numeric(12, 2), nullable=False),
        sa.Column("channel", sa.String(24), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="ENVOYEE"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True)),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    for column in ("tenant_id", "patient_id", "fee_id", "due_date_id"):
        op.create_index(f"ix_payment_reminders_{column}", "payment_reminders", [column])
    op.create_index("ix_payment_reminder_tenant_patient_created", "payment_reminders", ["tenant_id", "patient_id", "created_at"])


def downgrade():
    op.drop_table("payment_reminders")
