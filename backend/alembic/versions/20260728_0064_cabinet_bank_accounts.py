"""cabinet bank accounts linked to payments

Revision ID: 20260728_0064
Revises: 20260728_0063
"""
from alembic import op
import sqlalchemy as sa


revision = "20260728_0064"
down_revision = "20260728_0063"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cabinet_bank_accounts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("bank_name", sa.String(120), nullable=False),
        sa.Column("account_holder", sa.String(180), nullable=False),
        sa.Column("rib", sa.String(32), nullable=False),
        sa.Column("iban", sa.String(34), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "label", name="uq_cabinet_bank_account_tenant_label"),
    )
    op.create_index("ix_cabinet_bank_accounts_tenant_id", "cabinet_bank_accounts", ["tenant_id"])
    op.create_index("ix_cabinet_bank_account_tenant_active", "cabinet_bank_accounts", ["tenant_id", "is_active"])
    op.add_column("payments", sa.Column("bank_account_id", sa.String(36), nullable=True))
    op.create_foreign_key("fk_payments_bank_account_id", "payments", "cabinet_bank_accounts", ["bank_account_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_payments_bank_account_id", "payments", ["bank_account_id"])


def downgrade() -> None:
    op.drop_index("ix_payments_bank_account_id", table_name="payments")
    op.drop_constraint("fk_payments_bank_account_id", "payments", type_="foreignkey")
    op.drop_column("payments", "bank_account_id")
    op.drop_table("cabinet_bank_accounts")
