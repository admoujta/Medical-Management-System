"""complete professional due dates

Revision ID: 20260717_0029
Revises: 20260717_0028
"""
from alembic import op
import sqlalchemy as sa

revision = "20260717_0029"
down_revision = "20260717_0028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("payment_due_dates", sa.Column("patient_id", sa.String(36), nullable=True))
    op.add_column("payment_due_dates", sa.Column("fee_id", sa.String(36), nullable=True))
    op.add_column("payment_due_dates", sa.Column("updated_by_user_id", sa.String(36), nullable=True))
    op.execute("""
        UPDATE payment_due_dates d
        SET patient_id = i.patient_id, fee_id = i.fee_id
        FROM invoices i
        WHERE d.invoice_id = i.id
    """)
    op.alter_column("payment_due_dates", "patient_id", nullable=False)
    op.create_foreign_key("fk_due_dates_patient", "payment_due_dates", "patient_profiles", ["patient_id"], ["id"], ondelete="CASCADE")
    op.create_foreign_key("fk_due_dates_fee", "payment_due_dates", "fees", ["fee_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_due_dates_updated_by", "payment_due_dates", "users", ["updated_by_user_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_payment_due_dates_patient_id", "payment_due_dates", ["patient_id"])
    op.create_index("ix_payment_due_dates_fee_id", "payment_due_dates", ["fee_id"])


def downgrade() -> None:
    op.drop_index("ix_payment_due_dates_fee_id", table_name="payment_due_dates")
    op.drop_index("ix_payment_due_dates_patient_id", table_name="payment_due_dates")
    op.drop_constraint("fk_due_dates_updated_by", "payment_due_dates", type_="foreignkey")
    op.drop_constraint("fk_due_dates_fee", "payment_due_dates", type_="foreignkey")
    op.drop_constraint("fk_due_dates_patient", "payment_due_dates", type_="foreignkey")
    op.drop_column("payment_due_dates", "updated_by_user_id")
    op.drop_column("payment_due_dates", "fee_id")
    op.drop_column("payment_due_dates", "patient_id")
