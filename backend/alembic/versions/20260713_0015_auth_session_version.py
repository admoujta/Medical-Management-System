"""add revocable authentication session version

Revision ID: 20260713_0015
Revises: 20260713_0014
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260713_0015"
down_revision: str | None = "20260713_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("auth_version", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("users", "auth_version")
