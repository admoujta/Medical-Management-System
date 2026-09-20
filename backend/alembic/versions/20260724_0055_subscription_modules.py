"""add subscription module entitlements

Revision ID: 20260724_0055
Revises: 20260724_0054
"""
from alembic import op
import sqlalchemy as sa

revision = "20260724_0055"
down_revision = "20260724_0054"
branch_labels = None
depends_on = None

MODULES = '["dashboard","appointments","patients","visits","fees","payments","reminders","whatsapp","cnss","prescriptions","documents","staff","audit","statistics"]'


def upgrade():
    op.add_column(
        "subscription_plans",
        sa.Column("enabled_modules", sa.JSON(), nullable=False, server_default=sa.text(f"'{MODULES}'::json")),
    )
    op.alter_column("subscription_plans", "enabled_modules", server_default=None)


def downgrade():
    op.drop_column("subscription_plans", "enabled_modules")
