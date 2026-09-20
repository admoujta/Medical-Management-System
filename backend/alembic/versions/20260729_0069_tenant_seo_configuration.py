"""Tenant-specific public SEO configuration

Revision ID: 20260729_0069
Revises: 20260729_0068
"""
from alembic import op
import sqlalchemy as sa


revision = "20260729_0069"
down_revision = "20260729_0068"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("seo_title", sa.String(length=70), nullable=True))
    op.add_column("tenants", sa.Column("seo_description", sa.String(length=320), nullable=True))
    op.add_column("tenants", sa.Column("seo_keywords", sa.String(length=500), nullable=True))
    op.add_column("tenants", sa.Column("seo_canonical_url", sa.String(length=500), nullable=True))
    op.add_column("tenants", sa.Column("seo_social_image_url", sa.String(length=500), nullable=True))
    op.add_column(
        "tenants",
        sa.Column("seo_indexable", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("tenants", "seo_indexable")
    op.drop_column("tenants", "seo_social_image_url")
    op.drop_column("tenants", "seo_canonical_url")
    op.drop_column("tenants", "seo_keywords")
    op.drop_column("tenants", "seo_description")
    op.drop_column("tenants", "seo_title")
