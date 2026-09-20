from unittest import TestCase
from unittest.mock import MagicMock, patch

from app.services.email_service import send_staff_activation_email


class StaffInvitationEmailTests(TestCase):
    @patch("app.services.email_service.smtplib.SMTP")
    @patch("app.services.email_service.settings")
    def test_invitation_uses_verified_sender_and_doctor_reply_to(self, settings, smtp_class):
        settings.smtp_username = "mailer@fadaa-sante.ma"
        settings.smtp_password = "secret"
        settings.smtp_from_email = "no-reply@fadaa-sante.ma"
        settings.smtp_host = "smtp.example.com"
        settings.smtp_port = 587
        settings.smtp_use_tls = True
        smtp = MagicMock()
        smtp_class.return_value.__enter__.return_value = smtp

        send_staff_activation_email(
            "secretaire@example.com",
            "Sara Assistante",
            "Cabinet Atlas",
            "https://app.example.com/activate-staff/token",
            doctor_name="Dr Adam Exemple",
            doctor_email="adam@example.com",
        )

        message = smtp.send_message.call_args.args[0]
        self.assertEqual(message["To"], "secretaire@example.com")
        self.assertIn("no-reply@fadaa-sante.ma", message["From"])
        self.assertIn("Dr Adam Exemple", message["From"])
        self.assertIn("adam@example.com", message["Reply-To"])
        self.assertTrue(message.is_multipart())
