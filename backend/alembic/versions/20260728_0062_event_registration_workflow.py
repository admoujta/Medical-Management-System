"""event location and registration workflow

Revision ID: 20260728_0062
Revises: 20260728_0061
"""
from alembic import op
import sqlalchemy as sa


revision = "20260728_0062"
down_revision = "20260728_0061"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("platform_events", sa.Column("attendance_mode", sa.String(24), nullable=False, server_default="in_person"))
    op.add_column("platform_events", sa.Column("venue_name", sa.String(180), nullable=True))
    op.add_column("platform_events", sa.Column("address", sa.String(300), nullable=True))
    op.add_column("platform_events", sa.Column("city", sa.String(120), nullable=True))
    op.add_column("platform_events", sa.Column("country", sa.String(120), nullable=True, server_default="Maroc"))
    op.add_column("platform_events", sa.Column("map_url", sa.String(500), nullable=True))
    op.add_column("platform_events", sa.Column("online_provider", sa.String(60), nullable=True))
    op.add_column("platform_events", sa.Column("online_url", sa.String(500), nullable=True))
    op.add_column("platform_events", sa.Column("registration_mode", sa.String(24), nullable=False, server_default="internal"))
    op.create_index("ix_platform_events_attendance_mode", "platform_events", ["attendance_mode"])
    op.execute(
        "UPDATE platform_events SET attendance_mode = CASE WHEN is_online THEN 'online' ELSE 'in_person' END"
    )

    op.create_table(
        "event_registrations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("event_id", sa.String(36), sa.ForeignKey("platform_events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reference", sa.String(32), nullable=False, unique=True),
        sa.Column("contact_first_name", sa.String(100), nullable=False),
        sa.Column("contact_last_name", sa.String(100), nullable=False),
        sa.Column("contact_email", sa.String(320), nullable=False),
        sa.Column("contact_phone", sa.String(40), nullable=False),
        sa.Column("participant_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="confirmed"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("consent_accepted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_event_registrations_event_id", "event_registrations", ["event_id"])
    op.create_index("ix_event_registrations_reference", "event_registrations", ["reference"])
    op.create_index("ix_event_registrations_contact_email", "event_registrations", ["contact_email"])
    op.create_index("ix_event_registrations_status", "event_registrations", ["status"])
    op.create_index("ix_event_registrations_created_at", "event_registrations", ["created_at"])

    op.create_table(
        "event_participants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("registration_id", sa.String(36), sa.ForeignKey("event_registrations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("phone", sa.String(40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_event_participants_registration_id", "event_participants", ["registration_id"])


def downgrade() -> None:
    op.drop_table("event_participants")
    op.drop_table("event_registrations")
    op.drop_index("ix_platform_events_attendance_mode", table_name="platform_events")
    for column in (
        "registration_mode",
        "online_url",
        "online_provider",
        "map_url",
        "country",
        "city",
        "address",
        "venue_name",
        "attendance_mode",
    ):
        op.drop_column("platform_events", column)
