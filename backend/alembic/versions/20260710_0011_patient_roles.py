"""attach patient role to cabinet-created patient records

Revision ID: 20260710_0011
Revises: 20260710_0010
"""
from collections.abc import Sequence
from alembic import op

revision: str="20260710_0011";down_revision: str|None="20260710_0010";branch_labels: str|Sequence[str]|None=None;depends_on: str|Sequence[str]|None=None

def upgrade()->None:
    op.execute("""INSERT INTO user_roles (user_id,role_id)
    SELECT p.user_id,r.id FROM patient_profiles p JOIN roles r ON r.tenant_id=p.tenant_id AND r.code='patient'
    WHERE NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=p.user_id AND ur.role_id=r.id)""")

def downgrade()->None:
    pass
