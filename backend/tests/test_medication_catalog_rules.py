from unittest import TestCase

from pydantic import ValidationError

from app.schemas.crud import PrescriptionItem


class MedicationCatalogRulesTests(TestCase):
    def test_custom_medication_remains_supported(self):
        item = PrescriptionItem(medication="Préparation personnalisée")
        self.assertEqual(item.medication_source, "custom")
        self.assertIsNone(item.catalog_medication_id)

    def test_catalog_medication_requires_catalog_identifier(self):
        with self.assertRaises(ValidationError):
            PrescriptionItem(medication="Médicament", medication_source="catalog")

    def test_catalog_medication_can_keep_prescription_specific_dosage(self):
        item = PrescriptionItem(
            medication="Médicament catalogue",
            medication_source="catalog",
            catalog_medication_id="medication-1",
            dosage="1 comprimé",
        )
        self.assertEqual(item.catalog_medication_id, "medication-1")
        self.assertEqual(item.dosage, "1 comprimé")
