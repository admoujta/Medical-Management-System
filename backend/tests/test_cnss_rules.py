from decimal import Decimal
from datetime import date, timedelta
from unittest import TestCase

from pydantic import ValidationError

from app.schemas.crud import CNSSCreate, CNSSOut
from app.schemas.patient import PatientCNSSAction, PatientCNSSCreate, PatientProfileUpdate
from app.services import patient_service
from app.services.crud_service import CNSS_CABINET_TRANSITIONS
from app.services.patient_service import CNSS_PATIENT_ACTIONS_BY_STATUS


class CNSSValidationTests(TestCase):
    def test_patient_cnss_deposit_deadline_cannot_be_in_the_past(self):
        with self.assertRaises(ValidationError):
            PatientCNSSCreate(
                appointment_id="appointment-1",
                deposit_deadline=date.today() - timedelta(days=1),
            )

    def test_patient_cnss_deposit_reminder_is_limited_to_thirty_days(self):
        self.assertEqual(
            PatientProfileUpdate(cnss_deposit_reminder_days=7).cnss_deposit_reminder_days,
            7,
        )
        with self.assertRaises(ValidationError):
            PatientProfileUpdate(cnss_deposit_reminder_days=31)

    def test_patient_cnss_amount_decimal_dependency_is_available(self):
        self.assertEqual(patient_service.Decimal("99.95"), Decimal("99.95"))

    def test_reimbursement_cannot_exceed_total_amount(self):
        with self.assertRaises(ValidationError):
            CNSSCreate(
                patient_id="patient-1",
                status="APPROVED",
                total_amount=Decimal("500"),
                reimbursed_amount=Decimal("600"),
            )

    def test_remaining_patient_amount_is_computed(self):
        item = CNSSOut.model_validate({
            "id": "cnss-1",
            "patient_id": "patient-1",
            "tenant_id": "tenant-1",
            "reference": None,
            "label": "Dossier CNSS",
            "description": None,
            "requested_amount": Decimal("700"),
            "total_amount": Decimal("1000"),
            "estimated_reimbursable_amount": Decimal("700"),
            "reimbursed_amount": Decimal("650"),
            "status": "APPROVED",
            "deposit_date": None,
            "reimbursement_date": "2026-07-27",
            "rejection_reason": None,
            "file_url": None,
            "created_at": "2026-07-27T10:00:00Z",
        })
        self.assertEqual(item.remaining_patient_amount, Decimal("350"))

    def test_patient_request_requires_a_medical_link(self):
        with self.assertRaises(ValidationError):
            PatientCNSSCreate()

    def test_patient_deposit_requires_a_date(self):
        with self.assertRaises(ValidationError):
            PatientCNSSAction(action="confirm_deposit")

    def test_patient_rejection_requires_date_and_reason(self):
        with self.assertRaises(ValidationError):
            PatientCNSSAction(action="declare_rejected")

    def test_other_rejection_reason_requires_comment(self):
        with self.assertRaises(ValidationError):
            PatientCNSSAction(action="declare_rejected",decision_date="2026-07-28",rejection_code="OTHER")

    def test_workflow_does_not_allow_skipping_steps(self):
        self.assertEqual(CNSS_CABINET_TRANSITIONS["REQUESTED"],{"PROCESSING"})
        self.assertNotIn("READY_FOR_PICKUP",CNSS_CABINET_TRANSITIONS["REQUESTED"])
        self.assertEqual(CNSS_PATIENT_ACTIONS_BY_STATUS["READY_FOR_PICKUP"],{"confirm_pickup"})
        self.assertNotIn("declare_approved",CNSS_PATIENT_ACTIONS_BY_STATUS["READY_FOR_PICKUP"])

    def test_final_decision_belongs_to_patient(self):
        self.assertEqual(CNSS_CABINET_TRANSITIONS["SUBMITTED_TO_CNSS"],set())
        self.assertEqual(CNSS_PATIENT_ACTIONS_BY_STATUS["SUBMITTED_TO_CNSS"],{"declare_approved","declare_rejected"})
