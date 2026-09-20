"""patient portal settings

Revision ID: 20260710_0010
Revises: 20260710_0009
"""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa

revision: str="20260710_0010";down_revision: str|None="20260710_0009";branch_labels: str|Sequence[str]|None=None;depends_on: str|Sequence[str]|None=None

def upgrade()->None:
    for name,default in [("patient_can_request_appointment",True),("patient_can_confirm_appointment",False),("patient_can_cancel_appointment",True),("patient_can_view_payments",True),("patient_can_download_documents",True),("patient_requires_validation",True)]:
        op.add_column("tenant_settings",sa.Column(name,sa.Boolean(),nullable=False,server_default=sa.true() if default else sa.false()))

def downgrade()->None:
    for name in ["patient_requires_validation","patient_can_download_documents","patient_can_view_payments","patient_can_cancel_appointment","patient_can_confirm_appointment","patient_can_request_appointment"]:op.drop_column("tenant_settings",name)
