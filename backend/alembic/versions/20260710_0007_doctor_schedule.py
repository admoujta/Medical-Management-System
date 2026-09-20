"""doctor schedule and availability

Revision ID: 20260710_0007
Revises: 20260710_0006
"""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "20260710_0007"
down_revision: str | None = "20260710_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table("doctor_schedule_configs",
        sa.Column("id", sa.String(36), primary_key=True), sa.Column("tenant_id", sa.String(36), nullable=False),
        sa.Column("doctor_id", sa.String(36), nullable=False, unique=True), sa.Column("default_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("minimum_booking_delay_minutes", sa.Integer(), nullable=False), sa.Column("maximum_appointments_per_day", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["doctor_id"], ["doctor_profiles.id"], ondelete="CASCADE"))
    op.create_index("ix_schedule_configs_tenant", "doctor_schedule_configs", ["tenant_id"])
    op.create_table("doctor_schedules",
        sa.Column("id", sa.String(36), primary_key=True), sa.Column("tenant_id", sa.String(36), nullable=False), sa.Column("doctor_id", sa.String(36), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False), sa.Column("is_working", sa.Boolean(), nullable=False), sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True), sa.Column("break_start_time", sa.Time(), nullable=True), sa.Column("break_end_time", sa.Time(), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["doctor_id"], ["doctor_profiles.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("doctor_id", "weekday", name="uq_doctor_schedule_weekday"))
    op.create_index("ix_doctor_schedules_tenant", "doctor_schedules", ["tenant_id"])
    op.create_table("doctor_time_offs",
        sa.Column("id", sa.String(36), primary_key=True), sa.Column("tenant_id", sa.String(36), nullable=False), sa.Column("doctor_id", sa.String(36), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False), sa.Column("end_date", sa.Date(), nullable=False), sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["doctor_id"], ["doctor_profiles.id"], ondelete="CASCADE"))
    op.create_index("ix_doctor_time_offs_tenant", "doctor_time_offs", ["tenant_id"])
    op.create_table("blocked_slots",
        sa.Column("id", sa.String(36), primary_key=True), sa.Column("tenant_id", sa.String(36), nullable=False), sa.Column("doctor_id", sa.String(36), nullable=False),
        sa.Column("date", sa.Date(), nullable=False), sa.Column("start_time", sa.Time(), nullable=False), sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["doctor_id"], ["doctor_profiles.id"], ondelete="CASCADE"))
    op.create_index("ix_blocked_slots_tenant", "blocked_slots", ["tenant_id"])


def downgrade() -> None:
    op.drop_table("blocked_slots")
    op.drop_table("doctor_time_offs")
    op.drop_table("doctor_schedules")
    op.drop_table("doctor_schedule_configs")
