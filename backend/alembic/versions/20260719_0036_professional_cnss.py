"""professional CNSS tracking

Revision ID: 20260719_0036
Revises: 20260719_0035
"""
from alembic import op
import sqlalchemy as sa

revision = "20260719_0036"
down_revision = "20260719_0035"
branch_labels = None
depends_on = None


def upgrade():
    additions = [
        sa.Column("fee_id", sa.String(36), sa.ForeignKey("fees.id", ondelete="SET NULL")),
        sa.Column("visit_id", sa.String(36), sa.ForeignKey("visits.id", ondelete="SET NULL")),
        sa.Column("label", sa.String(180), nullable=False, server_default="Dossier CNSS"),
        sa.Column("description", sa.Text()),
        sa.Column("requested_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("reimbursed_amount", sa.Numeric(12, 2)),
        sa.Column("deposit_date", sa.Date()),
        sa.Column("reimbursement_date", sa.Date()),
        sa.Column("rejection_reason", sa.Text()),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("updated_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    ]
    for column in additions:
        op.add_column("cnss_cases", column)
    for column in ("fee_id", "visit_id"):
        op.create_index(f"ix_cnss_cases_{column}", "cnss_cases", [column])
    op.execute("UPDATE cnss_cases SET status='a_constituer' WHERE status='pending'")
    op.execute("UPDATE cnss_cases SET status='en_cours' WHERE status='in_progress'")
    op.create_table("cnss_status_history", sa.Column("id",sa.String(36),primary_key=True),sa.Column("tenant_id",sa.String(36),sa.ForeignKey("tenants.id",ondelete="CASCADE"),nullable=False),sa.Column("cnss_case_id",sa.String(36),sa.ForeignKey("cnss_cases.id",ondelete="CASCADE"),nullable=False),sa.Column("old_status",sa.String(32)),sa.Column("new_status",sa.String(32),nullable=False),sa.Column("changed_by_user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="SET NULL")),sa.Column("comment",sa.Text()),sa.Column("changed_at",sa.DateTime(timezone=True),server_default=sa.func.now()))
    for column in ("tenant_id","cnss_case_id","changed_at"): op.create_index(f"ix_cnss_status_history_{column}","cnss_status_history",[column])
    op.create_table("patient_notifications",sa.Column("id",sa.String(36),primary_key=True),sa.Column("tenant_id",sa.String(36),sa.ForeignKey("tenants.id",ondelete="CASCADE"),nullable=False),sa.Column("patient_id",sa.String(36),sa.ForeignKey("patient_profiles.id",ondelete="CASCADE"),nullable=False),sa.Column("notification_type",sa.String(40),nullable=False),sa.Column("title",sa.String(180),nullable=False),sa.Column("message",sa.Text(),nullable=False),sa.Column("resource_id",sa.String(36)),sa.Column("read_at",sa.DateTime(timezone=True)),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now()))
    for column in ("tenant_id","patient_id","notification_type","resource_id","created_at"): op.create_index(f"ix_patient_notifications_{column}","patient_notifications",[column])


def downgrade():
    op.drop_table("patient_notifications"); op.drop_table("cnss_status_history")
    for column in ("updated_at","updated_by_user_id","created_by_user_id","rejection_reason","reimbursement_date","deposit_date","reimbursed_amount","requested_amount","description","label","visit_id","fee_id"):
        op.drop_column("cnss_cases",column)
