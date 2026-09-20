"""Add secure QR check-in fields to appointments.

Revision ID: 20260730_0075
Revises: 20260729_0074
"""
import secrets

from alembic import op
import sqlalchemy as sa


revision = "20260730_0075"
down_revision = "20260729_0074"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("qr_token", sa.String(length=64), nullable=True))
    op.add_column("appointments", sa.Column("qr_scanned_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("qr_scanned_by_user_id", sa.String(length=36), nullable=True))
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id FROM appointments")).fetchall()
    for row in rows:
        bind.execute(
            sa.text("UPDATE appointments SET qr_token = :token WHERE id = :id"),
            {"token": secrets.token_urlsafe(32), "id": row[0]},
        )
    op.alter_column("appointments", "qr_token", existing_type=sa.String(length=64), nullable=False)
    op.create_index("ix_appointments_qr_token", "appointments", ["qr_token"], unique=True)
    op.create_foreign_key(
        "fk_appointments_qr_scanned_by_user_id",
        "appointments",
        "users",
        ["qr_scanned_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_appointments_qr_scanned_by_user_id", "appointments", type_="foreignkey")
    op.drop_index("ix_appointments_qr_token", table_name="appointments")
    op.drop_column("appointments", "qr_scanned_by_user_id")
    op.drop_column("appointments", "qr_scanned_at")
    op.drop_column("appointments", "qr_token")
