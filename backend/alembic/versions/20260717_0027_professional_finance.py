"""professional finance core

Revision ID: 20260717_0027
Revises: 20260717_0026
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0027"
down_revision = "20260717_0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payment_methods",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("code", sa.String(60), nullable=False),
        sa.Column("main_type", sa.String(16), nullable=False),
        sa.Column("subtype", sa.String(32), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "name", name="uq_payment_method_tenant_name"),
    )
    op.create_index("ix_payment_methods_tenant_id", "payment_methods", ["tenant_id"])
    op.create_index("ix_payment_method_tenant_type_active", "payment_methods", ["tenant_id", "main_type", "is_active"])

    op.create_table(
        "payment_due_dates",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("invoice_id", sa.String(36), sa.ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("paid_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(32), nullable=False, server_default="A_VENIR"),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_payment_due_dates_tenant_id", "payment_due_dates", ["tenant_id"])
    op.create_index("ix_payment_due_dates_invoice_id", "payment_due_dates", ["invoice_id"])
    op.create_index("ix_payment_due_dates_due_date", "payment_due_dates", ["due_date"])
    op.create_index("ix_due_date_tenant_status_date", "payment_due_dates", ["tenant_id", "status", "due_date"])

    op.add_column("tenant_settings", sa.Column("patient_cin_required", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("tenant_settings", sa.Column("patient_cin_document_required", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("patient_profiles", sa.Column("cin", sa.String(40), nullable=True))
    op.add_column("patient_profiles", sa.Column("cin_document_url", sa.String(500), nullable=True))
    op.create_index("ix_patient_profiles_cin", "patient_profiles", ["cin"])

    op.add_column("payments", sa.Column("doctor_id", sa.String(36), sa.ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True))
    op.add_column("payments", sa.Column("payment_method_id", sa.String(36), sa.ForeignKey("payment_methods.id", ondelete="RESTRICT"), nullable=True))
    op.add_column("payments", sa.Column("status", sa.String(32), nullable=False, server_default="PAYE"))
    op.add_column("payments", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_payments_doctor_id", "payments", ["doctor_id"])
    op.create_index("ix_payments_payment_method_id", "payments", ["payment_method_id"])

    op.add_column("invoices", sa.Column("doctor_id", sa.String(36), sa.ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True))
    op.add_column("invoices", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("invoices", sa.Column("comment", sa.Text(), nullable=True))
    op.add_column("invoices", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_invoices_doctor_id", "invoices", ["doctor_id"])
    op.create_index("ix_invoices_due_date", "invoices", ["due_date"])
    op.execute("UPDATE invoices i SET doctor_id = f.doctor_id FROM fees f WHERE i.fee_id = f.id")

    op.execute("""
        INSERT INTO payment_methods (id, tenant_id, name, code, main_type, subtype, is_active)
        SELECT md5(t.id || seed.code), t.id, seed.name, seed.code, seed.main_type, seed.subtype, true
        FROM tenants t CROSS JOIN (VALUES
          ('Espèces','cash','ESPECE',NULL),
          ('Carte bancaire','card','BANQUE','CARTE'),
          ('Chèque','cheque','BANQUE','CHEQUE'),
          ('Virement bancaire','transfer','BANQUE','VIREMENT')
        ) AS seed(name,code,main_type,subtype)
    """)
    op.execute("UPDATE payments p SET payment_method_id = pm.id FROM payment_methods pm WHERE p.tenant_id = pm.tenant_id AND p.method = pm.code")


def downgrade() -> None:
    op.drop_index("ix_invoices_due_date", table_name="invoices")
    op.drop_index("ix_invoices_doctor_id", table_name="invoices")
    for column in ("updated_at", "comment", "due_date", "doctor_id"):
        op.drop_column("invoices", column)
    op.drop_index("ix_payments_payment_method_id", table_name="payments")
    op.drop_index("ix_payments_doctor_id", table_name="payments")
    for column in ("updated_at", "status", "payment_method_id", "doctor_id"):
        op.drop_column("payments", column)
    op.drop_index("ix_patient_profiles_cin", table_name="patient_profiles")
    op.drop_column("patient_profiles", "cin_document_url")
    op.drop_column("patient_profiles", "cin")
    op.drop_column("tenant_settings", "patient_cin_document_required")
    op.drop_column("tenant_settings", "patient_cin_required")
    op.drop_table("payment_due_dates")
    op.drop_table("payment_methods")
