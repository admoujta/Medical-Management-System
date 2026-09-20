"""backup and restore logs

Revision ID: 20260719_0038
Revises: 20260719_0037
"""
from alembic import op
import sqlalchemy as sa
revision="20260719_0038";down_revision="20260719_0037";branch_labels=None;depends_on=None

def upgrade():
    op.create_table("backup_logs",sa.Column("id",sa.String(36),primary_key=True),sa.Column("tenant_id",sa.String(36),sa.ForeignKey("tenants.id",ondelete="SET NULL")),sa.Column("backup_type",sa.String(24),nullable=False),sa.Column("status",sa.String(24),nullable=False),sa.Column("backup_path",sa.String(500)),sa.Column("size",sa.BigInteger()),sa.Column("checksum",sa.String(64)),sa.Column("started_at",sa.DateTime(timezone=True)),sa.Column("finished_at",sa.DateTime(timezone=True)),sa.Column("triggered_by",sa.String(24),nullable=False),sa.Column("triggered_by_user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="SET NULL")),sa.Column("error_message",sa.Text()),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now()))
    for c in ("tenant_id","status","created_at"):op.create_index(f"ix_backup_logs_{c}","backup_logs",[c])
    op.create_table("restore_logs",sa.Column("id",sa.String(36),primary_key=True),sa.Column("backup_log_id",sa.String(36),sa.ForeignKey("backup_logs.id",ondelete="CASCADE"),nullable=False),sa.Column("tenant_id",sa.String(36),sa.ForeignKey("tenants.id",ondelete="SET NULL")),sa.Column("status",sa.String(24),nullable=False),sa.Column("started_at",sa.DateTime(timezone=True)),sa.Column("finished_at",sa.DateTime(timezone=True)),sa.Column("restored_by_user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="SET NULL")),sa.Column("restore_scope",sa.String(24),nullable=False),sa.Column("error_message",sa.Text()),sa.Column("verification_result",sa.JSON()),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now()))
    for c in ("backup_log_id","tenant_id","status","created_at"):op.create_index(f"ix_restore_logs_{c}","restore_logs",[c])

def downgrade():op.drop_table("restore_logs");op.drop_table("backup_logs")
