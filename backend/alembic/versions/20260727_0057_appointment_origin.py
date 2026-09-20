'''track appointment origin'''

from alembic import op
import sqlalchemy as sa


revision = '20260727_0057'
down_revision = '20260724_0056'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'appointments',
        sa.Column('origin', sa.String(length=32), nullable=False, server_default='cabinet'),
    )
    op.execute(sa.text('UPDATE appointments SET origin = :origin WHERE status = :status').bindparams(origin='online', status='requested'))
    op.create_index('ix_appointments_origin', 'appointments', ['tenant_id', 'origin'])


def downgrade() -> None:
    op.drop_index('ix_appointments_origin', table_name='appointments')
    op.drop_column('appointments', 'origin')
