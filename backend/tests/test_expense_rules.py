from datetime import date
from decimal import Decimal
from unittest import TestCase

from app.schemas.crud import ExpenseCreate


class ExpenseCalculationTests(TestCase):
    def test_calculates_ht_tax_and_ttc_from_lines(self):
        expense = ExpenseCreate(
            label="Commande de consommables",
            category="Fournitures",
            expense_type="VARIABLE",
            expense_date=date(2026, 7, 29),
            supplier_id="supplier-id",
            items=[
                {
                    "product_id": "gloves",
                    "description": "Boîtes de gants",
                    "quantity": "3",
                    "unit": "boîte",
                    "unit_price_ht": "100",
                    "tax_rate": "20",
                },
                {
                    "product_id": "paper",
                    "description": "Papier d’examen",
                    "quantity": "2",
                    "unit": "rouleau",
                    "unit_price_ht": "50",
                    "tax_rate": "10",
                },
            ],
        )
        self.assertEqual(expense.amount_ht, Decimal("400.00"))
        self.assertEqual(expense.tax_amount, Decimal("70.00"))
        self.assertEqual(expense.amount_ttc, Decimal("470.00"))
        self.assertEqual(expense.amount, Decimal("470.00"))
