"""secure staff invitations and hierarchy

Revision ID: 20260720_0024
Revises: 20260717_0023
"""
from alembic import op
import sqlalchemy as sa

revision = "20260720_0024"
down_revision = "20260717_0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("account_status", sa.String(30), nullable=False, server_default="active"))
    op.add_column("users", sa.Column("staff_level", sa.String(30), nullable=True))
    op.create_index("ix_users_account_status", "users", ["account_status"])
    op.create_table(
        "staff_invitations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint("user_id"), sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_staff_invitations_tenant_id", "staff_invitations", ["tenant_id"])
    op.create_index("ix_staff_invitations_user_id", "staff_invitations", ["user_id"])
    op.create_index("ix_staff_invitations_token_hash", "staff_invitations", ["token_hash"])


def downgrade() -> None:
    op.drop_table("staff_invitations")
    op.drop_index("ix_users_account_status", table_name="users")
    op.drop_column("users", "staff_level")
    op.drop_column("users", "account_status")
