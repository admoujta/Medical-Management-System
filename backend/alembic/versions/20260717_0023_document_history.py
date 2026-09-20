"""link document operations to history

Revision ID: 20260717_0023
Revises: 20260717_0022
"""

from alembic import op
import sqlalchemy as sa

revision = "20260717_0023"
down_revision = "20260717_0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("operation_history", sa.Column("document_id", sa.String(36), nullable=True))
    op.create_index("ix_operation_history_document_id", "operation_history", ["document_id"])
    op.create_foreign_key("fk_operation_history_document_id", "operation_history", "medical_documents", ["document_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_operation_history_document_id", "operation_history", type_="foreignkey")
    op.drop_index("ix_operation_history_document_id", table_name="operation_history")
    op.drop_column("operation_history", "document_id")
