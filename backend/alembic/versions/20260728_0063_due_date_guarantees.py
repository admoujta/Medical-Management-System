"""due date guarantees and supporting documents

Revision ID: 20260728_0063
Revises: 20260728_0062
"""
from alembic import op
import sqlalchemy as sa


revision = "20260728_0063"
down_revision = "20260728_0062"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payment_due_dates", sa.Column("guarantee_type", sa.String(16), nullable=False, server_default="NORMAL"))
    op.add_column("payment_due_dates", sa.Column("guarantor_name", sa.String(180), nullable=True))
    op.add_column("payment_due_dates", sa.Column("guarantor_cin", sa.String(40), nullable=True))
    op.add_column("payment_due_dates", sa.Column("guarantee_cheque_bank", sa.String(120), nullable=True))
    op.add_column("payment_due_dates", sa.Column("guarantee_cheque_number", sa.String(80), nullable=True))
    op.add_column("payment_due_dates", sa.Column("guarantee_cheque_issue_date", sa.Date(), nullable=True))
    op.add_column("payment_due_dates", sa.Column("guarantee_cheque_due_date", sa.Date(), nullable=True))
    op.create_table(
        "payment_due_date_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("due_date_id", sa.String(36), sa.ForeignKey("payment_due_dates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_type", sa.String(24), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(120), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_payment_due_date_documents_tenant_id", "payment_due_date_documents", ["tenant_id"])
    op.create_index("ix_payment_due_date_documents_due_date_id", "payment_due_date_documents", ["due_date_id"])
    op.create_index("ix_payment_due_date_documents_patient_id", "payment_due_date_documents", ["patient_id"])
    op.create_index("ix_payment_due_date_documents_document_type", "payment_due_date_documents", ["document_type"])
    op.create_index("ix_due_date_document_tenant_due", "payment_due_date_documents", ["tenant_id", "due_date_id"])


def downgrade() -> None:
    op.drop_table("payment_due_date_documents")
    for column in (
        "guarantee_cheque_due_date",
        "guarantee_cheque_issue_date",
        "guarantee_cheque_number",
        "guarantee_cheque_bank",
        "guarantor_cin",
        "guarantor_name",
        "guarantee_type",
    ):
        op.drop_column("payment_due_dates", column)
