from datetime import UTC, datetime, timedelta
import re
import unicodedata
from uuid import uuid4
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Appointment, AuditLog, BackupLog, BlogGalleryImage, EventGalleryImage, EventParticipant, EventRegistration, PatientNotification, PatientProfile, PlatformBlogPost, PlatformEvent, PlatformSettings, RestoreLog, Role, Subscription, SubscriptionPlan, SupportReply, SupportTicket, Tenant, User, UserNotification
from app.schemas.admin import AdminSubscriptionCreate, AdminSubscriptionUpdate, AdminTenantUpdate, BlogPostCreate, BlogPostUpdate, PlatformEventCreate, PlatformEventUpdate, PlatformSettingsUpdate, PublicEventRegistrationCreate, SubscriptionPlanCreate, SubscriptionPlanUpdate, SupportReplyCreate, SupportTicketUpdate
from app.services.crud_service import role_code

def require_super_admin(user:User)->None:
    if role_code(user)!="SUPER_ADMIN_IRMA" or user.tenant_id is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="Accès réservé au Super Admin IRMA.")

def log_action(db:Session,user:User,action:str,resource_type:str,resource_id:str|None=None,metadata:dict|None=None)->None:
    db.add(AuditLog(user_id=user.id,action=action,resource_type=resource_type,resource_id=resource_id,event_metadata=metadata))

def doctor_for_tenant(db:Session,tenant_id:str)->User|None:
    return db.scalar(select(User).join(User.roles).where(User.tenant_id==tenant_id,Role.code=="doctor_admin"))

def tenant_out(db:Session,t:Tenant)->dict:
    doctor=doctor_for_tenant(db,t.id);sub=db.scalar(select(Subscription).where(Subscription.tenant_id==t.id))
    return {"id":t.id,"name":t.name,"slug":t.slug,"city":t.city,"address":t.address,"phone":t.phone,"status":t.status,"trial_started_at":t.trial_started_at,"trial_ends_at":t.trial_ends_at,"doctor_admin_name":f"{doctor.first_name} {doctor.last_name}" if doctor else None,"doctor_admin_email":doctor.email if doctor else None,"plan_name":sub.plan_name if sub else None,"created_at":t.created_at}

def list_tenants(db:Session,user:User)->list[dict]:
    require_super_admin(user);return [tenant_out(db,t) for t in db.scalars(select(Tenant).order_by(Tenant.created_at.desc())).all()]

def get_tenant(db:Session,user:User,tenant_id:str)->dict:
    require_super_admin(user);t=db.get(Tenant,tenant_id)
    if not t:raise HTTPException(404,"Cabinet introuvable.")
    return tenant_out(db,t)

def update_tenant(db:Session,user:User,tenant_id:str,payload:AdminTenantUpdate)->dict:
    require_super_admin(user);t=db.get(Tenant,tenant_id)
    if not t:raise HTTPException(404,"Cabinet introuvable.")
    for k,v in payload.model_dump(exclude_unset=True).items():setattr(t,k,v)
    log_action(db,user,"admin.tenant.updated","tenant",tenant_id);db.commit();db.refresh(t);return tenant_out(db,t)

def change_tenant_status(db:Session,user:User,tenant_id:str,new_status:str)->dict:
    require_super_admin(user);t=db.get(Tenant,tenant_id)
    if not t:raise HTTPException(404,"Cabinet introuvable.")
    old=t.status;t.status=new_status;t.suspended_at=datetime.now(UTC) if new_status=="suspended" else None
    sub=db.scalar(select(Subscription).where(Subscription.tenant_id==tenant_id))
    if sub and new_status in {"trial","active","expired","cancelled"}:sub.status=new_status
    log_action(db,user,"admin.tenant.status_changed","tenant",tenant_id,{"from":old,"to":new_status});db.commit();db.refresh(t);return tenant_out(db,t)

def expiring(db:Session,user:User)->list[dict]:
    require_super_admin(user);now=datetime.now(UTC);end=now+timedelta(days=7)
    rows=db.scalars(select(Tenant).where(Tenant.status=="trial",Tenant.trial_ends_at>=now,Tenant.trial_ends_at<=end).order_by(Tenant.trial_ends_at)).all()
    return [tenant_out(db,t) for t in rows]

def ensure_subscriptions(db:Session)->None:
    existing=set(db.scalars(select(Subscription.tenant_id)).all())
    for t in db.scalars(select(Tenant)).all():
        if t.id not in existing:db.add(Subscription(tenant_id=t.id,status=t.status,start_date=t.trial_started_at,end_date=t.trial_ends_at,amount=0,payment_status="pending"))
    db.commit()

def subscription_out(db:Session,s:Subscription)->dict:
    t=db.get(Tenant,s.tenant_id);doctor=doctor_for_tenant(db,s.tenant_id)
    return {"id":s.id,"tenant_id":s.tenant_id,"cabinet_name":t.name if t else "Cabinet supprimé","doctor_name":f"{doctor.first_name} {doctor.last_name}" if doctor else None,"plan_name":s.plan_name,"plan_id":s.plan_id,"status":s.status,"start_date":s.start_date,"end_date":s.end_date,"next_due_date":s.next_due_date,"amount":float(s.amount),"payment_status":s.payment_status,"payment_method":s.payment_method,"admin_note":s.admin_note,"created_at":s.created_at}

def list_subscriptions(db:Session,user:User)->list[dict]:
    require_super_admin(user);ensure_subscriptions(db);return [subscription_out(db,s) for s in db.scalars(select(Subscription).order_by(Subscription.created_at.desc())).all()]
def create_subscription(db:Session,user:User,payload:AdminSubscriptionCreate)->dict:
    require_super_admin(user);tenant=db.get(Tenant,payload.tenant_id)
    if not tenant:raise HTTPException(404,"Cabinet introuvable.")
    if db.scalar(select(Subscription).where(Subscription.tenant_id==payload.tenant_id)):raise HTTPException(409,"Un abonnement existe déjà pour ce cabinet.")
    item=Subscription(**payload.model_dump());db.add(item);tenant.status=item.status if item.status in {"trial","active","expired","cancelled"} else tenant.status;db.flush();log_action(db,user,"admin.subscription.created","subscription",item.id);db.commit();return subscription_out(db,item)

def get_subscription(db:Session,user:User,item_id:str)->dict:
    require_super_admin(user);s=db.get(Subscription,item_id)
    if not s:raise HTTPException(404,"Abonnement introuvable.")
    return subscription_out(db,s)

def update_subscription(db:Session,user:User,item_id:str,payload:AdminSubscriptionUpdate)->dict:
    require_super_admin(user);s=db.get(Subscription,item_id)
    if not s:raise HTTPException(404,"Abonnement introuvable.")
    for k,v in payload.model_dump(exclude_unset=True).items():setattr(s,k,v)
    t=db.get(Tenant,s.tenant_id)
    if t and s.status in {"trial","active","expired"}:t.status=s.status
    log_action(db,user,"admin.subscription.updated","subscription",s.id,{"status":s.status});db.commit();db.refresh(s);return subscription_out(db,s)

def ticket_out(db:Session,t:SupportTicket)->dict:
    tenant=db.get(Tenant,t.tenant_id) if t.tenant_id else None;creator=db.get(User,t.created_by) if t.created_by else None
    return {"id":t.id,"tenant_id":t.tenant_id,"cabinet_name":tenant.name if tenant else None,"created_by_name":f"{creator.first_name} {creator.last_name}" if creator else None,"subject":t.subject,"message":t.message,"status":t.status,"priority":t.priority,"internal_note":t.internal_note,"created_at":t.created_at,"updated_at":t.updated_at}

def list_tickets(db:Session,user:User)->list[dict]:require_super_admin(user);return [ticket_out(db,t) for t in db.scalars(select(SupportTicket).order_by(SupportTicket.created_at.desc())).all()]
def get_ticket(db:Session,user:User,item_id:str)->dict:
    require_super_admin(user);t=db.get(SupportTicket,item_id)
    if not t:raise HTTPException(404,"Ticket introuvable.")
    return ticket_out(db,t)
def update_ticket(db:Session,user:User,item_id:str,payload:SupportTicketUpdate)->dict:
    require_super_admin(user);t=db.get(SupportTicket,item_id)
    if not t:raise HTTPException(404,"Ticket introuvable.")
    for k,v in payload.model_dump(exclude_unset=True).items():setattr(t,k,v)
    log_action(db,user,"admin.support.updated","support_ticket",t.id);db.commit();db.refresh(t);return ticket_out(db,t)
def reply_ticket(db:Session,user:User,item_id:str,payload:SupportReplyCreate)->dict:
    require_super_admin(user);get_ticket(db,user,item_id);ticket=db.get(SupportTicket,item_id);r=SupportReply(ticket_id=item_id,user_id=user.id,message=payload.message,internal=payload.internal);db.add(r)
    if ticket and not payload.internal:
        ticket.status="in_progress"
        if ticket.tenant_id and ticket.created_by:db.add(UserNotification(tenant_id=ticket.tenant_id,user_id=ticket.created_by,notification_type="SUPPORT_REPLY",title="Nouvelle réponse du support",message=payload.message.strip(),resource_id=ticket.id))
    log_action(db,user,"admin.support.replied","support_ticket",item_id);db.commit();return {"status":"sent","id":r.id}

def logs(db:Session,user:User)->list[dict]:
    require_super_admin(user);rows=db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(250)).all()
    return [{"id":x.id,"level":"INFO","message":x.action,"user_id":x.user_id,"tenant_id":x.tenant_id,"action":x.action,"resource_type":x.resource_type,"created_at":x.created_at} for x in rows]

def analytics(db:Session,user:User)->dict:
    require_super_admin(user)
    statuses=dict(db.execute(select(Tenant.status,func.count()).group_by(Tenant.status)).all());roles=dict(db.execute(select(Role.code,func.count(User.id)).join(User.roles).group_by(Role.code)).all())
    return {"total_tenants":sum(statuses.values()),"tenants_by_status":statuses,"users_by_role":roles,"appointments_total_anonymized":db.scalar(select(func.count()).select_from(Appointment)) or 0,"active_subscriptions":db.scalar(select(func.count()).select_from(Subscription).where(Subscription.status=="active")) or 0,"subscription_revenue":float(db.scalar(select(func.coalesce(func.sum(Subscription.amount),0)).where(Subscription.payment_status=="paid")) or 0)}

def dashboard(db:Session,user:User)->dict:
    a=analytics(db,user);tenants=list_tenants(db,user);tickets=list_tickets(db,user);log_rows=logs(db,user)
    statuses=a["tenants_by_status"]
    month_start=datetime.now(UTC).replace(day=1,hour=0,minute=0,second=0,microsecond=0)
    latest_backup=db.scalar(select(BackupLog).order_by(BackupLog.created_at.desc()));latest_restore=db.scalar(select(RestoreLog).order_by(RestoreLog.created_at.desc()));backup_alerts=sum(row is not None and row.status=="failed" for row in (latest_backup,latest_restore))
    return {"stats":{"total_tenants":a["total_tenants"],"trial":statuses.get("trial",0),"active":statuses.get("active",0),"expired":statuses.get("expired",0),"suspended":statuses.get("suspended",0),"new_this_month":db.scalar(select(func.count()).select_from(Tenant).where(Tenant.created_at>=month_start)) or 0,"doctors":a["users_by_role"].get("doctor_admin",0),"active_subscriptions":a["active_subscriptions"],"expired_subscriptions":db.scalar(select(func.count()).select_from(Subscription).where(Subscription.status=="expired")) or 0,"open_tickets":sum(t["status"] in {"open","in_progress"} for t in tickets),"revenue":a["subscription_revenue"],"backup_alerts":backup_alerts},"expiring_soon":expiring(db,user),"recent_tenants":tenants[:5],"recent_logs":log_rows[:5],"recent_tickets":tickets[:5]}

def check_expiration(db:Session,user:User)->dict:
    require_super_admin(user);now=datetime.now(UTC);rows=db.scalars(select(Tenant).where(Tenant.status=="trial",Tenant.trial_ends_at<now)).all()
    for t in rows:t.status="expired";log_action(db,user,"admin.tenant.auto_expired","tenant",t.id)
    db.commit();return {"updated":len(rows)}

def extend_trial(db:Session,user:User,tenant_id:str,days:int=30)->dict:
    require_super_admin(user);t=db.get(Tenant,tenant_id)
    if not t:raise HTTPException(404,"Cabinet introuvable.")
    t.trial_ends_at=max(t.trial_ends_at,datetime.now(UTC))+timedelta(days=days);t.status="trial";t.suspended_at=None
    sub=db.scalar(select(Subscription).where(Subscription.tenant_id==tenant_id))
    if sub:sub.status="trial";sub.end_date=t.trial_ends_at
    log_action(db,user,"admin.tenant.trial_extended","tenant",t.id,{"days":days});db.commit();return tenant_out(db,t)

def renew_subscription(db:Session,user:User,item_id:str)->dict:
    require_super_admin(user);s=db.get(Subscription,item_id)
    if not s:raise HTTPException(404,"Abonnement introuvable.")
    plan=db.get(SubscriptionPlan,s.plan_id) if s.plan_id else None;months=plan.duration_months if plan else 1
    s.start_date=datetime.now(UTC);s.end_date=s.start_date+timedelta(days=30*months);s.next_due_date=s.end_date;s.status="active";s.payment_status="paid"
    t=db.get(Tenant,s.tenant_id);t.status="active";t.suspended_at=None
    log_action(db,user,"admin.subscription.renewed","subscription",s.id,{"months":months});db.commit();return subscription_out(db,s)

def list_plans(db:Session,user:User):require_super_admin(user);return list(db.scalars(select(SubscriptionPlan).order_by(SubscriptionPlan.price)).all())
def create_plan(db:Session,user:User,payload:SubscriptionPlanCreate):
    require_super_admin(user)
    if db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.name==payload.name)):raise HTTPException(409,"Ce plan existe déjà.")
    data=payload.model_dump();data["slug"]=data.get("slug") or re.sub(r"[^a-z0-9]+","-",unicodedata.normalize("NFKD",payload.name).encode("ascii","ignore").decode().lower()).strip("-")
    modules=set(data.get("enabled_modules") or [])
    data.update(whatsapp_enabled="whatsapp" in modules,cnss_enabled="cnss" in modules,statistics_enabled="statistics" in modules)
    if db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.slug==data["slug"])):raise HTTPException(409,"Ce slug de plan existe déjà.")
    if data.get("is_featured"):
        for plan in db.scalars(select(SubscriptionPlan).where(SubscriptionPlan.is_featured.is_(True))).all():plan.is_featured=False
    item=SubscriptionPlan(**data);db.add(item);db.flush();log_action(db,user,"admin.plan.created","subscription_plan",item.id);db.commit();db.refresh(item);return item
def update_plan(db:Session,user:User,item_id:str,payload:SubscriptionPlanUpdate):
    require_super_admin(user);item=db.get(SubscriptionPlan,item_id)
    if not item:raise HTTPException(404,"Plan introuvable.")
    if payload.is_featured:
        for plan in db.scalars(select(SubscriptionPlan).where(SubscriptionPlan.id!=item.id,SubscriptionPlan.is_featured.is_(True))).all():plan.is_featured=False
    data=payload.model_dump(exclude_unset=True)
    if "enabled_modules" in data:
        modules=set(data["enabled_modules"] or [])
        data.update(whatsapp_enabled="whatsapp" in modules,cnss_enabled="cnss" in modules,statistics_enabled="statistics" in modules)
    for key,value in data.items():setattr(item,key,value)
    log_action(db,user,"admin.plan.updated","subscription_plan",item.id);db.commit();db.refresh(item);return item
def delete_plan(db:Session,user:User,item_id:str):
    require_super_admin(user);item=db.get(SubscriptionPlan,item_id)
    if not item:raise HTTPException(404,"Plan introuvable.")
    item.is_active=False;log_action(db,user,"admin.plan.disabled","subscription_plan",item.id);db.commit();return {"status":"disabled"}

def main_users(db:Session,user:User)->list[dict]:
    require_super_admin(user);rows=db.scalars(select(User).join(User.roles).where(Role.code.in_(["doctor_admin","secretary","platform_super_admin"])).order_by(User.created_at.desc())).unique().all()
    return [{"id":row.id,"name":f"{row.first_name} {row.last_name}","email":row.email,"role":role_code(row),"tenant_id":row.tenant_id,"cabinet_name":db.get(Tenant,row.tenant_id).name if row.tenant_id else "Plateforme FADAA","is_active":row.is_active,"created_at":row.created_at} for row in rows]
def set_user_active(db:Session,user:User,item_id:str,active:bool):
    require_super_admin(user);item=db.get(User,item_id)
    if not item:raise HTTPException(404,"Utilisateur introuvable.")
    if item.is_super_admin and item.id==user.id and not active:raise HTTPException(422,"Vous ne pouvez pas désactiver votre propre compte Super Admin.")
    item.is_active=active;log_action(db,user,"admin.user.activated" if active else "admin.user.disabled","user",item.id);db.commit();return {"status":"active" if active else "disabled"}

def get_settings(db:Session,user:User):
    require_super_admin(user);item=db.get(PlatformSettings,"global")
    if not item:item=PlatformSettings(id="global");db.add(item);db.commit();db.refresh(item)
    return item
def update_settings(db:Session,user:User,payload:PlatformSettingsUpdate):
    item=get_settings(db,user)
    for key,value in payload.model_dump(exclude_unset=True).items():setattr(item,key,value)
    log_action(db,user,"admin.settings.updated","platform_settings","global");db.commit();db.refresh(item);return item

def event_registration_count(db:Session,event_id:str)->int:
    return int(db.scalar(select(func.coalesce(func.sum(EventRegistration.participant_count),0)).where(EventRegistration.event_id==event_id,EventRegistration.status=="confirmed")) or 0)

def event_out(db:Session,item:PlatformEvent,include_online_url:bool=True)->dict:
    registered=event_registration_count(db,item.id);remaining=max(0,item.capacity-registered) if item.capacity is not None else None
    gallery=list(db.scalars(select(EventGalleryImage).where(EventGalleryImage.event_id==item.id).order_by(EventGalleryImage.is_cover.desc(),EventGalleryImage.display_order,EventGalleryImage.created_at)).all())
    gallery_out=[{"id":image.id,"event_id":item.id,"url":f"/api/public/events/gallery/{image.id}","alt_text":image.alt_text,"caption":image.caption,"display_order":image.display_order,"is_cover":image.is_cover} for image in gallery]
    return {
        "id":item.id,"slug":item.slug or item.id,"title":item.title,"event_type":item.event_type,"description":item.description,"article_content":item.article_content,
        "start_at":item.start_at,"end_at":item.end_at,"location":item.location,"is_online":item.is_online,
        "attendance_mode":item.attendance_mode,"venue_name":item.venue_name,"address":item.address,
        "city":item.city,"country":item.country,"map_url":item.map_url,"online_provider":item.online_provider,
        "online_url":item.online_url if include_online_url else None,"registration_mode":item.registration_mode,
        "registration_url":item.registration_url,"capacity":item.capacity,"registration_count":registered,
        "remaining_capacity":remaining,"is_full":remaining==0 if remaining is not None else False,
        "status":item.status,"is_featured":item.is_featured,"notification_audience":item.notification_audience,"notification_sent_at":item.notification_sent_at,"gallery":gallery_out,
        "cover_image_url":next((image["url"] for image in gallery_out if image["is_cover"]),gallery_out[0]["url"] if gallery_out else None),
        "created_at":item.created_at,"updated_at":item.updated_at,
    }

def list_events(db:Session,user:User):
    require_super_admin(user);return [event_out(db,item) for item in db.scalars(select(PlatformEvent).order_by(PlatformEvent.start_at.desc())).all()]

def validate_event_values(values:dict)->None:
    start=values["start_at"];end=values["end_at"]
    if end<=start:raise HTTPException(422,"L’heure de fin doit être après l’heure de début.")
    mode=values.get("attendance_mode","in_person")
    if mode in {"in_person","hybrid"} and not (values.get("address") or values.get("location")):raise HTTPException(422,"Renseignez le lieu ou l’adresse de l’événement.")
    if mode in {"online","hybrid"} and not values.get("online_url"):raise HTTPException(422,"Le lien de visioconférence est obligatoire.")
    if values.get("registration_mode","internal")=="external" and not values.get("registration_url"):raise HTTPException(422,"Le lien d’inscription externe est obligatoire.")

def event_payload_values(payload,*,exclude_unset:bool=False)->dict:
    values=payload.model_dump(exclude_unset=exclude_unset)
    for key in ("map_url","online_url","registration_url"):
        if values.get(key) is not None:values[key]=str(values[key])
    return values

def event_slug(db:Session,title:str,item_id:str|None=None)->str:
    import re
    import unicodedata
    base=unicodedata.normalize("NFKD",title).encode("ascii","ignore").decode().lower()
    base=re.sub(r"[^a-z0-9]+","-",base).strip("-") or "evenement"
    slug=base;suffix=2
    while db.scalar(select(PlatformEvent.id).where(PlatformEvent.slug==slug,PlatformEvent.id!=item_id)):
        slug=f"{base}-{suffix}";suffix+=1
    return slug

def notify_event_audience(db:Session,item:PlatformEvent)->None:
    if item.notification_sent_at or item.status!="published":return
    message=f"Un nouvel événement « {item.title} » est prévu le {item.start_at.strftime('%d/%m/%Y à %H:%M')}."
    if item.notification_audience in {"doctors","both"}:
        doctors=db.scalars(select(User).join(User.roles).where(Role.code=="doctor_admin",User.tenant_id.is_not(None),User.is_active.is_(True))).unique().all()
        db.add_all([UserNotification(tenant_id=user.tenant_id,user_id=user.id,notification_type="PLATFORM_EVENT",title="Nouvel événement FADAA Santé",message=message,resource_id=item.id) for user in doctors])
    if item.notification_audience in {"patients","both"}:
        patients=db.scalars(select(PatientProfile).join(User,User.id==PatientProfile.user_id).where(PatientProfile.status=="active",User.is_active.is_(True))).all()
        db.add_all([PatientNotification(tenant_id=patient.tenant_id,patient_id=patient.id,notification_type="PLATFORM_EVENT",title="Nouvel événement FADAA Santé",message=message,resource_id=item.id) for patient in patients])
    item.notification_sent_at=datetime.now(UTC)

def create_event(db:Session,user:User,payload:PlatformEventCreate):
    require_super_admin(user)
    values=event_payload_values(payload);validate_event_values(values);values["is_online"]=values["attendance_mode"] in {"online","hybrid"}
    if values["attendance_mode"]=="online" and values.get("location") in {None,"","En ligne"}:values["location"]="En ligne"
    item=PlatformEvent(**values,slug=event_slug(db,values["title"]),created_by_user_id=user.id);db.add(item);db.flush();notify_event_audience(db,item);log_action(db,user,"admin.event.created","platform_event",item.id,{"status":item.status,"audience":item.notification_audience});db.commit();db.refresh(item);return event_out(db,item)
def update_event(db:Session,user:User,item_id:str,payload:PlatformEventUpdate):
    require_super_admin(user);item=db.get(PlatformEvent,item_id)
    if not item:raise HTTPException(404,"Événement introuvable.")
    values=event_payload_values(payload,exclude_unset=True)
    merged={key:getattr(item,key) for key in ("start_at","end_at","attendance_mode","address","location","online_url","registration_mode","registration_url")}
    merged.update(values);validate_event_values(merged)
    if "attendance_mode" in values:values["is_online"]=values["attendance_mode"] in {"online","hybrid"}
    if "title" in values and values["title"]!=item.title:values["slug"]=event_slug(db,values["title"],item.id)
    for key,value in values.items():setattr(item,key,value)
    notify_event_audience(db,item)
    item.updated_by_user_id=user.id;log_action(db,user,"admin.event.updated","platform_event",item.id,{"status":item.status,"audience":item.notification_audience});db.commit();db.refresh(item);return event_out(db,item)
def cancel_event(db:Session,user:User,item_id:str):
    require_super_admin(user);item=db.get(PlatformEvent,item_id)
    if not item:raise HTTPException(404,"Événement introuvable.")
    item.status="cancelled";item.updated_by_user_id=user.id;log_action(db,user,"admin.event.cancelled","platform_event",item.id);db.commit();return {"status":"cancelled"}

def public_events(db:Session,include_past:bool=False)->list[dict]:
    now=datetime.now(UTC);query=select(PlatformEvent).where(PlatformEvent.status=="published")
    if not include_past:query=query.where(PlatformEvent.end_at>=now).order_by(PlatformEvent.is_featured.desc(),PlatformEvent.start_at)
    else:query=query.order_by(PlatformEvent.start_at.desc())
    rows=list(db.scalars(query).all())
    if include_past:rows.sort(key=lambda item:(item.end_at<now,not item.is_featured,item.start_at.timestamp() if item.end_at>=now else -item.start_at.timestamp()))
    return [event_out(db,item,include_online_url=False) for item in rows if item.attendance_mode=="in_person" or bool(item.online_url)]

def public_event(db:Session,slug_or_id:str)->dict:
    item=db.scalar(select(PlatformEvent).where((PlatformEvent.slug==slug_or_id)|(PlatformEvent.id==slug_or_id),PlatformEvent.status=="published"))
    if not item:raise HTTPException(404,"Événement introuvable.")
    return event_out(db,item,include_online_url=False)

def blog_slug(db:Session,title:str,item_id:str|None=None)->str:
    base=unicodedata.normalize("NFKD",title).encode("ascii","ignore").decode().lower()
    base=re.sub(r"[^a-z0-9]+","-",base).strip("-") or "article"
    slug=base;suffix=2
    while db.scalar(select(PlatformBlogPost.id).where(PlatformBlogPost.slug==slug,PlatformBlogPost.id!=item_id)):
        slug=f"{base}-{suffix}";suffix+=1
    return slug

def blog_out(db:Session,item:PlatformBlogPost)->dict:
    images=list(db.scalars(select(BlogGalleryImage).where(BlogGalleryImage.post_id==item.id).order_by(BlogGalleryImage.is_cover.desc(),BlogGalleryImage.display_order,BlogGalleryImage.created_at)).all())
    gallery=[{"id":image.id,"post_id":item.id,"url":f"/api/public/blog/gallery/{image.id}","alt_text":image.alt_text,"caption":image.caption,"display_order":image.display_order,"is_cover":image.is_cover} for image in images]
    return {"id":item.id,"slug":item.slug,"title":item.title,"excerpt":item.excerpt,"content":item.content,"category":item.category,"author_name":item.author_name,"status":item.status,"is_featured":item.is_featured,"published_at":item.published_at,"gallery":gallery,"cover_image_url":next((image["url"] for image in gallery if image["is_cover"]),gallery[0]["url"] if gallery else None),"created_at":item.created_at,"updated_at":item.updated_at}

def list_blog_posts(db:Session,user:User)->list[dict]:
    require_super_admin(user);return [blog_out(db,item) for item in db.scalars(select(PlatformBlogPost).order_by(PlatformBlogPost.created_at.desc())).all()]
def create_blog_post(db:Session,user:User,payload:BlogPostCreate)->dict:
    require_super_admin(user);values=payload.model_dump();item=PlatformBlogPost(**values,slug=blog_slug(db,values["title"]),created_by_user_id=user.id,published_at=datetime.now(UTC) if values["status"]=="published" else None);db.add(item);db.flush();log_action(db,user,"admin.blog.created","platform_blog_post",item.id,{"status":item.status});db.commit();db.refresh(item);return blog_out(db,item)
def update_blog_post(db:Session,user:User,item_id:str,payload:BlogPostUpdate)->dict:
    require_super_admin(user);item=db.get(PlatformBlogPost,item_id)
    if not item:raise HTTPException(404,"Article introuvable.")
    values=payload.model_dump(exclude_unset=True)
    if "title" in values and values["title"]!=item.title:values["slug"]=blog_slug(db,values["title"],item.id)
    for key,value in values.items():setattr(item,key,value)
    if item.status=="published" and not item.published_at:item.published_at=datetime.now(UTC)
    item.updated_by_user_id=user.id;log_action(db,user,"admin.blog.updated","platform_blog_post",item.id,{"status":item.status});db.commit();db.refresh(item);return blog_out(db,item)
def public_blog_posts(db:Session)->list[dict]:
    rows=db.scalars(select(PlatformBlogPost).where(PlatformBlogPost.status=="published").order_by(PlatformBlogPost.is_featured.desc(),PlatformBlogPost.published_at.desc())).all();return [blog_out(db,item) for item in rows]
def public_blog_post(db:Session,slug:str)->dict:
    item=db.scalar(select(PlatformBlogPost).where(PlatformBlogPost.slug==slug,PlatformBlogPost.status=="published"))
    if not item:raise HTTPException(404,"Article introuvable.")
    return blog_out(db,item)

def create_event_registration(db:Session,event_id:str,payload:PublicEventRegistrationCreate)->dict:
    event=db.scalar(select(PlatformEvent).where(PlatformEvent.id==event_id).with_for_update())
    if not event or event.status!="published":raise HTTPException(404,"Événement introuvable ou non disponible.")
    if event.end_at<datetime.now(UTC):raise HTTPException(409,"Les inscriptions à cet événement sont terminées.")
    if event.registration_mode!="internal":raise HTTPException(409,"Cet événement utilise une inscription externe.")
    if event.attendance_mode in {"online","hybrid"} and not event.online_url:raise HTTPException(409,"Le lien de participation doit être configuré par l’administrateur avant l’ouverture des inscriptions.")
    requested=len(payload.participants);registered=event_registration_count(db,event.id)
    if event.capacity is not None and registered+requested>event.capacity:
        remaining=max(0,event.capacity-registered)
        raise HTTPException(409,f"Capacité insuffisante. Il reste {remaining} place(s).")
    reference=f"EVT-{datetime.now(UTC).strftime('%y%m%d')}-{str(uuid4())[:6].upper()}"
    registration=EventRegistration(event_id=event.id,reference=reference,contact_first_name=payload.contact_first_name,contact_last_name=payload.contact_last_name,contact_email=str(payload.contact_email),contact_phone=payload.contact_phone,participant_count=requested,status="confirmed",notes=payload.notes,consent_accepted=payload.consent_accepted)
    db.add(registration);db.flush()
    db.add_all([EventParticipant(registration_id=registration.id,first_name=row.first_name,last_name=row.last_name,email=str(row.email) if row.email else None,phone=row.phone) for row in payload.participants])
    db.commit()
    return {"reference":reference,"event_id":event.id,"event_title":event.title,"participant_count":requested,"status":"confirmed","attendance_mode":event.attendance_mode,"location":event.location,"map_url":event.map_url,"online_provider":event.online_provider,"online_url":event.online_url}

def list_event_registrations(db:Session,user:User,event_id:str)->list[dict]:
    require_super_admin(user);event=db.get(PlatformEvent,event_id)
    if not event:raise HTTPException(404,"Événement introuvable.")
    rows=db.scalars(select(EventRegistration).where(EventRegistration.event_id==event_id).order_by(EventRegistration.created_at.desc())).all()
    result=[]
    for row in rows:
        participants=db.scalars(select(EventParticipant).where(EventParticipant.registration_id==row.id).order_by(EventParticipant.created_at)).all()
        result.append({"id":row.id,"event_id":row.event_id,"reference":row.reference,"contact_first_name":row.contact_first_name,"contact_last_name":row.contact_last_name,"contact_email":row.contact_email,"contact_phone":row.contact_phone,"participant_count":row.participant_count,"status":row.status,"notes":row.notes,"created_at":row.created_at,"participants":[{"id":p.id,"first_name":p.first_name,"last_name":p.last_name,"email":p.email,"phone":p.phone} for p in participants]})
    return result
