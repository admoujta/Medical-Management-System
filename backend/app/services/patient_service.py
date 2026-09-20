from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import Appointment, AuthSession, CNSSCase, CNSSStatusHistory, DoctorProfile, Fee, HonoraireAppointment, HonoraireVisit, MedicalDocument, PatientCabinetMembership, PatientProfile, Payment, PaymentDueDate, Prescription, Tenant, TenantSettings, User, UserNotification, Visit
from app.schemas.crud import CNSSOut
from app.schemas.patient import AppointmentRequest, PasswordChange, PatientCNSSAction, PatientCNSSCreate, PatientPortalSettings, PatientProfileUpdate
from app.services.crud_service import ensure_write_allowed, role_code, serialize_fee

CNSS_PATIENT_ACTIONS_BY_STATUS={
    "READY_FOR_PICKUP":{"confirm_pickup"},
    "DELIVERED_TO_PATIENT":{"confirm_deposit"},
    "SUBMITTED_TO_CNSS":{"declare_approved","declare_rejected"},
}

def context(user:User)->tuple[str,PatientProfile]:
    tenant_id=getattr(user,"active_tenant_id",None) or user.tenant_id
    if role_code(user)!="PATIENT" or not tenant_id or not user.patient_profile:
        raise HTTPException(403,"Accès réservé au patient.")
    if user.patient_profile.status != "active":raise HTTPException(403,"Votre compte patient n’est pas actif.")
    return tenant_id,user.patient_profile

def settings(db:Session,user:User)->PatientPortalSettings:
    tenant_id,_=context(user);row=db.scalar(select(TenantSettings).where(TenantSettings.tenant_id==tenant_id))
    return PatientPortalSettings.model_validate(row,from_attributes=True) if row else PatientPortalSettings()

def tenant_settings(db:Session,tenant_id:str)->PatientPortalSettings:
    row=db.scalar(select(TenantSettings).where(TenantSettings.tenant_id==tenant_id))
    return PatientPortalSettings.model_validate(row,from_attributes=True) if row else PatientPortalSettings()

def ensure_membership(db:Session,patient_id:str,tenant_id:str)->PatientCabinetMembership:
    membership=db.scalar(select(PatientCabinetMembership).where(PatientCabinetMembership.patient_id==patient_id,PatientCabinetMembership.tenant_id==tenant_id))
    if membership:
        if membership.status!="active":raise HTTPException(403,"Votre accès à ce cabinet est inactif.")
        return membership
    membership=PatientCabinetMembership(patient_id=patient_id,tenant_id=tenant_id,status="active")
    db.add(membership);db.flush();return membership

def update_settings(db:Session,user:User,payload:PatientPortalSettings)->PatientPortalSettings:
    from app.services.crud_service import require_role
    require_role(user,{"MEDECIN_ADMIN"});ensure_write_allowed(user);row=db.scalar(select(TenantSettings).where(TenantSettings.tenant_id==user.tenant_id))
    if not row:row=TenantSettings(tenant_id=user.tenant_id);db.add(row)
    for k,v in payload.model_dump().items():setattr(row,k,v)
    db.commit();db.refresh(row);return PatientPortalSettings.model_validate(row,from_attributes=True)

def profile(db:Session,user:User)->dict:
    tenant_id,p=context(user);tenant=db.get(Tenant,tenant_id)
    if not tenant:raise HTTPException(404,"Cabinet introuvable.")
    if tenant.settings and not tenant.settings.patient_portal_enabled:raise HTTPException(403,"L’espace patient est désactivé pour ce cabinet.")
    return {"id":p.id,"tenant_id":tenant_id,"first_name":user.first_name,"last_name":user.last_name,"email":user.email,"phone":user.phone,"birth_date":p.birth_date,"gender":p.gender,"address":p.address,"status":p.status,"cabinet_name":tenant.name,"cnss_deposit_reminder_days":p.cnss_deposit_reminder_days,"settings":settings(db,user).model_dump()}

def update_profile(db:Session,user:User,payload:PatientProfileUpdate)->dict:
    _,p=context(user);ensure_write_allowed(user);data=payload.model_dump(exclude_unset=True)
    if data.get("email") and db.scalar(select(User).where(User.email==data["email"],User.id!=user.id)):raise HTTPException(409,"Email déjà utilisé.")
    if "email" in data:user.email=data["email"]
    if "phone" in data:user.phone=data["phone"]
    if "address" in data:p.address=data["address"]
    if data.get("cnss_deposit_reminder_days") is not None:p.cnss_deposit_reminder_days=data["cnss_deposit_reminder_days"]
    db.commit();return profile(db,user)

def change_password(db:Session,user:User,payload:PasswordChange)->dict:
    context(user);ensure_write_allowed(user)
    if not verify_password(payload.current_password,user.password_hash):raise HTTPException(400,"Mot de passe actuel incorrect.")
    user.password_hash=hash_password(payload.new_password)
    user.auth_version += 1
    db.query(AuthSession).filter(AuthSession.user_id==user.id,AuthSession.revoked_at.is_(None)).update({AuthSession.revoked_at:datetime.now(UTC)},synchronize_session=False)
    db.commit();return {"status":"updated"}

def appointments(db:Session,user:User):
    _,p=context(user)
    tenant_ids=select(PatientCabinetMembership.tenant_id).where(PatientCabinetMembership.patient_id==p.id,PatientCabinetMembership.status=="active")
    return list(db.scalars(select(Appointment).where(Appointment.patient_id==p.id,or_(Appointment.tenant_id==p.tenant_id,Appointment.tenant_id.in_(tenant_ids))).order_by(Appointment.date.desc())).all())
def visits(db:Session,user:User):
    tenant,p=context(user)
    rows=db.scalars(select(Visit).where(Visit.tenant_id==tenant,Visit.patient_id==p.id).order_by(Visit.visit_date.desc())).all()
    result=[{"id":x.id,"doctor_id":x.doctor_id,"visit_date":x.visit_date,"reason":x.reason,"notes":x.notes,"attendance_status":x.attendance_status,"status":x.status,"appointment_id":x.appointment_id,"actual_start_time":x.actual_start_time,"actual_end_time":x.actual_end_time,"duration_seconds":x.duration_seconds} for x in rows]
    linked={x.appointment_id for x in rows if x.appointment_id}
    absences=db.scalars(select(Appointment).where(Appointment.tenant_id==tenant,Appointment.patient_id==p.id,Appointment.status=="absent").order_by(Appointment.date.desc())).all()
    result.extend({"id":f"absence-{x.id}","visit_date":x.date,"reason":x.reason,"attendance_status":"absent","status":"absent","appointment_id":x.id} for x in absences if x.id not in linked)
    return sorted(result,key=lambda x:x["visit_date"],reverse=True)
def documents(db:Session,user:User):
    tenant,p=context(user);return list(db.scalars(select(MedicalDocument).where(MedicalDocument.tenant_id==tenant,MedicalDocument.patient_id==p.id,MedicalDocument.shared_with_patient.is_(True)).order_by(MedicalDocument.created_at.desc())).all())
def prescriptions(db:Session,user:User):
    tenant,p=context(user);return list(db.scalars(select(Prescription).where(Prescription.tenant_id==tenant,Prescription.patient_id==p.id).order_by(Prescription.created_at.desc())).all())
def cnss(db:Session,user:User):
    tenant,p=context(user);rows=db.scalars(select(CNSSCase).where(CNSSCase.tenant_id==tenant,CNSSCase.patient_id==p.id).order_by(CNSSCase.created_at.desc())).all()
    from app.services.crud_service import serialize_cnss_items
    return serialize_cnss_items(db,list(rows),hide_internal_notes=True)

def create_cnss_request(db:Session,user:User,payload:PatientCNSSCreate)->CNSSOut:
    tenant,patient=context(user);ensure_write_allowed(user)
    linked=[]
    appointment=None;visit=None;fee=None
    if payload.appointment_id:
        appointment=db.scalar(select(Appointment).where(Appointment.id==payload.appointment_id,Appointment.tenant_id==tenant,Appointment.patient_id==patient.id))
        if not appointment:raise HTTPException(404,"Rendez-vous introuvable.")
        linked.append(CNSSCase.appointment_id==appointment.id)
    if payload.visit_id:
        visit=db.scalar(select(Visit).where(Visit.id==payload.visit_id,Visit.tenant_id==tenant,Visit.patient_id==patient.id))
        if not visit:raise HTTPException(404,"Visite introuvable.")
        linked.append(CNSSCase.visit_id==visit.id)
    if payload.fee_id:
        fee=db.scalar(select(Fee).where(Fee.id==payload.fee_id,Fee.tenant_id==tenant,Fee.patient_id==patient.id))
        if not fee:raise HTTPException(404,"Acte médical introuvable.")
        linked.append(CNSSCase.fee_id==fee.id)
    for condition in linked:
        duplicate=db.scalar(select(CNSSCase.id).where(CNSSCase.tenant_id==tenant,CNSSCase.patient_id==patient.id,CNSSCase.status.notin_({"APPROVED","REJECTED"}),condition))
        if duplicate:raise HTTPException(409,"Une demande CNSS/CNOPS active existe déjà pour cet élément médical.")
    amount=Decimal(str(fee.amount if fee else 0))
    item=CNSSCase(tenant_id=tenant,patient_id=patient.id,appointment_id=payload.appointment_id,visit_id=payload.visit_id,fee_id=payload.fee_id,label="Demande de dossier CNSS/CNOPS",description=(payload.comment or "").strip() or None,requested_amount=amount,total_amount=amount,estimated_reimbursable_amount=amount,status="REQUESTED",deposit_deadline=payload.deposit_deadline or date.today()+timedelta(days=30),created_by_user_id=user.id)
    db.add(item);db.flush()
    db.add(CNSSStatusHistory(tenant_id=tenant,cnss_case_id=item.id,old_status=None,new_status="REQUESTED",changed_by_user_id=user.id,changed_by_role="PATIENT",comment=(payload.comment or "").strip() or "Demande envoyée par le patient.",event_metadata={"appointment_id":payload.appointment_id,"visit_id":payload.visit_id,"fee_id":payload.fee_id}))
    doctor_id=appointment.doctor_id if appointment else visit.doctor_id if visit else fee.doctor_id if fee else None
    doctor=db.get(DoctorProfile,doctor_id) if doctor_id else None
    doctor_user=db.get(User,doctor.user_id) if doctor else None
    notification_message=f"{user.first_name} {user.last_name} a envoyé une nouvelle demande de dossier CNSS/CNOPS."
    if doctor_user and doctor_user.is_active:
        db.add(UserNotification(tenant_id=tenant,user_id=doctor_user.id,notification_type="CNSS_REQUEST",title="Nouvelle demande CNSS/CNOPS",message=notification_message,resource_id=item.id))
    else:
        from app.services.subscription_service import notify_tenant_doctors
        notify_tenant_doctors(db,tenant,"CNSS_REQUEST","Nouvelle demande CNSS/CNOPS",notification_message,item.id)
    db.commit();db.refresh(item)
    return CNSSOut.model_validate(item,from_attributes=True).model_copy(update={"internal_notes":None})

def update_cnss_by_patient(db:Session,user:User,item_id:str,payload:PatientCNSSAction)->CNSSOut:
    tenant,patient=context(user);ensure_write_allowed(user)
    item=db.scalar(select(CNSSCase).where(CNSSCase.id==item_id,CNSSCase.tenant_id==tenant,CNSSCase.patient_id==patient.id))
    if not item:raise HTTPException(404,"Dossier CNSS/CNOPS introuvable.")
    old_status=item.status
    if payload.action not in CNSS_PATIENT_ACTIONS_BY_STATUS.get(old_status,set()):
        raise HTTPException(409,"Cette action n’est pas disponible à l’étape actuelle du dossier.")
    comment=(payload.comment or "").strip() or None
    metadata={}
    if payload.action=="confirm_pickup":
        if old_status!="READY_FOR_PICKUP":raise HTTPException(409,"Le dossier doit être disponible au cabinet avant sa récupération.")
        item.status="DELIVERED_TO_PATIENT";item.delivery_confirmed_at=datetime.now(UTC);item.delivery_confirmed_by_user_id=user.id
        history_comment=comment or "Récupération du dossier confirmée par le patient."
    elif payload.action=="confirm_deposit":
        if old_status!="DELIVERED_TO_PATIENT":raise HTTPException(409,"Confirmez d’abord la récupération du dossier.")
        item.status="SUBMITTED_TO_CNSS";item.deposit_date=payload.deposit_date;item.deposit_reference=payload.deposit_reference
        metadata={"deposit_date":str(payload.deposit_date),"deposit_reference":payload.deposit_reference}
        history_comment=comment or "Dépôt auprès de la CNSS/CNOPS déclaré par le patient."
    elif payload.action=="declare_approved":
        if old_status!="SUBMITTED_TO_CNSS":raise HTTPException(409,"La décision peut être déclarée uniquement après le dépôt auprès de la CNSS/CNOPS.")
        amount=Decimal(str(payload.reimbursed_amount)) if payload.reimbursed_amount is not None else None
        if amount is not None and amount>Decimal(str(item.total_amount or 0)):raise HTTPException(422,"Le montant remboursé ne peut pas dépasser le montant total.")
        item.status="APPROVED";item.decision_date=payload.decision_date or date.today();item.reimbursed_amount=amount if amount is not None else item.reimbursed_amount
        metadata={"decision_date":str(item.decision_date),"reimbursed_amount":payload.reimbursed_amount}
        history_comment=comment or "Acceptation par la CNSS/CNOPS déclarée par le patient."
    else:
        if old_status!="SUBMITTED_TO_CNSS":raise HTTPException(409,"La décision peut être déclarée uniquement après le dépôt auprès de la CNSS/CNOPS.")
        labels={"INCOMPLETE":"Dossier incomplet","MISSING_DOCUMENT":"Document manquant","INCORRECT_INFORMATION":"Informations incorrectes","DEADLINE_EXCEEDED":"Délai dépassé","NOT_COVERED":"Acte non pris en charge","OTHER":"Autre"}
        item.status="REJECTED";item.decision_date=payload.decision_date;item.rejection_code=payload.rejection_code;item.rejection_reason=labels[payload.rejection_code or "OTHER"]
        metadata={"decision_date":str(payload.decision_date),"rejection_code":payload.rejection_code}
        history_comment=comment
    db.add(CNSSStatusHistory(tenant_id=tenant,cnss_case_id=item.id,old_status=old_status,new_status=item.status,changed_by_user_id=user.id,changed_by_role="PATIENT",comment=history_comment,rejection_reason=item.rejection_reason if item.status=="REJECTED" else None,event_metadata=metadata))
    item.updated_by_user_id=user.id
    db.commit();db.refresh(item)
    return CNSSOut.model_validate(item,from_attributes=True).model_copy(update={"internal_notes":None})
def payments(db:Session,user:User):
    tenant,p=context(user)
    if not settings(db,user).patient_can_view_payments:raise HTTPException(403,"Les paiements ne sont pas partagés par le cabinet.")
    return list(db.scalars(select(Payment).where(Payment.tenant_id==tenant,Payment.patient_id==p.id).order_by(Payment.paid_at.desc())).all())
def fees(db:Session,user:User):
    tenant,p=context(user)
    if not settings(db,user).patient_can_view_payments:raise HTTPException(403,"Les honoraires ne sont pas partagés par le cabinet.")
    rows=db.scalars(select(Fee).where(Fee.tenant_id==tenant,Fee.patient_id==p.id).order_by(Fee.created_at.desc())).all()
    return [serialize_fee(db,row) for row in rows]

def request_appointment(db:Session,user:User,payload:AppointmentRequest):
    _,p=context(user)
    doctor=db.scalar(select(DoctorProfile).where(DoctorProfile.id==payload.doctor_id)) if payload.doctor_id else None
    if not doctor:raise HTTPException(404,"Médecin introuvable.")
    tenant=doctor.tenant_id;target_tenant=db.get(Tenant,tenant)
    if not target_tenant or target_tenant.status not in {"trial","active"}:raise HTTPException(403,"Ce cabinet n’est pas disponible.")
    cfg=tenant_settings(db,tenant)
    if not cfg.patient_can_request_appointment:raise HTTPException(403,"La demande de rendez-vous est désactivée par le cabinet.")
    timezone_name=target_tenant.settings.timezone if target_tenant.settings else "Africa/Casablanca"
    try:timezone=ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:timezone=ZoneInfo("Africa/Casablanca")
    now=datetime.now(timezone)
    requested_start=datetime.combine(payload.date,payload.start_time,tzinfo=timezone)
    if requested_start<=now:raise HTTPException(400,"Vous ne pouvez pas demander un rendez-vous dans le passé. Choisissez une date et une heure à venir.")
    from app.services.schedule_service import public_availability
    available_days=public_availability(db,doctor.id)
    selected_slot=next((slot for day in available_days if day["date"]==payload.date.isoformat() for slot in day["slots"] if slot["start_time"]==payload.start_time.strftime("%H:%M")),None)
    if not selected_slot:raise HTTPException(409,"Ce créneau n’est plus disponible. Choisissez un autre créneau proposé.")
    selected_end=datetime.strptime(selected_slot["end_time"],"%H:%M").time()
    conflict=db.scalar(select(Appointment).where(Appointment.tenant_id==tenant,Appointment.doctor_id==doctor.id,Appointment.date==payload.date,Appointment.status.notin_({"cancelled","requested","rejected"}),Appointment.start_time<selected_end,Appointment.end_time>payload.start_time))
    if conflict:raise HTTPException(409,"Ce créneau est déjà réservé.")
    duplicate=db.scalar(select(Appointment).where(Appointment.tenant_id==tenant,Appointment.patient_id==p.id,Appointment.date==payload.date,Appointment.status.notin_({"cancelled","rejected"}),Appointment.start_time<selected_end,Appointment.end_time>payload.start_time))
    if duplicate:raise HTTPException(409,"Vous avez déjà un rendez-vous ou une demande sur ce créneau.")
    ensure_membership(db,p.id,tenant)
    item=Appointment(tenant_id=tenant,patient_id=p.id,doctor_id=doctor.id,date=payload.date,start_time=payload.start_time,end_time=selected_end,reason=payload.reason,status="requested" if cfg.patient_requires_validation else "planned")
    item.origin='patient_portal';db.add(item);db.commit();db.refresh(item);return item

def change_appointment_status(db:Session,user:User,item_id:str,target:str):
    _,p=context(user);item=db.scalar(select(Appointment).where(Appointment.id==item_id,Appointment.patient_id==p.id))
    if not item:raise HTTPException(404,"Rendez-vous introuvable.")
    ensure_membership(db,p.id,item.tenant_id);cfg=tenant_settings(db,item.tenant_id)
    if target=="confirmed" and not cfg.patient_can_confirm_appointment:raise HTTPException(403,"Confirmation non autorisée.")
    if target=="cancelled" and not cfg.patient_can_cancel_appointment:raise HTTPException(403,"Annulation non autorisée.")
    allowed={"confirmed":{"planned"},"cancelled":{"requested","planned","confirmed"}}
    if item.status not in allowed.get(target,set()):raise HTTPException(422,"Ce changement de statut n’est plus autorisé pour ce rendez-vous.")
    item.status=target;db.commit();db.refresh(item);return item

def dashboard(db:Session,user:User)->dict:
    info=profile(db,user);appts=appointments(db,user);visit_rows=visits(db,user);docs=documents(db,user);rx=prescriptions(db,user);cases=cnss(db,user)
    terminal_statuses={"completed","cancelled","rejected","absent"}
    now=datetime.now(ZoneInfo("Africa/Casablanca"))
    future=sorted([x for x in appts if (x.date>now.date() or (x.date==now.date() and x.end_time>=now.time().replace(tzinfo=None))) and x.status not in terminal_statuses],key=lambda x:(x.date,x.start_time))
    memberships=db.scalars(select(PatientCabinetMembership).where(PatientCabinetMembership.patient_id==user.patient_profile.id,PatientCabinetMembership.status=="active")).all()
    tenant_ids={row.tenant_id for row in memberships}
    if user.patient_profile.tenant_id:tenant_ids.add(user.patient_profile.tenant_id)
    visible_tenant_ids={tenant_id for tenant_id in tenant_ids if tenant_settings(db,tenant_id).patient_can_view_payments}
    fee_rows=db.scalars(select(Fee).where(Fee.patient_id==user.patient_profile.id,Fee.tenant_id.in_(visible_tenant_ids))).all() if visible_tenant_ids else []
    due_rows=db.scalars(select(PaymentDueDate).where(PaymentDueDate.patient_id==user.patient_profile.id,PaymentDueDate.tenant_id.in_(visible_tenant_ids),PaymentDueDate.status!="ANNULEE").order_by(PaymentDueDate.due_date)).all() if visible_tenant_ids else []
    tenant_names={row.id:row.name for row in db.scalars(select(Tenant).where(Tenant.id.in_(visible_tenant_ids))).all()} if visible_tenant_ids else {}
    total_amount=sum(float(row.amount or 0) for row in fee_rows)
    total_paid=sum(float(row.paid_amount or 0) for row in fee_rows)
    remaining=max(0,total_amount-total_paid)
    overdue=sum(float(row.remaining_amount) for row in due_rows if row.due_date<date.today() and row.remaining_amount>0)
    upcoming=sum(float(row.remaining_amount) for row in due_rows if row.due_date>=date.today() and row.remaining_amount>0)
    due_items=[{"id":row.id,"fee_id":row.fee_id,"tenant_id":row.tenant_id,"cabinet_name":tenant_names.get(row.tenant_id,"Cabinet médical"),"amount":float(row.amount),"paid_amount":float(row.paid_amount),"remaining_amount":float(row.remaining_amount),"due_date":row.due_date,"status":"EN_RETARD" if row.due_date<date.today() else row.status} for row in due_rows if row.remaining_amount>0]
    financial_summary={"visible":bool(visible_tenant_ids),"cabinet_count":len(visible_tenant_ids),"total_amount":total_amount,"total_paid":total_paid,"remaining_amount":remaining,"upcoming_due_amount":upcoming,"overdue_due_amount":overdue,"open_due_count":len(due_items),"next_due_date":due_items[0]["due_date"] if due_items else None}
    financial_items=[]
    if fee_rows:
        fee_ids={row.id for row in fee_rows}
        appointment_links=db.scalars(select(HonoraireAppointment).where(HonoraireAppointment.fee_id.in_(fee_ids))).all()
        visit_links=db.scalars(select(HonoraireVisit).where(HonoraireVisit.fee_id.in_(fee_ids))).all()
        appointment_ids={row.appointment_id for row in appointment_links}
        visit_ids={row.visit_id for row in visit_links}
        appointment_rows={row.id:row for row in appts if row.id in appointment_ids}
        linked_visits={row.id:row for row in db.scalars(select(Visit).where(Visit.id.in_(visit_ids))).all()} if visit_ids else {}
        payment_rows=db.scalars(select(Payment).where(Payment.fee_id.in_(fee_ids)).order_by(Payment.paid_at)).all()
        shared_documents=db.scalars(select(MedicalDocument).where(MedicalDocument.patient_id==user.patient_profile.id,MedicalDocument.tenant_id.in_(visible_tenant_ids),MedicalDocument.shared_with_patient.is_(True),MedicalDocument.archived_at.is_(None),or_(MedicalDocument.fee_id.in_(fee_ids),MedicalDocument.appointment_id.in_(appointment_ids),MedicalDocument.visit_id.in_(visit_ids)))).all()
        doctor_ids={row.doctor_id for row in fee_rows if row.doctor_id}|{row.doctor_id for row in appointment_rows.values() if row.doctor_id}
        doctors={row.id:row for row in db.scalars(select(DoctorProfile).where(DoctorProfile.id.in_(doctor_ids))).all()} if doctor_ids else {}
        for fee in sorted(fee_rows,key=lambda row:row.created_at,reverse=True):
            fee_appointment_ids={row.appointment_id for row in appointment_links if row.fee_id==fee.id}
            fee_visit_ids={row.visit_id for row in visit_links if row.fee_id==fee.id}
            fee_appointments=[appointment_rows[item_id] for item_id in fee_appointment_ids if item_id in appointment_rows]
            doctor=doctors.get(fee.doctor_id) or next((doctors.get(item.doctor_id) for item in fee_appointments if item.doctor_id),None)
            fee_dues=[row for row in due_rows if row.fee_id==fee.id]
            fee_documents=[row for row in shared_documents if row.fee_id==fee.id or row.appointment_id in fee_appointment_ids or row.visit_id in fee_visit_ids]
            financial_items.append({
                "id":fee.id,"tenant_id":fee.tenant_id,"cabinet_name":tenant_names.get(fee.tenant_id,"Cabinet médical"),"title":fee.title,"fee_type":fee.fee_type,
                "amount":float(fee.amount),"paid_amount":float(fee.paid_amount),"remaining_amount":max(0,float(fee.amount)-float(fee.paid_amount)),"status":fee.status,"due_date":fee.due_date,"created_at":fee.created_at,
                "doctor":{"id":doctor.id,"name":f"Dr {doctor.user.first_name} {doctor.user.last_name}" if doctor and doctor.user else "Médecin du cabinet","specialty":doctor.specialty if doctor else None} if doctor else None,
                "appointments":[{"id":item.id,"date":item.date,"start_time":item.start_time,"end_time":item.end_time,"reason":item.reason,"status":item.status,"doctor_name":f"Dr {doctors[item.doctor_id].user.first_name} {doctors[item.doctor_id].user.last_name}" if item.doctor_id in doctors and doctors[item.doctor_id].user else None} for item in sorted(fee_appointments,key=lambda row:(row.date,row.start_time),reverse=True)],
                "visits":[{"id":item.id,"visit_date":item.visit_date,"reason":item.reason,"status":item.status,"attendance_status":item.attendance_status} for item_id in fee_visit_ids if (item:=linked_visits.get(item_id))],
                "payments":[{"id":item.id,"amount":float(item.amount),"method":item.method,"status":item.status,"paid_at":item.paid_at,"reference":item.reference} for item in payment_rows if item.fee_id==fee.id],
                "dues":[{"id":item.id,"amount":float(item.amount),"paid_amount":float(item.paid_amount),"remaining_amount":float(item.remaining_amount),"due_date":item.due_date,"status":"EN_RETARD" if item.due_date<date.today() and item.remaining_amount>0 else item.status} for item in fee_dues],
                "documents":[{"id":item.id,"title":item.title,"document_type":item.document_type,"document_date":item.document_date,"created_at":item.created_at} for item in fee_documents],
            })
    return {"profile":info,"next_appointment":future[0] if future else None,"total_appointments":len(appts),"completed_visits":sum(x["attendance_status"]=="present" for x in visit_rows),"absences":sum(x["attendance_status"]=="absent" for x in visit_rows),"recent_appointments":appts[:5],"recent_visits":visit_rows[:5],"recent_documents":docs[:5],"recent_prescriptions":rx[:5],"cnss":cases[:5],"remaining_amount":remaining if visible_tenant_ids else None,"financial_summary":financial_summary,"upcoming_due_dates":due_items[:5],"financial_items":financial_items}
