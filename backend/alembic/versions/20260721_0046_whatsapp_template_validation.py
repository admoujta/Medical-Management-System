"""track Meta WhatsApp template validation

Revision ID: 20260721_0046
Revises: 20260721_0045
"""
from alembic import op
import sqlalchemy as sa

revision="20260721_0046"
down_revision="20260721_0045"
branch_labels=None
depends_on=None

def upgrade():
    op.add_column("whatsapp_message_templates",sa.Column("meta_template_id",sa.String(180),nullable=True))
    op.add_column("whatsapp_message_templates",sa.Column("category",sa.String(32),nullable=False,server_default="UTILITY"))
    op.add_column("whatsapp_message_templates",sa.Column("rejection_reason",sa.Text(),nullable=True))
    op.add_column("whatsapp_message_templates",sa.Column("submitted_at",sa.DateTime(timezone=True),nullable=True))
    op.add_column("whatsapp_message_templates",sa.Column("synced_at",sa.DateTime(timezone=True),nullable=True))
    op.create_index("ix_whatsapp_message_templates_meta_template_id","whatsapp_message_templates",["meta_template_id"])

def downgrade():
    op.drop_index("ix_whatsapp_message_templates_meta_template_id",table_name="whatsapp_message_templates")
    for column in ["synced_at","submitted_at","rejection_reason","category","meta_template_id"]:op.drop_column("whatsapp_message_templates",column)
