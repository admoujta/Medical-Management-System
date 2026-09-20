from __future__ import annotations

import base64
import hashlib
import json
import re
import unicodedata
from datetime import UTC, datetime, timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.phone import normalize_phone
from app.models import PatientProfile, PlatformWhatsAppConfiguration, User, WhatsAppConfiguration, WhatsAppConversation, WhatsAppMessageLog, WhatsAppMessageTemplate
from app.services import whatsapp_consent_service

GRAPH_VERSION="v23.0"
DEFAULT_TEMPLATES={
    "rappel_rdv":("Rappel rendez-vous","Bonjour {patient_name}, vous avez un rendez-vous le {date} à {heure} au cabinet {cabinet_name}. Merci de confirmer votre présence."),
    "confirmation_rdv":("Confirmation rendez-vous","Bonjour {patient_name}, votre rendez-vous du {date} à {heure} est confirmé au cabinet {cabinet_name}. Merci et à bientôt."),
    "relance_paiement":("Relance paiement","Bonjour {patient_name}, un reste à payer de {rap} DH est en attente au cabinet {cabinet_name}. Merci de régulariser votre situation."),
    "cnss":("Relance CNSS/CNOPS","Bonjour {patient_name}, une mise à jour concernant votre dossier CNSS/CNOPS est disponible auprès du cabinet {cabinet_name}. Consultez votre espace patient pour plus de détails."),
    "general":("Message général","Bonjour {patient_name}, le cabinet {cabinet_name} vous contacte au sujet de votre suivi."),
}

def _fernet()->Fernet:
    key=base64.urlsafe_b64encode(hashlib.sha256(settings.secret_key.encode()).digest())
    return Fernet(key)

def encrypt_secret(value:str)->str:return _fernet().encrypt(value.encode()).decode()
def decrypt_secret(value:str)->str:
    try:return _fernet().decrypt(value.encode()).decode()
    except InvalidToken:raise HTTPException(500,"Impossible de déchiffrer les identifiants WhatsApp.")

def configuration_out(item:WhatsAppConfiguration|PlatformWhatsAppConfiguration)->dict:
    return {"id":item.id,"business_account_name":item.business_account_name,"phone_number":item.phone_number,"phone_number_id":item.phone_number_id,"whatsapp_business_account_id":item.whatsapp_business_account_id,"access_token":"********","webhook_verify_token":"********","webhook_url":item.webhook_url,"status":item.status,"last_test_at":item.last_test_at,"last_error_message":item.last_error_message,"created_at":item.created_at,"updated_at":item.updated_at}

def cabinet_meta_ready(item:WhatsAppConfiguration|None)->bool:
    return bool(
        item
        and item.status=="connecte"
        and item.phone_number_id
        and item.whatsapp_business_account_id
        and not item.phone_number_id.startswith("platform-managed")
        and not item.whatsapp_business_account_id.startswith("platform-managed")
    )

def _request(url:str,token:str,method:str="GET",payload:dict|None=None)->dict:
    body=json.dumps(payload).encode() if payload is not None else None
    request=Request(url,data=body,method=method,headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"})
    try:
        with urlopen(request,timeout=12) as response:return json.loads(response.read().decode() or "{}")
    except HTTPError as exc:
        try:
            error=json.loads(exc.read().decode()).get("error",{})
            parts=[error.get("message"),error.get("error_user_title"),error.get("error_user_msg"),(error.get("error_data") or {}).get("details")]
            detail=" — ".join(dict.fromkeys(str(part) for part in parts if part)) or None
        except Exception:detail=None
        raise RuntimeError(detail or f"Meta a retourné HTTP {exc.code}.") from exc
    except (URLError,TimeoutError) as exc:raise RuntimeError("Le service Meta WhatsApp est inaccessible.") from exc

def test_connection(db:Session,item:WhatsAppConfiguration|PlatformWhatsAppConfiguration)->tuple[bool,str|None]:
    item.last_test_at=datetime.now(UTC)
    try:
        result=_request(f"https://graph.facebook.com/{GRAPH_VERSION}/{item.phone_number_id}?fields=display_phone_number,verified_name",decrypt_secret(item.access_token_encrypted))
        # Meta reste la source de vérité pour chaque numéro d'envoi.
        display_phone_number=(result.get("display_phone_number") or "").strip()
        verified_name=(result.get("verified_name") or "").strip()
        if display_phone_number:item.phone_number=normalize_phone(display_phone_number)
        if verified_name:item.business_account_name=verified_name
        item.status="connecte";item.last_error_message=None;db.commit();return True,None
    except RuntimeError as exc:
        item.status="erreur";item.last_error_message=str(exc);db.commit();return False,str(exc)

def _meta_status(value:str|None)->str:
    return {"APPROVED":"valide","PENDING":"en_attente_validation","REJECTED":"refuse","PAUSED":"refuse","DISABLED":"refuse"}.get((value or "").upper(),"en_attente_validation")

def rejection_reason(value:object)->str|None:
    reason=str(value or "").strip()
    return None if reason.upper() in {"","NONE","NULL","N/A"} else reason

def _template_name(tenant_id:str,name:str)->str:
    raw=unicodedata.normalize("NFKD",f"fadaa_{tenant_id[:8]}_{name}").encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9_]+","_",raw).strip("_")[:180]

def _meta_body(content:str)->tuple[str,list[str]]:
    variables:list[str]=[]
    def replace(match):
        key=match.group(1)
        if key not in variables:variables.append(key)
        return "{{"+str(variables.index(key)+1)+"}}"
    return re.sub(r"(?<!\{)\{([a-zA-Z0-9_]+)\}(?!\})",replace,content),variables

def submit_template(db:Session,item:WhatsAppMessageTemplate)->WhatsAppMessageTemplate:
    config=db.scalar(select(WhatsAppConfiguration).where(WhatsAppConfiguration.tenant_id==item.tenant_id))
    if not cabinet_meta_ready(config):raise HTTPException(409,"Connectez d’abord le compte Meta de ce cabinet.")
    if item.meta_template_id:raise HTTPException(409,"Ce modèle a déjà été soumis à Meta. Synchronisez son statut.")
    meta_name=item.meta_template_name or _template_name(item.tenant_id,item.name);body,variables=_meta_body(item.content)
    # A local row may have been deleted while its Meta template still exists.
    # Reattach it instead of trying to create a duplicate name at Meta.
    try:
        existing=_request(f"https://graph.facebook.com/{GRAPH_VERSION}/{config.whatsapp_business_account_id}/message_templates?name={quote(meta_name)}&fields=id,name,status,category,rejected_reason",decrypt_secret(config.access_token_encrypted))
    except RuntimeError as exc:raise HTTPException(502,f"Recherche du modèle Meta impossible : {exc}") from exc
    matches=existing.get("data") or []
    if matches:
        result=matches[0];item.meta_template_name=meta_name;item.meta_template_id=str(result.get("id"));item.status=_meta_status(result.get("status"));item.category=result.get("category") or item.category;item.rejection_reason=rejection_reason(result.get("rejected_reason"));item.submitted_at=item.submitted_at or datetime.now(UTC);item.synced_at=datetime.now(UTC);db.commit();db.refresh(item);return item
    component={"type":"BODY","text":body}
    if variables:component["example"]={"body_text":[[f"Exemple {key.replace('_',' ')}" for key in variables]]}
    try:result=_request(f"https://graph.facebook.com/{GRAPH_VERSION}/{config.whatsapp_business_account_id}/message_templates",decrypt_secret(config.access_token_encrypted),"POST",{"name":meta_name,"language":item.language,"category":item.category,"components":[component]})
    except RuntimeError as exc:raise HTTPException(502,f"Soumission Meta impossible : {exc}") from exc
    item.meta_template_name=meta_name;item.meta_template_id=str(result.get("id") or "") or None;item.status=_meta_status(result.get("status"));item.rejection_reason=None;item.submitted_at=datetime.now(UTC);item.synced_at=datetime.now(UTC);db.commit();db.refresh(item);return item

def sync_template(db:Session,item:WhatsAppMessageTemplate)->WhatsAppMessageTemplate:
    config=db.scalar(select(WhatsAppConfiguration).where(WhatsAppConfiguration.tenant_id==item.tenant_id))
    if not cabinet_meta_ready(config):raise HTTPException(409,"Connectez d’abord le compte Meta de ce cabinet.")
    if not item.meta_template_id:raise HTTPException(409,"Soumettez d’abord ce modèle à Meta.")
    # Meta's template-id endpoint may return an error even though the template
    # is visible and approved in the WABA. The WABA/name lookup is the stable
    # source used by WhatsApp Manager and also survives local reattachments.
    try:
        response=_request(
            f"https://graph.facebook.com/{GRAPH_VERSION}/{config.whatsapp_business_account_id}/message_templates"
            f"?name={quote(item.meta_template_name or '')}&fields=id,name,status,category,rejected_reason",
            decrypt_secret(config.access_token_encrypted),
        )
    except RuntimeError as exc:raise HTTPException(502,f"Synchronisation Meta impossible : {exc}") from exc
    matches=response.get("data") or []
    if not matches:raise HTTPException(404,"Le modèle n’existe plus dans le compte WhatsApp Meta.")
    result=next((row for row in matches if str(row.get("id"))==str(item.meta_template_id)),matches[0])
    item.meta_template_id=str(result.get("id") or item.meta_template_id)
    item.meta_template_name=result.get("name") or item.meta_template_name
    item.status=_meta_status(result.get("status"));item.category=result.get("category") or item.category;item.rejection_reason=rejection_reason(result.get("rejected_reason"));item.synced_at=datetime.now(UTC);db.commit();db.refresh(item);return item

def recover_approved_template(db:Session,tenant_id:str,message_type:str,language:str="fr")->WhatsAppMessageTemplate|None:
    """Reattach an approved Meta template whose local row was lost."""
    # Les modèles historiques générés automatiquement existent uniquement en
    # français. Ne jamais les utiliser silencieusement pour un patient arabophone.
    if language != "fr":
        return None
    default=DEFAULT_TEMPLATES.get(message_type)
    config=db.scalar(select(WhatsAppConfiguration).where(WhatsAppConfiguration.tenant_id==tenant_id))
    if not default or not cabinet_meta_ready(config):return None
    name,content=default
    meta_name=_template_name(tenant_id,name)
    try:
        response=_request(
            f"https://graph.facebook.com/{GRAPH_VERSION}/{config.whatsapp_business_account_id}/message_templates"
            f"?name={quote(meta_name)}&fields=id,name,status,category,rejected_reason",
            decrypt_secret(config.access_token_encrypted),
        )
    except RuntimeError:
        return None
    result=next((row for row in response.get("data",[]) if row.get("name")==meta_name and _meta_status(row.get("status"))=="valide"),None)
    if not result:return None
    item=db.scalar(select(WhatsAppMessageTemplate).where(
        WhatsAppMessageTemplate.tenant_id==tenant_id,
        WhatsAppMessageTemplate.type==message_type,
        WhatsAppMessageTemplate.language=="fr",
    ).order_by(WhatsAppMessageTemplate.updated_at.desc()).limit(1))
    if not item:
        item=WhatsAppMessageTemplate(tenant_id=tenant_id,name=name,type=message_type,language="fr",content=content,status="valide")
        db.add(item)
    item.meta_template_name=meta_name
    item.meta_template_id=str(result.get("id"))
    item.status="valide"
    item.category=result.get("category") or "UTILITY"
    item.rejection_reason=None
    item.submitted_at=item.submitted_at or datetime.now(UTC)
    item.synced_at=datetime.now(UTC)
    db.commit();db.refresh(item);return item

def patient_for_phone(db:Session,tenant_id:str,phone:str)->PatientProfile|None:
    try:target=normalize_phone(phone)
    except ValueError:return None
    rows=db.scalars(select(PatientProfile).where(PatientProfile.tenant_id==tenant_id)).all()
    for row in rows:
        try:
            if normalize_phone(row.user.phone or "")==target:return row
        except ValueError:continue
    return None

def message_out(db:Session,item:WhatsAppMessageLog)->dict:
    patient=db.get(PatientProfile,item.patient_id) if item.patient_id else None;patient_user=db.get(User,patient.user_id) if patient else None;creator=db.get(User,item.created_by_user_id) if item.created_by_user_id else None
    return {"id":item.id,"patient_id":item.patient_id,"patient_name":f"{patient_user.first_name} {patient_user.last_name}" if patient_user else None,"appointment_id":item.appointment_id,"fee_id":item.fee_id,"payment_id":item.payment_id,"template_id":item.template_id,"phone_number":item.phone_number,"message_content":item.message_content,"message_type":item.message_type,"direction":item.direction,"status":item.status,"meta_message_id":item.meta_message_id,"error_message":item.error_message,"sent_at":item.sent_at,"delivered_at":item.delivered_at,"read_at":item.read_at,"created_by_user_id":item.created_by_user_id,"created_by_name":f"{creator.first_name} {creator.last_name}" if creator else None,"created_at":item.created_at,"updated_at":item.updated_at}

def get_or_create_conversation(db:Session,tenant_id:str,patient:PatientProfile,phone:str|None=None)->WhatsAppConversation:
    item=db.scalar(select(WhatsAppConversation).where(WhatsAppConversation.tenant_id==tenant_id,WhatsAppConversation.patient_id==patient.id))
    normalized=phone or normalize_phone(patient.whatsapp_phone_number or patient.user.phone or "")
    if item:
        item.patient_phone_number=normalized
        return item
    item=WhatsAppConversation(tenant_id=tenant_id,patient_id=patient.id,patient_phone_number=normalized,status="ouverte")
    db.add(item);db.flush();return item

def update_conversation_from_message(conversation:WhatsAppConversation,item:WhatsAppMessageLog,incoming:bool=False)->None:
    conversation.last_message_at=item.received_at or item.sent_at or item.created_at or datetime.now(UTC)
    conversation.last_message_preview=(item.message_content or f"[{item.message_type}]")[:280]
    if incoming:conversation.unread_count+=1

def send_message(db:Session,*,tenant_id:str,patient:PatientProfile,content:str,message_type:str,actor_id:str|None,appointment_id:str|None=None,fee_id:str|None=None,payment_id:str|None=None,template_id:str|None=None,template_values:dict[str,str]|None=None)->WhatsAppMessageLog:
    config=db.scalar(select(WhatsAppConfiguration).where(WhatsAppConfiguration.tenant_id==tenant_id))
    if not config:raise HTTPException(409,"Configurez le compte Meta WhatsApp de ce cabinet.")
    if not cabinet_meta_ready(config):raise HTTPException(409,"Testez et validez d’abord la connexion Meta de ce cabinet.")
    patient_language=patient.preferred_whatsapp_language or "fr"
    template=db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.tenant_id==tenant_id,WhatsAppMessageTemplate.id==template_id)) if template_id else db.scalar(select(WhatsAppMessageTemplate).where(WhatsAppMessageTemplate.tenant_id==tenant_id,WhatsAppMessageTemplate.type==message_type,WhatsAppMessageTemplate.language==patient_language,WhatsAppMessageTemplate.status=="valide").order_by(WhatsAppMessageTemplate.updated_at.desc()).limit(1))
    if not template or template.status!="valide" or not template.meta_template_name:raise HTTPException(409,"Aucun modèle approuvé par Meta n’est disponible pour ce message. Soumettez puis faites valider un modèle WhatsApp.")
    if template.language != patient_language:
        language_label="arabe" if patient_language=="ar" else "français"
        raise HTTPException(409,f"Le patient préfère communiquer en {language_label}. Sélectionnez un modèle WhatsApp approuvé dans cette langue.")
    template_id=template.id
    whatsapp_consent_service.require_can_send(patient)
    try:phone=normalize_phone(patient.whatsapp_phone_number or patient.user.phone or "")
    except ValueError as exc:raise HTTPException(409,str(exc)) from exc
    if not phone:raise HTTPException(409,"Le patient ne possède pas de numéro de téléphone valide.")
    digits="".join(c for c in phone if c.isdigit())
    if digits.startswith("0"):digits=f"212{digits[1:]}"
    conversation=get_or_create_conversation(db,tenant_id,patient,phone)
    item=WhatsAppMessageLog(conversation_id=conversation.id,tenant_id=tenant_id,patient_id=patient.id,appointment_id=appointment_id,fee_id=fee_id,payment_id=payment_id,template_id=template_id,phone_number=phone,message_content=content,message_type=message_type,sender_type="cabinet",direction="sortant",status="en_attente",created_by_user_id=actor_id)
    db.add(item);db.flush()
    try:
        body_pattern,variables=_meta_body(template.content)
        if template_values is not None:
            missing=[key for key in variables if key not in template_values]
            if missing:raise HTTPException(422,f"Variables WhatsApp manquantes : {', '.join(missing)}.")
            values=[str(template_values[key]) for key in variables]
        else:
            pattern=re.escape(template.content)
            for key in variables:pattern=pattern.replace(re.escape("{"+key+"}"),"(.+?)",1)
            match=re.fullmatch(pattern,content,re.DOTALL)
            if variables and not match:raise HTTPException(422,"Le message personnalisé ne correspond pas au modèle approuvé par Meta.")
            values=list(match.groups()) if match else []
        components=[{"type":"body","parameters":[{"type":"text","text":value} for value in values]}] if values else []
        response=_request(f"https://graph.facebook.com/{GRAPH_VERSION}/{config.phone_number_id}/messages",decrypt_secret(config.access_token_encrypted),"POST",{"messaging_product":"whatsapp","recipient_type":"individual","to":digits,"type":"template","template":{"name":template.meta_template_name,"language":{"code":template.language},"components":components}})
        item.meta_message_id=(response.get("messages") or [{}])[0].get("id");item.status="envoye";item.sent_at=datetime.now(UTC);item.error_message=None
    except RuntimeError as exc:item.status="echec";item.error_message=str(exc)
    update_conversation_from_message(conversation,item)
    db.commit();db.refresh(item);return item

def send_text_message(db:Session,*,tenant_id:str,patient:PatientProfile,content:str,actor_id:str,reply_to_message_id:str|None=None)->WhatsAppMessageLog:
    config=db.scalar(select(WhatsAppConfiguration).where(WhatsAppConfiguration.tenant_id==tenant_id))
    if not cabinet_meta_ready(config):raise HTTPException(409,"Le compte Meta WhatsApp du cabinet n’est pas prêt.")
    whatsapp_consent_service.require_can_send(patient)
    phone=normalize_phone(patient.whatsapp_phone_number or patient.user.phone or "");digits="".join(character for character in phone if character.isdigit())
    conversation=get_or_create_conversation(db,tenant_id,patient,phone)
    latest_inbound=db.scalar(select(WhatsAppMessageLog.received_at).where(
        WhatsAppMessageLog.conversation_id==conversation.id,WhatsAppMessageLog.direction=="entrant"
    ).order_by(WhatsAppMessageLog.received_at.desc()).limit(1))
    if not latest_inbound or datetime.now(UTC)-latest_inbound>timedelta(hours=24):
        raise HTTPException(409,"La fenêtre de conversation de 24 h est fermée. Sélectionnez un modèle WhatsApp approuvé.")
    item=WhatsAppMessageLog(conversation_id=conversation.id,tenant_id=tenant_id,patient_id=patient.id,phone_number=phone,message_content=content,message_type="texte",sender_type="cabinet",direction="sortant",status="en_attente",created_by_user_id=actor_id,reply_to_message_id=reply_to_message_id)
    db.add(item);db.flush()
    try:
        response=_request(f"https://graph.facebook.com/{GRAPH_VERSION}/{config.phone_number_id}/messages",decrypt_secret(config.access_token_encrypted),"POST",{"messaging_product":"whatsapp","recipient_type":"individual","to":digits,"type":"text","text":{"preview_url":False,"body":content}})
        item.meta_message_id=(response.get("messages") or [{}])[0].get("id");item.status="envoye";item.sent_at=datetime.now(UTC)
    except RuntimeError as exc:item.status="echec";item.error_message=str(exc)
    update_conversation_from_message(conversation,item);db.commit();db.refresh(item);return item

def render_template(template:WhatsAppMessageTemplate|None,fallback:str,values:dict[str,str])->str:
    content=template.content if template else fallback
    for key,value in values.items():content=content.replace("{"+key+"}",value)
    return content
