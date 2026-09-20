from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.core.phone import PhoneNumber

ConnectionStatus=Literal["non_configure","en_attente","connecte","erreur"]
TemplateType=Literal["rappel_rdv","confirmation_rdv","relance_paiement","cnss","general"]
TemplateStatus=Literal["brouillon","en_attente_validation","valide","refuse"]

class WhatsAppConfigurationWrite(BaseModel):
    business_account_name:str=Field(min_length=2,max_length=180)
    phone_number:PhoneNumber
    phone_number_id:str=Field(min_length=2,max_length=120)
    whatsapp_business_account_id:str=Field(min_length=2,max_length=120)
    access_token:str=Field(min_length=8,max_length=4000)
    webhook_verify_token:str=Field(min_length=8,max_length=500)
    webhook_url:str|None=Field(default=None,max_length=500)

class WhatsAppConfigurationOut(BaseModel):
    id:str;business_account_name:str;phone_number:str;phone_number_id:str;whatsapp_business_account_id:str
    access_token:str="********";webhook_verify_token:str="********";webhook_url:str|None;status:str;last_test_at:datetime|None;last_error_message:str|None;created_at:datetime;updated_at:datetime

class WhatsAppWebhookSetupWrite(BaseModel):
    webhook_verify_token:str=Field(min_length=8,max_length=500)
    webhook_url:str=Field(min_length=12,max_length=500)

class CabinetWhatsAppWrite(WhatsAppConfigurationWrite):
    """Identifiants Meta propres à un cabinet."""

class CabinetWhatsAppOut(WhatsAppConfigurationOut):
    """Configuration Meta du cabinet, avec secrets systématiquement masqués."""

class WhatsAppTemplateWrite(BaseModel):
    name:str=Field(min_length=2,max_length=180);type:TemplateType;language:Literal["fr","ar"]="fr";content:str=Field(min_length=3,max_length=4000);meta_template_name:str|None=Field(default=None,max_length=180);category:Literal["UTILITY","MARKETING"]="UTILITY";status:TemplateStatus="brouillon"

class WhatsAppTemplateOut(WhatsAppTemplateWrite):
    id:str;meta_template_id:str|None=None;rejection_reason:str|None=None;submitted_at:datetime|None=None;synced_at:datetime|None=None;created_at:datetime;updated_at:datetime
    model_config={"from_attributes":True}

class WhatsAppMessageOut(BaseModel):
    id:str;patient_id:str|None;patient_name:str|None=None;appointment_id:str|None;fee_id:str|None;payment_id:str|None;template_id:str|None;phone_number:str;message_content:str;message_type:str;direction:str;status:str;meta_message_id:str|None;error_message:str|None;sent_at:datetime|None;delivered_at:datetime|None;read_at:datetime|None;created_by_user_id:str|None;created_by_name:str|None=None;created_at:datetime;updated_at:datetime

class WhatsAppSendRequest(BaseModel):
    template_id:str|None=None
    message:str|None=Field(default=None,min_length=3,max_length=4000)

class WhatsAppConversationSend(BaseModel):
    message_type:Literal["texte","template"]="texte"
    content:str|None=Field(default=None,min_length=1,max_length=4000)
    template_id:str|None=None
    reply_to_message_id:str|None=None

class WhatsAppConversationUpdate(BaseModel):
    status:Literal["ouverte","fermee","archivee"]|None=None
    assigned_user_id:str|None=None

ConsentSource=Literal[
    "patient_space","registration","cabinet_reception","signed_form","other",
    "formulaire_patient","accueil_cabinet","inscription_web","confirmation_whatsapp","import","autre",
]

class WhatsAppConsentGrant(BaseModel):
    phone_number:PhoneNumber
    accepted:bool
    preferred_language:Literal["fr","ar"]="fr"
    source:ConsentSource
    note:str|None=Field(default=None,max_length=2000)
    decision_confirmed:bool=False

class WhatsAppConsentDecision(BaseModel):
    source:ConsentSource="cabinet_reception"
    note:str|None=Field(default=None,max_length=2000)
    decision_confirmed:bool=False

class WhatsAppConsentWithdraw(BaseModel):
    reason:str|None=Field(default=None,max_length=2000)
    decision_confirmed:bool=False

class WhatsAppPatientConsentAccept(BaseModel):
    phone_number:PhoneNumber
    accepted:bool
    preferred_language:Literal["fr","ar"]="fr"
    note:str|None=Field(default=None,max_length=2000)

class WhatsAppConsentPreferences(BaseModel):
    phone_number:PhoneNumber|None=None
    preferred_language:Literal["fr","ar"]|None=None
    note:str|None=Field(default=None,max_length=2000)
