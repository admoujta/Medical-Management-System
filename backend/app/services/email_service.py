import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr
from html import escape

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    pass


def send_staff_activation_email(
    email: str,
    full_name: str,
    cabinet_name: str,
    activation_url: str,
    *,
    doctor_name: str | None = None,
    doctor_email: str | None = None,
) -> None:
    smtp_username = settings.smtp_username
    if smtp_username and "@" not in smtp_username and settings.smtp_from_email.endswith("@gmail.com"):
        smtp_username = settings.smtp_from_email
    sender_name = doctor_name or cabinet_name
    subject = f"{sender_name} vous invite à rejoindre {cabinet_name}"
    body = (
        f"Bonjour {full_name},\n\n"
        f"{sender_name} a créé votre compte professionnel pour le cabinet {cabinet_name}. "
        "Choisissez votre mot de passe avec le lien sécurisé ci-dessous (valable 48 heures) :\n\n"
        f"{activation_url}\n\n"
        f"Vous pouvez répondre à cet e-mail pour contacter {sender_name}.\n\n"
        "Si vous n’attendiez pas cet e-mail, vous pouvez l’ignorer."
    )
    if not settings.smtp_host or not smtp_username or not settings.smtp_password:
        raise EmailDeliveryError("Service Gmail incomplet. Renseignez SMTP_USERNAME et SMTP_PASSWORD dans backend/.env.")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr((f"{sender_name} via FADAA Santé", settings.smtp_from_email))
    message["To"] = email
    if doctor_email:
        message["Reply-To"] = formataddr((sender_name, doctor_email))
    message.set_content(body)
    message.add_alternative(
        f"""\
        <html><body style="margin:0;background:#f3f7f7;font-family:Arial,sans-serif;color:#12313a">
          <div style="max-width:620px;margin:32px auto;background:#fff;border:1px solid #dbe8e6;border-radius:14px;overflow:hidden">
            <div style="background:#0f766e;padding:24px 30px;color:#fff">
              <div style="font-size:12px;font-weight:bold;letter-spacing:1px">FADAA SANTÉ</div>
              <h1 style="margin:8px 0 0;font-size:24px">Invitation professionnelle</h1>
            </div>
            <div style="padding:30px">
              <p>Bonjour <strong>{escape(full_name)}</strong>,</p>
              <p><strong>{escape(sender_name)}</strong> a créé votre compte professionnel pour
                <strong>{escape(cabinet_name)}</strong>.</p>
              <p>Définissez votre mot de passe grâce au bouton sécurisé ci-dessous. Ce lien est valable 48 heures.</p>
              <p style="margin:28px 0"><a href="{escape(activation_url)}"
                style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:13px 22px;border-radius:9px;font-weight:bold">
                Activer mon compte
              </a></p>
              <p style="font-size:13px;color:#64748b">Si le bouton ne fonctionne pas, copiez ce lien :<br>
                <a href="{escape(activation_url)}">{escape(activation_url)}</a></p>
              <hr style="border:0;border-top:1px solid #e2e8f0;margin:26px 0">
              <p style="font-size:13px;color:#64748b">Vous pouvez répondre directement à cet e-mail pour contacter {escape(sender_name)}.</p>
            </div>
          </div>
        </body></html>""",
        subtype="html",
    )
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            smtp.login(smtp_username, settings.smtp_password or "")
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException):
        logger.exception("Échec d’envoi de l’email d’activation à %s", email)
        raise EmailDeliveryError("Le serveur email a refusé l’envoi. Vérifiez les paramètres SMTP.")


def send_patient_activation_email(email: str, full_name: str, cabinet_name: str, activation_url: str) -> None:
    smtp_username = settings.smtp_username
    if smtp_username and "@" not in smtp_username and settings.smtp_from_email.endswith("@gmail.com"):
        smtp_username = settings.smtp_from_email
    subject = "Activez votre espace patient FADAA Santé"
    body = (
        f"Bonjour {full_name},\n\n"
        f"Votre espace patient a été préparé à la suite de votre demande auprès de {cabinet_name}. "
        "Définissez obligatoirement votre mot de passe avec le lien sécurisé ci-dessous "
        "(valable 48 heures) :\n\n"
        f"{activation_url}\n\n"
        "Ce compte vous appartient et pourra ensuite être utilisé auprès de plusieurs cabinets. "
        "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail."
    )
    if not settings.smtp_host or not smtp_username or not settings.smtp_password:
        raise EmailDeliveryError("Service email incomplet. Renseignez la configuration SMTP dans backend/.env.")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            smtp.login(smtp_username, settings.smtp_password or "")
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException):
        logger.exception("Échec d’envoi de l’activation patient à %s", email)
        raise EmailDeliveryError("Le serveur email a refusé l’envoi. Vérifiez les paramètres SMTP.")
