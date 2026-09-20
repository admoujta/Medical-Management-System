"""complete cheque payment details

Revision ID: 20260717_0025
Revises: 20260717_0024
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0025"
down_revision = "20260717_0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("cheque_bank", sa.String(120), nullable=True))
    op.add_column("payments", sa.Column("cheque_number", sa.String(80), nullable=True))
    op.add_column("payments", sa.Column("cheque_deposit_date", sa.Date(), nullable=True))
    op.add_column("payments", sa.Column("cheque_cashing_date", sa.Date(), nullable=True))
    op.add_column("payments", sa.Column("cheque_status", sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column("payments", "cheque_status")
    op.drop_column("payments", "cheque_cashing_date")
    op.drop_column("payments", "cheque_deposit_date")
    op.drop_column("payments", "cheque_number")
    op.drop_column("payments", "cheque_bank")
