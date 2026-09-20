from datetime import UTC, datetime, timedelta
from unittest import TestCase

from pydantic import ValidationError

from app.main import app
from app.schemas.admin import PlatformEventCreate, PublicEventRegistrationCreate


class EventWorkflowRulesTests(TestCase):
    def event_payload(self, **updates):
        now = datetime.now(UTC) + timedelta(days=2)
        payload = {
            "title": "Atelier FADAA Santé",
            "event_type": "Atelier",
            "start_at": now,
            "end_at": now + timedelta(hours=2),
            "location": "Centre FADAA",
            "attendance_mode": "in_person",
            "registration_mode": "internal",
        }
        payload.update(updates)
        return payload

    def test_online_event_requires_a_meeting_link(self):
        with self.assertRaises(ValidationError):
            PlatformEventCreate.model_validate(
                self.event_payload(attendance_mode="online", location="En ligne")
            )
        item = PlatformEventCreate.model_validate(
            self.event_payload(
                attendance_mode="online",
                location="En ligne",
                online_provider="Google Meet",
                online_url="https://meet.google.com/abc-defg-hij",
            )
        )
        self.assertEqual(item.attendance_mode, "online")

    def test_external_registration_requires_a_url(self):
        with self.assertRaises(ValidationError):
            PlatformEventCreate.model_validate(
                self.event_payload(registration_mode="external")
            )

    def test_group_registration_accepts_multiple_participants(self):
        payload = PublicEventRegistrationCreate.model_validate(
            {
                "contact_first_name": "Adam",
                "contact_last_name": "Test",
                "contact_email": "adam@example.com",
                "contact_phone": "0612345678",
                "consent_accepted": True,
                "participants": [
                    {"first_name": "Adam", "last_name": "Test"},
                    {"first_name": "Sara", "last_name": "Test"},
                ],
            }
        )
        self.assertEqual(len(payload.participants), 2)

    def test_event_registration_routes_are_available(self):
        registered = {
            (method, route.path)
            for route in app.routes
            for method in (getattr(route, "methods", set()) or set())
        }
        self.assertIn(
            ("POST", "/api/public/events/{event_id}/registrations"), registered
        )
        self.assertIn(
            ("GET", "/api/super-admin/events/{event_id}/registrations"), registered
        )
