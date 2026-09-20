from unittest import TestCase
from types import SimpleNamespace

from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.whatsapp import CabinetWhatsAppWrite
from app.services.whatsapp_consent_service import can_send_whatsapp, require_can_send
from app.services.whatsapp_service import _meta_body, _meta_status, cabinet_meta_ready


class WhatsAppTemplateRulesTests(TestCase):
    def test_converts_named_variables_in_meta_order(self):
        body, variables = _meta_body("Bonjour {patient_name}, reste {rap} chez {cabinet_name}.")
        self.assertEqual(body, "Bonjour {{1}}, reste {{2}} chez {{3}}.")
        self.assertEqual(variables, ["patient_name", "rap", "cabinet_name"])

    def test_repeated_variable_keeps_same_meta_index(self):
        body, variables = _meta_body("{patient_name} / {patient_name}")
        self.assertEqual(body, "{{1}} / {{1}}")
        self.assertEqual(variables, ["patient_name"])

    def test_maps_meta_template_statuses(self):
        self.assertEqual(_meta_status("APPROVED"), "valide")
        self.assertEqual(_meta_status("REJECTED"), "refuse")
        self.assertEqual(_meta_status("PENDING"), "en_attente_validation")

    def test_legacy_platform_placeholder_is_not_a_ready_cabinet(self):
        self.assertFalse(cabinet_meta_ready(SimpleNamespace(
            status="connecte",
            phone_number_id="platform-managed",
            whatsapp_business_account_id="platform-managed",
        )))
        self.assertTrue(cabinet_meta_ready(SimpleNamespace(
            status="connecte",
            phone_number_id="123456789",
            whatsapp_business_account_id="987654321",
        )))


class WhatsAppPhoneRulesTests(TestCase):
    @staticmethod
    def payload(phone_number: str):
        return CabinetWhatsAppWrite(
            business_account_name="Cabinet Test",
            phone_number=phone_number,
            phone_number_id="123456789",
            whatsapp_business_account_id="987654321",
            access_token="meta-token-test",
            webhook_verify_token="verify-token-test",
            webhook_url="https://example.test/api/webhooks/whatsapp",
        )

    def test_normalizes_moroccan_phone(self):
        payload = self.payload("06 12 34 56 78")
        self.assertEqual(payload.phone_number, "+212612345678")

    def test_rejects_invalid_phone(self):
        with self.assertRaises(ValidationError):
            self.payload("123")


class WhatsAppConsentRulesTests(TestCase):
    @staticmethod
    def patient(status: str, opt_in: bool, opt_out=None, phone="+212612345678"):
        return SimpleNamespace(
            whatsapp_consent_status=status,
            whatsapp_opt_in=opt_in,
            whatsapp_opt_out_at=opt_out,
            whatsapp_phone_number=phone,
            user=SimpleNamespace(phone=phone),
        )

    def test_accepted_consent_allows_send(self):
        self.assertTrue(can_send_whatsapp(self.patient("accepted", True)))

    def test_pending_and_refused_consent_block_send(self):
        self.assertFalse(can_send_whatsapp(self.patient("pending", False)))
        self.assertFalse(can_send_whatsapp(self.patient("refused", False)))
        with self.assertRaises(HTTPException) as pending:
            require_can_send(self.patient("pending", False))
        self.assertIn("pas encore donné", pending.exception.detail)
        with self.assertRaises(HTTPException) as refused:
            require_can_send(self.patient("refused", False))
        self.assertIn("refuse", refused.exception.detail)

    def test_withdrawn_consent_has_specific_error(self):
        patient = self.patient("withdrawn", False)
        with self.assertRaises(HTTPException) as context:
            require_can_send(patient)
        self.assertIn("retiré", context.exception.detail)
