"""allow global platform admin role

Revision ID: 20260710_0009
Revises: 20260710_0008
"""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "20260710_0009"
down_revision: str | None = "20260710_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.alter_column("roles", "tenant_id", existing_type=sa.String(length=36), nullable=True)

def downgrade() -> None:
    op.execute("DELETE FROM roles WHERE tenant_id IS NULL")
    op.alter_column("roles", "tenant_id", existing_type=sa.String(length=36), nullable=False)
