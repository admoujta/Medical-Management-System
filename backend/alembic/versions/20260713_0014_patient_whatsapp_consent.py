"""store explicit patient WhatsApp consent

Revision ID: 20260713_0014
Revises: 20260713_0013
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260713_0014"
down_revision: str | None = "20260713_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("patient_profiles", sa.Column("whatsapp_opt_in", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("patient_profiles", sa.Column("whatsapp_consent_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("patient_profiles", "whatsapp_consent_at")
    op.drop_column("patient_profiles", "whatsapp_opt_in")
