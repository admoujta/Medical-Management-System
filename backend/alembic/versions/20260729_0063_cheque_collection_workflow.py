"""cheque collection workflow

Revision ID: 20260729_0063
Revises: 20260728_0064
"""
from alembic import op
import sqlalchemy as sa

revision = "20260729_0063"
down_revision = "20260728_0064"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("payments", sa.Column("cheque_expected_cashing_date", sa.Date(), nullable=True))
    op.add_column("payments", sa.Column("cheque_collection_method", sa.String(24), nullable=True))
    op.add_column("payments", sa.Column("cheque_rejection_reason", sa.Text(), nullable=True))
    op.add_column("payments", sa.Column("cheque_rejected_at", sa.Date(), nullable=True))
    op.execute("UPDATE payments SET cheque_expected_cashing_date=cheque_cashing_date, cheque_cashing_date=NULL, cheque_status='RECU' WHERE method='cheque' AND cheque_status='EN_ATTENTE'")

def downgrade() -> None:
    op.drop_column("payments", "cheque_rejected_at")
    op.drop_column("payments", "cheque_rejection_reason")
    op.drop_column("payments", "cheque_collection_method")
    op.drop_column("payments", "cheque_expected_cashing_date")
