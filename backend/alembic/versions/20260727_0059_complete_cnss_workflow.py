"""complete CNSS workflow and financial calculation fields

Revision ID: 20260727_0059
Revises: 20260727_0058
"""
from alembic import op
import sqlalchemy as sa

revision = "20260727_0059"
down_revision = "20260727_0058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cnss_cases", sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"))
    op.add_column("cnss_cases", sa.Column("estimated_reimbursable_amount", sa.Numeric(12, 2), nullable=False, server_default="0"))
    op.add_column("cnss_status_history", sa.Column("rejection_reason", sa.Text(), nullable=True))
    op.execute("UPDATE cnss_cases SET total_amount = COALESCE(requested_amount, 0), estimated_reimbursable_amount = COALESCE(requested_amount, 0)")
    op.execute("""
        UPDATE cnss_cases SET status = CASE status
            WHEN 'a_constituer' THEN 'en_preparation'
            WHEN 'depose' THEN 'depose_cnss'
            WHEN 'en_cours' THEN 'en_cours_de_traitement'
            WHEN 'pending' THEN 'en_preparation'
            WHEN 'in_progress' THEN 'en_cours_de_traitement'
            ELSE status
        END
    """)
    op.execute("""
        UPDATE cnss_status_history SET
            old_status = CASE old_status
                WHEN 'a_constituer' THEN 'en_preparation'
                WHEN 'depose' THEN 'depose_cnss'
                WHEN 'en_cours' THEN 'en_cours_de_traitement'
                WHEN 'pending' THEN 'en_preparation'
                WHEN 'in_progress' THEN 'en_cours_de_traitement'
                ELSE old_status
            END,
            new_status = CASE new_status
                WHEN 'a_constituer' THEN 'en_preparation'
                WHEN 'depose' THEN 'depose_cnss'
                WHEN 'en_cours' THEN 'en_cours_de_traitement'
                WHEN 'pending' THEN 'en_preparation'
                WHEN 'in_progress' THEN 'en_cours_de_traitement'
                ELSE new_status
            END
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE cnss_cases SET status = CASE status
            WHEN 'en_preparation' THEN 'a_constituer'
            WHEN 'en_cours_de_traitement' THEN 'en_cours'
            WHEN 'traite' THEN 'en_cours'
            WHEN 'livre_au_patient' THEN 'en_cours'
            WHEN 'depose_cnss' THEN 'depose'
            ELSE status
        END
    """)
    op.drop_column("cnss_status_history", "rejection_reason")
    op.drop_column("cnss_cases", "estimated_reimbursable_amount")
    op.drop_column("cnss_cases", "total_amount")
