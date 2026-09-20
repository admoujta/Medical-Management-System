"""Event editorial pages and galleries

Revision ID: 20260729_0070
Revises: 20260729_0069
"""
from alembic import op
import sqlalchemy as sa


revision = "20260729_0070"
down_revision = "20260729_0069"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("platform_events", sa.Column("slug", sa.String(length=240), nullable=True))
    op.add_column("platform_events", sa.Column("article_content", sa.Text(), nullable=True))
    op.create_index("ix_platform_events_slug", "platform_events", ["slug"], unique=True)
    op.execute(
        "UPDATE platform_events SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || left(id, 8) "
        "WHERE slug IS NULL"
    )
    op.create_table(
        "event_gallery_images",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("event_id", sa.String(length=36), sa.ForeignKey("platform_events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("alt_text", sa.String(length=220), nullable=False),
        sa.Column("caption", sa.String(length=500), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_cover", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_event_gallery_images_event_id", "event_gallery_images", ["event_id"])


def downgrade() -> None:
    op.drop_table("event_gallery_images")
    op.drop_index("ix_platform_events_slug", table_name="platform_events")
    op.drop_column("platform_events", "article_content")
    op.drop_column("platform_events", "slug")
