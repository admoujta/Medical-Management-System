"""professional prescriptions, pdf archive and audit

Revision ID: 20260717_0033
Revises: 20260717_0032
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0033"
down_revision = "20260717_0032"
branch_labels = None
depends_on = None


def _add(table: str, column: sa.Column) -> None:
    names = {item["name"] for item in sa.inspect(op.get_bind()).get_columns(table)}
    if column.name not in names: op.add_column(table, column)


def _index(table: str, column: str) -> None:
    name = f"ix_{table}_{column}"
    if name not in {item["name"] for item in sa.inspect(op.get_bind()).get_indexes(table)}:
        op.create_index(name, table, [column])


def upgrade() -> None:
    _add("tenants", sa.Column("website", sa.String(255)))
    _add("tenants", sa.Column("tax_identifier", sa.String(80)))
    _add("tenants", sa.Column("ice", sa.String(80)))
    _add("doctor_profiles", sa.Column("professional_phone", sa.String(40)))
    _add("doctor_profiles", sa.Column("professional_number", sa.String(80)))
    _add("doctor_profiles", sa.Column("signature_url", sa.String(500)))
    _add("prescriptions", sa.Column("appointment_id", sa.String(36), sa.ForeignKey("appointments.id", ondelete="SET NULL")))
    _add("prescriptions", sa.Column("visit_id", sa.String(36), sa.ForeignKey("visits.id", ondelete="SET NULL")))
    _add("prescriptions", sa.Column("prescription_number", sa.String(80)))
    _add("prescriptions", sa.Column("items", sa.JSON()))
    _add("prescriptions", sa.Column("consultation_date", sa.Date()))
    _add("prescriptions", sa.Column("location", sa.String(120)))
    _add("prescriptions", sa.Column("pdf_document_id", sa.String(36), sa.ForeignKey("medical_documents.id", ondelete="SET NULL")))
    _add("prescriptions", sa.Column("updated_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")))
    _add("prescriptions", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.execute("UPDATE prescriptions SET prescription_number = 'ORD-' || to_char(created_at, 'YYYY') || '-' || upper(substr(replace(id, '-', ''), 1, 8)) WHERE prescription_number IS NULL")
    op.alter_column("prescriptions", "prescription_number", nullable=False)
    for column in ("appointment_id", "visit_id", "prescription_number", "pdf_document_id"): _index("prescriptions", column)
    _add("operation_history", sa.Column("prescription_id", sa.String(36), sa.ForeignKey("prescriptions.id", ondelete="SET NULL")))
    _index("operation_history", "prescription_id")


def downgrade() -> None:
    op.drop_index("ix_operation_history_prescription_id", table_name="operation_history"); op.drop_column("operation_history", "prescription_id")
    for column in ("pdf_document_id", "prescription_number", "visit_id", "appointment_id"): op.drop_index(f"ix_prescriptions_{column}", table_name="prescriptions")
    for column in ("updated_at", "updated_by_user_id", "pdf_document_id", "location", "consultation_date", "items", "prescription_number", "visit_id", "appointment_id"): op.drop_column("prescriptions", column)
    for column in ("signature_url", "professional_number", "professional_phone"): op.drop_column("doctor_profiles", column)
    for column in ("ice", "tax_identifier", "website"): op.drop_column("tenants", column)
