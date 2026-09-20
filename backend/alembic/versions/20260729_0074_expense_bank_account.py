"""Link expenses to cabinet bank accounts

Revision ID: 20260729_0074
Revises: 20260729_0073
"""
from alembic import op
import sqlalchemy as sa


revision = "20260729_0074"
down_revision = "20260729_0073"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("expenses", sa.Column("bank_account_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_expenses_bank_account_id",
        "expenses",
        "cabinet_bank_accounts",
        ["bank_account_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_expenses_bank_account_id", "expenses", ["bank_account_id"])


def downgrade() -> None:
    op.drop_index("ix_expenses_bank_account_id", table_name="expenses")
    op.drop_constraint("fk_expenses_bank_account_id", "expenses", type_="foreignkey")
    op.drop_column("expenses", "bank_account_id")
