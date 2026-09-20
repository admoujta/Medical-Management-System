"""Add cabinet-scoped patient medical summaries.

Revision ID: 20260806_0078
Revises: 20260804_0077
"""
from alembic import op
import sqlalchemy as sa


revision = "20260806_0078"
down_revision = "20260804_0077"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patient_medical_summaries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("primary_condition", sa.String(length=240), nullable=True),
        sa.Column("active_conditions", sa.JSON(), nullable=False),
        sa.Column("allergies", sa.JSON(), nullable=False),
        sa.Column("current_treatments", sa.JSON(), nullable=False),
        sa.Column("next_step", sa.Text(), nullable=True),
        sa.Column("updated_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "patient_id", name="uq_patient_medical_summary_tenant_patient"),
    )
    op.create_index("ix_patient_medical_summaries_tenant_id", "patient_medical_summaries", ["tenant_id"])
    op.create_index("ix_patient_medical_summaries_patient_id", "patient_medical_summaries", ["patient_id"])


def downgrade() -> None:
    op.drop_index("ix_patient_medical_summaries_patient_id", table_name="patient_medical_summaries")
    op.drop_index("ix_patient_medical_summaries_tenant_id", table_name="patient_medical_summaries")
    op.drop_table("patient_medical_summaries")
