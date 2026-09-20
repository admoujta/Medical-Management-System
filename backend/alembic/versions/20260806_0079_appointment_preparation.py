"""Add secretary-to-doctor appointment preparation workflow.

Revision ID: 20260806_0079
Revises: 20260806_0078
"""
from alembic import op
import sqlalchemy as sa


revision = "20260806_0079"
down_revision = "20260806_0078"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "appointment_preparations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("appointment_id", sa.String(length=36), nullable=False),
        sa.Column("patient_id", sa.String(length=36), nullable=False),
        sa.Column("chief_complaint", sa.Text(), nullable=True),
        sa.Column("reported_allergies", sa.JSON(), nullable=False),
        sa.Column("reported_treatments", sa.JSON(), nullable=False),
        sa.Column("blood_pressure", sa.String(length=40), nullable=True),
        sa.Column("temperature", sa.String(length=20), nullable=True),
        sa.Column("weight", sa.String(length=20), nullable=True),
        sa.Column("height", sa.String(length=20), nullable=True),
        sa.Column("reception_notes", sa.Text(), nullable=True),
        sa.Column("doctor_diagnosis", sa.String(length=240), nullable=True),
        sa.Column("next_step", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False),
        sa.Column("recorded_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("validated_by_user_id", sa.String(length=36), nullable=True),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recorded_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["validated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("appointment_id"),
    )
    op.create_index("ix_appointment_preparations_tenant_id", "appointment_preparations", ["tenant_id"])
    op.create_index("ix_appointment_preparations_appointment_id", "appointment_preparations", ["appointment_id"], unique=True)
    op.create_index("ix_appointment_preparations_patient_id", "appointment_preparations", ["patient_id"])


def downgrade() -> None:
    op.drop_index("ix_appointment_preparations_patient_id", table_name="appointment_preparations")
    op.drop_index("ix_appointment_preparations_appointment_id", table_name="appointment_preparations")
    op.drop_index("ix_appointment_preparations_tenant_id", table_name="appointment_preparations")
    op.drop_table("appointment_preparations")
