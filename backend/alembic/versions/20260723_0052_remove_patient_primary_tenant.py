"""remove the legacy primary tenant from patient users

Revision ID: 20260723_0052
Revises: 20260723_0051
"""
from alembic import op

revision = "20260723_0052"
down_revision = "20260723_0051"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        UPDATE users u
        SET tenant_id = NULL
        WHERE EXISTS (
            SELECT 1 FROM patient_profiles p WHERE p.user_id = u.id
        )
    """)


def downgrade():
    op.execute("""
        UPDATE users u
        SET tenant_id = p.tenant_id
        FROM patient_profiles p
        WHERE p.user_id = u.id AND u.tenant_id IS NULL
    """)
