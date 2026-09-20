"""payment methods and terms

Revision ID: 20260717_0024
Revises: 20260717_0023
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0024"
down_revision = "20260717_0023"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("tenant_settings", sa.Column("payment_settings", sa.JSON(), nullable=False, server_default='{"methods":["cash","card","transfer","cheque","other"],"settlement_types":["immediate","partial","single_due","installment"],"default_method":"cash","default_settlement_type":"immediate","default_due_days":30,"default_installments":3,"grace_days":0}'))
    op.add_column("payments", sa.Column("payment_type", sa.String(32), nullable=False, server_default="immediate"))
    op.add_column("payments", sa.Column("due_date", sa.Date(), nullable=True))

def downgrade() -> None:
    op.drop_column("payments", "due_date")
    op.drop_column("payments", "payment_type")
    op.drop_column("tenant_settings", "payment_settings")
