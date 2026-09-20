"""cheque owner identity and required documents

Revision ID: 20260729_0066
Revises: 20260729_0063
"""
from alembic import op
import sqlalchemy as sa

revision = "20260729_0066"
down_revision = "20260729_0063"
branch_labels = None
depends_on = None

def upgrade() -> None:
    for name, type_ in (
        ("cheque_owner_name", sa.String(180)),
        ("cheque_owner_cin", sa.String(40)),
        ("cheque_copy_path", sa.String(500)),
        ("cheque_copy_filename", sa.String(255)),
        ("cheque_copy_mime_type", sa.String(120)),
        ("cheque_owner_cin_path", sa.String(500)),
        ("cheque_owner_cin_filename", sa.String(255)),
        ("cheque_owner_cin_mime_type", sa.String(120)),
    ):
        op.add_column("payments", sa.Column(name, type_, nullable=True))

def downgrade() -> None:
    for name in (
        "cheque_owner_cin_mime_type", "cheque_owner_cin_filename",
        "cheque_owner_cin_path", "cheque_copy_mime_type",
        "cheque_copy_filename", "cheque_copy_path",
        "cheque_owner_cin", "cheque_owner_name",
    ):
        op.drop_column("payments", name)
