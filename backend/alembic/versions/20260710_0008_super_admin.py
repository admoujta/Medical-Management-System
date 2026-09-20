"""super admin billing and support

Revision ID: 20260710_0008
Revises: 20260710_0007
"""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa

revision: str = "20260710_0008"
down_revision: str | None = "20260710_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table("subscriptions",
        sa.Column("id", sa.String(36), primary_key=True), sa.Column("tenant_id", sa.String(36), nullable=False),
        sa.Column("plan_name", sa.String(120), nullable=False), sa.Column("status", sa.String(32), nullable=False),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False), sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("amount", sa.Numeric(12,2), nullable=False), sa.Column("payment_status", sa.String(32), nullable=False),
        sa.Column("admin_note", sa.Text()), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"],["tenants.id"],ondelete="CASCADE"), sa.UniqueConstraint("tenant_id"))
    op.create_index("ix_subscriptions_tenant_id","subscriptions",["tenant_id"],unique=True)
    op.create_index("ix_subscriptions_status","subscriptions",["status"])
    op.create_table("support_tickets",
        sa.Column("id",sa.String(36),primary_key=True),sa.Column("tenant_id",sa.String(36)),sa.Column("created_by",sa.String(36)),
        sa.Column("subject",sa.String(240),nullable=False),sa.Column("message",sa.Text(),nullable=False),sa.Column("status",sa.String(32),nullable=False),
        sa.Column("priority",sa.String(24),nullable=False),sa.Column("internal_note",sa.Text()),
        sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"],["tenants.id"],ondelete="SET NULL"),sa.ForeignKeyConstraint(["created_by"],["users.id"],ondelete="SET NULL"))
    op.create_index("ix_support_tickets_tenant_id","support_tickets",["tenant_id"]);op.create_index("ix_support_tickets_status","support_tickets",["status"])
    op.create_table("support_replies",sa.Column("id",sa.String(36),primary_key=True),sa.Column("ticket_id",sa.String(36),nullable=False),sa.Column("user_id",sa.String(36)),sa.Column("message",sa.Text(),nullable=False),sa.Column("internal",sa.Boolean(),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.text("now()"),nullable=False),sa.ForeignKeyConstraint(["ticket_id"],["support_tickets.id"],ondelete="CASCADE"),sa.ForeignKeyConstraint(["user_id"],["users.id"],ondelete="SET NULL"))
    op.create_index("ix_support_replies_ticket_id","support_replies",["ticket_id"])
    op.execute("INSERT INTO subscriptions (id,tenant_id,plan_name,status,start_date,end_date,amount,payment_status) SELECT gen_random_uuid()::text,id,'FADAA Cabinet',status,trial_started_at,trial_ends_at,0,'pending' FROM tenants")


def downgrade() -> None:
    op.drop_table("support_replies");op.drop_table("support_tickets");op.drop_table("subscriptions")
