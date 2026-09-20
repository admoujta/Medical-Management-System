"""medical access audit metadata

Revision ID: 20260719_0037
Revises: 20260719_0036
"""
from alembic import op
import sqlalchemy as sa

revision="20260719_0037"
down_revision="20260719_0036"
branch_labels=None
depends_on=None

def upgrade():
    columns=[sa.Column("user_role",sa.String(40)),sa.Column("patient_id",sa.String(36),sa.ForeignKey("patient_profiles.id",ondelete="SET NULL")),sa.Column("ip_address",sa.String(64)),sa.Column("user_agent",sa.String(500)),sa.Column("access_datetime",sa.DateTime(timezone=True),server_default=sa.func.now()),sa.Column("details",sa.Text())]
    for column in columns: op.add_column("audit_logs",column)
    for column in ("user_role","patient_id","access_datetime"): op.create_index(f"ix_audit_logs_{column}","audit_logs",[column])
    op.execute("UPDATE audit_logs SET access_datetime=created_at WHERE access_datetime IS NULL")

def downgrade():
    for column in ("access_datetime","patient_id","user_role"): op.drop_index(f"ix_audit_logs_{column}",table_name="audit_logs")
    for column in ("details","access_datetime","user_agent","ip_address","patient_id","user_role"): op.drop_column("audit_logs",column)
