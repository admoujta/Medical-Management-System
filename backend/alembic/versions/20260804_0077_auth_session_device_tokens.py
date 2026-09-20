"""Store refresh-token and device metadata per authenticated session.

Revision ID: 20260804_0077
Revises: 20260731_0076
"""
from alembic import op
import sqlalchemy as sa


revision = "20260804_0077"
down_revision = "20260731_0076"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("auth_sessions", sa.Column("refresh_token_hash", sa.String(length=64), nullable=True))
    op.add_column("auth_sessions", sa.Column("device_name", sa.String(length=160), nullable=True))
    op.add_column("auth_sessions", sa.Column("user_agent", sa.String(length=500), nullable=True))
    op.add_column("auth_sessions", sa.Column("ip_address", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("auth_sessions", "ip_address")
    op.drop_column("auth_sessions", "user_agent")
    op.drop_column("auth_sessions", "device_name")
    op.drop_column("auth_sessions", "refresh_token_hash")
