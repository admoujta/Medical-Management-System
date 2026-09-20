"""CNSS deposit deadlines and patient reminder preference

Revision ID: 20260729_0068
Revises: 20260729_0067
"""
from alembic import op
import sqlalchemy as sa


revision = "20260729_0068"
down_revision = "20260729_0067"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cnss_cases", sa.Column("deposit_deadline", sa.Date(), nullable=True))
    op.create_index("ix_cnss_cases_deposit_deadline", "cnss_cases", ["deposit_deadline"])
    op.add_column(
        "patient_profiles",
        sa.Column("cnss_deposit_reminder_days", sa.Integer(), nullable=False, server_default="3"),
    )
    op.execute(
        "UPDATE cnss_cases SET deposit_deadline = (created_at::date + INTERVAL '30 days')::date "
        "WHERE deposit_deadline IS NULL"
    )


def downgrade() -> None:
    op.drop_column("patient_profiles", "cnss_deposit_reminder_days")
    op.drop_index("ix_cnss_cases_deposit_deadline", table_name="cnss_cases")
    op.drop_column("cnss_cases", "deposit_deadline")
