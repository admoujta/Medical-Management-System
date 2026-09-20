from datetime import UTC, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import MagicMock

from fastapi import HTTPException
from app.main import app
from app.models import Payment
from app.schemas.appointment_details import (
    AppointmentDetailsAppointment,
    AppointmentDetailsCabinet,
    AppointmentDetailsDoctor,
    AppointmentDetailsPatient,
    AppointmentDetailsResponse,
)
from app.services.appointment_details_service import (
    actual_duration_seconds,
    _actor,
    _load_appointment,
    honoraire_totals,
    money,
    payment_counts_as_paid,
)


class AppointmentDetailsFinancialRulesTests(TestCase):
    def payment(self, *, status="PAYE", method="cash", cheque_status=None):
        return Payment(
            tenant_id="tenant",
            patient_id="patient",
            fee_id="fee",
            amount=Decimal("100.00"),
            status=status,
            method=method,
            cheque_status=cheque_status,
        )

    def test_money_is_decimal_safe(self):
        self.assertEqual(money("0.105"), Decimal("0.11"))
        self.assertIsInstance(money("500.00"), Decimal)

    def test_cancelled_failed_reversed_and_refunded_payments_are_excluded(self):
        for status in ("ANNULE", "REMBOURSE", "ECHEC", "FAILED", "REVERSED", "CANCELLED"):
            with self.subTest(status=status):
                self.assertFalse(payment_counts_as_paid(self.payment(status=status)))

    def test_valid_payment_is_counted(self):
        self.assertTrue(payment_counts_as_paid(self.payment()))

    def test_pending_cheque_is_not_counted(self):
        self.assertFalse(
            payment_counts_as_paid(
                self.payment(method="cheque", cheque_status="EN_ATTENTE")
            )
        )
        self.assertTrue(
            payment_counts_as_paid(
                self.payment(method="cheque", cheque_status="ENCAISSE")
            )
        )

    def test_honoraire_totals_ignore_cancelled_payments(self):
        valid = self.payment()
        valid.amount = Decimal("300.00")
        cancelled = self.payment(status="ANNULE")
        cancelled.amount = Decimal("200.00")
        self.assertEqual(
            honoraire_totals("500.00", [valid, cancelled]),
            (Decimal("500.00"), Decimal("300.00"), Decimal("200.00")),
        )


class AppointmentDetailsDurationTests(TestCase):
    def test_stored_duration_has_priority(self):
        self.assertEqual(actual_duration_seconds(42, None, None), 42)

    def test_duration_is_null_without_both_actual_timestamps(self):
        now = datetime.now(UTC)
        self.assertIsNone(actual_duration_seconds(None, now, None))

    def test_actual_duration_handles_cross_midnight(self):
        started = datetime(2026, 7, 28, 23, 50, tzinfo=UTC)
        ended = started + timedelta(minutes=25)
        self.assertEqual(actual_duration_seconds(None, started, ended), 1500)


class AppointmentDetailsContractTests(TestCase):
    def response(self):
        now = datetime.now(UTC)
        return AppointmentDetailsResponse(
            appointment=AppointmentDetailsAppointment(
                id="appointment",
                date=now.date(),
                start_time=now.time(),
                end_time=now.time(),
                actual_start_time=None,
                actual_end_time=None,
                duration_seconds=None,
                reason=None,
                notes=None,
                status="planned",
            ),
            patient=AppointmentDetailsPatient(
                id="patient",
                full_name="Pat Patient",
                phone=None,
                email=None,
                gender=None,
                birth_date=now.date(),
                address=None,
                account_status="active",
            ),
            doctor=AppointmentDetailsDoctor(
                id="doctor",
                full_name="Dr Médecin",
                specialty="Médecine générale",
                phone=None,
                email=None,
            ),
            cabinet=AppointmentDetailsCabinet(
                id="tenant",
                name="Cabinet",
                address="Adresse",
                phone="+212600000000",
            ),
            visit=None,
        )

    def test_absent_visit_is_explicitly_null(self):
        self.assertIsNone(self.response().visit)

    def test_missing_collections_are_empty_arrays(self):
        payload = self.response().model_dump()
        for field in (
            "honoraires",
            "payments",
            "prescriptions",
            "documents",
            "cnss_records",
            "activity_history",
        ):
            self.assertEqual(payload[field], [], field)

    def test_all_expected_top_level_fields_are_stable(self):
        self.assertEqual(
            set(self.response().model_dump()),
            {
                "appointment",
                "patient",
                "doctor",
                "cabinet",
                "visit",
                "honoraires",
                "payments",
                "prescriptions",
                "documents",
                "cnss_records",
                "activity_history",
            },
        )

    def test_dedicated_endpoint_is_documented_without_changing_basic_endpoint(self):
        spec = app.openapi()
        self.assertIn("/api/appointments/{appointment_id}", spec["paths"])
        details = spec["paths"]["/api/appointments/{appointment_id}/details"]["get"]
        self.assertEqual(
            details["responses"]["200"]["content"]["application/json"]["schema"]["$ref"],
            "#/components/schemas/AppointmentDetailsResponse",
        )
        self.assertTrue({"401", "403", "404"}.issubset(details["responses"]))

    def test_openapi_contract_marks_visit_nullable_and_collections_as_arrays(self):
        schema = app.openapi()["components"]["schemas"]["AppointmentDetailsResponse"]
        visit_schema = schema["properties"]["visit"]
        self.assertIn({"type": "null"}, visit_schema["anyOf"])
        for field in (
            "honoraires",
            "payments",
            "prescriptions",
            "documents",
            "cnss_records",
            "activity_history",
        ):
            self.assertEqual(schema["properties"][field]["type"], "array")


class AppointmentDetailsAccessTests(TestCase):
    def user(self, role, *, patient_profile=None):
        return SimpleNamespace(
            id=f"user-{role}",
            tenant_id="tenant-a",
            active_tenant_id="tenant-a",
            roles=[SimpleNamespace(code=role)],
            patient_profile=patient_profile,
        )

    def appointment(self, patient_id="patient-a"):
        return SimpleNamespace(id="appointment", patient_id=patient_id)

    def test_authorized_doctor_can_resolve_appointment(self):
        db = MagicMock()
        db.scalar.return_value = self.appointment()
        appointment, is_patient = _load_appointment(
            db, self.user("MEDECIN_ADMIN"), "appointment"
        )
        self.assertEqual(appointment.id, "appointment")
        self.assertFalse(is_patient)

    def test_authorized_secretary_can_resolve_appointment(self):
        db = MagicMock()
        db.scalar.side_effect = [self.appointment(), None]
        appointment, is_patient = _load_appointment(
            db, self.user("SECRETAIRE"), "appointment"
        )
        self.assertEqual(appointment.id, "appointment")
        self.assertFalse(is_patient)

    def test_linked_patient_can_resolve_appointment(self):
        profile = SimpleNamespace(id="patient-a")
        db = MagicMock()
        db.scalar.return_value = self.appointment()
        appointment, is_patient = _load_appointment(
            db,
            self.user("PATIENT", patient_profile=profile),
            "appointment",
        )
        self.assertEqual(appointment.patient_id, profile.id)
        self.assertTrue(is_patient)

    def test_unlinked_patient_is_hidden_with_404(self):
        db = MagicMock()
        db.scalar.return_value = self.appointment(patient_id="another-patient")
        with self.assertRaises(HTTPException) as error:
            _load_appointment(
                db,
                self.user("PATIENT", patient_profile=SimpleNamespace(id="patient-a")),
                "appointment",
            )
        self.assertEqual(error.exception.status_code, 404)

    def test_unauthorized_role_is_rejected(self):
        db = MagicMock()
        db.scalar.return_value = self.appointment()
        with self.assertRaises(HTTPException) as error:
            _load_appointment(db, self.user("SUPER_ADMIN_IRMA"), "appointment")
        self.assertEqual(error.exception.status_code, 403)

    def test_cross_tenant_or_nonexistent_appointment_is_hidden_with_404(self):
        db = MagicMock()
        db.scalar.return_value = None
        with self.assertRaises(HTTPException) as error:
            _load_appointment(db, self.user("MEDECIN_ADMIN"), "outside-tenant")
        self.assertEqual(error.exception.status_code, 404)

    def test_activity_actor_uses_full_name_or_system_identity(self):
        user = SimpleNamespace(id="user-1", first_name="Adam", last_name="Médecin")
        self.assertEqual(_actor("user-1", {"user-1": user}).full_name, "Adam Médecin")
        system = _actor(None, {})
        self.assertIsNone(system.id)
        self.assertEqual(system.full_name, "Système")
