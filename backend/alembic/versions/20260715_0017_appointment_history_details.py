"""appointment history actor and description details

Revision ID: 20260715_0017
Revises: 20260714_0016
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260715_0017"
down_revision: str | None = "20260714_0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("operation_history", sa.Column("doctor_id", sa.String(36), nullable=True))
    op.add_column("operation_history", sa.Column("old_status", sa.String(32), nullable=True))
    op.add_column("operation_history", sa.Column("new_status", sa.String(32), nullable=True))
    op.add_column("operation_history", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("operation_history", sa.Column("performed_by_role", sa.String(50), nullable=True))
    op.create_foreign_key("fk_operation_history_doctor", "operation_history", "doctor_profiles", ["doctor_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_operation_history_doctor_id", "operation_history", ["doctor_id"])


def downgrade() -> None:
    op.drop_index("ix_operation_history_doctor_id", table_name="operation_history")
    op.drop_constraint("fk_operation_history_doctor", "operation_history", type_="foreignkey")
    op.drop_column("operation_history", "performed_by_role")
    op.drop_column("operation_history", "description")
    op.drop_column("operation_history", "new_status")
    op.drop_column("operation_history", "old_status")
    op.drop_column("operation_history", "doctor_id")
