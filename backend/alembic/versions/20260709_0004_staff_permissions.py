"""staff permission matrix

Revision ID: 20260709_0004
Revises: 20260709_0003
Create Date: 2026-07-09
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260709_0004"
down_revision: str | None = "20260709_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "staff_permissions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("tenant_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("permissions", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "user_id", name="uq_staff_permissions_tenant_user"),
    )
    op.create_index("ix_staff_permissions_tenant_id", "staff_permissions", ["tenant_id"])
    op.create_index("ix_staff_permissions_user_id", "staff_permissions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_staff_permissions_user_id", table_name="staff_permissions")
    op.drop_index("ix_staff_permissions_tenant_id", table_name="staff_permissions")
    op.drop_table("staff_permissions")
