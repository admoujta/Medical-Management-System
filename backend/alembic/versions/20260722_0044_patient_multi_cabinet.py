"""allow one global patient profile to access multiple cabinets

Revision ID: 20260722_0044
Revises: 20260721_0043
"""
from alembic import op
import sqlalchemy as sa

revision = "20260722_0044"
down_revision = "20260721_0043"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "patient_cabinet_memberships",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("patient_id", sa.String(36), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("patient_id", "tenant_id", name="uq_patient_cabinet_membership"),
    )
    op.create_index("ix_patient_cabinet_memberships_patient_id", "patient_cabinet_memberships", ["patient_id"])
    op.create_index("ix_patient_cabinet_memberships_tenant_id", "patient_cabinet_memberships", ["tenant_id"])
    op.execute("""
        INSERT INTO patient_cabinet_memberships (id, patient_id, tenant_id, status)
        SELECT CAST(gen_random_uuid() AS VARCHAR), id, tenant_id, 'active'
        FROM patient_profiles
    """)


def downgrade():
    op.drop_table("patient_cabinet_memberships")
