"""professional patient-driven CNSS workflow

Revision ID: 20260728_0060
Revises: 20260727_0059
"""
from alembic import op
import sqlalchemy as sa

revision = "20260728_0060"
down_revision = "20260727_0059"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cnss_cases", sa.Column("appointment_id", sa.String(36), nullable=True))
    op.create_foreign_key("fk_cnss_cases_appointment", "cnss_cases", "appointments", ["appointment_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_cnss_cases_appointment_id", "cnss_cases", ["appointment_id"])
    op.add_column("cnss_cases", sa.Column("internal_notes", sa.Text(), nullable=True))
    op.add_column("cnss_cases", sa.Column("delivery_confirmed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("cnss_cases", sa.Column("delivery_confirmed_by_user_id", sa.String(36), nullable=True))
    op.create_foreign_key("fk_cnss_delivery_user", "cnss_cases", "users", ["delivery_confirmed_by_user_id"], ["id"], ondelete="SET NULL")
    op.add_column("cnss_cases", sa.Column("deposit_reference", sa.String(160), nullable=True))
    op.add_column("cnss_cases", sa.Column("decision_date", sa.Date(), nullable=True))
    op.add_column("cnss_cases", sa.Column("rejection_code", sa.String(64), nullable=True))
    op.add_column("cnss_status_history", sa.Column("changed_by_role", sa.String(32), nullable=True))
    op.add_column("cnss_status_history", sa.Column("event_metadata", sa.JSON(), nullable=True))
    op.execute("""
        UPDATE cnss_cases SET status = CASE status
            WHEN 'en_preparation' THEN 'REQUESTED'
            WHEN 'en_cours_de_traitement' THEN 'PROCESSING'
            WHEN 'traite' THEN 'READY_FOR_PICKUP'
            WHEN 'livre_au_patient' THEN 'DELIVERED_TO_PATIENT'
            WHEN 'depose_cnss' THEN 'SUBMITTED_TO_CNSS'
            WHEN 'rembourse' THEN 'APPROVED'
            WHEN 'rejete' THEN 'REJECTED'
            ELSE status
        END
    """)
    op.execute("""
        UPDATE cnss_status_history SET
          old_status = CASE old_status
            WHEN 'en_preparation' THEN 'REQUESTED' WHEN 'en_cours_de_traitement' THEN 'PROCESSING'
            WHEN 'traite' THEN 'READY_FOR_PICKUP' WHEN 'livre_au_patient' THEN 'DELIVERED_TO_PATIENT'
            WHEN 'depose_cnss' THEN 'SUBMITTED_TO_CNSS' WHEN 'rembourse' THEN 'APPROVED'
            WHEN 'rejete' THEN 'REJECTED' ELSE old_status END,
          new_status = CASE new_status
            WHEN 'en_preparation' THEN 'REQUESTED' WHEN 'en_cours_de_traitement' THEN 'PROCESSING'
            WHEN 'traite' THEN 'READY_FOR_PICKUP' WHEN 'livre_au_patient' THEN 'DELIVERED_TO_PATIENT'
            WHEN 'depose_cnss' THEN 'SUBMITTED_TO_CNSS' WHEN 'rembourse' THEN 'APPROVED'
            WHEN 'rejete' THEN 'REJECTED' ELSE new_status END
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE cnss_cases SET status = CASE status
            WHEN 'REQUESTED' THEN 'en_preparation' WHEN 'PROCESSING' THEN 'en_cours_de_traitement'
            WHEN 'READY_FOR_PICKUP' THEN 'traite' WHEN 'DELIVERED_TO_PATIENT' THEN 'livre_au_patient'
            WHEN 'SUBMITTED_TO_CNSS' THEN 'depose_cnss' WHEN 'APPROVED' THEN 'rembourse'
            WHEN 'REJECTED' THEN 'rejete' ELSE status END
    """)
    op.drop_column("cnss_status_history", "event_metadata")
    op.drop_column("cnss_status_history", "changed_by_role")
    op.drop_column("cnss_cases", "rejection_code")
    op.drop_column("cnss_cases", "decision_date")
    op.drop_column("cnss_cases", "deposit_reference")
    op.drop_constraint("fk_cnss_delivery_user", "cnss_cases", type_="foreignkey")
    op.drop_column("cnss_cases", "delivery_confirmed_by_user_id")
    op.drop_column("cnss_cases", "delivery_confirmed_at")
    op.drop_column("cnss_cases", "internal_notes")
    op.drop_index("ix_cnss_cases_appointment_id", table_name="cnss_cases")
    op.drop_constraint("fk_cnss_cases_appointment", "cnss_cases", type_="foreignkey")
    op.drop_column("cnss_cases", "appointment_id")
