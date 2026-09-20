"""global patient activation invitations

Revision ID: 20260723_0051
Revises: 20260723_0050
"""
from alembic import op
import sqlalchemy as sa

revision = "20260723_0051"
down_revision = "20260723_0050"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "patient_invitations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_id", sa.String(36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_patient_invitations_tenant_id", "patient_invitations", ["tenant_id"])
    op.create_index("ix_patient_invitations_user_id", "patient_invitations", ["user_id"])
    op.create_index("ix_patient_invitations_token_hash", "patient_invitations", ["token_hash"])
    op.execute("""
        INSERT INTO patient_cabinet_memberships (id, patient_id, tenant_id, status)
        SELECT CAST(gen_random_uuid() AS VARCHAR), p.id, p.tenant_id, 'active'
        FROM patient_profiles p
        WHERE NOT EXISTS (
            SELECT 1 FROM patient_cabinet_memberships m
            WHERE m.patient_id = p.id AND m.tenant_id = p.tenant_id
        )
    """)


def downgrade():
    op.drop_table("patient_invitations")
