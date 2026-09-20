from datetime import date
from decimal import Decimal
from unittest import TestCase

from pydantic import ValidationError

from app.models.financial import PaymentDueDate
from app.schemas.crud import BankAccountCreate, DueDateCreate, PaymentCreate
from app.services.crud_service import build_installment_schedule, refresh_due_status


class InstallmentScheduleTests(TestCase):
    def test_distributes_cents_without_losing_money(self):
        schedule = build_installment_schedule(1000, date(2026, 7, 31), 3)
        self.assertEqual(Decimal(str(sum(row["amount"] for row in schedule))), Decimal("1000.0"))
        self.assertEqual([row["amount"] for row in schedule], [333.34, 333.33, 333.33])

    def test_handles_end_of_month(self):
        schedule = build_installment_schedule(600, date(2026, 1, 31), 3)
        self.assertEqual([row["due_date"] for row in schedule], ["2026-01-31", "2026-02-28", "2026-03-31"])

    def test_rejects_no_amount_loss_on_small_values(self):
        schedule = build_installment_schedule(0.05, date(2026, 7, 1), 2)
        self.assertEqual([row["amount"] for row in schedule], [0.03, 0.02])


class DueDateStatusTests(TestCase):
    def row(self, amount, paid, due_date, status="A_VENIR"):
        return PaymentDueDate(amount=Decimal(amount), paid_amount=Decimal(paid), due_date=due_date, status=status)

    def test_paid_status(self):
        row = self.row("300", "300", date.today())
        refresh_due_status(row)
        self.assertEqual(row.status, "PAYEE")

    def test_new_due_without_persisted_paid_amount_starts_at_zero(self):
        row = PaymentDueDate(amount=Decimal("1000"), paid_amount=None, due_date=date(2099, 1, 1), status="A_VENIR")
        refresh_due_status(row)
        self.assertEqual(row.status, "A_VENIR")

    def test_partial_status(self):
        row = self.row("300", "100", date.today())
        refresh_due_status(row)
        self.assertEqual(row.status, "PARTIELLEMENT_PAYEE")

    def test_future_status(self):
        row = self.row("300", "0", date(2099, 1, 1))
        refresh_due_status(row)
        self.assertEqual(row.status, "A_VENIR")

    def test_waiting_status_on_due_date(self):
        row = self.row("300", "0", date.today())
        refresh_due_status(row)
        self.assertEqual(row.status, "EN_ATTENTE")

    def test_late_status(self):
        row = self.row("300", "0", date(2020, 1, 1))
        refresh_due_status(row)
        self.assertEqual(row.status, "EN_RETARD")

    def test_partially_paid_but_overdue_is_late(self):
        row = self.row("1000", "400", date(2020, 1, 1))
        refresh_due_status(row)
        self.assertEqual(row.status, "EN_RETARD")

    def test_remaining_amount_is_computed(self):
        row = self.row("1000", "400", date.today())
        self.assertEqual(row.remaining_amount, Decimal("600"))

    def test_cancelled_status_is_never_overwritten(self):
        row = self.row("300", "0", date(2020, 1, 1), "ANNULEE")
        refresh_due_status(row)
        self.assertEqual(row.status, "ANNULEE")


class DueDateGuaranteeTests(TestCase):
    def test_simple_due_date_does_not_require_a_document(self):
        payload = DueDateCreate(
            amount=Decimal("300.00"),
            due_date=date(2026, 8, 31),
            guarantee_type="NORMAL",
        )
        self.assertEqual(payload.guarantee_type, "NORMAL")
        self.assertIsNone(payload.guarantor_cin)

    def test_guarantor_requires_name_and_cin(self):
        with self.assertRaises(ValidationError):
            DueDateCreate(
                amount=Decimal("300.00"),
                due_date=date(2026, 8, 31),
                guarantee_type="GUARANTOR",
                guarantor_name="Garant",
            )
        payload = DueDateCreate(
            amount=Decimal("300.00"),
            due_date=date(2026, 8, 31),
            guarantee_type="GUARANTOR",
            guarantor_name="Garant Exemple",
            guarantor_cin="AB123456",
        )
        self.assertEqual(payload.guarantor_cin, "AB123456")

    def test_cheque_requires_complete_details_and_valid_dates(self):
        with self.assertRaises(ValidationError):
            DueDateCreate(
                amount=Decimal("300.00"),
                due_date=date(2026, 8, 31),
                guarantee_type="CHEQUE",
                guarantee_cheque_bank="Banque",
                guarantee_cheque_number="CH-1",
                guarantee_cheque_issue_date=date(2026, 9, 1),
                guarantee_cheque_due_date=date(2026, 8, 31),
            )
        payload = DueDateCreate(
            amount=Decimal("300.00"),
            due_date=date(2026, 8, 31),
            guarantee_type="CHEQUE",
            guarantee_cheque_bank="Banque",
            guarantee_cheque_number="CH-1",
            guarantee_cheque_issue_date=date(2026, 8, 1),
            guarantee_cheque_due_date=date(2026, 8, 31),
        )
        self.assertEqual(payload.guarantee_cheque_number, "CH-1")


class BankAccountPaymentTests(TestCase):
    def test_bank_account_contract_accepts_complete_cabinet_data(self):
        payload = BankAccountCreate(
            label="Compte principal",
            bank_name="Banque Exemple",
            account_holder="Cabinet Exemple",
            rib="1234 5678 9012 3456",
            iban="MA64 1234 5678 9012 3456",
            is_default=True,
        )
        self.assertTrue(payload.is_default)
        self.assertEqual(payload.bank_name, "Banque Exemple")

    def test_payment_contract_carries_the_selected_bank_account(self):
        payload = PaymentCreate(
            patient_id="patient-id",
            fee_id="fee-id",
            amount=250,
            method="transfer",
            bank_account_id="bank-account-id",
        )
        self.assertEqual(payload.bank_account_id, "bank-account-id")
