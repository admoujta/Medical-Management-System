from datetime import datetime
from decimal import Decimal
from typing import Literal
from pydantic import AnyHttpUrl, BaseModel, EmailStr, Field, model_validator

TenantStatus = Literal["trial","active","grace_period","expired","suspended","cancelled"]
SubscriptionStatus = Literal["trial","active","past_due","suspended","expired","cancelled","pending_payment"]
SubscriptionModule = Literal["dashboard","appointments","patients","visits","fees","payments","reminders","whatsapp","cnss","prescriptions","documents","staff","audit","statistics"]

class AdminTenantOut(BaseModel):
    id:str; name:str; slug:str; city:str; address:str; status:str
    phone:str; trial_started_at:datetime; trial_ends_at:datetime; doctor_admin_name:str|None; doctor_admin_email:str|None; plan_name:str|None=None; created_at:datetime

class AdminTenantUpdate(BaseModel):
    name:str|None=Field(default=None,min_length=2,max_length=180); city:str|None=None; address:str|None=None

class AdminStatusUpdate(BaseModel): status:TenantStatus

class AdminSubscriptionOut(BaseModel):
    id:str; tenant_id:str; cabinet_name:str; doctor_name:str|None; plan_name:str; status:str; start_date:datetime; end_date:datetime; amount:float; payment_status:str; admin_note:str|None; created_at:datetime
    plan_id:str|None=None; payment_method:str|None=None; next_due_date:datetime|None=None

class AdminSubscriptionUpdate(BaseModel):
    plan_name:str|None=None; status:SubscriptionStatus|None=None; start_date:datetime|None=None; end_date:datetime|None=None; amount:float|None=Field(default=None,ge=0); payment_status:str|None=None; admin_note:str|None=None
class AdminSubscriptionCreate(BaseModel):
    tenant_id:str;plan_id:str|None=None;plan_name:str="FADAA Cabinet";status:SubscriptionStatus="active";start_date:datetime;end_date:datetime;amount:float=Field(ge=0);payment_status:str="pending";payment_method:str|None=None

class SupportTicketOut(BaseModel):
    id:str; tenant_id:str|None; cabinet_name:str|None; created_by_name:str|None; subject:str; message:str; status:str; priority:str; internal_note:str|None; created_at:datetime; updated_at:datetime

class SupportTicketUpdate(BaseModel):
    status:Literal["open","in_progress","resolved","closed"]|None=None; priority:Literal["low","normal","high","urgent"]|None=None; internal_note:str|None=None

class SupportReplyCreate(BaseModel): message:str=Field(min_length=2,max_length=5000); internal:bool=False

class DoctorSupportTicketCreate(BaseModel):
    subject:str=Field(min_length=3,max_length=240)
    message:str=Field(min_length=5,max_length=5000)
    priority:Literal["low","normal","high","urgent"]="normal"

class AdminDashboardOut(BaseModel):
    stats:dict[str,float|int]; expiring_soon:list[AdminTenantOut]; recent_tenants:list[AdminTenantOut]; recent_logs:list[dict]; recent_tickets:list[SupportTicketOut]

class SubscriptionPlanCreate(BaseModel):
    name:str=Field(min_length=2,max_length=120);slug:str|None=Field(default=None,min_length=2,max_length=120,pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$");description:str|None=Field(default=None,max_length=5000)
    price:Decimal=Field(ge=0,max_digits=12,decimal_places=2);currency:str=Field(default="MAD",min_length=3,max_length=3);billing_interval:Literal["monthly","quarterly","yearly"]="monthly"
    duration_months:int=Field(default=1,ge=1,le=60);trial_days:int=Field(default=30,ge=0,le=365);features:list[str]=Field(default_factory=list);enabled_modules:list[SubscriptionModule]=Field(default_factory=list)
    max_doctors:int|None=Field(default=None,ge=1);max_secretaries:int|None=Field(default=None,ge=0);max_patients:int|None=Field(default=None,ge=1)
    whatsapp_enabled:bool=False;cnss_enabled:bool=False;statistics_enabled:bool=False;is_featured:bool=False;is_active:bool=True;display_order:int=0
class SubscriptionPlanUpdate(BaseModel):
    name:str|None=Field(default=None,min_length=2,max_length=120);slug:str|None=Field(default=None,min_length=2,max_length=120,pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$");description:str|None=Field(default=None,max_length=5000)
    price:Decimal|None=Field(default=None,ge=0,max_digits=12,decimal_places=2);currency:str|None=Field(default=None,min_length=3,max_length=3);billing_interval:Literal["monthly","quarterly","yearly"]|None=None
    duration_months:int|None=Field(default=None,ge=1,le=60);trial_days:int|None=Field(default=None,ge=0,le=365);features:list[str]|None=None;enabled_modules:list[SubscriptionModule]|None=None
    max_doctors:int|None=Field(default=None,ge=1);max_secretaries:int|None=Field(default=None,ge=0);max_patients:int|None=Field(default=None,ge=1)
    whatsapp_enabled:bool|None=None;cnss_enabled:bool|None=None;statistics_enabled:bool|None=None;is_featured:bool|None=None;is_active:bool|None=None;display_order:int|None=None
class SubscriptionPlanOut(SubscriptionPlanCreate):
    id:str;created_at:datetime;updated_at:datetime

class PlatformSettingsUpdate(BaseModel):
    trial_days:int|None=Field(default=None,ge=1,le=365);reminder_days:list[int]|None=None;reminder_message:str|None=Field(default=None,max_length=2000);maintenance_mode:bool|None=None;support_email:str|None=None;terms_url:str|None=None;privacy_url:str|None=None
class PlatformSettingsOut(BaseModel):
    id:str;trial_days:int;reminder_days:list[int];reminder_message:str;maintenance_mode:bool;support_email:str|None;terms_url:str|None;privacy_url:str|None;updated_at:datetime

EventStatus = Literal["draft", "published", "cancelled", "completed"]
EventAttendanceMode = Literal["in_person", "online", "hybrid"]
EventRegistrationMode = Literal["internal", "external"]
class PlatformEventCreate(BaseModel):
    title:str=Field(min_length=3,max_length=220);event_type:str=Field(min_length=2,max_length=80);description:str|None=Field(default=None,max_length=5000);article_content:str|None=Field(default=None,max_length=50000)
    start_at:datetime;end_at:datetime;location:str=Field(default="En ligne",min_length=2,max_length=220);is_online:bool=False
    attendance_mode:EventAttendanceMode="in_person";venue_name:str|None=Field(default=None,max_length=180);address:str|None=Field(default=None,max_length=300);city:str|None=Field(default=None,max_length=120);country:str|None=Field(default="Maroc",max_length=120);map_url:AnyHttpUrl|None=None
    online_provider:str|None=Field(default=None,max_length=60);online_url:AnyHttpUrl|None=None;registration_mode:EventRegistrationMode="internal"
    registration_url:AnyHttpUrl|None=None;capacity:int|None=Field(default=None,ge=1,le=100000);status:EventStatus="draft";is_featured:bool=False;notification_audience:Literal["doctors","patients","both"]="both"

    @model_validator(mode="after")
    def validate_event_configuration(self):
        if self.end_at <= self.start_at:
            raise ValueError("L’heure de fin doit être après l’heure de début.")
        if self.attendance_mode in {"in_person","hybrid"} and not (self.address or self.location):
            raise ValueError("Renseignez le lieu ou l’adresse de l’événement.")
        if self.attendance_mode in {"online","hybrid"} and not self.online_url:
            raise ValueError("Le lien de visioconférence est obligatoire pour un événement en ligne.")
        if self.registration_mode == "external" and not self.registration_url:
            raise ValueError("Le lien d’inscription externe est obligatoire.")
        return self

class PlatformEventUpdate(BaseModel):
    title:str|None=Field(default=None,min_length=3,max_length=220);event_type:str|None=Field(default=None,min_length=2,max_length=80);description:str|None=Field(default=None,max_length=5000);article_content:str|None=Field(default=None,max_length=50000)
    start_at:datetime|None=None;end_at:datetime|None=None;location:str|None=Field(default=None,min_length=2,max_length=220);is_online:bool|None=None
    attendance_mode:EventAttendanceMode|None=None;venue_name:str|None=Field(default=None,max_length=180);address:str|None=Field(default=None,max_length=300);city:str|None=Field(default=None,max_length=120);country:str|None=Field(default=None,max_length=120);map_url:AnyHttpUrl|None=None
    online_provider:str|None=Field(default=None,max_length=60);online_url:AnyHttpUrl|None=None;registration_mode:EventRegistrationMode|None=None
    registration_url:AnyHttpUrl|None=None;capacity:int|None=Field(default=None,ge=1,le=100000);status:EventStatus|None=None;is_featured:bool|None=None;notification_audience:Literal["doctors","patients","both"]|None=None
class PlatformEventOut(BaseModel):
    id:str;slug:str;title:str;event_type:str;description:str|None;article_content:str|None;start_at:datetime;end_at:datetime;location:str;is_online:bool
    attendance_mode:str;venue_name:str|None;address:str|None;city:str|None;country:str|None;map_url:str|None;online_provider:str|None;online_url:str|None;registration_mode:str;registration_url:str|None
    capacity:int|None;registration_count:int=0;remaining_capacity:int|None=None;is_full:bool=False;status:str;is_featured:bool;notification_audience:str;notification_sent_at:datetime|None;gallery:list[dict]=Field(default_factory=list);cover_image_url:str|None=None;created_at:datetime;updated_at:datetime

class PublicPlatformEventOut(BaseModel):
    id:str;slug:str;title:str;event_type:str;description:str|None;article_content:str|None;start_at:datetime;end_at:datetime;location:str
    attendance_mode:str;venue_name:str|None;address:str|None;city:str|None;country:str|None;map_url:str|None;online_provider:str|None
    registration_mode:str;registration_url:str|None;capacity:int|None;registration_count:int;remaining_capacity:int|None;is_full:bool;is_featured:bool;gallery:list[dict]=Field(default_factory=list);cover_image_url:str|None=None

class EventGalleryImageOut(BaseModel):
    id:str;event_id:str;url:str;alt_text:str;caption:str|None;display_order:int;is_cover:bool

BlogStatus=Literal["draft","published","archived"]
class BlogPostCreate(BaseModel):
    title:str=Field(min_length=3,max_length=220);excerpt:str|None=Field(default=None,max_length=1000);content:str=Field(min_length=10,max_length=100000)
    category:str=Field(default="Actualités",min_length=2,max_length=100);author_name:str=Field(default="Équipe FADAA Santé",min_length=2,max_length=160);status:BlogStatus="draft";is_featured:bool=False
class BlogPostUpdate(BaseModel):
    title:str|None=Field(default=None,min_length=3,max_length=220);excerpt:str|None=Field(default=None,max_length=1000);content:str|None=Field(default=None,min_length=10,max_length=100000)
    category:str|None=Field(default=None,min_length=2,max_length=100);author_name:str|None=Field(default=None,min_length=2,max_length=160);status:BlogStatus|None=None;is_featured:bool|None=None
class BlogPostOut(BaseModel):
    id:str;slug:str;title:str;excerpt:str|None;content:str;category:str;author_name:str;status:str;is_featured:bool;published_at:datetime|None
    gallery:list[dict]=Field(default_factory=list);cover_image_url:str|None=None;created_at:datetime;updated_at:datetime
class PublicBlogPostOut(BaseModel):
    id:str;slug:str;title:str;excerpt:str|None;content:str;category:str;author_name:str;is_featured:bool;published_at:datetime|None
    gallery:list[dict]=Field(default_factory=list);cover_image_url:str|None=None
class BlogGalleryImageOut(BaseModel):
    id:str;post_id:str;url:str;alt_text:str;caption:str|None;display_order:int;is_cover:bool

class PlatformMediaAssetOut(BaseModel):
    id:str;url:str;original_filename:str;alt_text:str;caption:str|None;mime_type:str;file_size:int;created_at:datetime

class BlogGalleryFromMediaCreate(BaseModel):
    media_asset_ids:list[str]=Field(min_length=1,max_length=50)
    is_cover_id:str|None=None

class EventParticipantCreate(BaseModel):
    first_name:str=Field(min_length=2,max_length=100);last_name:str=Field(min_length=2,max_length=100);email:EmailStr|None=None;phone:str|None=Field(default=None,max_length=40)

class PublicEventRegistrationCreate(BaseModel):
    contact_first_name:str=Field(min_length=2,max_length=100);contact_last_name:str=Field(min_length=2,max_length=100);contact_email:EmailStr;contact_phone:str=Field(min_length=8,max_length=40)
    participants:list[EventParticipantCreate]=Field(min_length=1,max_length=20);notes:str|None=Field(default=None,max_length=1000);consent_accepted:bool

    @model_validator(mode="after")
    def validate_consent(self):
        if not self.consent_accepted:
            raise ValueError("Vous devez accepter l’utilisation de vos informations pour cette inscription.")
        return self

class EventParticipantOut(BaseModel):
    id:str;first_name:str;last_name:str;email:str|None;phone:str|None

class EventRegistrationOut(BaseModel):
    id:str;event_id:str;reference:str;contact_first_name:str;contact_last_name:str;contact_email:str;contact_phone:str;participant_count:int;status:str;notes:str|None;created_at:datetime;participants:list[EventParticipantOut]=Field(default_factory=list)

class PublicEventRegistrationConfirmation(BaseModel):
    reference:str;event_id:str;event_title:str;participant_count:int;status:str;attendance_mode:str;location:str;map_url:str|None;online_provider:str|None;online_url:str|None
