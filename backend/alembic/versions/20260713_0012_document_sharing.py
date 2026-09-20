"""add explicit patient document sharing

Revision ID: 20260713_0012
Revises: 20260710_0011
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260713_0012"
down_revision: str | None = "20260710_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "medical_documents",
        sa.Column("shared_with_patient", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("medical_documents", "shared_with_patient")
