from __future__ import annotations

import re
from datetime import UTC, date, datetime
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DocumentCategory, DoctorProfile, MedicalDocument, PatientProfile, Prescription, Tenant, User


def _safe(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", value.strip())[:60].strip("_") or "patient"


def _age(birth_date: date) -> int:
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def _absolute(relative: str | None) -> Path | None:
    if not relative: return None
    root = Path(settings.upload_dir).resolve(); path = (root / relative).resolve()
    return path if root in path.parents and path.is_file() else None


def generate_and_archive(db: Session, prescription: Prescription, actor: User) -> MedicalDocument:
    tenant = db.get(Tenant, prescription.tenant_id)
    patient = db.get(PatientProfile, prescription.patient_id)
    patient_user = db.get(User, patient.user_id) if patient else None
    doctor = db.get(DoctorProfile, prescription.doctor_id)
    doctor_user = db.get(User, doctor.user_id) if doctor else None
    if not tenant or not patient or not patient_user or not doctor or not doctor_user:
        raise ValueError("Données requises introuvables pour générer l’ordonnance.")

    brand_value = tenant.primary_color if re.fullmatch(r"#[0-9a-fA-F]{6}", tenant.primary_color or "") else "#0f766e"
    brand = colors.HexColor(brand_value)
    brand_light = colors.Color(
        0.90 + brand.red * 0.10,
        0.90 + brand.green * 0.10,
        0.90 + brand.blue * 0.10,
    )

    relative_dir = Path("cabinets") / tenant.id / "patients" / patient.id / "documents" / "ordonnances"
    filename = f"ordonnance_{_safe(prescription.prescription_number)}_{_safe(patient_user.last_name)}_{date.today().isoformat()}.pdf"
    relative_path = relative_dir / filename
    output = Path(settings.upload_dir) / relative_path
    output.parent.mkdir(parents=True, exist_ok=True)

    styles = getSampleStyleSheet()
    normal = ParagraphStyle("RxNormal", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=13, textColor=colors.HexColor("#142F38"))
    small = ParagraphStyle("RxSmall", parent=normal, fontSize=7.5, leading=10, textColor=colors.HexColor("#526675"))
    title = ParagraphStyle("RxTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=20, leading=24, alignment=TA_CENTER, textColor=brand, spaceAfter=6*mm)
    right = ParagraphStyle("RxRight", parent=small, alignment=TA_RIGHT)

    logo = _absolute(tenant.logo_url)
    doctor_lines = [f"<b>Dr {escape(doctor_user.first_name)} {escape(doctor_user.last_name)}</b>", escape(doctor.specialty)]
    if doctor.professional_number: doctor_lines.append(f"N° professionnel : {escape(doctor.professional_number)}")
    if doctor.professional_phone or doctor_user.phone: doctor_lines.append(f"Tél. {escape(doctor.professional_phone or doctor_user.phone or '')}")
    doctor_lines.append(escape(doctor.professional_email or doctor_user.email))
    cabinet_lines = [f"<b>{escape(tenant.name)}</b>", escape(f"{tenant.address}, {tenant.city}"), f"Tél. {escape(tenant.phone)}"]
    if tenant.website: cabinet_lines.append(escape(tenant.website))
    if tenant.ice: cabinet_lines.append(f"ICE : {escape(tenant.ice)}")
    if tenant.tax_identifier: cabinet_lines.append(f"Identifiant fiscal : {escape(tenant.tax_identifier)}")

    header_left = [Image(str(logo), width=25*mm, height=18*mm)] if logo else []
    header_left.append(Paragraph("<br/>".join(cabinet_lines), normal))
    header = Table([[header_left, Paragraph("<br/>".join(doctor_lines), right)]], colWidths=[95*mm, 75*mm])
    header.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("LINEBELOW", (0,0), (-1,-1), 1.2, brand), ("BOTTOMPADDING", (0,0), (-1,-1), 4*mm)]))

    consultation_date = prescription.consultation_date or prescription.created_at.date()
    patient_info = [
        [Paragraph("<b>Patient</b>", small), Paragraph(f"{escape(patient_user.first_name)} {escape(patient_user.last_name)}", normal), Paragraph("<b>Dossier</b>", small), Paragraph(escape(patient.id), normal)],
        [Paragraph("<b>Naissance / âge</b>", small), Paragraph(f"{patient.birth_date.strftime('%d/%m/%Y')} · {_age(patient.birth_date)} ans", normal), Paragraph("<b>Consultation</b>", small), Paragraph(consultation_date.strftime("%d/%m/%Y"), normal)],
    ]
    if patient.gender or patient.cin:
        patient_info.append([Paragraph("<b>Sexe</b>", small), Paragraph(escape(patient.gender or "—"), normal), Paragraph("<b>CIN</b>", small), Paragraph(escape(patient.cin or "—"), normal)])
    info_table = Table(patient_info, colWidths=[30*mm, 58*mm, 30*mm, 52*mm])
    info_table.setStyle(TableStyle([("GRID", (0,0), (-1,-1), .35, colors.HexColor("#D6E2E0")), ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#F2F7F6")), ("BACKGROUND", (2,0), (2,-1), colors.HexColor("#F2F7F6")), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("PADDING", (0,0), (-1,-1), 2.5*mm)]))

    story = [header, Spacer(1, 7*mm), Paragraph("ORDONNANCE", title), info_table, Spacer(1, 7*mm)]
    if prescription.items:
        rows = [[Paragraph(f"<b>{label}</b>", small) for label in ("Médicament", "Dosage / forme", "Prise", "Durée / quantité", "Instructions")]]
        for item in prescription.items:
            rows.append([Paragraph(escape(str(item.get("medication") or "")), normal), Paragraph(escape(" · ".join(filter(None, [item.get("dosage"), item.get("form"), item.get("route")]))), small), Paragraph(escape(str(item.get("frequency") or "")), small), Paragraph(escape(" · ".join(filter(None, [item.get("duration"), item.get("quantity")]))), small), Paragraph(escape(" · ".join(filter(None, [item.get("instructions"), item.get("notes")]))), small)])
        medication_table = Table(rows, repeatRows=1, colWidths=[38*mm, 34*mm, 32*mm, 31*mm, 35*mm])
        medication_table.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), brand_light), ("TEXTCOLOR", (0,0), (-1,0), brand), ("GRID", (0,0), (-1,-1), .4, colors.HexColor("#B9CBC8")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("PADDING", (0,0), (-1,-1), 2.2*mm)]))
        story.append(medication_table)
    else:
        story.append(Paragraph(escape(prescription.content).replace("\n", "<br/>"), ParagraphStyle("RxContent", parent=normal, fontSize=11, leading=18)))
    signature = _absolute(doctor.signature_url)
    signature_cell = [Image(str(signature), width=38*mm, height=17*mm), Paragraph("Cachet et signature du praticien", right)] if signature else [Spacer(1, 17*mm), Paragraph("Cachet et signature du praticien", right)]
    story.extend([Spacer(1, 16*mm), Table([["", signature_cell]], colWidths=[105*mm, 65*mm], style=TableStyle([("LINEABOVE", (1,0), (1,0), .5, colors.grey), ("TOPPADDING", (1,0), (1,0), 3*mm), ("ALIGN", (1,0), (1,0), "RIGHT")]))])

    def footer(canvas, doc):
        canvas.saveState(); canvas.setStrokeColor(colors.HexColor("#B9CBC8")); canvas.line(20*mm, 16*mm, 190*mm, 16*mm)
        canvas.setFont("Helvetica", 7); canvas.setFillColor(colors.HexColor("#526675")); canvas.drawString(20*mm, 11*mm, f"{tenant.name} · {tenant.address}, {tenant.city} · {tenant.phone}")
        canvas.drawRightString(190*mm, 11*mm, f"Page {doc.page}"); canvas.restoreState()

    SimpleDocTemplate(str(output), pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=15*mm, bottomMargin=22*mm, title=f"Ordonnance {prescription.prescription_number}", author=f"Dr {doctor_user.first_name} {doctor_user.last_name}").build(story, onFirstPage=footer, onLaterPages=footer)

    previous = db.get(MedicalDocument, prescription.pdf_document_id) if prescription.pdf_document_id else None
    if previous:
        previous.archived_at = datetime.now(UTC); previous.status = "ARCHIVE"; previous.updated_by_user_id = actor.id
    category = db.scalar(select(DocumentCategory).where(DocumentCategory.code == "ORDONNANCE", or_(DocumentCategory.tenant_id.is_(None), DocumentCategory.tenant_id == tenant.id)).order_by(DocumentCategory.tenant_id.desc().nullslast()))
    document = MedicalDocument(tenant_id=tenant.id, patient_id=patient.id, doctor_id=doctor.id, appointment_id=prescription.appointment_id, visit_id=prescription.visit_id, category_id=category.id if category else None, title=f"Ordonnance {prescription.prescription_number}", description=f"Ordonnance prescrite par le Dr {doctor_user.first_name} {doctor_user.last_name} · Thème {brand_value.upper()}", document_type="Ordonnance", file_url=str(relative_path), original_filename=filename, stored_filename=filename, extension=".pdf", mime_type="application/pdf", file_size=output.stat().st_size, source="generation_automatique", status="ACTIF", confidential=False, shared_with_patient=True, document_date=prescription.created_at.date(), version=(previous.version + 1 if previous else 1), parent_document_id=(previous.parent_document_id or previous.id) if previous else None, created_by_user_id=actor.id)
    db.add(document); db.flush(); prescription.pdf_document_id = document.id
    return document
