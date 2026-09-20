"""add verified doctor reviews

Revision ID: 20260716_0021
Revises: 20260716_0020
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20260716_0021"
down_revision: str | None = "20260716_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "doctor_reviews",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), nullable=False),
        sa.Column("doctor_id", sa.String(36), nullable=False),
        sa.Column("patient_id", sa.String(36), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_doctor_reviews_rating"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctor_profiles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_review_patient"),
    )
    op.create_index("ix_doctor_reviews_tenant_id", "doctor_reviews", ["tenant_id"])
    op.create_index("ix_doctor_reviews_doctor_id", "doctor_reviews", ["doctor_id"])
    op.create_index("ix_doctor_reviews_patient_id", "doctor_reviews", ["patient_id"])


def downgrade() -> None:
    op.drop_table("doctor_reviews")
