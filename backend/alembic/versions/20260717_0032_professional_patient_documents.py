"""professional patient document management

Revision ID: 20260717_0032
Revises: 20260717_0031
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0032"
down_revision = "20260717_0031"
branch_labels = None
depends_on = None

DEFAULT_CATEGORIES = (
    ("Analyses médicales", "ANALYSE", "MEDICAL", 10),
    ("Radiologie et imagerie", "RADIOLOGIE", "MEDICAL", 20),
    ("Ordonnances", "ORDONNANCE", "MEDICAL", 30),
    ("Comptes rendus", "COMPTE_RENDU", "MEDICAL", 40),
    ("Courriers médicaux", "COURRIER_MEDICAL", "MEDICAL", 50),
    ("Certificats", "CERTIFICAT", "MEDICAL", 60),
    ("Pièces CNSS", "CNSS", "ADMINISTRATIF", 70),
    ("Assurance", "ASSURANCE", "ADMINISTRATIF", 80),
    ("Identité", "IDENTITE", "ADMINISTRATIF", 90),
    ("Consentements", "CONSENTEMENT", "ADMINISTRATIF", 100),
    ("Factures", "FACTURE", "ADMINISTRATIF", 110),
    ("Reçus", "RECU", "ADMINISTRATIF", 120),
    ("Autres documents", "AUTRE", "ADMINISTRATIF", 130),
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "document_categories" not in inspector.get_table_names():
        op.create_table(
            "document_categories",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
            sa.Column("name", sa.String(120), nullable=False),
            sa.Column("code", sa.String(60), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("category_type", sa.String(24), nullable=False, server_default="MEDICAL"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.UniqueConstraint("tenant_id", "code", name="uq_document_category_tenant_code"),
        )
        op.create_index("ix_document_categories_tenant_id", "document_categories", ["tenant_id"])
        op.create_index("ix_document_categories_code", "document_categories", ["code"])

    columns = {column["name"] for column in sa.inspect(bind).get_columns("medical_documents")}
    additions = {
        "doctor_id": sa.Column("doctor_id", sa.String(36), sa.ForeignKey("doctor_profiles.id", ondelete="SET NULL")),
        "appointment_id": sa.Column("appointment_id", sa.String(36), sa.ForeignKey("appointments.id", ondelete="SET NULL")),
        "fee_id": sa.Column("fee_id", sa.String(36), sa.ForeignKey("fees.id", ondelete="SET NULL")),
        "invoice_id": sa.Column("invoice_id", sa.String(36), sa.ForeignKey("invoices.id", ondelete="SET NULL")),
        "category_id": sa.Column("category_id", sa.String(36), sa.ForeignKey("document_categories.id", ondelete="SET NULL")),
        "description": sa.Column("description", sa.Text()),
        "original_filename": sa.Column("original_filename", sa.String(255)),
        "stored_filename": sa.Column("stored_filename", sa.String(255)),
        "extension": sa.Column("extension", sa.String(16)),
        "status": sa.Column("status", sa.String(24), nullable=False, server_default="ACTIF"),
        "confidential": sa.Column("confidential", sa.Boolean(), nullable=False, server_default=sa.false()),
        "document_date": sa.Column("document_date", sa.Date()),
        "version": sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        "parent_document_id": sa.Column("parent_document_id", sa.String(36), sa.ForeignKey("medical_documents.id", ondelete="SET NULL")),
        "updated_by_user_id": sa.Column("updated_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
        "archived_at": sa.Column("archived_at", sa.DateTime(timezone=True)),
    }
    for name, column in additions.items():
        if name not in columns:
            op.add_column("medical_documents", column)
    indexes = {index["name"] for index in sa.inspect(bind).get_indexes("medical_documents")}
    for column in ("doctor_id", "appointment_id", "fee_id", "invoice_id", "category_id", "document_date", "parent_document_id", "archived_at"):
        name = f"ix_medical_documents_{column}"
        if name not in indexes:
            op.create_index(name, "medical_documents", [column])

    category_table = sa.table("document_categories", sa.column("id", sa.String), sa.column("tenant_id", sa.String), sa.column("name", sa.String), sa.column("code", sa.String), sa.column("category_type", sa.String), sa.column("is_active", sa.Boolean), sa.column("display_order", sa.Integer))
    op.bulk_insert(category_table, [{"id": f"global-document-{index:02d}", "tenant_id": None, "name": name, "code": code, "category_type": kind, "is_active": True, "display_order": order} for index, (name, code, kind, order) in enumerate(DEFAULT_CATEGORIES, 1)])


def downgrade() -> None:
    for column in ("archived_at", "parent_document_id", "document_date", "category_id", "invoice_id", "fee_id", "appointment_id", "doctor_id"):
        op.drop_index(f"ix_medical_documents_{column}", table_name="medical_documents")
    for column in ("archived_at", "updated_by_user_id", "parent_document_id", "version", "document_date", "confidential", "status", "extension", "stored_filename", "original_filename", "description", "category_id", "invoice_id", "fee_id", "appointment_id", "doctor_id"):
        op.drop_column("medical_documents", column)
    op.drop_table("document_categories")
