"""automatic installment schedules

Revision ID: 20260717_0026
Revises: 20260717_0025
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0026"
down_revision = "20260717_0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("installment_count", sa.Integer(), nullable=True))
    op.add_column("payments", sa.Column("installment_schedule", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("payments", "installment_schedule")
    op.drop_column("payments", "installment_count")
