"""link payments to due dates

Revision ID: 20260717_0028
Revises: 20260717_0027
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0028"
down_revision = "20260717_0027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("due_date_id", sa.String(36), sa.ForeignKey("payment_due_dates.id", ondelete="SET NULL"), nullable=True))
    op.add_column("payments", sa.Column("cheque_issue_date", sa.Date(), nullable=True))
    op.create_index("ix_payments_due_date_id", "payments", ["due_date_id"])
    op.execute("UPDATE payments SET cheque_issue_date = cheque_deposit_date WHERE cheque_issue_date IS NULL")
    op.execute("UPDATE payments SET cheque_status = CASE cheque_status WHEN 'to_cash' THEN 'EN_ATTENTE' WHEN 'cashed' THEN 'ENCAISSE' WHEN 'rejected' THEN 'REJETE' WHEN 'cancelled' THEN 'ANNULE' ELSE cheque_status END WHERE cheque_status IS NOT NULL")


def downgrade() -> None:
    op.drop_index("ix_payments_due_date_id", table_name="payments")
    op.drop_column("payments", "cheque_issue_date")
    op.drop_column("payments", "due_date_id")
