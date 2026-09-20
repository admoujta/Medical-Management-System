"""allow multiple reviews per patient and doctor

Revision ID: 20260721_0043
Revises: 20260721_0042
"""
from alembic import op

revision="20260721_0043"
down_revision="20260721_0042"
branch_labels=None
depends_on=None

def upgrade():
    op.drop_constraint("uq_doctor_review_patient","doctor_reviews",type_="unique")

def downgrade():
    op.create_unique_constraint("uq_doctor_review_patient","doctor_reviews",["doctor_id","patient_id"])
