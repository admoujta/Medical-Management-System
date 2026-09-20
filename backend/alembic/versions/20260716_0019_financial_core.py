"""complete the honoraire, appointment, visit and payment core

Revision ID: 20260716_0019
Revises: 20260715_0018
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260716_0019"
down_revision: str | None = "20260715_0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("fees", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("fees", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()))
    op.add_column("payments", sa.Column("reference", sa.String(length=120), nullable=True))
    op.execute("UPDATE fees SET status = 'in_progress' WHERE status = 'unpaid'")
    op.execute("UPDATE fees SET status = 'partially_paid' WHERE status = 'partial'")
    # Préserver les anciens paiements non affectés en créant un honoraire payé
    # dédié, plutôt que de perdre leur historique lors du passage au modèle strict.
    op.execute("""
        INSERT INTO fees (id, tenant_id, patient_id, doctor_id, title, description,
                          fee_type, amount, paid_amount, status, created_at, updated_at)
        SELECT p.id, p.tenant_id, p.patient_id, NULL, 'Paiement historique',
               'Honoraire créé automatiquement pendant la migration', 'AUTRE',
               p.amount, p.amount, 'paid', p.paid_at, p.paid_at
        FROM payments p
        WHERE p.fee_id IS NULL
    """)
    op.execute("UPDATE payments SET fee_id = id WHERE fee_id IS NULL")
    op.drop_constraint("payments_fee_id_fkey", "payments", type_="foreignkey")
    op.alter_column("payments", "fee_id", existing_type=sa.String(length=36), nullable=False)
    op.create_foreign_key("payments_fee_id_fkey", "payments", "fees", ["fee_id"], ["id"], ondelete="CASCADE")
    op.create_table(
        "honoraire_appointments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("fee_id", sa.String(length=36), nullable=False),
        sa.Column("appointment_id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["fee_id"], ["fees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("fee_id", "appointment_id", name="uq_honoraire_appointment"),
    )
    op.create_index("ix_honoraire_appointments_tenant_id", "honoraire_appointments", ["tenant_id"])
    op.create_index("ix_honoraire_appointments_fee_id", "honoraire_appointments", ["fee_id"])
    op.create_index("ix_honoraire_appointments_appointment_id", "honoraire_appointments", ["appointment_id"])


def downgrade() -> None:
    op.drop_table("honoraire_appointments")
    op.drop_constraint("payments_fee_id_fkey", "payments", type_="foreignkey")
    op.alter_column("payments", "fee_id", existing_type=sa.String(length=36), nullable=True)
    op.create_foreign_key("payments_fee_id_fkey", "payments", "fees", ["fee_id"], ["id"], ondelete="SET NULL")
    op.drop_column("payments", "reference")
    op.drop_column("fees", "updated_at")
    op.drop_column("fees", "due_date")
