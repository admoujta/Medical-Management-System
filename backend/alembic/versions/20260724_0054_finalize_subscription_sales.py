"""finalize subscription sales defaults

Revision ID: 20260724_0054
Revises: 20260724_0053
"""
from alembic import op

revision = "20260724_0054"
down_revision = "20260724_0053"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        """
        UPDATE subscription_plans
        SET slug = CASE
            WHEN lower(name) = 'essentiel' THEN 'essentiel'
            WHEN lower(name) = 'professionnel' THEN 'professionnel'
            ELSE lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
        END
        WHERE slug IS NULL OR btrim(slug) = ''
        """
    )
    op.execute(
        """
        UPDATE subscription_plans
        SET description = 'Les fonctions essentielles pour démarrer et gérer un cabinet médical.'
        WHERE lower(name) = 'essentiel' AND (description IS NULL OR btrim(description) = '')
        """
    )
    op.execute(
        """
        UPDATE subscription_plans
        SET description = 'Une gestion complète pour les cabinets structurés et leurs équipes.',
            is_featured = true,
            whatsapp_enabled = true,
            cnss_enabled = true,
            statistics_enabled = true
        WHERE lower(name) = 'professionnel'
        """
    )


def downgrade():
    # Les slugs peuvent déjà être utilisés par des inscriptions : ils sont conservés.
    op.execute("UPDATE subscription_plans SET is_featured = false WHERE lower(name) = 'professionnel'")
