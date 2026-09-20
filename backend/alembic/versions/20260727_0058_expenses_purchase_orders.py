"""expenses and purchase orders

Revision ID: 20260727_0058
Revises: 20260727_0057
"""
from alembic import op
import sqlalchemy as sa

revision = "20260727_0058"
down_revision = "20260727_0057"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expenses",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(180), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("expense_type", sa.String(16), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("supplier", sa.String(180)),
        sa.Column("payment_method", sa.String(60)),
        sa.Column("reference", sa.String(120)),
        sa.Column("note", sa.Text()),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_expense_tenant_date_category", "expenses", ["tenant_id", "expense_date", "category"])
    op.create_table(
        "purchase_orders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_number", sa.String(60), nullable=False),
        sa.Column("supplier", sa.String(180), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("order_date", sa.Date(), nullable=False),
        sa.Column("expected_date", sa.Date()),
        sa.Column("status", sa.String(24), nullable=False, server_default="BROUILLON"),
        sa.Column("note", sa.Text()),
        sa.Column("created_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "order_number", name="uq_purchase_order_tenant_number"),
    )
    op.create_index("ix_purchase_order_tenant_status_date", "purchase_orders", ["tenant_id", "status", "order_date"])


def downgrade() -> None:
    op.drop_table("purchase_orders")
    op.drop_table("expenses")
