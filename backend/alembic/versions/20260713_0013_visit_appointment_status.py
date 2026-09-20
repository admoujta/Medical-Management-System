"""link visits to appointments and persist visit status

Revision ID: 20260713_0013
Revises: 20260713_0012
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260713_0013"
down_revision: str | None = "20260713_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("visits", sa.Column("appointment_id", sa.String(length=36), nullable=True))
    op.add_column("visits", sa.Column("status", sa.String(length=32), nullable=False, server_default="completed"))
    op.create_index("ix_visits_appointment_id", "visits", ["appointment_id"], unique=True)
    op.create_foreign_key("fk_visits_appointment_id", "visits", "appointments", ["appointment_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_visits_appointment_id", "visits", type_="foreignkey")
    op.drop_index("ix_visits_appointment_id", table_name="visits")
    op.drop_column("visits", "status")
    op.drop_column("visits", "appointment_id")
