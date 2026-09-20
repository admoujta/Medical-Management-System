"""scanned patient documents

Revision ID: 20260717_0031
Revises: 20260717_0030
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0031"
down_revision = "20260717_0030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Some development databases are initialized through SQLAlchemy metadata
    # before Alembic runs. Keep this migration safe for both existing and new
    # installations without masking unrelated database errors.
    inspector = sa.inspect(op.get_bind())
    existing_columns = {column["name"] for column in inspector.get_columns("medical_documents")}
    columns = {
        "visit_id": sa.Column("visit_id", sa.String(36), sa.ForeignKey("visits.id", ondelete="SET NULL"), nullable=True),
        "cnss_case_id": sa.Column("cnss_case_id", sa.String(36), sa.ForeignKey("cnss_cases.id", ondelete="SET NULL"), nullable=True),
        "mime_type": sa.Column("mime_type", sa.String(120), nullable=True),
        "file_size": sa.Column("file_size", sa.Integer(), nullable=True),
        "source": sa.Column("source", sa.String(32), nullable=False, server_default="upload_manuel"),
        "scanned_at": sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=True),
        "created_by_user_id": sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        "updated_at": sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    }
    for name, column in columns.items():
        if name not in existing_columns:
            op.add_column("medical_documents", column)

    existing_indexes = {index["name"] for index in sa.inspect(op.get_bind()).get_indexes("medical_documents")}
    if "ix_medical_documents_visit_id" not in existing_indexes:
        op.create_index("ix_medical_documents_visit_id", "medical_documents", ["visit_id"])
    if "ix_medical_documents_cnss_case_id" not in existing_indexes:
        op.create_index("ix_medical_documents_cnss_case_id", "medical_documents", ["cnss_case_id"])


def downgrade() -> None:
    op.drop_index("ix_medical_documents_cnss_case_id", table_name="medical_documents")
    op.drop_index("ix_medical_documents_visit_id", table_name="medical_documents")
    for column in ("updated_at", "created_by_user_id", "scanned_at", "source", "file_size", "mime_type", "cnss_case_id", "visit_id"):
        op.drop_column("medical_documents", column)
