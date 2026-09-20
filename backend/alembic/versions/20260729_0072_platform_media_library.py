"""Reusable platform media library

Revision ID: 20260729_0072
Revises: 20260729_0071
"""
from alembic import op
import sqlalchemy as sa


revision = "20260729_0072"
down_revision = "20260729_0071"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_media_assets",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("alt_text", sa.String(length=220), nullable=False),
        sa.Column("caption", sa.String(length=500), nullable=True),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_platform_media_assets_created_at", "platform_media_assets", ["created_at"])
    op.create_index("ix_platform_media_assets_archived_at", "platform_media_assets", ["archived_at"])
    op.add_column("blog_gallery_images", sa.Column("media_asset_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_blog_gallery_images_media_asset_id",
        "blog_gallery_images",
        "platform_media_assets",
        ["media_asset_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_blog_gallery_images_media_asset_id", "blog_gallery_images", ["media_asset_id"])


def downgrade() -> None:
    op.drop_index("ix_blog_gallery_images_media_asset_id", table_name="blog_gallery_images")
    op.drop_constraint("fk_blog_gallery_images_media_asset_id", "blog_gallery_images", type_="foreignkey")
    op.drop_column("blog_gallery_images", "media_asset_id")
    op.drop_table("platform_media_assets")
