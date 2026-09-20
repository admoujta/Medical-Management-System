"""add tenant-isolated user notifications

Revision ID: 20260721_0042
Revises: 20260721_0041
"""
from alembic import op
import sqlalchemy as sa

revision="20260721_0042"
down_revision="20260721_0041"
branch_labels=None
depends_on=None

def upgrade():
    op.create_table("user_notifications",sa.Column("id",sa.String(36),primary_key=True),sa.Column("tenant_id",sa.String(36),sa.ForeignKey("tenants.id",ondelete="CASCADE"),nullable=False),sa.Column("user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False),sa.Column("notification_type",sa.String(40),nullable=False),sa.Column("title",sa.String(180),nullable=False),sa.Column("message",sa.Text(),nullable=False),sa.Column("resource_id",sa.String(36)),sa.Column("read_at",sa.DateTime(timezone=True)),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now(),nullable=False))
    for column in ("tenant_id","user_id","notification_type","resource_id","created_at"):op.create_index(f"ix_user_notifications_{column}","user_notifications",[column])

def downgrade():
    op.drop_table("user_notifications")
