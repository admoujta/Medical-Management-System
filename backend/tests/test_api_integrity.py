from collections import defaultdict
from unittest import TestCase

from pydantic import ValidationError

from app.main import app
from app.schemas.crud import PatientCreate


class ApiRouteIntegrityTests(TestCase):
    def test_no_duplicate_method_and_path(self):
        registered = defaultdict(list)
        for route in app.routes:
            for method in getattr(route, "methods", set()) or set():
                registered[(method, route.path)].append(route.name)
        duplicates = {key: names for key, names in registered.items() if len(names) > 1}
        self.assertEqual(duplicates, {})

    def test_multi_device_session_routes_are_available(self):
        registered = {
            (method, route.path)
            for route in app.routes
            for method in (getattr(route, "methods", set()) or set())
        }
        self.assertIn(("POST", "/api/auth/login"), registered)
        self.assertIn(("POST", "/api/auth/refresh"), registered)
        self.assertIn(("POST", "/api/auth/logout"), registered)
        self.assertIn(("POST", "/api/auth/logout-all"), registered)

    def test_patient_consolidated_report_route_is_available(self):
        registered = {
            (method, route.path)
            for route in app.routes
            for method in (getattr(route, "methods", set()) or set())
        }
        self.assertIn(("GET", "/api/patients/{patient_id}/report/{file_format}"), registered)

    def test_openapi_operation_ids_are_unique(self):
        operation_ids = defaultdict(list)
        for path, path_item in app.openapi()["paths"].items():
            for method, operation in path_item.items():
                if isinstance(operation, dict) and operation.get("operationId"):
                    operation_ids[operation["operationId"]].append((method.upper(), path))
        duplicates = {key: routes for key, routes in operation_ids.items() if len(routes) > 1}
        self.assertEqual(duplicates, {})

    def test_removed_legacy_routes_are_not_registered(self):
        registered = {(method, route.path) for route in app.routes for method in (getattr(route, "methods", set()) or set())}
        self.assertNotIn(("GET", "/api/staff/reminders"), registered)
        self.assertNotIn(("POST", "/api/staff/reminders/send"), registered)
        self.assertNotIn(("GET", "/api/security/audit-logs-export"), registered)
        self.assertFalse(any(path.startswith("/api/v1/") for _, path in registered))
        self.assertNotIn(("POST", "/api/documents/upload"), registered)
        self.assertNotIn(("POST", "/api/patients/{patient_id}/documents/upload"), registered)

    def test_document_routes_are_separated_by_actor(self):
        registered = {(method, route.path) for route in app.routes for method in (getattr(route, "methods", set()) or set())}
        expected = {
            ("GET", "/api/patient/documents"),
            ("GET", "/api/patient/documents/{item_id}"),
            ("GET", "/api/patient/documents/{item_id}/download"),
            ("GET", "/api/doctor/documents"),
            ("POST", "/api/doctor/patients/{patient_id}/documents"),
            ("GET", "/api/doctor/patients/{patient_id}/documents"),
        }
        self.assertTrue(expected.issubset(registered))

    def test_doctor_notification_read_all_precedes_dynamic_read_route(self):
        patch_paths = [
            route.path
            for route in app.routes
            if "PATCH" in (getattr(route, "methods", set()) or set())
        ]
        self.assertLess(
            patch_paths.index("/api/doctor/notifications/read-all"),
            patch_paths.index("/api/doctor/notifications/{item_id}/read"),
        )

    def test_patient_creation_requires_a_valid_email(self):
        payload = {
            "first_name": "Adam",
            "last_name": "Patient",
            "birth_date": "1990-01-01",
        }
        with self.assertRaises(ValidationError):
            PatientCreate.model_validate(payload)
        with self.assertRaises(ValidationError):
            PatientCreate.model_validate({**payload, "email": "adresse-invalide", "gender": "M"})
        with self.assertRaises(ValidationError):
            PatientCreate.model_validate({**payload, "email": "patient@example.com", "gender": "Autre"})

    def test_subscription_saas_routes_are_separate_from_medical_payments(self):
        registered = {(method, route.path) for route in app.routes for method in (getattr(route, "methods", set()) or set())}
        expected = {
            ("GET", "/api/public/subscription-plans"),
            ("GET", "/api/doctor/subscription"),
            ("POST", "/api/doctor/subscription/pay"),
            ("GET", "/api/doctor/subscription/payments"),
            ("GET", "/api/super-admin/subscription-payments"),
            ("PATCH", "/api/super-admin/subscription-payments/{item_id}/validate"),
        }
        self.assertTrue(expected.issubset(registered))
        self.assertIn(("POST", "/api/payments"), registered)
        self.assertNotIn(("POST", "/api/payments/subscription"), registered)

    def test_cnss_routes_reuse_the_existing_resource(self):
        registered = {(method, route.path) for route in app.routes for method in (getattr(route, "methods", set()) or set())}
        expected = {
            ("POST", "/api/cnss"),
            ("GET", "/api/cnss"),
            ("GET", "/api/cnss/{cnss_id}"),
            ("PATCH", "/api/cnss/{cnss_id}/status"),
            ("GET", "/api/cnss/{cnss_id}/history"),
            ("GET", "/api/cnss/{cnss_id}/documents"),
            ("POST", "/api/cnss/{cnss_id}/documents"),
            ("DELETE", "/api/cnss/{cnss_id}/documents/{document_id}"),
            ("GET", "/api/cnss/{cnss_id}/documents/{document_id}/preview"),
            ("GET", "/api/cnss/{cnss_id}/documents/{document_id}/download"),
            ("GET", "/api/patient/cnss/{item_id}/detail"),
            ("POST", "/api/patient/cnss"),
            ("PATCH", "/api/patient/cnss/{item_id}/action"),
            ("POST", "/api/patient/cnss/{item_id}/documents"),
        }
        self.assertTrue(expected.issubset(registered))

    def test_medication_catalog_routes_are_available_for_prescriptions(self):
        registered = {(method, route.path) for route in app.routes for method in (getattr(route, "methods", set()) or set())}
        self.assertIn(("GET", "/api/medications/catalog"), registered)
        self.assertIn(("GET", "/api/medications/catalog/specialties"), registered)

    def test_complete_appointment_details_route_is_available(self):
        registered = {
            (method, route.path)
            for route in app.routes
            for method in (getattr(route, "methods", set()) or set())
        }
        self.assertIn(
            ("GET", "/api/appointments/{appointment_id}/details"),
            registered,
        )

    def test_due_date_supporting_document_routes_are_available(self):
        registered = {
            (method, route.path)
            for route in app.routes
            for method in (getattr(route, "methods", set()) or set())
        }
        self.assertTrue(
            {
                ("POST", "/api/echeances/{item_id}/documents"),
                ("GET", "/api/echeances/{item_id}/documents"),
                ("GET", "/api/documents-echeance/{document_id}/preview"),
                ("GET", "/api/documents-echeance/{document_id}/download"),
                ("DELETE", "/api/documents-echeance/{document_id}"),
            }.issubset(registered)
        )

    def test_cabinet_bank_account_routes_are_available(self):
        registered = {
            (method, route.path)
            for route in app.routes
            for method in (getattr(route, "methods", set()) or set())
        }
        self.assertTrue(
            {
                ("GET", "/api/bank-accounts"),
                ("POST", "/api/bank-accounts"),
                ("PUT", "/api/bank-accounts/{item_id}"),
            }.issubset(registered)
        )

    def test_large_collections_expose_server_side_pagination(self):
        spec = app.openapi()
        paths = (
            "/api/users",
            "/api/patients",
            "/api/appointments",
            "/api/visits",
            "/api/honoraires",
            "/api/invoices",
            "/api/payments",
            "/api/cnss",
            "/api/prescriptions",
            "/api/doctor/documents",
            "/api/expenses",
            "/api/purchase-orders",
            "/api/whatsapp/templates",
            "/api/whatsapp/messages",
        )
        for path in paths:
            parameters = {
                parameter["name"]
                for parameter in spec["paths"][path]["get"].get("parameters", [])
            }
            self.assertTrue(
                {"page", "page_size", "search", "sort_by", "sort_order"}.issubset(
                    parameters
                ),
                path,
            )

    def test_patient_portal_collections_expose_pagination(self):
        spec = app.openapi()
        paths = (
            "/api/patient/appointments",
            "/api/patient/visits",
            "/api/patient/documents",
            "/api/patient/prescriptions",
            "/api/patient/cnss",
            "/api/patient/payments",
            "/api/patient/honoraires",
        )
        for path in paths:
            parameters = {
                parameter["name"]
                for parameter in spec["paths"][path]["get"].get("parameters", [])
            }
            self.assertTrue({"page", "page_size", "search"}.issubset(parameters), path)

    def test_platform_admin_growing_collections_expose_pagination(self):
        spec = app.openapi()
        paths = (
            "/api/super-admin/instances",
            "/api/super-admin/subscriptions",
            "/api/super-admin/support-tickets",
            "/api/super-admin/audit-logs",
            "/api/super-admin/backups",
            "/api/super-admin/restores",
            "/api/super-admin/subscription-payments",
            "/api/super-admin/users",
            "/api/super-admin/events",
        )
        for path in paths:
            parameters = {
                parameter["name"]
                for parameter in spec["paths"][path]["get"].get("parameters", [])
            }
            self.assertTrue({"page", "page_size", "search"}.issubset(parameters), path)
