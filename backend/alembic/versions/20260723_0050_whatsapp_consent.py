"""complete WhatsApp patient consent

Revision ID: 20260723_0050
Revises: 20260723_0049
"""
from alembic import op
import sqlalchemy as sa

revision = "20260723_0050"
down_revision = "20260723_0049"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patient_profiles", sa.Column("whatsapp_consent_status", sa.String(16), nullable=False, server_default="pending"))
    op.add_column("patient_profiles", sa.Column("whatsapp_consent_source", sa.String(32)))
    op.add_column("patient_profiles", sa.Column("whatsapp_consent_collected_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")))
    op.add_column("patient_profiles", sa.Column("whatsapp_phone_number", sa.String(40)))
    op.add_column("patient_profiles", sa.Column("whatsapp_consent_note", sa.Text()))
    op.add_column("patient_profiles", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.add_column("whatsapp_message_logs", sa.Column("consent_withdrawal_requested", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE patient_profiles SET whatsapp_consent_status = CASE WHEN whatsapp_opt_in THEN 'accepted' WHEN whatsapp_opt_out_at IS NOT NULL THEN 'withdrawn' ELSE 'pending' END")
    op.execute("UPDATE patient_profiles SET whatsapp_phone_number = users.phone FROM users WHERE patient_profiles.user_id = users.id AND patient_profiles.whatsapp_opt_in = true")
    op.create_table(
        "whatsapp_consent_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("previous_status", sa.String(16)),
        sa.Column("new_status", sa.String(16), nullable=False),
        sa.Column("action", sa.String(32), nullable=False),
        sa.Column("phone_number", sa.String(40)),
        sa.Column("source", sa.String(32)),
        sa.Column("performed_by_user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("note", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_whatsapp_consent_logs_tenant_id", "whatsapp_consent_logs", ["tenant_id"])
    op.create_index("ix_whatsapp_consent_logs_patient_id", "whatsapp_consent_logs", ["patient_id"])
    op.create_index("ix_whatsapp_consent_tenant_patient_created", "whatsapp_consent_logs", ["tenant_id", "patient_id", "created_at"])


def downgrade() -> None:
    op.drop_column("whatsapp_message_logs", "consent_withdrawal_requested")
    op.drop_table("whatsapp_consent_logs")
    for name in ("updated_at", "whatsapp_consent_note", "whatsapp_phone_number", "whatsapp_consent_collected_by_user_id", "whatsapp_consent_source", "whatsapp_consent_status"):
        op.drop_column("patient_profiles", name)
