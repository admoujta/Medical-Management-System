"""centralize WhatsApp technical configuration

Revision ID: 20260721_0045
Revises: 20260721_0044
"""
from alembic import op
import sqlalchemy as sa

revision = "20260721_0045"
down_revision = "20260721_0044"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "platform_whatsapp_configuration",
        sa.Column("id",sa.String(36),primary_key=True),
        sa.Column("business_account_name",sa.String(180),nullable=False),
        sa.Column("phone_number",sa.String(40),nullable=False),
        sa.Column("phone_number_id",sa.String(120),nullable=False),
        sa.Column("whatsapp_business_account_id",sa.String(120),nullable=False),
        sa.Column("access_token_encrypted",sa.Text(),nullable=False),
        sa.Column("webhook_verify_token_encrypted",sa.Text(),nullable=False),
        sa.Column("webhook_url",sa.String(500),nullable=True),
        sa.Column("status",sa.String(32),nullable=False,server_default="en_attente"),
        sa.Column("last_test_at",sa.DateTime(timezone=True),nullable=True),
        sa.Column("last_error_message",sa.Text(),nullable=True),
        sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
        sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False),
    )

def downgrade():
    op.drop_table("platform_whatsapp_configuration")
