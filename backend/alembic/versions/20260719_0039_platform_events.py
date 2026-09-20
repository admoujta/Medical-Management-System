"""platform events managed by super admin

Revision ID: 20260719_0039
Revises: 20260719_0038
"""
from alembic import op
import sqlalchemy as sa
revision="20260719_0039";down_revision="20260719_0038";branch_labels=None;depends_on=None

def upgrade():
    op.create_table("platform_events",sa.Column("id",sa.String(36),primary_key=True),sa.Column("title",sa.String(220),nullable=False),sa.Column("event_type",sa.String(80),nullable=False),sa.Column("description",sa.Text()),sa.Column("start_at",sa.DateTime(timezone=True),nullable=False),sa.Column("end_at",sa.DateTime(timezone=True),nullable=False),sa.Column("location",sa.String(220),nullable=False),sa.Column("is_online",sa.Boolean(),nullable=False,server_default=sa.false()),sa.Column("registration_url",sa.String(500)),sa.Column("capacity",sa.Integer()),sa.Column("status",sa.String(24),nullable=False,server_default="draft"),sa.Column("is_featured",sa.Boolean(),nullable=False,server_default=sa.false()),sa.Column("created_by_user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="RESTRICT"),nullable=False),sa.Column("updated_by_user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="SET NULL")),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()),sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()))
    op.create_index("ix_platform_events_start_at","platform_events",["start_at"]);op.create_index("ix_platform_events_status","platform_events",["status"])

def downgrade():op.drop_table("platform_events")
