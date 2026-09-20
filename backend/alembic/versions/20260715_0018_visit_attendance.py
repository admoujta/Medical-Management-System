"""add visit attendance status

Revision ID: 20260715_0018
Revises: 20260715_0017
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260715_0018"
down_revision: str | None = "20260715_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("visits", sa.Column("attendance_status", sa.String(16), nullable=False, server_default="present"))
    op.create_check_constraint("ck_visits_attendance_status", "visits", "attendance_status IN ('present', 'absent')")


def downgrade() -> None:
    op.drop_constraint("ck_visits_attendance_status", "visits", type_="check")
    op.drop_column("visits", "attendance_status")
