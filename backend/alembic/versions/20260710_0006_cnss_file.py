"""add CNSS uploaded file

Revision ID: 20260710_0006
Revises: 20260710_0005
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260710_0006"
down_revision: str | None = "20260710_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("cnss_cases", sa.Column("file_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("cnss_cases", "file_url")
