"""medication catalog foundation

Revision ID: 20260728_0061
Revises: 20260728_0060
"""
from alembic import op
import sqlalchemy as sa

revision = "20260728_0061"
down_revision = "20260728_0060"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "medication_catalog",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True),
        sa.Column("source", sa.String(80), nullable=False, server_default="FADAA"),
        sa.Column("external_code", sa.String(120), nullable=True),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("generic_name", sa.String(180), nullable=True),
        sa.Column("strength", sa.String(120), nullable=True),
        sa.Column("form", sa.String(120), nullable=True),
        sa.Column("route", sa.String(120), nullable=True),
        sa.Column("specialties", sa.JSON(), nullable=True),
        sa.Column("default_dosage", sa.String(120), nullable=True),
        sa.Column("default_frequency", sa.String(180), nullable=True),
        sa.Column("default_duration", sa.String(120), nullable=True),
        sa.Column("default_instructions", sa.String(500), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("source", "external_code", name="uq_medication_catalog_source_code"),
    )
    op.create_index("ix_medication_catalog_tenant_id", "medication_catalog", ["tenant_id"])
    op.create_index("ix_medication_catalog_external_code", "medication_catalog", ["external_code"])
    op.create_index("ix_medication_catalog_name", "medication_catalog", ["name"])
    op.create_index("ix_medication_catalog_generic_name", "medication_catalog", ["generic_name"])
    op.create_index("ix_medication_catalog_is_active", "medication_catalog", ["is_active"])


def downgrade() -> None:
    op.drop_table("medication_catalog")
