"""add VAT details to fees

Revision ID: 20260717_0022
Revises: 20260716_0021
"""

from alembic import op
import sqlalchemy as sa


revision = "20260717_0022"
down_revision = "20260716_0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("fees", sa.Column("amount_ht", sa.Numeric(12, 2), nullable=True))
    op.add_column("fees", sa.Column("tax_rate", sa.Numeric(5, 2), nullable=False, server_default="0"))
    op.add_column("fees", sa.Column("tax_amount", sa.Numeric(12, 2), nullable=False, server_default="0"))
    op.execute("UPDATE fees SET amount_ht = amount WHERE amount_ht IS NULL")
    op.alter_column("fees", "amount_ht", nullable=False)


def downgrade() -> None:
    op.drop_column("fees", "tax_amount")
    op.drop_column("fees", "tax_rate")
    op.drop_column("fees", "amount_ht")
