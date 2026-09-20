"""whatsapp cloud api module

Revision ID: 20260721_0044
Revises: 20260721_0043
"""
from alembic import op
import sqlalchemy as sa

revision="20260721_0044"
down_revision="20260721_0043"
branch_labels=None
depends_on=None

def upgrade():
    op.create_table("whatsapp_configurations",
        sa.Column("id",sa.String(36),primary_key=True),sa.Column("tenant_id",sa.String(36),sa.ForeignKey("tenants.id",ondelete="CASCADE"),nullable=False),
        sa.Column("business_account_name",sa.String(180),nullable=False),sa.Column("phone_number",sa.String(40),nullable=False),sa.Column("phone_number_id",sa.String(120),nullable=False),
        sa.Column("whatsapp_business_account_id",sa.String(120),nullable=False),sa.Column("access_token_encrypted",sa.Text(),nullable=False),sa.Column("webhook_verify_token_encrypted",sa.Text(),nullable=False),
        sa.Column("webhook_url",sa.String(500)),sa.Column("status",sa.String(32),nullable=False,server_default="non_configure"),sa.Column("last_test_at",sa.DateTime(timezone=True)),sa.Column("last_error_message",sa.Text()),
        sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now()),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now()),sa.UniqueConstraint("tenant_id",name="uq_whatsapp_configuration_tenant"))
    op.create_index("ix_whatsapp_configurations_tenant_id","whatsapp_configurations",["tenant_id"])
    op.create_table("whatsapp_message_templates",
        sa.Column("id",sa.String(36),primary_key=True),sa.Column("tenant_id",sa.String(36),sa.ForeignKey("tenants.id",ondelete="CASCADE"),nullable=False),sa.Column("name",sa.String(180),nullable=False),
        sa.Column("type",sa.String(40),nullable=False),sa.Column("language",sa.String(8),nullable=False,server_default="fr"),sa.Column("content",sa.Text(),nullable=False),sa.Column("meta_template_name",sa.String(180)),
        sa.Column("status",sa.String(32),nullable=False,server_default="brouillon"),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now()),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now()),
        sa.UniqueConstraint("tenant_id","name","language",name="uq_whatsapp_template_tenant_name_language"))
    op.create_index("ix_whatsapp_message_templates_tenant_id","whatsapp_message_templates",["tenant_id"])
    op.create_table("whatsapp_message_logs",
        sa.Column("id",sa.String(36),primary_key=True),sa.Column("tenant_id",sa.String(36),sa.ForeignKey("tenants.id",ondelete="CASCADE"),nullable=False),sa.Column("patient_id",sa.String(36),sa.ForeignKey("patient_profiles.id",ondelete="SET NULL")),
        sa.Column("appointment_id",sa.String(36),sa.ForeignKey("appointments.id",ondelete="SET NULL")),sa.Column("fee_id",sa.String(36),sa.ForeignKey("fees.id",ondelete="SET NULL")),sa.Column("payment_id",sa.String(36),sa.ForeignKey("payments.id",ondelete="SET NULL")),
        sa.Column("template_id",sa.String(36),sa.ForeignKey("whatsapp_message_templates.id",ondelete="SET NULL")),sa.Column("phone_number",sa.String(40),nullable=False),sa.Column("message_content",sa.Text(),nullable=False),
        sa.Column("message_type",sa.String(40),nullable=False),sa.Column("direction",sa.String(16),nullable=False,server_default="sortant"),sa.Column("status",sa.String(24),nullable=False,server_default="en_attente"),
        sa.Column("meta_message_id",sa.String(180),unique=True),sa.Column("error_message",sa.Text()),sa.Column("sent_at",sa.DateTime(timezone=True)),sa.Column("delivered_at",sa.DateTime(timezone=True)),sa.Column("read_at",sa.DateTime(timezone=True)),
        sa.Column("created_by_user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="SET NULL")),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now()),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now()))
    for column in ("tenant_id","patient_id","appointment_id","fee_id","payment_id"): op.create_index(f"ix_whatsapp_message_logs_{column}","whatsapp_message_logs",[column])
    op.create_index("ix_whatsapp_message_tenant_patient_created","whatsapp_message_logs",["tenant_id","patient_id","created_at"])
    op.create_index("ix_whatsapp_message_tenant_status","whatsapp_message_logs",["tenant_id","status"])

def downgrade():
    op.drop_table("whatsapp_message_logs");op.drop_table("whatsapp_message_templates");op.drop_table("whatsapp_configurations")
