import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Edit3,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  apiCreate,
  apiDelete,
  apiGet,
  apiList,
  apiPage,
  apiUpdate,
  initialPagination,
  type PaginationMeta,
} from "../../lib/api";
import { PaginationControls } from "../../components/PaginationControls";
import { getSession, logout } from "../../lib/auth";
import { confirmAction } from "../../lib/uiFeedback";
import { MedecinLayout } from "./MedecinLayout";

type Config = {
  id: string;
  business_account_name: string;
  phone_number: string;
  phone_number_id: string;
  whatsapp_business_account_id: string;
  access_token: string;
  webhook_verify_token: string;
  webhook_url: string | null;
  status: string;
  last_test_at: string | null;
  last_error_message: string | null;
};
type Template = {
  id: string;
  name: string;
  type: string;
  language: string;
  content: string;
  meta_template_name: string | null;
  meta_template_id: string | null;
  category: "UTILITY" | "MARKETING";
  status: string;
  rejection_reason: string | null;
  submitted_at: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};
type Message = {
  id: string;
  patient_id: string | null;
  patient_name: string | null;
  phone_number: string;
  message_content: string;
  message_type: string;
  direction: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_by_name: string | null;
  created_at: string;
};
type Conversation = {
  id: string;
  patient_id: string;
  patient_name: string;
  phone_number: string;
  status: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_count: number;
  whatsapp_opt_in: boolean;
  preferred_language: string;
  remaining_amount: number;
  free_text_allowed: boolean;
  next_appointment: { date: string; time: string } | null;
  last_appointment: { date: string; status: string } | null;
  cnss_status: string | null;
};
type View = "conversations" | "configuration" | "templates" | "messages";
const emptyConfig = {
  phone_number: "",
  business_account_name: "",
  phone_number_id: "",
  whatsapp_business_account_id: "",
  access_token: "",
  webhook_verify_token: "",
  webhook_url: `${window.location.origin}/api/webhooks/whatsapp`,
};
const emptyTemplate = {
  name: "",
  type: "rappel_rdv",
  language: "fr",
  content: "",
  meta_template_name: "",
  category: "UTILITY" as const,
  status: "brouillon",
};
const statusStyle: Record<string, string> = {
  connecte: "bg-emerald-100 text-emerald-800",
  non_configure: "bg-slate-100 text-slate-600",
  en_attente: "bg-amber-100 text-amber-800",
  erreur: "bg-red-100 text-red-700",
  envoye: "bg-blue-100 text-blue-700",
  livre: "bg-indigo-100 text-indigo-700",
  lu: "bg-emerald-100 text-emerald-700",
  echec: "bg-red-100 text-red-700",
  recu: "bg-teal-100 text-teal-700",
  brouillon: "bg-slate-100 text-slate-600",
  valide: "bg-emerald-100 text-emerald-700",
  en_attente_validation: "bg-amber-100 text-amber-800",
  refuse: "bg-red-100 text-red-700",
};
const labels: Record<string, string> = {
  rappel_rdv: "Rappel rendez-vous",
  confirmation_rdv: "Confirmation rendez-vous",
  relance_paiement: "Relance paiement",
  cnss: "CNSS/CNOPS",
  general: "Général",
  connecte: "Connecté",
  non_configure: "Non configuré",
  en_attente: "En attente",
  erreur: "Erreur",
  envoye: "Envoyé",
  livre: "Livré",
  lu: "Lu",
  echec: "Échec",
  recu: "Reçu",
  brouillon: "Brouillon",
  valide: "Validé",
  en_attente_validation: "En attente de validation",
  refuse: "Refusé",
};
const when = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Jamais";

export function WhatsAppModulePage({
  onNavigate,
  initialView = "configuration",
}: {
  onNavigate: (path: string) => void;
  initialView?: View;
}) {
  const token = getSession()?.accessToken ?? "";
  const [view, setView] = useState<View>(initialView);
  const [config, setConfig] = useState<Config | null>(null);
  const [form, setForm] = useState({ ...emptyConfig });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [templatePage, setTemplatePage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [templatePagination, setTemplatePagination] =
    useState<PaginationMeta>(initialPagination);
  const [messagePagination, setMessagePagination] =
    useState<PaginationMeta>(initialPagination);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setView(initialView), [initialView]);
  async function load() {
    if (!token) return;
    const [c, t, m] = await Promise.allSettled([
      apiGet<Config>("/whatsapp/configuration", token),
      apiPage<Template>(
        `/whatsapp/templates?page=${templatePage}&page_size=10&sort_by=updated_at&sort_order=desc`,
        token,
      ),
      apiPage<Message>(
        `/whatsapp/messages?page=${messagePage}&page_size=10&sort_by=created_at&sort_order=desc`,
        token,
      ),
    ]);
    if (c.status === "fulfilled") {
      setConfig(c.value);
      const legacy = c.value.phone_number_id.startsWith("platform-managed");
      setForm({
        business_account_name: c.value.business_account_name,
        phone_number: c.value.phone_number,
        phone_number_id: legacy ? "" : c.value.phone_number_id,
        whatsapp_business_account_id: legacy
          ? ""
          : c.value.whatsapp_business_account_id,
        access_token: legacy ? "" : "********",
        webhook_verify_token: legacy ? "" : "********",
        webhook_url: c.value.webhook_url ?? emptyConfig.webhook_url,
      });
    } else {
      setConfig(null);
    }
    if (t.status === "fulfilled") {
      setTemplates(t.value.items);
      setTemplatePagination(t.value.pagination);
    }
    if (m.status === "fulfilled") {
      setMessages(m.value.items);
      setMessagePagination(m.value.pagination);
    }
  }
  useEffect(() => {
    void load();
  }, [token, templatePage, messagePage]);
  async function saveConfig(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = { ...form };
      config
        ? await apiUpdate<Config>("/whatsapp/configuration", token, payload)
        : await apiCreate<Config>("/whatsapp/configuration", token, payload);
      const refreshed = await apiGet<Config>("/whatsapp/configuration", token);
      setConfig(refreshed);
      setForm({
        business_account_name: refreshed.business_account_name,
        phone_number: refreshed.phone_number,
        phone_number_id: refreshed.phone_number_id,
        whatsapp_business_account_id: refreshed.whatsapp_business_account_id,
        access_token: "********",
        webhook_verify_token: "********",
        webhook_url: refreshed.webhook_url ?? emptyConfig.webhook_url,
      });
      setMessage("Configuration Meta enregistrée. Testez maintenant la connexion.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Configuration impossible.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiCreate<{ message: string }>(
        "/whatsapp/test-connection",
        token,
        {},
      );
      setMessage(result.message);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "WhatsApp n’est pas encore disponible. Contactez le support FADAA Santé.",
      );
      await load();
    } finally {
      setBusy(false);
    }
  }
  async function disable() {
    if (
      !await confirmAction({
        title: "Désactiver WhatsApp ?",
        message:
          "Les envois WhatsApp de ce cabinet seront interrompus jusqu’à la prochaine activation.",
        confirmLabel: "Désactiver",
        tone: "danger",
      })
    )
      return;
    setConfig(await apiCreate<Config>("/whatsapp/disable", token, {}));
  }
  const stats = useMemo(
    () => ({
      total: messagePagination.total_items,
      sent: messages.filter((x) => ["envoye", "livre", "lu"].includes(x.status))
        .length,
      read: messages.filter((x) => x.status === "lu").length,
      failed: messages.filter((x) => x.status === "echec").length,
    }),
    [messages, messagePagination.total_items],
  );
  const body = (
    <div className="mx-auto max-w-[1500px] px-5 py-7 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">
            WhatsApp professionnel
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            Communication WhatsApp
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Échangez avec vos patients et retrouvez tout l’historique dans leur
            dossier.
          </p>
        </div>
        {config && <Status value={config.status} />}
      </header>
      <nav className="mt-6 flex gap-2 overflow-x-auto rounded-xl border border-atlas-line bg-white p-2 shadow-sm">
        {(
          [
            ["conversations", "Conversations", MessageCircle],
            ["templates", "Modèles", Edit3],
            ["messages", "Journal", Archive],
            ["configuration", "Configuration", Settings2],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => {
              setView(key);
              onNavigate(`/doctor/whatsapp/${key}`);
            }}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-5 py-3 text-sm font-bold ${view === key ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"}`}
          >
            <Icon size={17} />
            {label}
            {key === "messages" && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {messagePagination.total_items}
              </span>
            )}
          </button>
        ))}
      </nav>
      {message && (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">
          ✓ {message}
        </p>
      )}
      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
          {error}
        </p>
      )}
      {view === "conversations" && (
        <Conversations
          token={token}
          templates={templates}
          onNavigate={onNavigate}
        />
      )}{" "}
      {view === "configuration" && (
        <Configuration
          config={config}
          form={form}
          setForm={setForm}
          busy={busy}
          onSave={saveConfig}
          onTest={test}
          onDisable={disable}
        />
      )}{" "}
      {view === "templates" && (
        <Templates
          rows={templates}
          token={token}
          onReload={load}
          pagination={templatePagination}
          onPageChange={setTemplatePage}
        />
      )}{" "}
      {view === "messages" && (
        <Messages
          rows={messages}
          stats={stats}
          token={token}
          onNavigate={onNavigate}
          onReload={load}
          pagination={messagePagination}
          onPageChange={setMessagePage}
        />
      )}
    </div>
  );
  return (
    <MedecinLayout
      cabinetName="WhatsApp"
      onNavigate={onNavigate}
      onLogout={() => {
        logout();
        onNavigate("/login");
      }}
    >
      {body}
    </MedecinLayout>
  );
}

function Conversations({
  token,
  templates,
  onNavigate,
}: {
  token: string;
  templates: Template[];
  onNavigate: (path: string) => void;
}) {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] =
    useState<PaginationMeta>(initialPagination);
  const [text, setText] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  async function load() {
    const current = ++requestId.current;
    setLoading(true);
    try {
      const data = await apiPage<Conversation>(
        `/whatsapp/conversations?filter=${filter}&search=${encodeURIComponent(query)}&page=${page}&page_size=10&sort_order=desc`,
        token,
      );
      if (current !== requestId.current) return;
      setRows(data.items);
      setPagination(data.pagination);
      setSelected((previous) => {
        if (!previous) return null;
        return data.items.find((item) => item.id === previous.id) ?? previous;
      });
    } catch (reason) {
      if (current === requestId.current)
        setError(
          reason instanceof Error
            ? reason.message
            : "Chargement des patients impossible.",
        );
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }
  async function open(item: Conversation) {
    setSelected(item);
    setError("");
    setLoadingMessages(true);
    if (!item.free_text_allowed) {
      const approved = templates.find(
        (template) =>
          template.status === "valide" &&
          Boolean(template.meta_template_name) &&
          template.language === item.preferred_language,
      );
      setTemplateId(approved?.id ?? "");
    } else {
      setTemplateId("");
    }
    try {
      setMessages(
        await apiList<Message>(
          `/whatsapp/conversations/${item.id}/messages`,
          token,
        ),
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Chargement de la conversation impossible.",
      );
    } finally {
      setLoadingMessages(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [filter, query, page, token]);
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSending(true);
    setError("");
    try {
      await apiCreate(
        `/whatsapp/conversations/${selected.id}/messages`,
        token,
        templateId
          ? { message_type: "template", template_id: templateId }
          : { message_type: "texte", content: text },
      );
      setText("");
      setTemplateId("");
      await open(selected);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Envoi impossible.");
    } finally {
      setSending(false);
    }
  }
  const validTemplates = templates.filter(
    (item) =>
      item.status === "valide" &&
      Boolean(item.meta_template_name) &&
      (!selected || item.language === selected.preferred_language),
  );
  return (
    <section className="mt-6 grid h-[calc(100vh-260px)] min-h-[540px] max-h-[760px] overflow-hidden rounded-2xl border border-atlas-line bg-white shadow-sm lg:grid-cols-[320px_minmax(420px,1fr)_300px]">
      <aside className="flex min-h-0 flex-col border-r border-atlas-line">
        <div className="shrink-0 p-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-3.5 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Patient ou numéro…"
              className="w-full rounded-lg border border-atlas-line py-3 pl-10 pr-3 text-sm transition focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {[
              ["all", "Toutes"],
              ["unread", "Non lues"],
              ["ouverte", "Ouvertes"],
              ["archivee", "Archivées"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setFilter(key);
                  setPage(1);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${filter === key ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div
          className={`relative min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-atlas-line transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
        >
          {loading && !rows.length && (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          )}
          {rows.map((item) => (
            <button
              key={item.id}
              onClick={() => void open(item)}
              className={`flex w-full gap-3 border-b border-atlas-line p-4 text-left transition-colors duration-150 ${selected?.id === item.id ? "bg-emerald-50" : "hover:bg-slate-50"}`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                {item.patient_name
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2">
                  <b className="truncate text-sm">{item.patient_name}</b>
                  <small className="shrink-0 text-slate-400">
                    {item.last_message_at
                      ? new Date(item.last_message_at).toLocaleTimeString(
                          "fr-FR",
                          { hour: "2-digit", minute: "2-digit" },
                        )
                      : ""}
                  </small>
                </span>
                <span className="mt-1 block truncate text-xs text-slate-500">
                  {item.last_message_preview || "Conversation prête"}
                </span>
              </span>
              {item.unread_count > 0 && (
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-emerald-600 px-1 text-xs font-bold text-white">
                  {item.unread_count}
                </span>
              )}
            </button>
          ))}
          {!loading && !rows.length && (
            <div className="p-7 text-center">
              <p className="text-sm font-bold text-slate-600">
                Aucun patient trouvé
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                La recherche utilise le nom ou le numéro renseigné dans la fiche
                patient, pas le numéro du cabinet.
              </p>
              <button
                onClick={() => onNavigate("/doctor/patients")}
                className="mt-4 rounded-lg bg-atlas-teal px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-95"
              >
                Voir les patients
              </button>
            </div>
          )}
        </div>
        <PaginationControls
          pagination={pagination}
          loading={loading}
          itemLabel="conversation"
          onPageChange={setPage}
        />
      </aside>
      <main className="flex min-h-0 flex-col bg-slate-50/50">
        {selected ? (
          <>
            <header className="border-b border-atlas-line bg-white p-4">
              <div>
                <b>{selected.patient_name}</b>
                <p className="text-xs text-slate-500">
                  {selected.phone_number} ·{" "}
                  {selected.whatsapp_opt_in
                    ? "Consentement actif"
                    : "Consentement absent"}
                </p>
              </div>
            </header>
            {!selected.free_text_allowed && (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-800">
                La fenêtre de réponse libre est fermée. Un modèle WhatsApp
                approuvé a été sélectionné automatiquement.
              </div>
            )}
            <div
              className={`relative flex-1 space-y-3 overflow-y-auto p-5 transition-opacity ${loadingMessages ? "opacity-50" : "opacity-100"}`}
            >
              {loadingMessages && (
                <div className="absolute inset-0 z-10 grid place-items-center">
                  <RefreshCw
                    className="animate-spin text-emerald-600"
                    size={26}
                  />
                </div>
              )}
              {messages.map((item) => (
                <article
                  key={item.id}
                  className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm transition-all ${item.direction === "sortant" ? "ml-auto rounded-br-sm bg-emerald-600 text-white" : "rounded-bl-sm bg-white"}`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {item.message_content}
                  </p>
                  <div
                    className={`mt-1 flex justify-end gap-2 text-[10px] ${item.direction === "sortant" ? "text-emerald-100" : "text-slate-400"}`}
                  >
                    <span>{when(item.sent_at ?? item.created_at)}</span>
                    <b>{labels[item.status] ?? item.status}</b>
                  </div>
                  {item.error_message && (
                    <p className="mt-2 rounded bg-red-50 p-2 text-xs font-bold text-red-700">
                      {item.error_message}
                    </p>
                  )}
                </article>
              ))}
            </div>
            <form
              onSubmit={send}
              className="border-t border-atlas-line bg-white p-4"
            >
              <div className="flex gap-2">
                <select
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                  className="max-w-48 rounded-lg border border-atlas-line px-3 text-xs font-bold"
                >
                  <option value="" disabled={!selected.free_text_allowed}>
                    Message libre
                  </option>
                  {validTemplates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <input
                  disabled={Boolean(templateId) || !selected.free_text_allowed}
                  required={!templateId && selected.free_text_allowed}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={
                    templateId
                      ? "Le modèle approuvé sera envoyé"
                      : "Écrire une réponse…"
                  }
                  className="min-w-0 flex-1 rounded-lg border border-atlas-line px-4 py-3 text-sm transition disabled:bg-slate-100"
                />
                <button
                  disabled={sending || (!templateId && !text.trim())}
                  className="rounded-lg bg-emerald-600 px-4 text-white transition hover:bg-emerald-700 disabled:opacity-40"
                >
                  <Send size={19} />
                </button>
              </div>
              {error && (
                <p className="mt-2 text-xs font-bold text-red-700">{error}</p>
              )}
              <p className="mt-2 text-[10px] text-slate-400">
                Message libre pendant les 24 h suivant une réponse patient.
                Sinon, utilisez un modèle validé.
              </p>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <MessageCircle className="mx-auto text-slate-300" size={48} />
              <h2 className="mt-3 font-display text-xl font-bold">
                Sélectionnez une conversation
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                L’historique complet apparaîtra ici.
              </p>
            </div>
          </div>
        )}
      </main>
      <aside className="min-h-0 overflow-y-auto overscroll-contain border-l border-atlas-line bg-white p-5">
        {selected ? (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <UserRound />
            </div>
            <h2 className="mt-3 font-display text-xl font-bold">
              {selected.patient_name}
            </h2>
            <p className="text-sm text-slate-500">{selected.phone_number}</p>
            <div className="mt-5 space-y-3 text-sm">
              <Detail
                label="Reste à payer"
                value={`${Number(selected.remaining_amount).toFixed(2)} MAD`}
              />
              <Detail
                label="Prochain rendez-vous"
                value={
                  selected.next_appointment
                    ? `${selected.next_appointment.date} à ${selected.next_appointment.time}`
                    : "Aucun"
                }
              />
              <Detail
                label="Dernier rendez-vous"
                value={selected.last_appointment?.date ?? "Aucun"}
              />
              <Detail
                label="Dossier CNSS/CNOPS"
                value={selected.cnss_status ?? "Aucun dossier"}
              />
              <Detail
                label="Langue WhatsApp"
                value={selected.preferred_language.toUpperCase()}
              />
            </div>
            <button
              onClick={() =>
                onNavigate(`/doctor/patients/${selected.patient_id}`)
              }
              className="mt-6 w-full rounded-lg bg-atlas-teal px-4 py-3 text-sm font-bold text-white"
            >
              Ouvrir la fiche patient
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Les informations du patient sélectionné seront affichées ici.
          </p>
        )}
      </aside>
    </section>
  );
}

function Configuration({
  config,
  form,
  setForm,
  busy,
  onSave,
  onTest,
  onDisable,
}: {
  config: Config | null;
  form: typeof emptyConfig;
  setForm: (value: typeof emptyConfig) => void;
  busy: boolean;
  onSave: (e: FormEvent) => void;
  onTest: () => void;
  onDisable: () => void;
}) {
  const field =
    "mt-2 w-full rounded-lg border border-atlas-line px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
  return (
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_360px]">
      <form
        onSubmit={onSave}
        className="rounded-2xl border border-atlas-line bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <Settings2 />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold">
              Compte WhatsApp Business
            </h2>
            <p className="text-xs text-slate-500">
              Les tokens sont chiffrés et ne sont jamais réaffichés.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">
            Nom du compte *
            <input
              required
              value={form.business_account_name}
              onChange={(e) =>
                setForm({ ...form, business_account_name: e.target.value })
              }
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Numéro professionnel *
            <input
              required
              type="tel"
              value={form.phone_number}
              onChange={(e) =>
                setForm({ ...form, phone_number: e.target.value })
              }
              placeholder="+212 6…"
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Phone Number ID *
            <input
              required
              value={form.phone_number_id}
              onChange={(e) =>
                setForm({ ...form, phone_number_id: e.target.value })
              }
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            WhatsApp Business Account ID *
            <input
              required
              value={form.whatsapp_business_account_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  whatsapp_business_account_id: e.target.value,
                })
              }
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Access Token Meta *
            <input
              required
              type="password"
              value={form.access_token}
              onChange={(e) =>
                setForm({ ...form, access_token: e.target.value })
              }
              className={field}
            />
          </label>
          <label className="text-sm font-bold">
            Webhook Verify Token *
            <input
              required
              type="password"
              value={form.webhook_verify_token}
              onChange={(e) =>
                setForm({ ...form, webhook_verify_token: e.target.value })
              }
              className={field}
            />
          </label>
          <label className="text-sm font-bold md:col-span-2">
            URL du Webhook
            <input
              value={form.webhook_url}
              onChange={(e) =>
                setForm({ ...form, webhook_url: e.target.value })
              }
              className={field}
            />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {busy ? "Enregistrement…" : "Enregistrer la configuration"}
          </button>
          {config && (
            <button
              type="button"
              disabled={busy}
              onClick={onTest}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-5 py-3 font-bold text-emerald-700"
            >
              <RefreshCw size={17} />
              Tester la connexion
            </button>
          )}
        </div>
      </form>
      <aside className="rounded-2xl border border-atlas-line bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold">État de la connexion</h2>
        {config ? (
          <div className="mt-5">
            <Status value={config.status} />
            <dl className="mt-5 space-y-4 text-sm">
              <Detail label="Compte" value={config.business_account_name} />
              <Detail label="Numéro" value={config.phone_number} />
              <Detail label="Dernier test" value={when(config.last_test_at)} />
              <Detail label="Token" value="••••••••••••" />
            </dl>
            {config.last_error_message && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
                {config.last_error_message}
              </p>
            )}
            <button
              type="button"
              onClick={onDisable}
              className="mt-5 w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600"
            >
              Désactiver
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-slate-50 p-5 text-center">
            <AlertCircle className="mx-auto text-slate-400" />
            <p className="mt-3 font-bold">Non configuré</p>
            <p className="mt-1 text-xs text-slate-500">
              Renseignez les identifiants fournis par Meta.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Templates({
  rows,
  token,
  onReload,
  pagination,
  onPageChange,
}: {
  rows: Template[];
  token: string;
  onReload: () => Promise<void>;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ ...emptyTemplate });
  const [error, setError] = useState("");
  function edit(item: Template) {
    setEditing(item);
    setForm({
      name: item.name,
      type: item.type,
      language: item.language,
      content: item.content,
      meta_template_name: item.meta_template_name ?? "",
      category: item.category,
      status: item.status,
    });
    setOpen(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      editing
        ? await apiUpdate(`/whatsapp/templates/${editing.id}`, token, form)
        : await apiCreate("/whatsapp/templates", token, form);
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyTemplate });
      await onReload();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Enregistrement impossible.",
      );
    }
  }
  async function submit(id: string) {
    try {
      await apiCreate(`/whatsapp/templates/${id}/submit`, token, {});
      await onReload();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Soumission Meta impossible.",
      );
    }
  }
  async function sync(id: string) {
    try {
      await apiCreate(`/whatsapp/templates/${id}/sync`, token, {});
      await onReload();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Synchronisation Meta impossible.",
      );
    }
  }
  async function remove(id: string) {
    if (
      await confirmAction({
        title: "Supprimer ce modèle ?",
        message:
          "Le modèle sera supprimé de FADAA Santé. Un modèle déjà soumis peut rester visible côté Meta.",
        confirmLabel: "Supprimer",
        tone: "danger",
      })
    ) {
      await apiDelete(`/whatsapp/templates/${id}`, token);
      await onReload();
    }
  }
  return (
    <section className="mt-6 rounded-2xl border border-atlas-line bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b p-5">
        <div>
          <h2 className="font-display text-xl font-bold">
            Modèles de messages
          </h2>
          <p className="text-sm text-slate-500">
            Variables disponibles : {"{patient_name}"}, {"{date}"}, {"{heure}"},{" "}
            {"{rap}"}, {"{cabinet_name}"}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm({ ...emptyTemplate });
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white"
        >
          <Plus size={17} />
          Nouveau modèle
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {["Nom", "Type", "Langue", "Statut", "Actions"].map((x) => (
                <th key={x} className="px-5 py-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-5 py-4">
                  <b>{item.name}</b>
                  <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                    {item.content}
                  </p>
                  {item.rejection_reason &&
                    !["NONE", "NULL", "N/A"].includes(
                      item.rejection_reason.toUpperCase(),
                    ) && (
                      <p className="mt-1 text-xs font-bold text-red-600">
                        Refus Meta : {item.rejection_reason}
                      </p>
                    )}
                </td>
                <td className="px-5 py-4">{labels[item.type] ?? item.type}</td>
                <td className="px-5 py-4 uppercase">{item.language}</td>
                <td className="px-5 py-4">
                  <Status value={item.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    {!item.meta_template_id && (
                      <>
                        <button
                          onClick={() => edit(item)}
                          className="rounded-lg bg-slate-100 p-2 text-slate-600"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => void submit(item.id)}
                          className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                        >
                          Soumettre à Meta
                        </button>
                      </>
                    )}
                    {item.meta_template_id && (
                      <button
                        onClick={() => void sync(item.id)}
                        className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                      >
                        Actualiser
                      </button>
                    )}
                    <button
                      onClick={() => void remove(item.id)}
                      className="rounded-lg bg-red-50 p-2 text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-500">
                  Aucun modèle WhatsApp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        pagination={pagination}
        itemLabel="modèle"
        onPageChange={onPageChange}
      />
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
          <form
            onSubmit={save}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex justify-between">
              <h2 className="font-display text-2xl font-bold">
                {editing ? "Modifier le modèle" : "Nouveau modèle"}
              </h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                Nom
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-2 w-full rounded-lg border p-3"
                />
              </label>
              <label>
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="mt-2 w-full rounded-lg border bg-white p-3"
                >
                  {[
                    "rappel_rdv",
                    "confirmation_rdv",
                    "relance_paiement",
                    "cnss",
                    "general",
                  ].map((x) => (
                    <option key={x} value={x}>
                      {labels[x]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Langue
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm({ ...form, language: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border bg-white p-3"
                >
                  <option value="fr">Français</option>
                  <option value="ar">Arabe</option>
                </select>
              </label>
              <label>
                Catégorie Meta
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      category: e.target.value as "UTILITY" | "MARKETING",
                    })
                  }
                  className="mt-2 w-full rounded-lg border bg-white p-3"
                >
                  <option value="UTILITY">Utilitaire</option>
                  <option value="MARKETING">Marketing</option>
                </select>
              </label>
              <label className="sm:col-span-2">
                Nom du modèle Meta
                <input
                  value={form.meta_template_name}
                  onChange={(e) =>
                    setForm({ ...form, meta_template_name: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border p-3"
                />
              </label>
              <label className="sm:col-span-2">
                Contenu
                <textarea
                  required
                  rows={6}
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  className="mt-2 w-full rounded-lg border p-3"
                />
              </label>
            </div>
            {error && (
              <p className="mt-3 text-sm font-bold text-red-600">{error}</p>
            )}
            <button className="mt-5 w-full rounded-lg bg-emerald-600 p-3 font-bold text-white">
              Enregistrer
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

function Messages({
  rows,
  stats,
  token,
  onNavigate,
  onReload,
  pagination,
  onPageChange,
}: {
  rows: Message[];
  stats: { total: number; sent: number; read: number; failed: number };
  token: string;
  onNavigate: (p: string) => void;
  onReload: () => Promise<void>;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const visible = rows.filter(
    (x) =>
      (!status || x.status === status) &&
      (!type || x.message_type === type) &&
      (!query ||
        `${x.patient_name ?? ""} ${x.phone_number} ${x.message_content}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  async function retry(id: string) {
    await apiCreate(`/whatsapp/messages/${id}/retry`, token, {});
    await onReload();
  }
  return (
    <div className="mt-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Messages" value={stats.total} />
        <Metric label="Envoyés / livrés" value={stats.sent} />
        <Metric label="Lus" value={stats.read} />
        <Metric label="Échecs" value={stats.failed} danger />
      </div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-atlas-line bg-white shadow-sm">
        <div className="grid gap-3 border-b p-5 md:grid-cols-[1fr_190px_210px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Patient, téléphone ou message…"
            className="rounded-lg border p-3"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border bg-white p-3"
          >
            <option value="">Tous les types</option>
            {[
              "rappel_rdv",
              "confirmation_rdv",
              "relance_paiement",
              "cnss",
              "general",
              "reponse_patient",
            ].map((x) => (
              <option key={x} value={x}>
                {labels[x] ?? "Réponse patient"}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border bg-white p-3"
          >
            <option value="">Tous les statuts</option>
            {["en_attente", "envoye", "livre", "lu", "recu", "echec"].map(
              (x) => (
                <option key={x} value={x}>
                  {labels[x]}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Patient",
                  "Téléphone",
                  "Type",
                  "Message",
                  "Date",
                  "Statut",
                  "Action",
                ].map((x) => (
                  <th key={x} className="px-4 py-3">
                    {x}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-4">
                    <b>{item.patient_name ?? "Non rattaché"}</b>
                    <small className="block text-slate-400">
                      {item.direction === "entrant"
                        ? "Reçu"
                        : "Envoyé par " +
                          (item.created_by_name ?? "le cabinet")}
                    </small>
                  </td>
                  <td className="px-4 py-4">{item.phone_number}</td>
                  <td className="px-4 py-4">
                    {labels[item.message_type] ?? "Réponse patient"}
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    <p className="line-clamp-2">{item.message_content}</p>
                    {item.error_message && (
                      <small className="text-red-600">
                        {item.error_message}
                      </small>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {when(item.sent_at ?? item.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <Status value={item.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      {item.status === "echec" && (
                        <button
                          onClick={() => void retry(item.id)}
                          className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700"
                        >
                          Réessayer
                        </button>
                      )}
                      {item.patient_id && (
                        <button
                          onClick={() =>
                            onNavigate(`/doctor/patients/${item.patient_id}`)
                          }
                          className="rounded-lg bg-atlas-mist px-3 py-2 text-xs font-bold text-atlas-teal"
                        >
                          Fiche patient
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    Aucun message correspondant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          pagination={pagination}
          itemLabel="message"
          onPageChange={onPageChange}
        />
      </section>
    </div>
  );
}

function Status({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex h-7 w-fit max-w-full shrink-0 self-center items-center justify-center whitespace-nowrap rounded-full px-3 text-[11px] font-extrabold leading-none ${statusStyle[value] ?? "bg-slate-100 text-slate-600"}`}
    >
      {labels[value] ?? value.replaceAll("_", " ")}
    </span>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-slate-400">{label}</dt>
      <dd className="mt-1 break-all font-semibold">{value}</dd>
    </div>
  );
}
function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${danger ? "border-red-100 bg-red-50" : "border-atlas-line bg-white"}`}
    >
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p
        className={`mt-2 text-3xl font-black ${danger ? "text-red-700" : "text-atlas-petrol"}`}
      >
        {value}
      </p>
    </div>
  );
}
