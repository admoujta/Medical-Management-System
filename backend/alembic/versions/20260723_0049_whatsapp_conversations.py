"""integrated WhatsApp conversations

Revision ID: 20260723_0049
Revises: 20260723_0048
"""
from alembic import op
import sqlalchemy as sa

revision = "20260723_0049"
down_revision = "20260723_0048"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("patient_profiles", sa.Column("whatsapp_opt_out_at", sa.DateTime(timezone=True)))
    op.add_column("patient_profiles", sa.Column("preferred_whatsapp_language", sa.String(8), nullable=False, server_default="fr"))
    op.create_table("whatsapp_conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_phone_number", sa.String(40), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="ouverte"),
        sa.Column("assigned_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("last_message_at", sa.DateTime(timezone=True)), sa.Column("last_message_preview", sa.String(280)),
        sa.Column("unread_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id", "patient_id", name="uq_whatsapp_conversation_tenant_patient"))
    op.create_index("ix_whatsapp_conversations_tenant_id", "whatsapp_conversations", ["tenant_id"])
    op.create_index("ix_whatsapp_conversations_patient_id", "whatsapp_conversations", ["patient_id"])
    op.create_index("ix_whatsapp_conversation_tenant_last", "whatsapp_conversations", ["tenant_id", "last_message_at"])
    for column in (
        sa.Column("conversation_id", sa.String(36), sa.ForeignKey("whatsapp_conversations.id", ondelete="SET NULL")),
        sa.Column("sender_type", sa.String(16), nullable=False, server_default="cabinet"),
        sa.Column("media_url", sa.String(500)), sa.Column("media_mime_type", sa.String(120)),
        sa.Column("reply_to_message_id", sa.String(36), sa.ForeignKey("whatsapp_message_logs.id", ondelete="SET NULL")),
        sa.Column("received_at", sa.DateTime(timezone=True)), sa.Column("internal_read_at", sa.DateTime(timezone=True)),
    ): op.add_column("whatsapp_message_logs", column)
    op.create_index("ix_whatsapp_message_logs_conversation_id", "whatsapp_message_logs", ["conversation_id"])
    op.create_table("whatsapp_unknown_messages",
        sa.Column("id", sa.String(36), primary_key=True), sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE")),
        sa.Column("phone_number", sa.String(40), nullable=False), sa.Column("meta_message_id", sa.String(180), nullable=False, unique=True),
        sa.Column("message_type", sa.String(40), nullable=False), sa.Column("content", sa.Text()), sa.Column("media_id", sa.String(180)),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("linked_patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="SET NULL")),
        sa.Column("linked_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")), sa.Column("linked_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.create_index("ix_whatsapp_unknown_messages_tenant_id", "whatsapp_unknown_messages", ["tenant_id"])
    op.create_index("ix_whatsapp_unknown_messages_phone_number", "whatsapp_unknown_messages", ["phone_number"])

def downgrade():
    op.drop_table("whatsapp_unknown_messages")
    for column in ("internal_read_at","received_at","reply_to_message_id","media_mime_type","media_url","sender_type","conversation_id"):
        op.drop_column("whatsapp_message_logs", column)
    op.drop_table("whatsapp_conversations")
    op.drop_column("patient_profiles", "preferred_whatsapp_language")
    op.drop_column("patient_profiles", "whatsapp_opt_out_at")
