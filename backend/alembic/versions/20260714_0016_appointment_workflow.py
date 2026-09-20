"""professional appointment workflow, billing and history

Revision ID: 20260714_0016
Revises: 20260713_0015
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260714_0016"
down_revision: str | None = "20260713_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("actual_start_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("actual_end_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("duration_seconds", sa.Integer(), nullable=True))
    op.add_column("appointments", sa.Column("started_by_user_id", sa.String(36), nullable=True))
    op.add_column("appointments", sa.Column("ended_by_user_id", sa.String(36), nullable=True))
    op.create_foreign_key("fk_appointment_started_by", "appointments", "users", ["started_by_user_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_appointment_ended_by", "appointments", "users", ["ended_by_user_id"], ["id"], ondelete="SET NULL")

    op.add_column("visits", sa.Column("actual_start_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("visits", sa.Column("actual_end_time", sa.DateTime(timezone=True), nullable=True))
    op.add_column("visits", sa.Column("duration_seconds", sa.Integer(), nullable=True))
    op.add_column("visits", sa.Column("created_by_user_id", sa.String(36), nullable=True))
    op.create_foreign_key("fk_visit_created_by", "visits", "users", ["created_by_user_id"], ["id"], ondelete="SET NULL")

    for name, column in [
        ("doctor_id", sa.Column("doctor_id", sa.String(36), nullable=True)),
        ("title", sa.Column("title", sa.String(180), nullable=False, server_default="Consultation")),
        ("description", sa.Column("description", sa.Text(), nullable=True)),
        ("fee_type", sa.Column("fee_type", sa.String(50), nullable=False, server_default="CONSULTATION")),
        ("created_by_user_id", sa.Column("created_by_user_id", sa.String(36), nullable=True)),
    ]:
        op.add_column("fees", column)
    op.create_foreign_key("fk_fee_doctor", "fees", "doctor_profiles", ["doctor_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_fee_created_by", "fees", "users", ["created_by_user_id"], ["id"], ondelete="SET NULL")

    op.create_table("honoraire_visits",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fee_id", sa.String(36), sa.ForeignKey("fees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("visit_id", sa.String(36), sa.ForeignKey("visits.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("fee_id", "visit_id", name="uq_honoraire_visit"))
    op.create_index("ix_honoraire_visits_tenant_id", "honoraire_visits", ["tenant_id"])

    op.create_table("invoices",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fee_id", sa.String(36), sa.ForeignKey("fees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("invoice_number", sa.String(60), nullable=False),
        sa.Column("amount_total", sa.Numeric(12, 2), nullable=False),
        sa.Column("amount_paid", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("amount_due", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="UNPAID"),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.UniqueConstraint("tenant_id", "invoice_number", name="uq_invoice_tenant_number"))
    for column in ("tenant_id", "patient_id", "fee_id"):
        op.create_index(f"ix_invoices_{column}", "invoices", [column])

    op.add_column("payments", sa.Column("invoice_id", sa.String(36), nullable=True))
    op.add_column("payments", sa.Column("note", sa.Text(), nullable=True))
    op.add_column("payments", sa.Column("created_by_user_id", sa.String(36), nullable=True))
    op.create_foreign_key("fk_payment_invoice", "payments", "invoices", ["invoice_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_payment_created_by", "payments", "users", ["created_by_user_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_payments_invoice_id", "payments", ["invoice_id"])

    op.create_table("operation_history",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("appointment_id", sa.String(36), sa.ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("visit_id", sa.String(36), sa.ForeignKey("visits.id", ondelete="SET NULL"), nullable=True),
        sa.Column("fee_id", sa.String(36), sa.ForeignKey("fees.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invoice_id", sa.String(36), sa.ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True),
        sa.Column("payment_id", sa.String(36), sa.ForeignKey("payments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action_type", sa.String(80), nullable=False),
        sa.Column("old_value", sa.JSON(), nullable=True),
        sa.Column("new_value", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    for column in ("tenant_id", "user_id", "patient_id", "appointment_id", "visit_id", "fee_id", "invoice_id", "payment_id", "action_type", "created_at"):
        op.create_index(f"ix_operation_history_{column}", "operation_history", [column])


def downgrade() -> None:
    op.drop_table("operation_history")
    op.drop_index("ix_payments_invoice_id", table_name="payments")
    op.drop_constraint("fk_payment_created_by", "payments", type_="foreignkey")
    op.drop_constraint("fk_payment_invoice", "payments", type_="foreignkey")
    for column in ("created_by_user_id", "note", "invoice_id"):
        op.drop_column("payments", column)
    op.drop_table("invoices")
    op.drop_table("honoraire_visits")
    op.drop_constraint("fk_fee_created_by", "fees", type_="foreignkey")
    op.drop_constraint("fk_fee_doctor", "fees", type_="foreignkey")
    for column in ("created_by_user_id", "fee_type", "description", "title", "doctor_id"):
        op.drop_column("fees", column)
    op.drop_constraint("fk_visit_created_by", "visits", type_="foreignkey")
    for column in ("created_by_user_id", "duration_seconds", "actual_end_time", "actual_start_time"):
        op.drop_column("visits", column)
    op.drop_constraint("fk_appointment_ended_by", "appointments", type_="foreignkey")
    op.drop_constraint("fk_appointment_started_by", "appointments", type_="foreignkey")
    for column in ("ended_by_user_id", "started_by_user_id", "duration_seconds", "actual_end_time", "actual_start_time"):
        op.drop_column("appointments", column)
