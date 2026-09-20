"""Connect event galleries to the media library

Revision ID: 20260729_0073
Revises: 20260729_0072
"""
from alembic import op
import sqlalchemy as sa


revision = "20260729_0073"
down_revision = "20260729_0072"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("event_gallery_images", sa.Column("media_asset_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_event_gallery_images_media_asset_id",
        "event_gallery_images",
        "platform_media_assets",
        ["media_asset_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_event_gallery_images_media_asset_id", "event_gallery_images", ["media_asset_id"])


def downgrade() -> None:
    op.drop_index("ix_event_gallery_images_media_asset_id", table_name="event_gallery_images")
    op.drop_constraint("fk_event_gallery_images_media_asset_id", "event_gallery_images", type_="foreignkey")
    op.drop_column("event_gallery_images", "media_asset_id")
