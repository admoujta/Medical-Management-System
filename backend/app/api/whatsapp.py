from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.models import Appointment, CNSSCase, Fee, PatientProfile, PlatformWhatsAppConfiguration, Role, User, UserNotification, WhatsAppConfiguration, WhatsAppConversation, WhatsAppMessageLog, WhatsAppMessageTemplate, WhatsAppUnknownMessage
from app.schemas.whatsapp import CabinetWhatsAppOut, CabinetWhatsAppWrite, WhatsAppConfigurationOut, WhatsAppConfigurationWrite, WhatsAppConsentDecision, WhatsAppConsentGrant, WhatsAppConsentPreferences, WhatsAppConsentWithdraw, WhatsAppConversationSend, WhatsAppConversationUpdate, WhatsAppMessageOut, WhatsAppPatientConsentAccept, WhatsAppSendRequest, WhatsAppTemplateOut, WhatsAppTemplateWrite, WhatsAppWebhookSetupWrite
from app.schemas.crud import CollectionPageOut
from app.services import admin_service, crud_service, whatsapp_consent_service, whatsapp_service

router=APIRouter()

def require_access(db:Session,user,write:bool=False):
    roles={role.name.upper() for role in user.roles}
    if "MEDECIN_ADMIN" in roles:
        if write:crud_service.ensure_write_allowed(user)
        return
    crud_service.require_role(user,{"SECRETAIRE"});crud_service.require_module_access(db,user,"whatsapp_reminders",write=write)

def current_patient_profile(user)->PatientProfile:
    roles={role.name.upper() for role in user.roles}
    if "PATIENT" not in roles or not user.patient_profile:
        raise HTTPException(403,"Cette action est réservée au patient connecté.")
    return user.patient_profile

def get_configuration(db:Session,user)->WhatsAppConfiguration:
    item=db.scalar(select(WhatsAppConfiguration).where(WhatsAppConfiguration.tenant_id==user.tenant_id))
    if not item:raise HTTPException(404,"Aucune configuration WhatsApp pour ce cabinet.")
    return item

def get_platform_configuration(db:Session)->PlatformWhatsAppConfiguration:
    item=db.get(PlatformWhatsAppConfiguration,"global")
    if not item:raise HTTPException(404,"WhatsApp n’est pas encore configuré par le Super Admin.")
    return item

@router.get("/whatsapp/configuration",response_model=CabinetWhatsAppOut)
def configuration_get(current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"})
    item=get_configuration(db,current_user)
    if item.phone_number_id.startswith("platform-managed") or item.whatsapp_business_account_id.startswith("platform-managed"):
        item.status="non_configure";item.last_error_message="Complétez les identifiants Meta propres à ce cabinet.";db.commit();db.refresh(item)
    return whatsapp_service.configuration_out(item)

@router.post("/whatsapp/configuration",response_model=CabinetWhatsAppOut,status_code=201)
@router.patch("/whatsapp/configuration",response_model=CabinetWhatsAppOut)
@router.put("/whatsapp/configuration",response_model=CabinetWhatsAppOut)
def configuration_save(payload:CabinetWhatsAppWrite,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});crud_service.ensure_write_allowed(current_user)
    item=db.scalar(select(WhatsAppConfiguration).where(WhatsAppConfiguration.tenant_id==current_user.tenant_id))
    token_unchanged=payload.access_token=="********";verify_unchanged=payload.webhook_verify_token=="********"
    if not item and (token_unchanged or verify_unchanged):raise HTTPException(422,"Renseignez les identifiants Meta lors de la première configuration.")
    duplicate=db.scalar(select(WhatsAppConfiguration).where(WhatsAppConfiguration.phone_number_id==payload.phone_number_id,WhatsAppConfiguration.tenant_id!=current_user.tenant_id))
    if duplicate:raise HTTPException(409,"Ce Phone Number ID Meta est déjà rattaché à un autre cabinet.")
    if not item:
        item=WhatsAppConfiguration(tenant_id=current_user.tenant_id,business_account_name=payload.business_account_name,phone_number=payload.phone_number,phone_number_id=payload.phone_number_id,whatsapp_business_account_id=payload.whatsapp_business_account_id,access_token_encrypted=whatsapp_service.encrypt_secret(payload.access_token),webhook_verify_token_encrypted=whatsapp_service.encrypt_secret(payload.webhook_verify_token),webhook_url=payload.webhook_url,status="en_attente")
        db.add(item)
    else:
        item.business_account_name=payload.business_account_name;item.phone_number=payload.phone_number;item.phone_number_id=payload.phone_number_id;item.whatsapp_business_account_id=payload.whatsapp_business_account_id;item.webhook_url=payload.webhook_url;item.status="en_attente";item.last_error_message=None
        if not token_unchanged:item.access_token_encrypted=whatsapp_service.encrypt_secret(payload.access_token)
        if not verify_unchanged:item.webhook_verify_token_encrypted=whatsapp_service.encrypt_secret(payload.webhook_verify_token)
    db.flush()
    if not db.scalar(select(WhatsAppMessageTemplate.id).where(WhatsAppMessageTemplate.tenant_id==current_user.tenant_id).limit(1)):
        defaults=[
            ("Rappel rendez-vous","rappel_rdv","Bonjour {patient_name}, vous avez un rendez-vous le {date} à {heure} au cabinet {cabinet_name}. Merci de confirmer votre présence."),
            ("Confirmation rendez-vous","confirmation_rdv","Bonjour {patient_name}, votre rendez-vous du {date} à {heure} est confirmé au cabinet {cabinet_name}. Merci et à bientôt."),
            ("Relance paiement","relance_paiement","Bonjour {patient_name}, un reste à payer de {rap} DH est en attente au cabinet {cabinet_name}. Merci de régulariser votre situation."),
            ("Relance CNSS/CNOPS","cnss","Bonjour {patient_name}, une mise à jour concernant votre dossier CNSS/CNOPS est disponible auprès du cabinet {cabinet_name}. Consultez votre espace patient pour plus de détails."),
            ("Message général","general","Bonjour {patient_name}, le cabinet {cabinet_name} vous contacte au sujet de votre suivi."),
        ]
        db.add_all([WhatsAppMessageTemplate(tenant_id=current_user.tenant_id,name=name,type=kind,language="fr",content=content,status="brouillon") for name,kind,content in defaults])
    db.commit();db.refresh(item);return whatsapp_service.configuration_out(item)

@router.post("/whatsapp/test-connection")
def connection_test(current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});item=get_configuration(db,current_user)
    ok,error=whatsapp_service.test_connection(db,item)
    if not ok:raise HTTPException(502,f"Connexion Meta impossible. {error or ''}".strip())
    return {"status":"connecte","message":"Connexion Meta réussie pour ce cabinet."}

@router.post("/whatsapp/disable",response_model=CabinetWhatsAppOut)
def configuration_disable(current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});crud_service.ensure_write_allowed(current_user);item=get_configuration(db,current_user);item.status="non_configure";item.last_error_message=None;db.commit();db.refresh(item);return whatsapp_service.configuration_out(item)

@router.get("/super-admin/whatsapp/configuration",response_model=WhatsAppConfigurationOut)
def platform_configuration_get(current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);return whatsapp_service.configuration_out(get_platform_configuration(db))

@router.post("/super-admin/whatsapp/webhook-setup")
def platform_webhook_setup(payload:WhatsAppWebhookSetupWrite,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);item=db.get(PlatformWhatsAppConfiguration,"global")
    if not item:
        placeholder=whatsapp_service.encrypt_secret("configuration-en-attente")
        item=PlatformWhatsAppConfiguration(id="global",business_account_name="Configuration en cours",phone_number="À renseigner",phone_number_id="a-renseigner",whatsapp_business_account_id="a-renseigner",access_token_encrypted=placeholder,webhook_verify_token_encrypted=whatsapp_service.encrypt_secret(payload.webhook_verify_token),webhook_url=payload.webhook_url,status="non_configure");db.add(item)
    else:
        item.webhook_verify_token_encrypted=whatsapp_service.encrypt_secret(payload.webhook_verify_token);item.webhook_url=payload.webhook_url
    db.commit();return {"status":"ready","message":"Webhook prêt à être vérifié dans Meta.","webhook_url":item.webhook_url}

@router.post("/super-admin/whatsapp/configuration",response_model=WhatsAppConfigurationOut,status_code=201)
@router.patch("/super-admin/whatsapp/configuration",response_model=WhatsAppConfigurationOut)
@router.put("/super-admin/whatsapp/configuration",response_model=WhatsAppConfigurationOut)
def platform_configuration_save(payload:WhatsAppConfigurationWrite,current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);item=db.get(PlatformWhatsAppConfiguration,"global");token_unchanged=payload.access_token=="********";verify_unchanged=payload.webhook_verify_token=="********"
    if not item and (token_unchanged or verify_unchanged):raise HTTPException(422,"Renseignez les identifiants Meta lors de la première configuration.")
    if not item:
        item=PlatformWhatsAppConfiguration(id="global",business_account_name=payload.business_account_name,phone_number=payload.phone_number,phone_number_id=payload.phone_number_id,whatsapp_business_account_id=payload.whatsapp_business_account_id,access_token_encrypted=whatsapp_service.encrypt_secret(payload.access_token),webhook_verify_token_encrypted=whatsapp_service.encrypt_secret(payload.webhook_verify_token),webhook_url=payload.webhook_url,status="en_attente");db.add(item)
    else:
        item.business_account_name=payload.business_account_name;item.phone_number=payload.phone_number;item.phone_number_id=payload.phone_number_id;item.whatsapp_business_account_id=payload.whatsapp_business_account_id;item.webhook_url=payload.webhook_url;item.status="en_attente"
        if not token_unchanged:item.access_token_encrypted=whatsapp_service.encrypt_secret(payload.access_token)
        if not verify_unchanged:item.webhook_verify_token_encrypted=whatsapp_service.encrypt_secret(payload.webhook_verify_token)
    db.commit();db.refresh(item);return whatsapp_service.configuration_out(item)

@router.post("/super-admin/whatsapp/test-connection")
def platform_connection_test(current_user:CurrentUser,db:Session=Depends(get_db)):
    admin_service.require_super_admin(current_user);ok,error=whatsapp_service.test_connection(db,get_platform_configuration(db))
    if not ok:raise HTTPException(502,f"Connexion Meta impossible. {error or ''}".strip())
    return {"status":"connecte","message":"Connexion WhatsApp Cloud API réussie pour toute la plateforme."}

@router.get("/whatsapp/templates",response_model=list[WhatsAppTemplateOut]|CollectionPageOut[WhatsAppTemplateOut])
def templates_list(current_user:CurrentUser,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),sort_by:str=Query(default="updated_at"),sort_order:str=Query(default="desc",pattern="^(asc|desc)$"),db:Session=Depends(get_db)):
    require_access(db,current_user);query=select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.tenant_id==current_user.tenant_id)
    if search and search.strip():
        pattern=f"%{search.strip()}%";query=query.where(or_(WhatsAppMessageTemplate.name.ilike(pattern),WhatsAppMessageTemplate.content.ilike(pattern),WhatsAppMessageTemplate.category.ilike(pattern)))
    if page is not None:
        return crud_service.paginate_query(db,query,page=page,page_size=page_size,sort_column=WhatsAppMessageTemplate.updated_at,sort_order=sort_order,serializer=lambda items:items)
    rows=list(db.scalars(query.order_by(WhatsAppMessageTemplate.updated_at.desc())).all())
    # Pending/refused template states may change in Meta at any time. Refresh on
    # page load so the user does not have to discover and press a hidden button.
    for item in rows:
        if item.meta_template_id and item.status in {"en_attente_validation","refuse"}:
            try:whatsapp_service.sync_template(db,item)
            except HTTPException:pass
    return rows

@router.post("/whatsapp/templates",response_model=WhatsAppTemplateOut,status_code=201)
def templates_create(payload:WhatsAppTemplateWrite,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});crud_service.ensure_write_allowed(current_user);values=payload.model_dump();values["status"]="brouillon";item=WhatsAppMessageTemplate(tenant_id=current_user.tenant_id,**values);db.add(item)
    try:db.commit()
    except Exception:db.rollback();raise HTTPException(409,"Un modèle portant ce nom et cette langue existe déjà.")
    db.refresh(item);return item

@router.patch("/whatsapp/templates/{item_id}",response_model=WhatsAppTemplateOut)
def templates_update(item_id:str,payload:WhatsAppTemplateWrite,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});item=db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.id==item_id,WhatsAppMessageTemplate.tenant_id==current_user.tenant_id))
    if not item:raise HTTPException(404,"Modèle WhatsApp introuvable.")
    if item.meta_template_id:raise HTTPException(409,"Un modèle déjà soumis à Meta ne peut plus être modifié. Créez une nouvelle version.")
    for key,value in payload.model_dump(exclude={"status"}).items():setattr(item,key,value)
    db.commit();db.refresh(item);return item

@router.post("/whatsapp/templates/{item_id}/submit",response_model=WhatsAppTemplateOut)
def templates_submit(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});crud_service.ensure_write_allowed(current_user);item=db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.id==item_id,WhatsAppMessageTemplate.tenant_id==current_user.tenant_id))
    if not item:raise HTTPException(404,"Modèle WhatsApp introuvable.")
    return whatsapp_service.submit_template(db,item)

@router.post("/whatsapp/templates/{item_id}/sync",response_model=WhatsAppTemplateOut)
def templates_sync(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});item=db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.id==item_id,WhatsAppMessageTemplate.tenant_id==current_user.tenant_id))
    if not item:raise HTTPException(404,"Modèle WhatsApp introuvable.")
    return whatsapp_service.sync_template(db,item)

@router.delete("/whatsapp/templates/{item_id}",status_code=204)
def templates_delete(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    crud_service.require_role(current_user,{"MEDECIN_ADMIN"});item=db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.id==item_id,WhatsAppMessageTemplate.tenant_id==current_user.tenant_id))
    if not item:raise HTTPException(404,"Modèle WhatsApp introuvable.")
    if item.meta_template_id:raise HTTPException(409,"Ce modèle est déjà enregistré chez Meta et ne peut pas être supprimé ici. Créez une nouvelle version si nécessaire.")
    db.delete(item);db.commit();return Response(status_code=204)

@router.get("/whatsapp/messages",response_model=list[WhatsAppMessageOut]|CollectionPageOut[WhatsAppMessageOut])
def messages_list(current_user:CurrentUser,patient_id:str|None=None,message_status:str|None=None,message_type:str|None=None,page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),search:str|None=Query(default=None,max_length=120),sort_by:str=Query(default="created_at"),sort_order:str=Query(default="desc",pattern="^(asc|desc)$"),db:Session=Depends(get_db)):
    require_access(db,current_user);query=select(WhatsAppMessageLog).where(WhatsAppMessageLog.tenant_id==current_user.tenant_id)
    if patient_id:query=query.where(WhatsAppMessageLog.patient_id==patient_id)
    if message_status:query=query.where(WhatsAppMessageLog.status==message_status)
    if message_type:query=query.where(WhatsAppMessageLog.message_type==message_type)
    if search and search.strip():
        pattern=f"%{search.strip()}%";query=query.where(or_(WhatsAppMessageLog.message_content.ilike(pattern),WhatsAppMessageLog.phone_number.ilike(pattern)))
    if page is not None:
        return crud_service.paginate_query(db,query,page=page,page_size=page_size,sort_column=WhatsAppMessageLog.created_at,sort_order=sort_order,serializer=lambda items:[whatsapp_service.message_out(db,item) for item in items])
    return [whatsapp_service.message_out(db,item) for item in db.scalars(query.order_by(WhatsAppMessageLog.created_at.desc()).limit(500)).all()]

@router.get("/patients/{patient_id}/whatsapp/messages",response_model=list[WhatsAppMessageOut])
def patient_messages(patient_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user);crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient")
    rows=db.scalars(select(WhatsAppMessageLog).where(WhatsAppMessageLog.tenant_id==current_user.tenant_id,WhatsAppMessageLog.patient_id==patient_id).order_by(WhatsAppMessageLog.created_at.desc())).all()
    return [whatsapp_service.message_out(db,item) for item in rows]

@router.get("/patients/{patient_id}/whatsapp-consent")
def patient_whatsapp_consent(patient_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user);patient=crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient")
    return whatsapp_consent_service.consent_out(db,patient)

@router.post("/patients/{patient_id}/whatsapp-consent/grant")
@router.post("/patients/{patient_id}/whatsapp-consent/accept")
def patient_whatsapp_consent_grant(patient_id:str,payload:WhatsAppConsentGrant,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);patient=crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient")
    if not payload.accepted:raise HTTPException(422,"L’autorisation doit être cochée pour enregistrer un consentement accepté.")
    if not payload.decision_confirmed:raise HTTPException(422,"Confirmez que cette décision a été exprimée par le patient.")
    patient=whatsapp_consent_service.grant_consent(db,patient,payload.phone_number,payload.source,current_user.id,payload.preferred_language,payload.note)
    return whatsapp_consent_service.consent_out(db,patient)

@router.post("/patients/{patient_id}/whatsapp-consent/refuse")
def patient_whatsapp_consent_refuse(patient_id:str,payload:WhatsAppConsentDecision,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);patient=crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient")
    if not payload.decision_confirmed:raise HTTPException(422,"Confirmez que cette décision a été exprimée par le patient.")
    patient=whatsapp_consent_service.refuse_consent(db,patient,payload.source,current_user.id,payload.note)
    return whatsapp_consent_service.consent_out(db,patient)

@router.post("/patients/{patient_id}/whatsapp-consent/withdraw")
def patient_whatsapp_consent_withdraw(patient_id:str,payload:WhatsAppConsentWithdraw,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);patient=crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient")
    if not payload.decision_confirmed:raise HTTPException(422,"Confirmez que cette décision a été exprimée par le patient.")
    patient=whatsapp_consent_service.withdraw_consent(db,patient,current_user.id,payload.reason)
    return whatsapp_consent_service.consent_out(db,patient)

@router.patch("/patients/{patient_id}/whatsapp-consent/preferences")
def patient_whatsapp_consent_preferences(patient_id:str,payload:WhatsAppConsentPreferences,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);patient=crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient")
    patient=whatsapp_consent_service.update_consent_preferences(db,patient,current_user.id,payload.preferred_language,payload.phone_number,payload.note)
    return whatsapp_consent_service.consent_out(db,patient)

@router.get("/patients/{patient_id}/whatsapp-consent/history")
def patient_whatsapp_consent_history(patient_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user);crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient")
    return whatsapp_consent_service.get_consent_history(db,current_user.tenant_id,patient_id)

@router.get("/whatsapp/consents")
def whatsapp_consents(current_user:CurrentUser,status_filter:str|None=None,db:Session=Depends(get_db)):
    require_access(db,current_user);query=select(PatientProfile).where(PatientProfile.tenant_id==current_user.tenant_id)
    if status_filter:query=query.where(PatientProfile.whatsapp_consent_status==status_filter)
    return [whatsapp_consent_service.consent_out(db,row) for row in db.scalars(query.order_by(PatientProfile.created_at.desc())).all()]

@router.get("/patient/me/whatsapp-consent")
def my_whatsapp_consent(current_user:CurrentUser,db:Session=Depends(get_db)):
    return whatsapp_consent_service.consent_out(db,current_patient_profile(current_user))

@router.post("/patient/me/whatsapp-consent/accept")
def my_whatsapp_consent_accept(payload:WhatsAppPatientConsentAccept,current_user:CurrentUser,db:Session=Depends(get_db)):
    patient=current_patient_profile(current_user)
    if not payload.accepted:raise HTTPException(422,"Confirmez votre choix pour accepter les communications WhatsApp.")
    patient=whatsapp_consent_service.grant_consent(db,patient,payload.phone_number,"patient_space",current_user.id,payload.preferred_language,payload.note)
    return whatsapp_consent_service.consent_out(db,patient)

@router.post("/patient/me/whatsapp-consent/refuse")
def my_whatsapp_consent_refuse(payload:WhatsAppConsentWithdraw,current_user:CurrentUser,db:Session=Depends(get_db)):
    patient=current_patient_profile(current_user)
    patient=whatsapp_consent_service.refuse_consent(db,patient,"patient_space",current_user.id,payload.reason)
    return whatsapp_consent_service.consent_out(db,patient)

@router.post("/patient/me/whatsapp-consent/withdraw")
def my_whatsapp_consent_withdraw(payload:WhatsAppConsentWithdraw,current_user:CurrentUser,db:Session=Depends(get_db)):
    patient=current_patient_profile(current_user)
    patient=whatsapp_consent_service.withdraw_consent(db,patient,current_user.id,payload.reason,"patient_space")
    return whatsapp_consent_service.consent_out(db,patient)

@router.patch("/patient/me/whatsapp-consent/preferences")
def my_whatsapp_consent_preferences(payload:WhatsAppConsentPreferences,current_user:CurrentUser,db:Session=Depends(get_db)):
    patient=current_patient_profile(current_user)
    patient=whatsapp_consent_service.update_consent_preferences(db,patient,current_user.id,payload.preferred_language,payload.phone_number,payload.note)
    return whatsapp_consent_service.consent_out(db,patient)

@router.get("/patient/me/whatsapp-consent/history")
def my_whatsapp_consent_history(current_user:CurrentUser,db:Session=Depends(get_db)):
    patient=current_patient_profile(current_user)
    return whatsapp_consent_service.get_consent_history(db,patient.tenant_id,patient.id)

def selected_template(db:Session,user,template_id:str|None,message_type:str,language:str="fr")->WhatsAppMessageTemplate|None:
    if not template_id:
        item=db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.tenant_id==user.tenant_id,WhatsAppMessageTemplate.type==message_type,WhatsAppMessageTemplate.language==language,WhatsAppMessageTemplate.status=="valide").order_by(WhatsAppMessageTemplate.updated_at.desc()).limit(1))
        if item:return item
        pending=db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.tenant_id==user.tenant_id,WhatsAppMessageTemplate.type==message_type,WhatsAppMessageTemplate.language==language,WhatsAppMessageTemplate.meta_template_id.is_not(None)).order_by(WhatsAppMessageTemplate.updated_at.desc()).limit(1))
        if pending:
            try:
                pending=whatsapp_service.sync_template(db,pending)
                if pending.status=="valide":return pending
            except HTTPException:
                pass
        return whatsapp_service.recover_approved_template(db,user.tenant_id,message_type,language)
    item=db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.id==template_id,WhatsAppMessageTemplate.tenant_id==user.tenant_id))
    if not item:raise HTTPException(404,"Modèle WhatsApp introuvable.")
    if item.language!=language:raise HTTPException(409,"Ce modèle ne correspond pas à la langue WhatsApp préférée du patient.")
    return item

@router.post("/rendez-vous/{item_id}/send-whatsapp-reminder",response_model=WhatsAppMessageOut,status_code=201)
def appointment_reminder(item_id:str,payload:WhatsAppSendRequest,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);appointment=crud_service.get_scoped(db,current_user,Appointment,item_id,"Rendez-vous");patient=crud_service.get_scoped(db,current_user,PatientProfile,appointment.patient_id,"Patient");template=selected_template(db,current_user,payload.template_id,"rappel_rdv",patient.preferred_whatsapp_language);tenant=current_user.tenant
    fallback="Bonjour {patient_name}, vous avez un rendez-vous le {date} à {heure} au cabinet {cabinet_name}. Merci de confirmer votre présence."
    values={"patient_name":f"{patient.user.first_name} {patient.user.last_name}","date":appointment.date.strftime("%d/%m/%Y"),"heure":appointment.start_time.strftime("%H:%M"),"cabinet_name":tenant.name};content=payload.message or whatsapp_service.render_template(template,fallback,values)
    item=whatsapp_service.send_message(db,tenant_id=current_user.tenant_id,patient=patient,content=content,message_type="rappel_rdv",actor_id=current_user.id,appointment_id=appointment.id,template_id=template.id if template else None,template_values=values if not payload.message else None);return whatsapp_service.message_out(db,item)

@router.post("/honoraires/{item_id}/send-payment-reminder",response_model=WhatsAppMessageOut,status_code=201)
def fee_reminder(item_id:str,payload:WhatsAppSendRequest,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);fee=crud_service.get_scoped(db,current_user,Fee,item_id,"Honoraire");patient=crud_service.get_scoped(db,current_user,PatientProfile,fee.patient_id,"Patient")
    fee_remaining=max(Decimal("0.00"),Decimal(str(fee.amount or 0))-Decimal(str(fee.paid_amount or 0)))
    if fee_remaining<=0:raise HTTPException(409,"Cet honoraire est entièrement réglé.")
    template=selected_template(db,current_user,payload.template_id,"relance_paiement",patient.preferred_whatsapp_language);fallback="Bonjour {patient_name}, nous vous rappelons qu’un reste à payer de {rap} DH est encore en attente au cabinet {cabinet_name}. Merci de régulariser votre situation."
    values={"patient_name":f"{patient.user.first_name} {patient.user.last_name}","rap":f"{fee_remaining:.2f}","cabinet_name":current_user.tenant.name};content=payload.message or whatsapp_service.render_template(template,fallback,values)
    item=whatsapp_service.send_message(db,tenant_id=current_user.tenant_id,patient=patient,content=content,message_type="relance_paiement",actor_id=current_user.id,fee_id=fee.id,template_id=template.id if template else None,template_values=values if not payload.message else None);return whatsapp_service.message_out(db,item)

@router.post("/patients/{patient_id}/send-whatsapp-payment-reminder",response_model=WhatsAppMessageOut,status_code=201)
def patient_payment_reminder(patient_id:str,payload:WhatsAppSendRequest,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);patient=crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient")
    fees=db.scalars(select(Fee).where(Fee.tenant_id==current_user.tenant_id,Fee.patient_id==patient_id,Fee.status!="cancelled")).all()
    remaining=sum((max(Decimal("0.00"),Decimal(str(fee.amount or 0))-Decimal(str(fee.paid_amount or 0))) for fee in fees),Decimal("0.00"))
    if remaining<=0:raise HTTPException(409,"Ce patient n’a aucun reste à payer.")
    template=selected_template(db,current_user,payload.template_id,"relance_paiement",patient.preferred_whatsapp_language);fallback="Bonjour {patient_name}, nous vous rappelons qu’un reste à payer de {rap} DH est encore en attente au cabinet {cabinet_name}. Merci de régulariser votre situation."
    values={"patient_name":f"{patient.user.first_name} {patient.user.last_name}","rap":f"{remaining:.2f}","cabinet_name":current_user.tenant.name};content=payload.message or whatsapp_service.render_template(template,fallback,values)
    item=whatsapp_service.send_message(db,tenant_id=current_user.tenant_id,patient=patient,content=content,message_type="relance_paiement",actor_id=current_user.id,template_id=template.id if template else None,template_values=values if not payload.message else None);return whatsapp_service.message_out(db,item)

@router.post("/whatsapp/messages/{item_id}/retry",response_model=WhatsAppMessageOut)
def retry_message(item_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);old=db.scalar(select(WhatsAppMessageLog).where(WhatsAppMessageLog.id==item_id,WhatsAppMessageLog.tenant_id==current_user.tenant_id))
    if not old:raise HTTPException(404,"Message WhatsApp introuvable.")
    if old.status!="echec":raise HTTPException(409,"Seul un message en échec peut être réessayé.")
    patient=crud_service.get_scoped(db,current_user,PatientProfile,old.patient_id,"Patient");item=whatsapp_service.send_message(db,tenant_id=current_user.tenant_id,patient=patient,content=old.message_content,message_type=old.message_type,actor_id=current_user.id,appointment_id=old.appointment_id,fee_id=old.fee_id,payment_id=old.payment_id,template_id=old.template_id);return whatsapp_service.message_out(db,item)

def conversation_out(db:Session,item:WhatsAppConversation)->dict:
    patient=db.get(PatientProfile,item.patient_id);user=patient.user
    fees=db.scalars(select(Fee).where(Fee.tenant_id==item.tenant_id,Fee.patient_id==item.patient_id,Fee.status!="cancelled")).all()
    remaining=sum((max(Decimal("0.00"),Decimal(str(fee.amount or 0))-Decimal(str(fee.paid_amount or 0))) for fee in fees),Decimal("0.00"))
    latest_inbound=db.scalar(select(WhatsAppMessageLog.received_at).where(
        WhatsAppMessageLog.conversation_id==item.id,
        WhatsAppMessageLog.direction=="entrant",
        WhatsAppMessageLog.received_at.is_not(None),
    ).order_by(WhatsAppMessageLog.received_at.desc()).limit(1))
    free_text_allowed=bool(latest_inbound and datetime.now(UTC)-latest_inbound<=timedelta(hours=24))
    appointments=db.scalars(select(Appointment).where(Appointment.tenant_id==item.tenant_id,Appointment.patient_id==item.patient_id).order_by(Appointment.date.desc(),Appointment.start_time.desc()).limit(2)).all()
    cnss=db.scalar(select(CNSSCase).where(CNSSCase.tenant_id==item.tenant_id,CNSSCase.patient_id==item.patient_id).order_by(CNSSCase.updated_at.desc()).limit(1))
    return {"id":item.id,"patient_id":item.patient_id,"patient_name":f"{user.first_name} {user.last_name}","phone_number":item.patient_phone_number,"status":item.status,"assigned_user_id":item.assigned_user_id,"last_message_at":item.last_message_at,"last_message_preview":item.last_message_preview,"unread_count":item.unread_count,"whatsapp_opt_in":patient.whatsapp_opt_in,"preferred_language":patient.preferred_whatsapp_language,"remaining_amount":remaining,"free_text_allowed":free_text_allowed,"next_appointment":next(({"date":str(row.date),"time":str(row.start_time)[:5]} for row in reversed(appointments) if row.status not in {"completed","cancelled","absent"}),None),"last_appointment":{"date":str(appointments[0].date),"status":appointments[0].status} if appointments else None,"cnss_status":cnss.status if cnss else None}

@router.get("/whatsapp/conversations")
def conversations_list(current_user:CurrentUser,filter:str="all",search:str="",page:int|None=Query(default=None,ge=1),page_size:int=Query(default=20,ge=1,le=100),sort_order:str=Query(default="desc",pattern="^(asc|desc)$"),db:Session=Depends(get_db)):
    require_access(db,current_user)
    # Make every active patient with a valid phone selectable before the first
    # exchange. The unique tenant/patient constraint prevents duplicates.
    patients=db.scalars(select(PatientProfile).where(
        PatientProfile.tenant_id==current_user.tenant_id,
        PatientProfile.status!="disabled",
    )).all()
    for patient in patients:
        if not (patient.whatsapp_phone_number or patient.user.phone):continue
        try:whatsapp_service.get_or_create_conversation(db,current_user.tenant_id,patient)
        except ValueError:continue
    # Attach historical logs once, without duplicating conversations.
    patient_ids=db.scalars(select(WhatsAppMessageLog.patient_id).where(WhatsAppMessageLog.tenant_id==current_user.tenant_id,WhatsAppMessageLog.patient_id.is_not(None)).distinct()).all()
    for patient_id in patient_ids:
        patient=db.get(PatientProfile,patient_id)
        if patient:
            conversation=whatsapp_service.get_or_create_conversation(db,current_user.tenant_id,patient)
            logs=db.scalars(select(WhatsAppMessageLog).where(WhatsAppMessageLog.tenant_id==current_user.tenant_id,WhatsAppMessageLog.patient_id==patient_id,WhatsAppMessageLog.conversation_id.is_(None))).all()
            for log in logs:log.conversation_id=conversation.id;whatsapp_service.update_conversation_from_message(conversation,log,log.direction=="entrant" and log.internal_read_at is None)
    db.commit()
    query=select(WhatsAppConversation).join(PatientProfile,PatientProfile.id==WhatsAppConversation.patient_id).join(User,User.id==PatientProfile.user_id).where(WhatsAppConversation.tenant_id==current_user.tenant_id)
    if filter=="unread":query=query.where(WhatsAppConversation.unread_count>0)
    elif filter in {"ouverte","archivee","fermee"}:query=query.where(WhatsAppConversation.status==filter)
    terms=search.strip().lower().split()
    for term in terms:
        pattern=f"%{term}%"
        query=query.where(or_(User.first_name.ilike(pattern),User.last_name.ilike(pattern),WhatsAppConversation.patient_phone_number.ilike(pattern),WhatsAppConversation.last_message_preview.ilike(pattern)))
    if page is not None:
        return crud_service.paginate_query(db,query,page=page,page_size=page_size,sort_column=WhatsAppConversation.last_message_at,sort_order=sort_order,serializer=lambda items:[conversation_out(db,row) for row in items])
    rows=db.scalars(query.order_by(WhatsAppConversation.last_message_at.desc().nullslast())).all()
    return [conversation_out(db,row) for row in rows]

@router.post("/whatsapp/conversations/patient/{patient_id}",status_code=201)
def conversation_create(patient_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);patient=crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient")
    item=whatsapp_service.get_or_create_conversation(db,current_user.tenant_id,patient);db.commit();return conversation_out(db,item)

@router.get("/whatsapp/conversations/{conversation_id}/messages")
def conversation_messages(conversation_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user);conversation=db.scalar(select(WhatsAppConversation).where(WhatsAppConversation.id==conversation_id,WhatsAppConversation.tenant_id==current_user.tenant_id))
    if not conversation:raise HTTPException(404,"Conversation WhatsApp introuvable.")
    rows=db.scalars(select(WhatsAppMessageLog).where(WhatsAppMessageLog.conversation_id==conversation.id,WhatsAppMessageLog.tenant_id==current_user.tenant_id).order_by(WhatsAppMessageLog.created_at)).all()
    now=datetime.now(UTC)
    for row in rows:
        if row.direction=="entrant" and row.internal_read_at is None:row.internal_read_at=now
    conversation.unread_count=0;db.commit()
    return [whatsapp_service.message_out(db,row) for row in rows]

@router.post("/whatsapp/conversations/{conversation_id}/messages",status_code=201)
def conversation_send(conversation_id:str,payload:WhatsAppConversationSend,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);conversation=db.scalar(select(WhatsAppConversation).where(WhatsAppConversation.id==conversation_id,WhatsAppConversation.tenant_id==current_user.tenant_id))
    if not conversation:raise HTTPException(404,"Conversation WhatsApp introuvable.")
    patient=crud_service.get_scoped(db,current_user,PatientProfile,conversation.patient_id,"Patient")
    if payload.message_type=="texte":
        if not payload.content:raise HTTPException(422,"Saisissez un message.")
        item=whatsapp_service.send_text_message(db,tenant_id=current_user.tenant_id,patient=patient,content=payload.content,actor_id=current_user.id,reply_to_message_id=payload.reply_to_message_id)
    else:
        template=selected_template(db,current_user,payload.template_id,"general",patient.preferred_whatsapp_language)
        if not template:raise HTTPException(409,"Sélectionnez un modèle approuvé par Meta.")
        appointment=db.scalar(select(Appointment).where(Appointment.tenant_id==current_user.tenant_id,Appointment.patient_id==patient.id,Appointment.status.in_({"planned","confirmed","waiting"})).order_by(Appointment.date,Appointment.start_time).limit(1))
        fees=db.scalars(select(Fee).where(Fee.tenant_id==current_user.tenant_id,Fee.patient_id==patient.id,Fee.status!="cancelled")).all()
        remaining=sum((max(Decimal("0.00"),Decimal(str(fee.amount or 0))-Decimal(str(fee.paid_amount or 0))) for fee in fees),Decimal("0.00"))
        values={"patient_name":f"{patient.user.first_name} {patient.user.last_name}","cabinet_name":current_user.tenant.name,"date":appointment.date.strftime("%d/%m/%Y") if appointment else "à confirmer","heure":appointment.start_time.strftime("%H:%M") if appointment else "à confirmer","rap":f"{remaining:.2f}"}
        content=whatsapp_service.render_template(template,template.content,values)
        item=whatsapp_service.send_message(db,tenant_id=current_user.tenant_id,patient=patient,content=content,message_type=template.type,actor_id=current_user.id,template_id=template.id,template_values=values)
    return whatsapp_service.message_out(db,item)

@router.patch("/whatsapp/conversations/{conversation_id}")
@router.put("/whatsapp/conversations/{conversation_id}")
def conversation_update(conversation_id:str,payload:WhatsAppConversationUpdate,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);item=db.scalar(select(WhatsAppConversation).where(WhatsAppConversation.id==conversation_id,WhatsAppConversation.tenant_id==current_user.tenant_id))
    if not item:raise HTTPException(404,"Conversation WhatsApp introuvable.")
    for key,value in payload.model_dump(exclude_unset=True).items():setattr(item,key,value)
    db.commit();return conversation_out(db,item)

@router.get("/whatsapp/unknown-numbers")
def unknown_numbers(current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user);rows=db.scalars(select(WhatsAppUnknownMessage).where(WhatsAppUnknownMessage.tenant_id==current_user.tenant_id,WhatsAppUnknownMessage.linked_patient_id.is_(None)).order_by(WhatsAppUnknownMessage.received_at.desc())).all()
    return [{"id":row.id,"phone_number":row.phone_number,"content":row.content,"message_type":row.message_type,"received_at":row.received_at} for row in rows]

@router.post("/whatsapp/unknown-numbers/{item_id}/link/{patient_id}")
def unknown_link(item_id:str,patient_id:str,current_user:CurrentUser,db:Session=Depends(get_db)):
    require_access(db,current_user,True);row=db.scalar(select(WhatsAppUnknownMessage).where(WhatsAppUnknownMessage.id==item_id,WhatsAppUnknownMessage.tenant_id==current_user.tenant_id))
    if not row:raise HTTPException(404,"Message inconnu introuvable.")
    patient=crud_service.get_scoped(db,current_user,PatientProfile,patient_id,"Patient");conversation=whatsapp_service.get_or_create_conversation(db,current_user.tenant_id,patient,row.phone_number)
    message=WhatsAppMessageLog(conversation_id=conversation.id,tenant_id=current_user.tenant_id,patient_id=patient.id,phone_number=row.phone_number,message_content=row.content or f"[{row.message_type}]",message_type=row.message_type,sender_type="patient",direction="entrant",status="recu",meta_message_id=row.meta_message_id,received_at=row.received_at)
    db.add(message);row.linked_patient_id=patient.id;row.linked_by_user_id=current_user.id;row.linked_at=datetime.now(UTC);whatsapp_service.update_conversation_from_message(conversation,message,True);db.commit();return {"status":"linked","conversation_id":conversation.id}

@router.get("/webhooks/whatsapp")
def webhook_verify(mode:str|None=Query(None,alias="hub.mode"),verify_token:str|None=Query(None,alias="hub.verify_token"),challenge:str|None=Query(None,alias="hub.challenge"),db:Session=Depends(get_db)):
    if mode!="subscribe" or not verify_token:raise HTTPException(403,"Vérification WhatsApp refusée.")
    configurations=list(db.scalars(select(WhatsAppConfiguration)).all())
    platform=db.get(PlatformWhatsAppConfiguration,"global")
    if platform:configurations.append(platform)
    for item in configurations:
        if whatsapp_service.decrypt_secret(item.webhook_verify_token_encrypted)==verify_token:return Response(content=challenge or "",media_type="text/plain")
    raise HTTPException(403,"Jeton de vérification WhatsApp invalide.")

@router.post("/webhooks/whatsapp")
async def webhook_receive(request:Request,db:Session=Depends(get_db)):
    payload=await request.json()
    for entry in payload.get("entry",[]):
        for change in entry.get("changes",[]):
            value=change.get("value",{});phone_number_id=value.get("metadata",{}).get("phone_number_id")
            if change.get("field")=="message_template_status_update":
                update=value;template=db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.meta_template_id==str(update.get("message_template_id"))))
                if template:template.status=whatsapp_service._meta_status(update.get("event"));template.rejection_reason=whatsapp_service.rejection_reason(update.get("reason"));template.synced_at=datetime.now(UTC)
                continue
            cabinet=db.scalar(select(WhatsAppConfiguration).where(WhatsAppConfiguration.phone_number_id==phone_number_id))
            if not cabinet:continue
            tenant_id=cabinet.tenant_id
            for event in value.get("statuses",[]):
                item=db.scalar(select(WhatsAppMessageLog).where(WhatsAppMessageLog.meta_message_id==event.get("id"),WhatsAppMessageLog.tenant_id==tenant_id))
                if not item:continue
                mapped={"sent":"envoye","delivered":"livre","read":"lu","failed":"echec"}.get(event.get("status"),event.get("status"));item.status=mapped
                moment=datetime.fromtimestamp(int(event.get("timestamp",datetime.now(UTC).timestamp())),UTC)
                if mapped=="envoye":item.sent_at=moment
                elif mapped=="livre":item.delivered_at=moment
                elif mapped=="lu":item.read_at=moment
                elif mapped=="echec":item.error_message=str(event.get("errors") or "Échec signalé par Meta.")
            for message in value.get("messages",[]):
                meta_id=str(message.get("id") or "")
                if not meta_id or db.scalar(select(WhatsAppMessageLog.id).where(WhatsAppMessageLog.meta_message_id==meta_id)) or db.scalar(select(WhatsAppUnknownMessage.id).where(WhatsAppUnknownMessage.meta_message_id==meta_id)):continue
                raw_phone=message.get("from","")
                try:phone=whatsapp_service.normalize_phone(raw_phone) or raw_phone
                except ValueError:phone=raw_phone
                patient=whatsapp_service.patient_for_phone(db,tenant_id,phone)
                kind=message.get("type","texte");content=(message.get("text") or {}).get("body")
                media=message.get(kind) or {};moment=datetime.fromtimestamp(int(message.get("timestamp",datetime.now(UTC).timestamp())),UTC)
                if not tenant_id or not patient:
                    db.add(WhatsAppUnknownMessage(tenant_id=tenant_id,phone_number=phone,meta_message_id=meta_id,message_type=kind,content=content,media_id=media.get("id"),received_at=moment))
                    continue
                conversation=whatsapp_service.get_or_create_conversation(db,tenant_id,patient,phone)
                item=WhatsAppMessageLog(conversation_id=conversation.id,tenant_id=tenant_id,patient_id=patient.id,phone_number=phone,message_content=content or f"[{kind}]",message_type=kind,sender_type="patient",direction="entrant",status="recu",meta_message_id=meta_id,media_url=media.get("id"),media_mime_type=media.get("mime_type"),received_at=moment)
                normalized_content=" ".join((content or "").strip().lower().split())
                withdrawal_phrases={"stop","arrêtez","arretez","ne me contactez plus","je ne veux plus recevoir de messages"}
                item.consent_withdrawal_requested=normalized_content in withdrawal_phrases
                db.add(item);whatsapp_service.update_conversation_from_message(conversation,item,True)
                recipients=db.scalars(select(User).where(User.tenant_id==tenant_id,User.is_active.is_(True),User.roles.any(Role.code.in_({"doctor_admin","secretary"})))).all()
                for recipient in recipients:
                    db.add(UserNotification(
                        tenant_id=tenant_id,user_id=recipient.id,
                        notification_type="WHATSAPP_CONSENT_WITHDRAWAL" if item.consent_withdrawal_requested else "WHATSAPP_MESSAGE",
                        title="Demande possible de retrait WhatsApp" if item.consent_withdrawal_requested else "Nouveau message WhatsApp",
                        message=(f"{patient.user.first_name} {patient.user.last_name} demande possiblement à ne plus être contacté. Confirmez le retrait depuis sa fiche patient." if item.consent_withdrawal_requested else f"Nouveau message de {patient.user.first_name} {patient.user.last_name}."),
                        resource_id=conversation.id,
                    ))
    db.commit();return {"status":"received"}
