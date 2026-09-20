from datetime import UTC, datetime
from decimal import Decimal
from html import escape
from pathlib import Path

from fastapi import HTTPException
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DoctorProfile, Fee, Invoice, MedicalDocument, PatientProfile, Payment, PaymentDocument, Tenant, TenantSettings, User
from app.schemas.crud import PaymentDocumentOut
from app.services.crud_service import add_operation, ensure_write_allowed, get_scoped, require_module_access, require_tenant, role_code, valid_payment_condition


METHOD_LABELS = {"cash": "Espèces", "card": "Carte bancaire", "transfer": "Virement bancaire", "cheque": "Chèque", "other": "Autre"}


def serialize(row: PaymentDocument) -> PaymentDocumentOut:
    return PaymentDocumentOut.model_validate(row, from_attributes=True)


def list_for_payment(db: Session, user: User, payment_id: str) -> list[PaymentDocumentOut]:
    require_module_access(db, user, "payments")
    payment = get_scoped(db, user, Payment, payment_id, "Paiement")
    rows = db.scalars(select(PaymentDocument).where(PaymentDocument.tenant_id == require_tenant(user), PaymentDocument.payment_id == payment.id).order_by(PaymentDocument.generated_at.desc())).all()
    return [serialize(row) for row in rows]


def get_document(db: Session, user: User, document_id: str) -> PaymentDocument:
    require_module_access(db, user, "payments")
    return get_scoped(db, user, PaymentDocument, document_id, "Document de paiement")


def generate(db: Session, user: User, payment_id: str, document_type: str) -> PaymentDocumentOut:
    require_module_access(db, user, "payments")
    tenant_id = require_tenant(user)
    payment = get_scoped(db, user, Payment, payment_id, "Paiement")
    existing = db.scalar(select(PaymentDocument).where(
        PaymentDocument.tenant_id == tenant_id,
        PaymentDocument.payment_id == payment.id,
        PaymentDocument.document_type == document_type,
    ).order_by(PaymentDocument.generated_at.desc()).limit(1))
    if existing and document_type != "recu" and (Path(settings.upload_dir) / existing.file_path).is_file():
        return serialize(existing)
    require_module_access(db, user, "payments", write=True); ensure_write_allowed(user)
    if payment.status in {"ANNULE", "REMBOURSE"}:
        raise HTTPException(409, "Un document ne peut pas être généré pour un paiement annulé ou remboursé.")
    fee = get_scoped(db, user, Fee, payment.fee_id, "Honoraire")
    patient = get_scoped(db, user, PatientProfile, payment.patient_id, "Patient")
    if fee.patient_id != patient.id or payment.patient_id != patient.id:
        raise HTTPException(422, "Le paiement, l’honoraire et le patient ne correspondent pas.")
    tenant = db.get(Tenant, tenant_id)
    if tenant is None:
        raise HTTPException(404, "Cabinet introuvable.")
    patient_user = db.get(User, patient.user_id)
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.id == payment.doctor_id, DoctorProfile.tenant_id == tenant_id)) if payment.doctor_id else None
    doctor_user = db.get(User, doctor.user_id) if doctor else None

    if existing and document_type == "recu":
        row = existing
        relative = Path(existing.file_path)
    else:
        year = datetime.now(UTC).year
        prefix = "REC" if document_type == "recu" else "FAC"
        db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": f"payment-document:{tenant_id}:{prefix}:{year}"})
        sequence = int(db.scalar(select(func.count(PaymentDocument.id)).where(PaymentDocument.tenant_id == tenant_id, PaymentDocument.document_type == document_type, func.extract("year", PaymentDocument.generated_at) == year)) or 0) + 1
        number = f"{prefix}-{year}-{sequence:04d}"
        document_id = __import__("uuid").uuid4().hex
        relative = Path("payment_documents") / tenant_id / f"{document_id}.pdf"
        row = PaymentDocument(id=document_id, tenant_id=tenant_id, patient_id=patient.id, fee_id=fee.id, payment_id=payment.id, document_type=document_type, document_number=number, file_path=str(relative), generated_by_user_id=user.id)
        db.add(row); db.flush()
    absolute = Path(settings.upload_dir) / relative
    absolute.parent.mkdir(parents=True, exist_ok=True)

    total_paid = Decimal(str(db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.fee_id == fee.id, valid_payment_condition())) or 0))
    current_valid = Decimal(payment.amount) if payment.status not in {"ANNULE", "REMBOURSE"} and (payment.method != "cheque" or payment.cheque_status == "ENCAISSE") else Decimal("0")
    financial = {"total": Decimal(fee.amount), "before": max(Decimal("0"), total_paid - current_valid), "current": Decimal(payment.amount), "paid": total_paid, "remaining": max(Decimal("0"), Decimal(fee.amount) - total_paid)}
    try:
        render_pdf(absolute, row, tenant, doctor, doctor_user, patient, patient_user, fee, payment, financial)
        db.commit(); db.refresh(row)
    except Exception:
        db.rollback(); absolute.unlink(missing_ok=True); raise
    return serialize(row)


def invoice_pdf_document(db: Session, user: User, invoice_id: str) -> MedicalDocument:
    """Generate once and archive the official invoice PDF in the patient library."""
    tenant_id = require_tenant(user)
    if role_code(user) == "PATIENT":
        patient = user.patient_profile
        settings_row = db.scalar(select(TenantSettings).where(TenantSettings.tenant_id == tenant_id))
        if not patient or (settings_row and not settings_row.patient_can_view_payments):
            raise HTTPException(403, "L’accès aux factures n’est pas autorisé par le cabinet.")
        invoice = db.scalar(select(Invoice).where(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id,
            Invoice.patient_id == patient.id,
        ))
        if invoice is None:
            raise HTTPException(404, "Facture introuvable.")
    else:
        require_module_access(db, user, "payments")
        invoice = get_scoped(db, user, Invoice, invoice_id, "Facture")
    existing = db.scalar(select(MedicalDocument).where(
        MedicalDocument.tenant_id == tenant_id,
        MedicalDocument.invoice_id == invoice.id,
        MedicalDocument.document_type == "Facture",
        MedicalDocument.archived_at.is_(None),
    ).order_by(MedicalDocument.created_at.desc()).limit(1))
    if existing and existing.file_url and (Path(settings.upload_dir) / existing.file_url).is_file():
        return existing

    fee = get_scoped(db, user, Fee, invoice.fee_id, "Honoraire")
    patient = get_scoped(db, user, PatientProfile, invoice.patient_id, "Patient")
    tenant = db.get(Tenant, tenant_id)
    patient_user = db.get(User, patient.user_id)
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.id == invoice.doctor_id, DoctorProfile.tenant_id == tenant_id)) if invoice.doctor_id else None
    doctor_user = db.get(User, doctor.user_id) if doctor else None
    if tenant is None:
        raise HTTPException(404, "Cabinet introuvable.")

    filename = f"facture_{invoice.invoice_number}.pdf"
    relative = Path("cabinets") / tenant_id / "patients" / patient.id / "documents" / "factures" / filename
    absolute = Path(settings.upload_dir) / relative
    absolute.parent.mkdir(parents=True, exist_ok=True)
    render_invoice_pdf(absolute, invoice, tenant, doctor, doctor_user, patient, patient_user, fee)
    document = MedicalDocument(
        tenant_id=tenant_id, patient_id=patient.id, doctor_id=invoice.doctor_id,
        fee_id=fee.id, invoice_id=invoice.id, title=f"Facture {invoice.invoice_number}",
        description=f"Facture officielle du cabinet · {fee.title}", document_type="Facture",
        file_url=str(relative), original_filename=filename, stored_filename=filename,
        extension=".pdf", mime_type="application/pdf", file_size=absolute.stat().st_size,
        source="generation_automatique", status="ACTIF", confidential=False,
        shared_with_patient=True, document_date=invoice.issued_at.date(),
        created_by_user_id=user.id,
    )
    db.add(document); db.flush()
    add_operation(db, user, "INVOICE_DOCUMENT_GENERATED", invoice=invoice, document=document,
                  description=f"Facture {invoice.invoice_number} générée et archivée dans le dossier patient.")
    db.commit(); db.refresh(document)
    return document


def render_invoice_pdf(path: Path, invoice: Invoice, tenant: Tenant, doctor: DoctorProfile | None, doctor_user: User | None, patient: PatientProfile, patient_user: User | None, fee: Fee) -> None:
    brand = colors.HexColor(tenant.primary_color if tenant.primary_color and tenant.primary_color.startswith("#") else "#0f766e")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("InvoiceTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=22, textColor=brand, alignment=TA_RIGHT)
    section = ParagraphStyle("InvoiceSection", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=11, textColor=brand, spaceAfter=6)
    small = ParagraphStyle("InvoiceSmall", parent=styles["BodyText"], fontSize=8, leading=11, textColor=colors.HexColor("#64748b"))
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=16*mm, title=invoice.invoice_number)
    doctor_name = f"Dr {doctor_user.first_name} {doctor_user.last_name}" if doctor_user else "Médecin du cabinet"
    cabinet_lines = [f"<b>{tenant.name}</b>", doctor_name, doctor.specialty if doctor else tenant.specialty, tenant.address or "", f"{tenant.city} · Tél. {tenant.phone}" if tenant.phone else tenant.city]
    cabinet_info = Paragraph("<br/>".join(filter(None, cabinet_lines)), styles["BodyText"])
    logo = _local_logo(tenant.logo_url)
    identity = Table([[Image(str(logo), width=22*mm, height=22*mm), cabinet_info]], colWidths=[27*mm,78*mm], style=TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0)])) if logo else cabinet_info
    patient_name = f"{patient_user.first_name} {patient_user.last_name}" if patient_user else patient.id
    story = [
        Table([[identity, Paragraph("FACTURE", title_style)]], colWidths=[105*mm,65*mm], style=TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LINEBELOW",(0,0),(-1,-1),1.5,brand),("BOTTOMPADDING",(0,0),(-1,-1),8)])),
        Spacer(1,8*mm),
        Table([["N° de facture",invoice.invoice_number],["Date d’émission",invoice.issued_at.strftime("%d/%m/%Y")],["Échéance",invoice.due_date.strftime("%d/%m/%Y") if invoice.due_date else "—"],["Statut",invoice.status.replace("_"," ")]],colWidths=[55*mm,115*mm],style=_table_style(brand)),
        Spacer(1,6*mm),Paragraph("Patient",section),
        Table([["Nom complet",patient_name],["Téléphone",patient_user.phone if patient_user and patient_user.phone else "—"]],colWidths=[55*mm,115*mm],style=_table_style(brand)),
        Spacer(1,6*mm),Paragraph("Détail facturé",section),
        Table([["Acte","Type","Montant"],[fee.title,fee.fee_type.replace("_"," ").title(),_money(Decimal(invoice.amount_total))]],colWidths=[80*mm,45*mm,45*mm],style=TableStyle([("BACKGROUND",(0,0),(-1,0),brand),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,-1),"Helvetica-Bold"),("GRID",(0,0),(-1,-1),.5,colors.HexColor("#cbd5e1")),("PADDING",(0,0),(-1,-1),7)])),
        Spacer(1,6*mm),Paragraph("Résumé",section),
        Table([["Total TTC",_money(Decimal(invoice.amount_total))],["Payé",_money(Decimal(invoice.amount_paid))],["Reste à payer",_money(Decimal(invoice.amount_due))]],colWidths=[85*mm,85*mm],style=_table_style(brand)),
        Spacer(1,18*mm),Paragraph("Cachet et signature du cabinet",ParagraphStyle("InvoiceSign",parent=small,alignment=TA_RIGHT)),Spacer(1,18*mm),
        Paragraph(" · ".join(filter(None,[tenant.name,tenant.address,tenant.city,f"Tél. {tenant.phone}" if tenant.phone else None]))+"<br/>Document généré automatiquement par FADAA Santé",ParagraphStyle("InvoiceFooter",parent=small,alignment=TA_CENTER)),
    ]
    doc.build(story)


def patient_receipt(db: Session, user: User, payment: Payment) -> PaymentDocument:
    """Return or generate the official PDF receipt for an authenticated patient."""
    patient = user.patient_profile
    if patient is None or payment.patient_id != patient.id:
        raise HTTPException(404, "Paiement introuvable.")
    existing = db.scalar(select(PaymentDocument).where(
        PaymentDocument.tenant_id == payment.tenant_id,
        PaymentDocument.payment_id == payment.id,
        PaymentDocument.document_type == "recu",
    ).order_by(PaymentDocument.generated_at.desc()).limit(1))
    if payment.status in {"ANNULE", "REMBOURSE"}:
        raise HTTPException(409, "Aucun reçu ne peut être généré pour ce paiement.")
    fee = db.scalar(select(Fee).where(Fee.id == payment.fee_id, Fee.tenant_id == payment.tenant_id, Fee.patient_id == patient.id))
    tenant = db.get(Tenant, payment.tenant_id)
    if fee is None or tenant is None:
        raise HTTPException(404, "Informations du paiement introuvables.")
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.id == payment.doctor_id, DoctorProfile.tenant_id == tenant.id)) if payment.doctor_id else None
    doctor_user = db.get(User, doctor.user_id) if doctor else None
    if existing:
        row = existing
        relative = Path(existing.file_path)
    else:
        year = datetime.now(UTC).year
        db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:key))"), {"key": f"payment-document:{tenant.id}:REC:{year}"})
        sequence = int(db.scalar(select(func.count(PaymentDocument.id)).where(PaymentDocument.tenant_id == tenant.id, PaymentDocument.document_type == "recu", func.extract("year", PaymentDocument.generated_at) == year)) or 0) + 1
        document_id = __import__("uuid").uuid4().hex
        relative = Path("payment_documents") / tenant.id / f"{document_id}.pdf"
        row = PaymentDocument(id=document_id, tenant_id=tenant.id, patient_id=patient.id, fee_id=fee.id, payment_id=payment.id, document_type="recu", document_number=f"REC-{year}-{sequence:04d}", file_path=str(relative), generated_by_user_id=user.id)
        db.add(row)
        db.flush()
    absolute = Path(settings.upload_dir) / relative
    absolute.parent.mkdir(parents=True, exist_ok=True)
    total_paid = Decimal(str(db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.fee_id == fee.id, valid_payment_condition())) or 0))
    current_valid = Decimal(payment.amount) if payment.status not in {"ANNULE", "REMBOURSE"} and (payment.method != "cheque" or payment.cheque_status == "ENCAISSE") else Decimal("0")
    financial = {"total": Decimal(fee.amount), "before": max(Decimal("0"), total_paid-current_valid), "current": Decimal(payment.amount), "paid": total_paid, "remaining": max(Decimal("0"), Decimal(fee.amount)-total_paid)}
    try:
        render_pdf(absolute, row, tenant, doctor, doctor_user, patient, user, fee, payment, financial)
        db.commit()
        db.refresh(row)
        return row
    except Exception:
        db.rollback()
        absolute.unlink(missing_ok=True)
        raise


def render_pdf(path: Path, row: PaymentDocument, tenant: Tenant, doctor: DoctorProfile | None, doctor_user: User | None, patient: PatientProfile, patient_user: User | None, fee: Fee, payment: Payment, financial: dict[str, Decimal]) -> None:
    if row.document_type == "recu":
        render_receipt_ticket(path, row, tenant, doctor, doctor_user, patient, patient_user, fee, payment, financial)
        return
    brand = colors.HexColor(tenant.primary_color if tenant.primary_color and tenant.primary_color.startswith("#") else "#0f766e")
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("DocTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=22, textColor=brand, alignment=TA_RIGHT)
    section = ParagraphStyle("Section", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=11, textColor=brand, spaceAfter=6)
    small = ParagraphStyle("Small", parent=styles["BodyText"], fontSize=8, leading=11, textColor=colors.HexColor("#64748b"))
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=16*mm, title=row.document_number)
    doctor_name = f"Dr {doctor_user.first_name} {doctor_user.last_name}" if doctor_user else "Médecin du cabinet"
    cabinet_lines = [f"<b>{tenant.name}</b>", doctor_name, doctor.specialty if doctor else tenant.specialty, tenant.address or "", f"{tenant.city} · Tél. {tenant.phone}", doctor.professional_email if doctor else ""]
    cabinet_info = Paragraph("<br/>".join(filter(None, cabinet_lines)), styles["BodyText"])
    logo = _local_logo(tenant.logo_url)
    identity = Table([[Image(str(logo), width=22*mm, height=22*mm), cabinet_info]], colWidths=[27*mm,78*mm], style=TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0)])) if logo else cabinet_info
    story = [Table([[identity, Paragraph("REÇU DE PAIEMENT" if row.document_type == "recu" else "FACTURE DE PAIEMENT", title_style)]], colWidths=[105*mm, 65*mm], style=TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LINEBELOW",(0,0),(-1,-1),1.5,brand),("BOTTOMPADDING",(0,0),(-1,-1),8)])), Spacer(1,8*mm)]
    story += [Table([["N° du document", row.document_number], ["Date de génération", datetime.now(UTC).strftime("%d/%m/%Y %H:%M")], ["Date du paiement", payment.paid_at.strftime("%d/%m/%Y %H:%M")]], colWidths=[55*mm,115*mm], style=_table_style(brand)), Spacer(1,6*mm)]
    patient_name = f"{patient_user.first_name} {patient_user.last_name}" if patient_user else patient.id
    story += [Paragraph("Patient", section), Table([["Nom complet", patient_name], ["Téléphone", patient_user.phone if patient_user and patient_user.phone else "—"], ["Identifiant patient", patient.id]], colWidths=[55*mm,115*mm], style=_table_style(brand)), Spacer(1,6*mm)]
    story += [Paragraph("Honoraire", section), Table([["Libellé", fee.title], ["Type", fee.fee_type.replace("_", " ").title()], ["Montant total", _money(financial["total"])]], colWidths=[55*mm,115*mm], style=_table_style(brand)), Spacer(1,6*mm)]
    payment_rows = [["Montant payé", _money(financial["current"])], ["Mode de paiement", METHOD_LABELS.get(payment.method, payment.method)], ["Référence", payment.reference or "—"], ["Commentaire", payment.note or "—"]]
    story += [Paragraph("Paiement", section), Table(payment_rows, colWidths=[55*mm,115*mm], style=_table_style(brand)), Spacer(1,6*mm)]
    summary = [["Total honoraire", "Déjà payé avant", "Paiement actuel", "Total payé", "Reste à payer"], [_money(financial["total"]), _money(financial["before"]), _money(financial["current"]), _money(financial["paid"]), _money(financial["remaining"])]]
    footer_parts = [tenant.name, tenant.address, tenant.city, f"Tél. {tenant.phone}" if tenant.phone else None]
    footer_text = " · ".join(part for part in footer_parts if part)
    story += [Paragraph("Résumé financier", section), Table(summary, colWidths=[34*mm]*5, style=TableStyle([("BACKGROUND",(0,0),(-1,0),brand),("TEXTCOLOR",(0,0),(-1,0),colors.white),("FONTNAME",(0,0),(-1,-1),"Helvetica-Bold"),("ALIGN",(0,0),(-1,-1),"CENTER"),("GRID",(0,0),(-1,-1),.5,colors.HexColor("#cbd5e1")),("PADDING",(0,0),(-1,-1),7)])), Spacer(1,15*mm), Paragraph("Signature / cachet du cabinet", ParagraphStyle("Sign", parent=small, alignment=TA_RIGHT)), Spacer(1,18*mm), Paragraph(f"{footer_text}<br/>Document généré automatiquement par FADAA Santé", ParagraphStyle("Footer", parent=small, alignment=TA_CENTER))]
    doc.build(story)


def render_receipt_ticket(path: Path, row: PaymentDocument, tenant: Tenant, doctor: DoctorProfile | None, doctor_user: User | None, patient: PatientProfile, patient_user: User | None, fee: Fee, payment: Payment, financial: dict[str, Decimal]) -> None:
    """Render a compact 80 mm payment receipt for thermal or standard printers."""
    brand = colors.HexColor(tenant.primary_color if tenant.primary_color and tenant.primary_color.startswith("#") else "#0f766e")
    ink = colors.HexColor("#0f172a")
    muted = colors.HexColor("#64748b")
    width = 80 * mm
    doc = SimpleDocTemplate(str(path), pagesize=(width, 190 * mm), leftMargin=5 * mm, rightMargin=5 * mm, topMargin=5 * mm, bottomMargin=5 * mm, title=row.document_number)
    styles = getSampleStyleSheet()
    center = ParagraphStyle("TicketCenter", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=10, alignment=TA_CENTER, textColor=ink)
    cabinet_style = ParagraphStyle("TicketCabinet", parent=center, fontName="Helvetica-Bold", fontSize=11, leading=13, textColor=brand)
    title = ParagraphStyle("TicketTitle", parent=center, fontName="Helvetica-Bold", fontSize=13, leading=15, textColor=ink, spaceBefore=3, spaceAfter=3)
    amount_style = ParagraphStyle("TicketAmount", parent=center, fontName="Helvetica-Bold", fontSize=17, leading=20, textColor=brand)
    tiny = ParagraphStyle("TicketTiny", parent=center, fontSize=6.5, leading=8, textColor=muted)
    doctor_name = f"Dr {doctor_user.first_name} {doctor_user.last_name}" if doctor_user else "Médecin du cabinet"
    patient_name = f"{patient_user.first_name} {patient_user.last_name}" if patient_user else patient.id
    location = " · ".join(filter(None, [tenant.address, tenant.city]))
    phone = f"Tél. {tenant.phone}" if tenant.phone else ""
    logo = _local_logo(tenant.logo_url)
    story = []
    if logo:
        story += [Image(str(logo), width=16 * mm, height=16 * mm), Spacer(1, 1.5 * mm)]
    story += [
        Paragraph(escape(tenant.name), cabinet_style),
        Paragraph(escape(doctor_name), center),
        Paragraph(escape(doctor.specialty if doctor and doctor.specialty else tenant.specialty or ""), center),
        Paragraph(escape(" · ".join(filter(None, [location, phone]))), tiny),
        Spacer(1, 2.5 * mm),
        Paragraph("- " * 25, tiny),
        Paragraph("TICKET DE CAISSE", title),
        Paragraph(escape(row.document_number), tiny),
        Paragraph("- " * 25, tiny),
        Spacer(1, 2 * mm),
        Paragraph("MONTANT REÇU", tiny),
        Paragraph(_money(financial["current"]), amount_style),
        Spacer(1, 3 * mm),
    ]
    rows = [
        ["Date", payment.paid_at.strftime("%d/%m/%Y %H:%M")],
        ["Patient", patient_name],
        ["Acte", fee.title],
        ["Paiement", METHOD_LABELS.get(payment.method, payment.method)],
        ["Référence", payment.reference or "—"],
    ]
    story += [Table(rows, colWidths=[22 * mm, 48 * mm], style=TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"), ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5), ("TEXTCOLOR", (0, 0), (0, -1), muted),
        ("TEXTCOLOR", (1, 0), (1, -1), ink), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), .25, colors.HexColor("#e2e8f0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 1), ("RIGHTPADDING", (0, 0), (-1, -1), 1),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ])), Spacer(1, 3 * mm)]
    summary = [["Total honoraire", _money(financial["total"])], ["Total payé", _money(financial["paid"])], ["RESTE À PAYER", _money(financial["remaining"])]]
    story += [Table(summary, colWidths=[35 * mm, 35 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ("FONTNAME", (0, 0), (-1, -2), "Helvetica"), ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8), ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TEXTCOLOR", (0, -1), (-1, -1), brand), ("BOX", (0, 0), (-1, -1), .5, brand),
        ("PADDING", (0, 0), (-1, -1), 5),
    ])), Spacer(1, 7 * mm), Paragraph("Cachet / signature", tiny), Spacer(1, 10 * mm), Paragraph("Merci pour votre confiance", cabinet_style), Paragraph(f"Ticket de caisse numéroté · {row.document_number}<br/>Généré par FADAA Santé · {datetime.now(UTC).strftime('%d/%m/%Y %H:%M')}", tiny)]
    doc.build(story)


def _money(value: Decimal) -> str:
    return f"{value.quantize(Decimal('0.01')):,.2f} MAD".replace(",", " ")


def _local_logo(logo_url: str | None) -> Path | None:
    if not logo_url or logo_url.startswith(("http://", "https://", "data:")):
        return None
    relative = logo_url.lstrip("/")
    if relative.startswith("uploads/"):
        relative = relative.removeprefix("uploads/")
    candidate = Path(settings.upload_dir) / relative
    return candidate if candidate.is_file() else None


def _table_style(brand):
    return TableStyle([("BACKGROUND",(0,0),(0,-1),colors.HexColor("#f1f5f9")),("TEXTCOLOR",(0,0),(0,-1),brand),("FONTNAME",(0,0),(0,-1),"Helvetica-Bold"),("GRID",(0,0),(-1,-1),.4,colors.HexColor("#cbd5e1")),("VALIGN",(0,0),(-1,-1),"TOP"),("PADDING",(0,0),(-1,-1),6)])
