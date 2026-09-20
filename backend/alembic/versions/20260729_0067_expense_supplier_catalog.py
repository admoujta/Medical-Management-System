"""expense supplier catalog and detailed lines

Revision ID: 20260729_0067
Revises: 20260729_0066
"""
from alembic import op
import sqlalchemy as sa

revision = "20260729_0067"
down_revision = "20260729_0066"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "expense_suppliers",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("supplier_type", sa.String(80), nullable=False),
        sa.Column("tax_id", sa.String(80), nullable=True),
        sa.Column("phone", sa.String(40), nullable=True),
        sa.Column("email", sa.String(180), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "name", name="uq_expense_supplier_tenant_name"),
    )
    op.create_index("ix_expense_suppliers_tenant_id", "expense_suppliers", ["tenant_id"])
    op.create_table(
        "supplier_products",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("supplier_id", sa.String(36), sa.ForeignKey("expense_suppliers.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("unit", sa.String(40), nullable=False, server_default="unité"),
        sa.Column("default_unit_price_ht", sa.Numeric(12, 2), nullable=False),
        sa.Column("tax_rate", sa.Numeric(5, 2), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("supplier_id", "name", name="uq_supplier_product_name"),
    )
    op.create_index("ix_supplier_products_tenant_id", "supplier_products", ["tenant_id"])
    op.create_index("ix_supplier_products_supplier_id", "supplier_products", ["supplier_id"])
    op.add_column("expenses", sa.Column("supplier_id", sa.String(36), nullable=True))
    op.create_foreign_key("fk_expenses_supplier_id", "expenses", "expense_suppliers", ["supplier_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_expenses_supplier_id", "expenses", ["supplier_id"])
    op.add_column("expenses", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("expenses", sa.Column("items", sa.JSON(), nullable=True))
    op.add_column("expenses", sa.Column("amount_ht", sa.Numeric(12, 2), nullable=True))
    op.add_column("expenses", sa.Column("tax_amount", sa.Numeric(12, 2), nullable=True))
    op.add_column("expenses", sa.Column("amount_ttc", sa.Numeric(12, 2), nullable=True))
    op.execute("UPDATE expenses SET amount_ht=amount, tax_amount=0, amount_ttc=amount")

def downgrade() -> None:
    for name in ("amount_ttc", "tax_amount", "amount_ht", "items", "description"):
        op.drop_column("expenses", name)
    op.drop_index("ix_expenses_supplier_id", table_name="expenses")
    op.drop_constraint("fk_expenses_supplier_id", "expenses", type_="foreignkey")
    op.drop_column("expenses", "supplier_id")
    op.drop_table("supplier_products")
    op.drop_table("expense_suppliers")
