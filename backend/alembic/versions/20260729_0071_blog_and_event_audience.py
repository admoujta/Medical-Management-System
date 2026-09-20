"""Independent blog module and event notification audience

Revision ID: 20260729_0071
Revises: 20260729_0070
"""
from alembic import op
import sqlalchemy as sa


revision = "20260729_0071"
down_revision = "20260729_0070"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("platform_events", sa.Column("notification_audience", sa.String(length=24), nullable=False, server_default="both"))
    op.add_column("platform_events", sa.Column("notification_sent_at", sa.DateTime(timezone=True), nullable=True))
    # Existing published events predate this feature. Mark them as already
    # announced so a later editorial edit cannot trigger a notification blast.
    op.execute(
        """
        UPDATE platform_events
        SET notification_sent_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
        WHERE status = 'published'
        """
    )
    op.create_table(
        "platform_blog_posts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("slug", sa.String(length=240), nullable=False),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("excerpt", sa.Text(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False, server_default="Actualités"),
        sa.Column("author_name", sa.String(length=160), nullable=False, server_default="Équipe FADAA Santé"),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="draft"),
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("updated_by_user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_platform_blog_posts_slug", "platform_blog_posts", ["slug"], unique=True)
    op.create_index("ix_platform_blog_posts_status", "platform_blog_posts", ["status"])
    op.create_index("ix_platform_blog_posts_published_at", "platform_blog_posts", ["published_at"])
    op.create_index("ix_platform_blog_posts_created_at", "platform_blog_posts", ["created_at"])
    op.create_table(
        "blog_gallery_images",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("post_id", sa.String(length=36), sa.ForeignKey("platform_blog_posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("alt_text", sa.String(length=220), nullable=False),
        sa.Column("caption", sa.String(length=500), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_cover", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_blog_gallery_images_post_id", "blog_gallery_images", ["post_id"])


def downgrade() -> None:
    op.drop_table("blog_gallery_images")
    op.drop_table("platform_blog_posts")
    op.drop_column("platform_events", "notification_sent_at")
    op.drop_column("platform_events", "notification_audience")
