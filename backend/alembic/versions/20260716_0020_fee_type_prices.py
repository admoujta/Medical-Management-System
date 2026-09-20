"""add configurable default prices by fee type

Revision ID: 20260716_0020
Revises: 20260716_0019
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260716_0020"
down_revision: str | None = "20260716_0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tenant_settings", sa.Column("fee_type_prices", sa.JSON(), nullable=False,
                  server_default='{"CONSULTATION": 300, "ACTE": 0, "SOIN": 0, "TRAITEMENT": 0, "AUTRE": 0}'))


def downgrade() -> None:
    op.drop_column("tenant_settings", "fee_type_prices")
