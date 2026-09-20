"""core doctor calendar fields

Revision ID: 20260710_0005
Revises: 20260709_0004
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260710_0005"
down_revision: str | None = "20260709_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("patient_profiles", sa.Column("address", sa.Text(), nullable=True))
    op.add_column("appointments", sa.Column("notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("appointments", "notes")
    op.drop_column("patient_profiles", "address")
