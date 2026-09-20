"""payment receipt and invoice documents

Revision ID: 20260717_0030
Revises: 20260717_0029
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0030"
down_revision = "20260717_0029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payment_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fee_id", sa.String(36), sa.ForeignKey("fees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payment_id", sa.String(36), sa.ForeignKey("payments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("document_type", sa.String(16), nullable=False),
        sa.Column("document_number", sa.String(60), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("generated_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "document_number", name="uq_payment_document_tenant_number"),
    )
    for column in ("tenant_id", "patient_id", "fee_id", "payment_id", "document_type"):
        op.create_index(f"ix_payment_documents_{column}", "payment_documents", [column])


def downgrade() -> None:
    op.drop_table("payment_documents")
