"""ensure default payment methods for every tenant

Revision ID: 20260721_0041
Revises: 20260721_0040
"""
from alembic import op

revision = "20260721_0041"
down_revision = "20260721_0040"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        INSERT INTO payment_methods (id, tenant_id, name, code, main_type, subtype, is_active)
        SELECT md5(t.id || d.code), t.id, d.name, d.code, d.main_type, d.subtype, true
        FROM tenants t
        CROSS JOIN (VALUES
            ('Espèces','cash','ESPECE',NULL),
            ('Chèque','cheque','BANQUE','CHEQUE'),
            ('Carte bancaire','card','BANQUE','CARTE'),
            ('Virement bancaire','transfer','BANQUE','VIREMENT')
        ) AS d(name,code,main_type,subtype)
        WHERE NOT EXISTS (
            SELECT 1 FROM payment_methods p WHERE p.tenant_id=t.id AND p.code=d.code
        )
    """)


def downgrade():
    op.execute("""
        DELETE FROM payment_methods p
        USING tenants t
        WHERE p.tenant_id=t.id
          AND p.id IN (md5(t.id || 'cash'),md5(t.id || 'cheque'),md5(t.id || 'card'),md5(t.id || 'transfer'))
    """)
