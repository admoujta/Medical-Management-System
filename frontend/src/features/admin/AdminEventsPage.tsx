import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  Clock3,
  Edit3,
  ExternalLink,
  ImagePlus,
  Images,
  Mail,
  MapPin,
  Phone,
  Search,
  Star,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { PaginationControls } from "../../components/PaginationControls";
import { apiCreate, apiDelete, apiPage, apiUpdate, apiUpload, initialPagination, type PaginationMeta } from "../../lib/api";
import { getSession } from "../../lib/auth";
import { confirmAction } from "../../lib/uiFeedback";
import { AdminLayout, StatusBadge } from "./AdminLayout";
import { MediaPicker } from "./MediaPicker";
import type { MediaAsset } from "./AdminMediaPage";

type EventStatus = "draft" | "published" | "cancelled" | "completed";
type AttendanceMode = "in_person" | "online" | "hybrid";
type RegistrationMode = "internal" | "external";
type PlatformEvent = {
  id: string;
  slug: string;
  title: string;
  event_type: string;
  description: string | null;
  article_content: string | null;
  start_at: string;
  end_at: string;
  location: string;
  is_online: boolean;
  attendance_mode: AttendanceMode;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  map_url: string | null;
  online_provider: string | null;
  online_url: string | null;
  registration_mode: RegistrationMode;
  registration_url: string | null;
  capacity: number | null;
  registration_count: number;
  remaining_capacity: number | null;
  is_full: boolean;
  status: EventStatus;
  is_featured: boolean;
  notification_audience:"doctors"|"patients"|"both";
  notification_sent_at:string|null;
  gallery:Array<{id:string;event_id:string;url:string;alt_text:string;caption:string|null;display_order:number;is_cover:boolean}>;
  cover_image_url:string|null;
  created_at: string;
  updated_at: string;
};
type FormState = {
  title: string;
  event_type: string;
  description: string;
  article_content: string;
  start_at: string;
  end_at: string;
  location: string;
  attendance_mode: AttendanceMode;
  venue_name: string;
  address: string;
  city: string;
  country: string;
  map_url: string;
  online_provider: string;
  online_url: string;
  registration_mode: RegistrationMode;
  registration_url: string;
  capacity: string;
  status: EventStatus;
  is_featured: boolean;
  notification_audience:"doctors"|"patients"|"both";
};
type EventRegistration = {
  id:string;reference:string;contact_first_name:string;contact_last_name:string;contact_email:string;contact_phone:string;participant_count:number;status:string;notes:string|null;created_at:string;
  participants:Array<{id:string;first_name:string;last_name:string;email:string|null;phone:string|null}>;
};
const empty: FormState = {
  title: "",
  event_type: "Webinaire gratuit",
  description: "",
  article_content: "",
  start_at: "",
  end_at: "",
  location: "",
  attendance_mode: "in_person",
  venue_name: "",
  address: "",
  city: "",
  country: "Maroc",
  map_url: "",
  online_provider: "Google Meet",
  online_url: "",
  registration_mode: "internal",
  registration_url: "",
  capacity: "",
  status: "draft",
  is_featured: false,
  notification_audience: "both",
};
const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";
const fmt = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
const local = (value: string) => {
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
};

export function AdminEventsPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const token = getSession()?.accessToken ?? "";
  const [rows, setRows] = useState<PlatformEvent[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const[page,setPage]=useState(1);
  const[pagination,setPagination]=useState<PaginationMeta>(initialPagination);
  const[summary,setSummary]=useState({total:0,published:0,upcoming:0,registrations:0});
  const[registrationEvent,setRegistrationEvent]=useState<PlatformEvent|null>(null);
  const[registrations,setRegistrations]=useState<EventRegistration[]>([]);
  const[registrationsLoading,setRegistrationsLoading]=useState(false);
  const[galleryFile,setGalleryFile]=useState<File|null>(null);const[galleryAlt,setGalleryAlt]=useState("");const[galleryCaption,setGalleryCaption]=useState("");const[galleryCover,setGalleryCover]=useState(false);const[galleryBusy,setGalleryBusy]=useState(false);
  const[mediaPicker,setMediaPicker]=useState(false);
  const load = useCallback(async()=>{
    const params=new URLSearchParams({page:String(page),page_size:"10"});
    if(query.trim())params.set("search",query.trim());
    if(status!=="all")params.set("status",status);
    const result=await apiPage<PlatformEvent>(`/super-admin/events?${params}`,token);
    setRows(result.items);setPagination(result.pagination);
    setSummary({total:Number(result.summary?.total??0),published:Number(result.summary?.published??0),upcoming:Number(result.summary?.upcoming??0),registrations:Number(result.summary?.registrations??0)});
  },[page,query,status,token]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(()=>setPage(1),[query,status]);
  const filtered = rows;
  function create() {
    setEditing(null);
    setForm(empty);
    setMessage("");
    setOpen(true);
  }
  function edit(row: PlatformEvent) {
    setEditing(row.id);
    setForm({
      title: row.title,
      event_type: row.event_type,
      description: row.description ?? "",
      article_content: row.article_content ?? "",
      start_at: local(row.start_at),
      end_at: local(row.end_at),
      location: row.location,
      attendance_mode: row.attendance_mode,
      venue_name: row.venue_name??"",
      address: row.address??"",
      city: row.city??"",
      country: row.country??"Maroc",
      map_url: row.map_url??"",
      online_provider: row.online_provider??"Google Meet",
      online_url: row.online_url??"",
      registration_mode: row.registration_mode,
      registration_url: row.registration_url ?? "",
      capacity: row.capacity?.toString() ?? "",
      status: row.status,
      is_featured: row.is_featured,
      notification_audience: row.notification_audience,
    });
    setMessage("");
    setOpen(true);
  }
  async function save() {
    setMessage("");
    if (!form.start_at || !form.end_at) {
      setMessage("Renseignez la date et les heures de début et de fin.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        is_online: form.attendance_mode!=="in_person",
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        capacity: form.capacity ? Number(form.capacity) : null,
        location: form.attendance_mode==="online"?"En ligne":form.location,
        venue_name:form.venue_name||null,address:form.address||null,city:form.city||null,country:form.country||null,map_url:form.map_url||null,
        online_provider:form.attendance_mode==="in_person"?null:form.online_provider||null,
        online_url:form.attendance_mode==="in_person"?null:form.online_url||null,
        registration_url: form.registration_url || null,
        description: form.description || null,
      };
      if (editing)
        await apiUpdate(`/super-admin/events/${editing}`, token, payload);
      else await apiCreate("/super-admin/events", token, payload);
      setOpen(false);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function publish(row: PlatformEvent) {
    await apiUpdate(`/super-admin/events/${row.id}`, token, {
      status: row.status === "published" ? "draft" : "published",
    });
    await load();
  }
  async function cancel(row: PlatformEvent) {
    if (
      !await confirmAction({
        title: "Annuler cet événement ?",
        message: `« ${row.title} » ne sera plus visible sur le site public.`,
        confirmLabel: "Annuler l’événement",
        tone: "warning",
      })
    )
      return;
    await apiDelete(`/super-admin/events/${row.id}`, token);
    await load();
  }
  async function showRegistrations(row:PlatformEvent){
    setRegistrationEvent(row);setRegistrationsLoading(true);
    try{const result=await apiPage<EventRegistration>(`/super-admin/events/${row.id}/registrations?page=1&page_size=100`,token);setRegistrations(result.items)}
    catch(error){setMessage(error instanceof Error?error.message:"Inscriptions indisponibles.")}
    finally{setRegistrationsLoading(false)}
  }
  async function uploadGalleryImage(){
    if(!editing||!galleryFile)return;setGalleryBusy(true);setMessage("");
    try{const image=await apiUpload<PlatformEvent["gallery"][number]>(`/super-admin/events/${editing}/gallery`,token,{file:galleryFile,alt_text:galleryAlt.trim()||form.title,caption:galleryCaption.trim(),is_cover:galleryCover,display_order:rows.find(row=>row.id===editing)?.gallery.length??0});setRows(current=>current.map(row=>row.id===editing?{...row,gallery:[...row.gallery.map(item=>galleryCover?{...item,is_cover:false}:item),image],cover_image_url:galleryCover||!row.cover_image_url?image.url:row.cover_image_url}:row));setGalleryFile(null);setGalleryAlt("");setGalleryCaption("");setGalleryCover(false);setMessage("Image ajoutée à la galerie.")}
    catch(error){setMessage(error instanceof Error?error.message:"Ajout de l’image impossible.")}
    finally{setGalleryBusy(false)}
  }
  async function addGalleryFromLibrary(assets:MediaAsset[]){
    if(!editing||!assets.length)return;const current=rows.find(row=>row.id===editing);const makeCover=!current?.gallery.length;
    const images=await apiCreate<PlatformEvent["gallery"]>(`/super-admin/events/${editing}/gallery/from-media`,token,{media_asset_ids:assets.map(asset=>asset.id),is_cover_id:makeCover?assets[0].id:null});
    setRows(values=>values.map(row=>row.id===editing?{...row,gallery:[...row.gallery.map(image=>makeCover?{...image,is_cover:false}:image),...images],cover_image_url:makeCover&&images[0]?images[0].url:row.cover_image_url}:row));setMessage(`${images.length} photo${images.length>1?"s":""} ajoutée${images.length>1?"s":""} depuis la médiathèque.`);
  }
  async function deleteGalleryImage(imageId:string){
    if(!editing)return;await apiDelete(`/super-admin/events/${editing}/gallery/${imageId}`,token);setRows(current=>current.map(row=>row.id===editing?{...row,gallery:row.gallery.filter(image=>image.id!==imageId),cover_image_url:row.cover_image_url?.includes(imageId)?null:row.cover_image_url}:row))
  }
  return (
    <AdminLayout onNavigate={onNavigate}>
      <div className="mx-auto max-w-[1600px] px-5 py-8 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-black uppercase tracking-wider text-teal-700">
              Communication plateforme
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Événements FADAA Santé
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Créez, préparez et publiez les événements visibles automatiquement
              sur le site public.
            </p>
          </div>
          <button
            onClick={create}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-bold text-white shadow-lg shadow-teal-700/20 hover:bg-teal-800"
          >
            <CalendarPlus size={19} />
            Créer un événement
          </button>
        </header>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Événements" value={summary.total} />
          <Metric label="Publiés" value={summary.published} />
          <Metric label="À venir sur le site" value={summary.upcoming} />
          <Metric label="Participants inscrits" value={summary.registrations} />
        </div>
        <section className="mt-7 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-3 border-b border-slate-100 p-5">
            <label className="relative min-w-64 flex-1">
              <Search
                size={17}
                className="absolute left-4 top-3.5 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un événement…"
                className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 outline-none focus:border-teal-500"
              />
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-600"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillons</option>
              <option value="published">Publiés</option>
              <option value="cancelled">Annulés</option>
              <option value="completed">Terminés</option>
            </select>
          </div>
          <div className="grid gap-4 p-5 xl:grid-cols-2">
            {filtered.map((row) => (
              <article
                key={row.id}
                className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-teal-700">
                        {row.event_type}
                      </span>
                      {row.is_featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                          <Star size={11} />À LA UNE
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-xl font-black text-slate-950">
                      {row.title}
                    </h2>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                {row.description && (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                    {row.description}
                  </p>
                )}
                <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={16} className="text-teal-600" />
                    {fmt(row.start_at)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 size={16} className="text-teal-600" />
                    {new Date(row.end_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {row.attendance_mode !== "in_person" ? (
                      <Video size={16} className="text-teal-600" />
                    ) : (
                      <MapPin size={16} className="text-teal-600" />
                    )}
                    {row.attendance_mode==="online"?`${row.online_provider??"En ligne"}`:[row.venue_name,row.location,row.city].filter(Boolean).join(" · ")}
                  </span>
                  <span className="inline-flex items-center gap-2"><Users size={16} className="text-teal-600"/>{row.registration_count} inscrit{row.registration_count!==1?"s":""} · {row.capacity??"illimité"}</span>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => edit(row)}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <Edit3 size={15} />
                    Modifier
                  </button>
                  {row.status==="published"&&<a href={`/evenements/${row.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-teal-700">Page publique <ExternalLink size={13}/></a>}
                  {row.registration_mode==="internal"&&<button onClick={()=>void showRegistrations(row)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold text-teal-700"><Users size={14}/>Inscriptions ({row.registration_count})</button>}
                  {row.status !== "cancelled" && (
                    <button
                      onClick={() => void publish(row)}
                      className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800"
                    >
                      {row.status === "published"
                        ? "Retirer du site"
                        : "Publier sur le site"}
                    </button>
                  )}
                  {row.registration_url && (
                    <a
                      href={row.registration_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      Lien <ExternalLink size={13} />
                    </a>
                  )}
                  {row.map_url&&<a href={row.map_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-slate-600"><MapPin size={13}/>Carte <ExternalLink size={12}/></a>}
                  {row.online_url&&<a href={row.online_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold text-slate-600"><Video size={13}/>{row.online_provider??"Réunion"} <ExternalLink size={12}/></a>}
                  {row.status !== "cancelled" && (
                    <button
                      onClick={() => void cancel(row)}
                      className="ml-auto rounded-lg p-2 text-red-600 hover:bg-red-50"
                      title="Annuler"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!filtered.length && (
              <div className="col-span-full py-16 text-center text-slate-500">
                <CalendarDays
                  className="mx-auto mb-3 text-slate-300"
                  size={36}
                />
                <p className="font-bold">Aucun événement trouvé.</p>
              </div>
            )}
          </div>
          <PaginationControls pagination={pagination} itemLabel="événement" onPageChange={setPage}/>
        </section>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-teal-700">
                  Gestion éditoriale
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {editing ? "Modifier l’événement" : "Nouvel événement"}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X />
              </button>
            </header>
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <Field label="Titre *">
                <input
                  className={input}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Field>
              <Field label="Type *">
                <input
                  className={input}
                  value={form.event_type}
                  onChange={(e) =>
                    setForm({ ...form, event_type: e.target.value })
                  }
                  placeholder="Webinaire, atelier…"
                />
              </Field>
              <Field label="Début *">
                <input
                  type="datetime-local"
                  className={input}
                  value={form.start_at}
                  onChange={(e) =>
                    setForm({ ...form, start_at: e.target.value })
                  }
                />
              </Field>
              <Field label="Fin *">
                <input
                  type="datetime-local"
                  className={input}
                  value={form.end_at}
                  onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                />
              </Field>
              <Field label="Mode de participation *">
                <select className={input} value={form.attendance_mode} onChange={e=>setForm({...form,attendance_mode:e.target.value as AttendanceMode})}>
                  <option value="in_person">En présentiel</option>
                  <option value="online">En ligne</option>
                  <option value="hybrid">Hybride</option>
                </select>
              </Field>
              <Field label="Capacité">
                <input
                  type="number"
                  min="1"
                  className={input}
                  value={form.capacity}
                  onChange={(e) =>
                    setForm({ ...form, capacity: e.target.value })
                  }
                  placeholder="Illimitée"
                />
              </Field>
              {form.attendance_mode!=="online"&&<>
                <Field label="Nom du lieu *"><input className={input} value={form.venue_name} onChange={e=>setForm({...form,venue_name:e.target.value,location:e.target.value})} placeholder="Centre de conférences…"/></Field>
                <Field label="Adresse *"><input className={input} value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Rue, quartier…"/></Field>
                <Field label="Ville *"><input className={input} value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Casablanca"/></Field>
                <Field label="Lien Google Maps"><input type="url" className={input} value={form.map_url} onChange={e=>setForm({...form,map_url:e.target.value})} placeholder="https://maps.google.com/…"/></Field>
              </>}
              {form.attendance_mode!=="in_person"&&<>
                <Field label="Plateforme"><select className={input} value={form.online_provider} onChange={e=>setForm({...form,online_provider:e.target.value})}><option>Google Meet</option><option>Zoom</option><option>Microsoft Teams</option><option>Autre</option></select></Field>
                <Field label="Lien de participation *"><input type="url" className={input} value={form.online_url} onChange={e=>setForm({...form,online_url:e.target.value})} placeholder="https://meet.google.com/…"/></Field>
              </>}
              <Field label="Gestion des inscriptions">
                <select className={input} value={form.registration_mode} onChange={e=>setForm({...form,registration_mode:e.target.value as RegistrationMode})}><option value="internal">Formulaire FADAA Santé</option><option value="external">Lien externe</option></select>
              </Field>
              <Field label="Notifier lors de la publication">
                <select className={input} value={form.notification_audience} onChange={e=>setForm({...form,notification_audience:e.target.value as FormState["notification_audience"]})}>
                  <option value="both">Médecins et patients</option>
                  <option value="doctors">Médecins uniquement</option>
                  <option value="patients">Patients uniquement</option>
                </select>
              </Field>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800"><b className="block">Notification maîtrisée</b>{editing&&rows.find(row=>row.id===editing)?.notification_sent_at?<span>La notification de création a déjà été envoyée. Elle ne sera pas renvoyée lors des modifications.</span>:<span>Elle sera envoyée une seule fois lorsque l’événement sera publié.</span>}</div>
              {form.registration_mode==="external"&&<Field label="Lien d’inscription externe *"><input type="url" className={input} value={form.registration_url} onChange={e=>setForm({...form,registration_url:e.target.value})} placeholder="https://…"/></Field>}
              <Field label="Statut">
                <select
                  className={input}
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as EventStatus })
                  }
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </Field>
              <label className="md:col-span-2 text-sm font-bold">
                Résumé affiché sur la landing page
                <textarea
                  className={`${input} min-h-28`}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              <label className="md:col-span-2 text-sm font-bold">
                Article de l’événement
                <textarea
                  className={`${input} min-h-56 leading-7`}
                  value={form.article_content}
                  onChange={(e) => setForm({ ...form, article_content: e.target.value })}
                  placeholder={"Présentez le programme, les objectifs, les intervenants et les informations utiles.\n\nUtilisez une ligne vide pour séparer les paragraphes."}
                />
                <span className="mt-2 block text-xs font-normal text-slate-500">Ce contenu apparaît dans la page publique séparée de l’événement.</span>
              </label>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <label className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) =>
                      setForm({ ...form, is_featured: e.target.checked })
                    }
                    className="h-5 w-5 accent-teal-600"
                  />
                  Mettre à la une
                </label>
              </div>
              {editing&&<section className="md:col-span-2 overflow-hidden rounded-2xl border border-slate-200"><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><ImagePlus size={19}/></span><div><h3 className="font-black">Galerie de l’événement</h3><p className="mt-1 text-xs font-normal text-slate-500">Ajoutez une couverture puis les photos qui illustrent l’article.</p></div></div><button type="button" onClick={()=>setMediaPicker(true)} className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-sm font-bold text-teal-700 shadow-sm hover:bg-teal-50"><Images size={17}/>Choisir dans la médiathèque</button></div><div className="p-5">
                {!!rows.find(row=>row.id===editing)?.gallery.length&&<div className="mb-5 grid gap-3 sm:grid-cols-2">{rows.find(row=>row.id===editing)?.gallery.map(image=><article key={image.id} className="overflow-hidden rounded-xl border bg-white"><img src={image.url} alt={image.alt_text} className="h-36 w-full object-cover"/><div className="flex items-start justify-between gap-2 p-3"><div><b className="text-xs">{image.alt_text}</b>{image.caption&&<p className="mt-1 text-xs font-normal text-slate-500">{image.caption}</p>}{image.is_cover&&<span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-700">Couverture</span>}</div><button type="button" onClick={()=>void deleteGalleryImage(image.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Supprimer l’image"><Trash2 size={15}/></button></div></article>)}</div>}
                <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold sm:col-span-2">Fichier image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>setGalleryFile(event.target.files?.[0]??null)} className={`${input} file:me-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:font-bold file:text-white`}/></label><label className="text-xs font-bold">Texte alternatif<input value={galleryAlt} onChange={event=>setGalleryAlt(event.target.value)} className={input} placeholder="Décrivez précisément l’image"/></label><label className="text-xs font-bold">Légende<input value={galleryCaption} onChange={event=>setGalleryCaption(event.target.value)} className={input} placeholder="Légende facultative"/></label></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={galleryCover} onChange={event=>setGalleryCover(event.target.checked)} className="h-4 w-4 accent-teal-700"/>Utiliser comme image principale</label><button type="button" disabled={!galleryFile||galleryBusy} onClick={()=>void uploadGalleryImage()} className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{galleryBusy?"Ajout…":"Ajouter à la galerie"}</button></div>
              </div></section>}
              {message && (
                <p className="md:col-span-2 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">
                  {message}
                </p>
              )}
            </div>
            <footer className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-6 py-5">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border px-5 py-3 font-bold text-slate-600"
              >
                Fermer
              </button>
              <button
                disabled={busy || !form.title || (form.attendance_mode!=="online"&&!form.venue_name) || (form.attendance_mode!=="in_person"&&!form.online_url)}
                onClick={() => void save()}
                className="rounded-xl bg-teal-700 px-6 py-3 font-bold text-white disabled:opacity-40"
              >
                {busy
                  ? "Enregistrement…"
                  : editing
                    ? "Enregistrer"
                    : "Créer l’événement"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {registrationEvent&&<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"><section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5"><div><p className="text-xs font-black uppercase tracking-wider text-teal-700">Participants inscrits</p><h2 className="mt-1 text-2xl font-black">{registrationEvent.title}</h2><p className="mt-1 text-sm text-slate-500">{registrationEvent.registration_count} participant{registrationEvent.registration_count!==1?"s":""} · capacité {registrationEvent.capacity??"illimitée"}</p></div><button onClick={()=>setRegistrationEvent(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X/></button></header><div className="space-y-3 p-6">{registrationsLoading?<p className="p-10 text-center text-slate-500">Chargement des inscriptions…</p>:registrations.map(row=><article key={row.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-teal-700">{row.reference}</p><h3 className="mt-1 font-black">{row.contact_first_name} {row.contact_last_name}</h3><div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500"><span className="inline-flex items-center gap-1"><Mail size={14}/>{row.contact_email}</span><span className="inline-flex items-center gap-1"><Phone size={14}/>{row.contact_phone}</span></div></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{row.participant_count} place{row.participant_count!==1?"s":""}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{row.participants.map((participant,index)=><div key={participant.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{index+1}. {participant.first_name} {participant.last_name}</b>{participant.email&&<p className="mt-1 text-xs text-slate-500">{participant.email}</p>}</div>)}</div>{row.notes&&<p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{row.notes}</p>}</article>)}{!registrationsLoading&&!registrations.length&&<p className="p-12 text-center text-slate-500">Aucune inscription pour le moment.</p>}</div></section></div>}
      {mediaPicker&&<MediaPicker token={token} onClose={()=>setMediaPicker(false)} onSelect={addGalleryFromLibrary}/>}
    </AdminLayout>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-bold">
      {label}
      {children}
    </label>
  );
}
