import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  LifeBuoy,
  ListTree,
  Search,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import {
  apiCreate,
  apiDelete,
  apiGet,
  apiList,
  apiUpdate,
} from "../../lib/api";
import { getSession } from "../../lib/auth";
import { confirmAction } from "../../lib/uiFeedback";
import { AdminLayout, StatusBadge } from "./AdminLayout";
import { AdminSubscriptionPaymentsPanel } from "./AdminSubscriptionPaymentsPanel";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  phone?: string;
  plan_name?: string | null;
  status: string;
  trial_started_at: string;
  trial_ends_at: string;
  doctor_admin_name: string | null;
  doctor_admin_email: string | null;
  created_at: string;
};
type Subscription = {
  id: string;
  tenant_id: string;
  cabinet_name: string;
  doctor_name: string | null;
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
  payment_status: string;
  payment_method?: string | null;
  admin_note: string | null;
  created_at: string;
};
type Ticket = {
  id: string;
  cabinet_name: string | null;
  created_by_name: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  internal_note: string | null;
  created_at: string;
  updated_at: string;
};
const useToken = () => getSession()?.accessToken ?? "";
const date = (value: string) => new Date(value).toLocaleDateString("fr-FR");
const Header = ({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) => (
  <header className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-6">
    <div>
      <p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
        {subtitle}
      </p>
    </div>
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
      Périmètre administratif sécurisé
    </div>
  </header>
);
const Shell = ({
  children,
  onNavigate,
}: {
  children: ReactNode;
  onNavigate: (p: string) => void;
}) => (
  <AdminLayout onNavigate={onNavigate}>
    <div className="mx-auto max-w-[1600px] px-5 py-7 md:px-8 md:py-9">
      {children}
    </div>
  </AdminLayout>
);

export function AdminDashboard({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const token = useToken();
  const [data, setData] = useState<any>();
  useEffect(() => {
    apiGet("/super-admin/dashboard", token).then(setData);
  }, [token]);
  if (!data)
    return (
      <Shell onNavigate={onNavigate}>
        <div className="grid min-h-96 place-items-center">
          <p className="font-bold text-slate-500">
            Chargement de la plateforme…
          </p>
        </div>
      </Shell>
    );
  const cards = [
    [
      "Instances",
      data.stats.total_tenants,
      Building2,
      "bg-teal-50 text-teal-700",
    ],
    [
      "Instances actives",
      data.stats.active,
      ShieldCheck,
      "bg-emerald-50 text-emerald-700",
    ],
    [
      "Essais en cours",
      data.stats.trial,
      CalendarClock,
      "bg-blue-50 text-blue-700",
    ],
    [
      "Nouvelles ce mois",
      data.stats.new_this_month ?? 0,
      UserPlus,
      "bg-violet-50 text-violet-700",
    ],
    [
      "Suspendues",
      data.stats.suspended,
      AlertTriangle,
      "bg-red-50 text-red-700",
    ],
    [
      "Abonnements actifs",
      data.stats.active_subscriptions,
      CreditCard,
      "bg-amber-50 text-amber-700",
    ],
  ];
  const actions = [
    [
      "Gérer les instances",
      "Consulter, activer ou suspendre un cabinet.",
      "/super-admin/instances",
      Building2,
    ],
    [
      "Suivre les abonnements",
      "Vérifier les périodes, paiements et expirations.",
      "/super-admin/abonnements",
      CreditCard,
    ],
    [
      "Traiter le support",
      `${data.stats.open_tickets ?? 0} ticket(s) ouvert(s).`,
      "/super-admin/support",
      LifeBuoy,
    ],
    [
      "Consulter les logs",
      "Contrôler les actions administratives sensibles.",
      "/super-admin/logs",
      ListTree,
    ],
  ] as const;
  return (
    <Shell onNavigate={onNavigate}>
      <Header
        eyebrow="Pilotage de la plateforme"
        title="Tableau de bord Super Admin"
        subtitle="Une vue opérationnelle des cabinets, abonnements et services FADAA Santé. Les informations médicales restent strictement inaccessibles."
      />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value, Icon, tone]: any) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,42,52,.06)]"
          >
            <span
              className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}
            >
              <Icon size={21} />
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-wider text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {value}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(([title, description, path, Icon]) => (
          <button
            key={path}
            onClick={() => onNavigate(path)}
            className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-teal-700 group-hover:bg-teal-50">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-sm text-slate-900">{title}</b>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {description}
              </span>
            </span>
            <ArrowRight
              size={17}
              className="mt-1 shrink-0 text-slate-300 group-hover:text-teal-600"
            />
          </button>
        ))}
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Dernières instances</h2>
              <p className="mt-1 text-xs text-slate-500">
                Cabinets récemment créés sur la plateforme
              </p>
            </div>
            <button
              onClick={() => onNavigate("/super-admin/instances")}
              className="text-sm font-bold text-teal-700"
            >
              Voir tout
            </button>
          </div>
          <TenantRows rows={data.recent_tenants} onNavigate={onNavigate} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <CalendarClock size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black">Expirations proches</h2>
              <p className="text-xs text-slate-500">
                Dans les sept prochains jours
              </p>
            </div>
          </div>
          <TenantRows rows={data.expiring_soon} onNavigate={onNavigate} />
          {!data.expiring_soon.length && (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
              Aucune expiration imminente.
            </div>
          )}
        </section>
      </div>
      <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[linear-gradient(110deg,#0d3540,#0f766e)] p-6 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200">
            Revenus d’abonnement enregistrés
          </p>
          <p className="mt-2 text-3xl font-black">
            {Number(data.stats.revenue ?? 0).toLocaleString("fr-MA")} MAD
          </p>
          <p className="mt-1 text-xs text-white/60">
            Données commerciales SaaS uniquement
          </p>
        </div>
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
          <CircleDollarSign size={28} />
        </span>
      </section>
    </Shell>
  );
}

function TenantRows({
  rows,
  onNavigate,
}: {
  rows: Tenant[];
  onNavigate: (p: string) => void;
}) {
  return (
    <div className="mt-4 space-y-2">
      {rows.length ? (
        rows.map((t) => (
          <button
            key={t.id}
            onClick={() => onNavigate(`/super-admin/instances/${t.id}`)}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-transparent bg-slate-50 p-3.5 text-left transition hover:border-teal-200 hover:bg-teal-50/40"
          >
            <span className="min-w-0">
              <b className="block truncate text-sm">{t.name}</b>
              <small className="mt-1 block truncate text-slate-500">
                {t.city} · {t.doctor_admin_email ?? "Sans propriétaire"}
              </small>
            </span>
            <StatusBadge status={t.status} />
          </button>
        ))
      ) : (
        <p className="py-5 text-sm text-slate-500">Aucun élément.</p>
      )}
    </div>
  );
}

export function AdminTenantsPage({
  onNavigate,
  tenantId,
}: {
  onNavigate: (p: string) => void;
  tenantId?: string;
}) {
  const token = useToken();
  const [rows, setRows] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const load = useCallback(
    () => apiList<Tenant>("/super-admin/instances", token).then(setRows),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);
  const selected = tenantId ? rows.find((x) => x.id === tenantId) : undefined;
  const cities = [...new Set(rows.map((x) => x.city).filter(Boolean))].sort();
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(
      (x) =>
        (!statusFilter || x.status === statusFilter) &&
        (!cityFilter || x.city === cityFilter) &&
        (!query ||
          `${x.name} ${x.slug} ${x.city} ${x.address} ${x.phone ?? ""} ${x.plan_name ?? ""} ${x.doctor_admin_name ?? ""} ${x.doctor_admin_email ?? ""}`
            .toLowerCase()
            .includes(query)),
    );
  }, [rows, search, statusFilter, cityFilter]);
  async function change(t: Tenant, status: string) {
    if (
      !await confirmAction({
        title: status === "active" ? "Activer ce cabinet ?" : "Modifier le statut du cabinet ?",
        message: `${t.name} passera au statut ${status.replaceAll("_", " ").toUpperCase()}.`,
        confirmLabel: status === "active" ? "Activer" : "Confirmer",
        tone: status === "suspended" ? "danger" : status === "expired" ? "warning" : "primary",
      })
    )
      return;
    await apiUpdate(`/super-admin/instances/${t.id}/status`, token, { status });
    await load();
  }
  return (
    <Shell onNavigate={onNavigate}>
      <Header
        eyebrow="Instances"
        title={selected ? selected.name : "Cabinets et instances"}
        subtitle="Recherchez et filtrez les informations administratives des cabinets. Aucune donnée médicale n’est exposée."
      />
      {selected ? (
        <div className="mt-7 rounded-2xl border bg-white p-6 shadow-sm">
          <button
            onClick={() => onNavigate("/super-admin/instances")}
            className="text-sm font-bold text-teal-700"
          >
            ← Retour aux instances
          </button>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Code cabinet" value={selected.slug} />
            <Field
              label="Médecin propriétaire"
              value={selected.doctor_admin_name ?? "—"}
            />
            <Field
              label="Email professionnel"
              value={selected.doctor_admin_email ?? "—"}
            />
            <Field label="Téléphone" value={selected.phone ?? "—"} />
            <Field label="Ville" value={selected.city} />
            <Field label="Plan actuel" value={selected.plan_name ?? "—"} />
            <Field
              label="Début essai"
              value={date(selected.trial_started_at)}
            />
            <Field label="Fin essai" value={date(selected.trial_ends_at)} />
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">
                Statut
              </p>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {["trial", "active", "expired", "suspended"].map((s) => (
              <button
                key={s}
                disabled={s === selected.status}
                onClick={() => change(selected, s)}
                className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-30"
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Cabinet, propriétaire, email, téléphone, ville ou code…"
          >
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Tous les statuts</option>
              {["trial", "active", "expired", "suspended", "cancelled"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value.toUpperCase()}
                  </option>
                ),
              )}
            </select>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Toutes les villes</option>
              {cities.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </FilterBar>
          <ResultCount
            shown={filtered.length}
            total={rows.length}
            onReset={() => {
              setSearch("");
              setStatusFilter("");
              setCityFilter("");
            }}
          />
          <div className="mt-3 rounded-2xl border bg-white p-5 shadow-sm">
            <TenantRows rows={filtered} onNavigate={onNavigate} />
          </div>
        </>
      )}
    </Shell>
  );
}
const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-slate-50 p-4">
    <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
    <p className="mt-1 font-bold">{value}</p>
  </div>
);

export function AdminSubscriptionsPage({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const token = useToken();
  const [rows, setRows] = useState<Subscription[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const load = useCallback(
    () =>
      apiList<Subscription>("/super-admin/subscriptions", token).then(setRows),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(
      (x) =>
        (!status || x.status === status) &&
        (!payment || x.payment_status === payment) &&
        (!query ||
          `${x.cabinet_name} ${x.doctor_name ?? ""} ${x.plan_name} ${x.payment_method ?? ""}`
            .toLowerCase()
            .includes(query)),
    );
  }, [rows, search, status, payment]);
  async function action(id: string, kind: "activate" | "cancel") {
    if (
      !await confirmAction({
        title: kind === "activate" ? "Activer cet abonnement ?" : "Annuler cet abonnement ?",
        message:
          kind === "activate"
            ? "L’abonnement sera activé immédiatement pour le cabinet."
            : "L’abonnement sera annulé. L’historique de facturation sera conservé.",
        confirmLabel: kind === "activate" ? "Activer" : "Annuler l’abonnement",
        tone: kind === "activate" ? "primary" : "danger",
      })
    )
      return;
    await apiCreate(`/super-admin/subscriptions/${id}/${kind}`, token, {});
    await load();
  }
  return (
    <Shell onNavigate={onNavigate}>
      <Header
        eyebrow="Facturation SaaS"
        title="Abonnements"
        subtitle="Recherche multicritère des abonnements de la plateforme, sans information financière médicale des patients."
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Cabinet, médecin, plan ou mode de paiement…"
      >
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border bg-white px-4 py-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          {["trial", "active", "expired", "cancelled", "pending_payment"].map(
            (value) => (
              <option key={value} value={value}>
                {value.replace("_", " ").toUpperCase()}
              </option>
            ),
          )}
        </select>
        <select
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
          className="rounded-xl border bg-white px-4 py-3 text-sm"
        >
          <option value="">Tous les paiements</option>
          {[...new Set(rows.map((x) => x.payment_status))].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </FilterBar>
      <ResultCount
        shown={visible.length}
        total={rows.length}
        onReset={() => {
          setSearch("");
          setStatus("");
          setPayment("");
        }}
      />
      <div className="mt-3 overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Cabinet",
                "Médecin",
                "Plan",
                "Statut",
                "Période",
                "Montant",
                "Paiement",
                "Actions",
              ].map((x) => (
                <th className="p-4" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id} className="border-t hover:bg-slate-50/70">
                <td className="p-4 font-bold">{s.cabinet_name}</td>
                <td className="p-4">{s.doctor_name ?? "—"}</td>
                <td className="p-4">{s.plan_name}</td>
                <td className="p-4">
                  <StatusBadge status={s.status} />
                </td>
                <td className="p-4">
                  {date(s.start_date)} → {date(s.end_date)}
                </td>
                <td className="p-4 font-bold">
                  {s.amount.toLocaleString("fr-FR")} MAD
                </td>
                <td className="p-4">{s.payment_status}</td>
                <td className="p-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => action(s.id, "activate")}
                      className="font-bold text-emerald-700"
                    >
                      Activer
                    </button>
                    <button
                      onClick={() => action(s.id, "cancel")}
                      className="font-bold text-red-600"
                    >
                      Annuler
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <EmptySearch />}
      </div>
      <AdminSubscriptionPaymentsPanel
        token={token}
        subscriptions={rows}
        onSubscriptionsChanged={load}
      />
    </Shell>
  );
}

export function AdminSupportPage({
  onNavigate,
  ticketId,
}: {
  onNavigate: (p: string) => void;
  ticketId?: string;
}) {
  const token = useToken();
  const [rows, setRows] = useState<Ticket[]>([]);
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const load = useCallback(
    () => apiList<Ticket>("/super-admin/support-tickets", token).then(setRows),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);
  const item = rows.find((x) => x.id === ticketId);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(
      (x) =>
        (!status || x.status === status) &&
        (!priority || x.priority === priority) &&
        (!query ||
          `${x.subject} ${x.message} ${x.cabinet_name ?? ""} ${x.created_by_name ?? ""}`
            .toLowerCase()
            .includes(query)),
    );
  }, [rows, search, status, priority]);
  async function close() {
    if (item) {
      await apiCreate(
        `/super-admin/support-tickets/${item.id}/close`,
        token,
        {},
      );
      await load();
    }
  }
  async function reply() {
    if (item && note) {
      setSuccess("");
      setError("");
      try {
        await apiCreate(
          `/super-admin/support-tickets/${item.id}/reply`,
          token,
          { message: note, internal: false },
        );
        setNote("");
        setSuccess("La réponse a été envoyée avec succès au médecin.");
        await load();
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Envoi impossible.",
        );
      }
    }
  }
  return (
    <Shell onNavigate={onNavigate}>
      <Header
        eyebrow="Assistance"
        title="Support technique"
        subtitle="Filtrez les demandes administratives et techniques. Les dossiers médicaux ne sont jamais consultables."
      />
      {success && (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700">
          ✓ {success}
        </p>
      )}
      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
          {error}
        </p>
      )}
      {item ? (
        <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <button
            onClick={() => onNavigate("/super-admin/support")}
            className="font-bold text-teal-700"
          >
            ← Retour au support
          </button>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">{item.subject}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {item.cabinet_name ?? "Plateforme"} ·{" "}
                {item.created_by_name ?? "Utilisateur"} ·{" "}
                {date(item.created_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={item.status} />
              <StatusBadge status={item.priority} />
            </div>
          </div>
          <p className="mt-5 rounded-xl bg-slate-50 p-4">{item.message}</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Réponse visible par le médecin"
            className="mt-5 min-h-28 w-full rounded-xl border p-3"
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => void reply()}
              disabled={!note.trim()}
              className="rounded-lg bg-teal-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Envoyer la réponse
            </button>
            <button
              onClick={close}
              className="rounded-lg border px-4 py-2 font-bold"
            >
              Fermer
            </button>
          </div>
        </section>
      ) : (
        <>
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Sujet, message, cabinet ou demandeur…"
          >
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Tous les statuts</option>
              {["open", "in_progress", "resolved", "closed"].map((value) => (
                <option key={value} value={value}>
                  {value.replace("_", " ").toUpperCase()}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-xl border bg-white px-4 py-3 text-sm"
            >
              <option value="">Toutes les priorités</option>
              {["low", "normal", "high", "urgent"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </FilterBar>
          <ResultCount
            shown={visible.length}
            total={rows.length}
            onReset={() => {
              setSearch("");
              setStatus("");
              setPriority("");
            }}
          />
          <div className="mt-3 space-y-3">
            {visible.length ? (
              visible.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onNavigate(`/super-admin/support/${t.id}`)}
                  className="flex w-full justify-between gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-teal-200"
                >
                  <span className="min-w-0">
                    <b className="block truncate">{t.subject}</b>
                    <small className="mt-1 block truncate text-slate-500">
                      {t.cabinet_name ?? "Plateforme"} ·{" "}
                      {t.created_by_name ?? "Utilisateur"} ·{" "}
                      {date(t.created_at)}
                    </small>
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <StatusBadge status={t.priority} />
                    <StatusBadge status={t.status} />
                  </span>
                </button>
              ))
            ) : (
              <EmptySearch />
            )}
          </div>
        </>
      )}
    </Shell>
  );
}

export function AdminLogsPage({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const token = useToken();
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [resource, setResource] = useState("");
  const [period, setPeriod] = useState("all");
  useEffect(() => {
    apiList<any>("/super-admin/audit-logs", token).then(setRows);
  }, [token]);
  const resources = [
    ...new Set(rows.map((x) => x.resource_type).filter(Boolean)),
  ];
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    return rows.filter((x) => {
      const age = now - new Date(x.created_at).getTime();
      return (
        (!resource || x.resource_type === resource) &&
        (period === "all" ||
          (period === "today" && age <= 86400000) ||
          (period === "week" && age <= 604800000)) &&
        (!query ||
          `${x.message} ${x.action} ${x.resource_type} ${x.resource_id ?? ""}`
            .toLowerCase()
            .includes(query))
      );
    });
  }, [rows, search, resource, period]);
  return (
    <Shell onNavigate={onNavigate}>
      <Header
        eyebrow="Audit"
        title="Logs administratifs"
        subtitle="Recherchez les actions techniques et administratives. Les contenus médicaux sont exclus de ces journaux."
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Action, ressource ou identifiant…"
      >
        <select
          value={resource}
          onChange={(e) => setResource(e.target.value)}
          className="rounded-xl border bg-white px-4 py-3 text-sm"
        >
          <option value="">Toutes les ressources</option>
          {resources.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-xl border bg-white px-4 py-3 text-sm"
        >
          <option value="all">Toutes les dates</option>
          <option value="today">Dernières 24 h</option>
          <option value="week">Sept derniers jours</option>
        </select>
      </FilterBar>
      <ResultCount
        shown={visible.length}
        total={rows.length}
        onReset={() => {
          setSearch("");
          setResource("");
          setPeriod("all");
        }}
      />
      <div className="mt-3 overflow-hidden rounded-2xl border bg-white shadow-sm">
        {visible.length ? (
          visible.map((x) => (
            <div
              key={x.id}
              className="grid gap-2 border-b p-4 text-sm last:border-0 md:grid-cols-[180px_120px_180px_1fr]"
            >
              <span className="text-slate-500">
                {new Date(x.created_at).toLocaleString("fr-FR")}
              </span>
              <b>{x.level}</b>
              <span className="font-semibold text-teal-700">
                {x.resource_type}
              </span>
              <span>{x.message}</span>
            </div>
          ))
        ) : (
          <EmptySearch />
        )}
      </div>
    </Shell>
  );
}

export function AdminAnalyticsPage({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const token = useToken();
  const [data, setData] = useState<any>();
  useEffect(() => {
    apiGet("/super-admin/analytics", token).then(setData);
  }, [token]);
  return (
    <Shell onNavigate={onNavigate}>
      <Header
        eyebrow="Données anonymisées"
        title="Analytics globales"
        subtitle="Uniquement des volumes agrégés, sans identité ni contenu médical."
      />
      {data && (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Cabinets" value={data.total_tenants} />
          <Metric
            label="Rendez-vous anonymisés"
            value={data.appointments_total_anonymized}
          />
          <Metric
            label="Abonnements actifs"
            value={data.active_subscriptions}
          />
          <Metric label="Revenus" value={`${data.subscription_revenue} MAD`} />
          {Object.entries(data.tenants_by_status).map(([k, v]) => (
            <Metric key={k} label={`Cabinets ${k}`} value={v as number} />
          ))}
        </div>
      )}
    </Shell>
  );
}

type Plan = {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  features: string[];
  is_active: boolean;
};
export function AdminPlansPage({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const token = useToken();
  const [rows, setRows] = useState<Plan[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [months, setMonths] = useState("1");
  const [features, setFeatures] = useState("Patients, Agenda, Facturation");
  const load = useCallback(
    () => apiList<Plan>("/super-admin/plans", token).then(setRows),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function create() {
    if (!name || !price) return;
    await apiCreate("/super-admin/plans", token, {
      name,
      price: Number(price),
      duration_months: Number(months),
      features: features
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      is_active: true,
    });
    setName("");
    setPrice("");
    await load();
  }
  async function disable(id: string) {
    if (
      await confirmAction({
        title: "Désactiver ce plan ?",
        message: "Le plan ne sera plus proposé aux nouveaux cabinets. Les abonnements existants seront conservés.",
        confirmLabel: "Désactiver",
        tone: "danger",
      })
    ) {
      await apiDelete(`/super-admin/plans/${id}`, token);
      await load();
    }
  }
  return (
    <Shell onNavigate={onNavigate}>
      <Header
        eyebrow="Offres SaaS"
        title="Plans d’abonnement"
        subtitle="Configurez les offres commerciales de la plateforme, sans donnée médicale."
      />
      <div className="mt-7 grid gap-6 xl:grid-cols-[380px_1fr]">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Nouveau plan</h2>
          <div className="mt-4 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du plan"
              className="w-full rounded-xl border px-4 py-3"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Prix MAD"
                className="rounded-xl border px-4 py-3"
              />
              <input
                type="number"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                min="1"
                placeholder="Mois"
                className="rounded-xl border px-4 py-3"
              />
            </div>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              className="min-h-28 w-full rounded-xl border p-4"
              placeholder="Fonctions séparées par des virgules"
            />
            <button
              onClick={create}
              className="w-full rounded-xl bg-teal-600 px-4 py-3 font-bold text-white"
            >
              Créer le plan
            </button>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          {rows.map((plan) => (
            <article
              key={plan.id}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">{plan.name}</h3>
                  <p className="mt-1 text-3xl font-black text-teal-700">
                    {plan.price.toLocaleString("fr-MA")} MAD
                  </p>
                  <p className="text-xs font-bold text-slate-400">
                    pour {plan.duration_months} mois
                  </p>
                </div>
                <StatusBadge status={plan.is_active ? "active" : "cancelled"} />
              </div>
              <ul className="mt-5 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              {plan.is_active && (
                <button
                  onClick={() => disable(plan.id)}
                  className="mt-5 text-sm font-bold text-red-600"
                >
                  Désactiver
                </button>
              )}
            </article>
          ))}
        </section>
      </div>
    </Shell>
  );
}

type MainUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  cabinet_name: string;
  is_active: boolean;
  created_at: string;
};
export function AdminUsersPage({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const token = useToken();
  const [rows, setRows] = useState<MainUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [accountStatus, setAccountStatus] = useState("");
  const load = useCallback(
    () => apiList<MainUser>("/super-admin/users", token).then(setRows),
    [token],
  );
  useEffect(() => {
    load();
  }, [load]);
  const roles = [...new Set(rows.map((x) => x.role))];
  const visible = useMemo(() => {
    const query = search.toLowerCase();
    return rows.filter(
      (x) =>
        (!role || x.role === role) &&
        (!accountStatus ||
          String(x.is_active) ===
            (accountStatus === "active" ? "true" : "false")) &&
        `${x.name} ${x.email} ${x.cabinet_name} ${x.role}`
          .toLowerCase()
          .includes(query),
    );
  }, [rows, search, role, accountStatus]);
  async function toggle(row: MainUser) {
    if (
      !await confirmAction({
        title: row.is_active ? "Désactiver ce compte ?" : "Réactiver ce compte ?",
        message: row.is_active
          ? `${row.email} perdra immédiatement l’accès à la plateforme.`
          : `${row.email} pourra de nouveau accéder à la plateforme.`,
        confirmLabel: row.is_active ? "Désactiver" : "Réactiver",
        tone: row.is_active ? "danger" : "primary",
      })
    )
      return;
    await apiUpdate(
      `/super-admin/users/${row.id}/${row.is_active ? "disable" : "activate"}`,
      token,
      {},
    );
    await load();
  }
  return (
    <Shell onNavigate={onNavigate}>
      <Header
        eyebrow="Accès principaux"
        title="Utilisateurs de la plateforme"
        subtitle="Filtrez les propriétaires, secrétaires et Super Admin — aucune donnée patient n’est accessible."
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Nom, email, cabinet ou rôle…"
      >
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border bg-white px-4 py-3 text-sm"
        >
          <option value="">Tous les rôles</option>
          {roles.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          value={accountStatus}
          onChange={(e) => setAccountStatus(e.target.value)}
          className="rounded-xl border bg-white px-4 py-3 text-sm"
        >
          <option value="">Tous les comptes</option>
          <option value="active">Actifs</option>
          <option value="disabled">Désactivés</option>
        </select>
      </FilterBar>
      <ResultCount
        shown={visible.length}
        total={rows.length}
        onReset={() => {
          setSearch("");
          setRole("");
          setAccountStatus("");
        }}
      />
      <div className="mt-3 overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Utilisateur",
                "Email",
                "Rôle",
                "Instance",
                "Création",
                "Statut",
                "Action",
              ].map((x) => (
                <th key={x} className="p-4">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id} className="border-t hover:bg-slate-50/70">
                <td className="p-4 font-bold">{row.name}</td>
                <td className="p-4">{row.email}</td>
                <td className="p-4">{row.role}</td>
                <td className="p-4">{row.cabinet_name}</td>
                <td className="p-4">{date(row.created_at)}</td>
                <td className="p-4">
                  <StatusBadge
                    status={row.is_active ? "active" : "suspended"}
                  />
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggle(row)}
                    className={`font-bold ${row.is_active ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {row.is_active ? "Désactiver" : "Réactiver"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <EmptySearch />}
      </div>
    </Shell>
  );
}

type GlobalSettings = {
  trial_days: number;
  reminder_days: number[];
  reminder_message: string;
  maintenance_mode: boolean;
  support_email: string | null;
  terms_url: string | null;
  privacy_url: string | null;
};
export function AdminSettingsPage({
  onNavigate,
}: {
  onNavigate: (p: string) => void;
}) {
  const token = useToken();
  const [value, setValue] = useState<GlobalSettings | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    apiGet<GlobalSettings>("/super-admin/settings", token).then(setValue);
  }, [token]);
  async function save() {
    if (!value) return;
    await apiUpdate("/super-admin/settings", token, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }
  if (!value)
    return (
      <Shell onNavigate={onNavigate}>
        <p>Chargement…</p>
      </Shell>
    );
  return (
    <Shell onNavigate={onNavigate}>
      <Header
        eyebrow="Configuration globale"
        title="Paramètres SaaS"
        subtitle="Réglages de la plateforme applicables aux instances, sans contenu médical."
      />
      <section className="mt-7 max-w-4xl rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold">
            Durée d’essai (jours)
            <input
              type="number"
              value={value.trial_days}
              onChange={(e) =>
                setValue({ ...value, trial_days: Number(e.target.value) })
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </label>
          <label className="text-sm font-bold">
            Jours de rappel
            <input
              value={value.reminder_days.join(", ")}
              onChange={(e) =>
                setValue({
                  ...value,
                  reminder_days: e.target.value
                    .split(",")
                    .map(Number)
                    .filter(Boolean),
                })
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </label>
          <label className="text-sm font-bold">
            Email support
            <input
              type="email"
              value={value.support_email ?? ""}
              onChange={(e) =>
                setValue({ ...value, support_email: e.target.value })
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border p-4 text-sm font-bold">
            <span>
              <b>Mode maintenance</b>
              <small className="block font-normal text-slate-500">
                Suspend les accès applicatifs si activé.
              </small>
            </span>
            <input
              type="checkbox"
              checked={value.maintenance_mode}
              onChange={(e) =>
                setValue({ ...value, maintenance_mode: e.target.checked })
              }
              className="h-5 w-5 accent-teal-600"
            />
          </label>
        </div>
        <label className="mt-5 block text-sm font-bold">
          Message de rappel
          <textarea
            value={value.reminder_message}
            onChange={(e) =>
              setValue({ ...value, reminder_message: e.target.value })
            }
            className="mt-2 min-h-28 w-full rounded-xl border p-4"
          />
        </label>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">
            Conditions générales
            <input
              value={value.terms_url ?? ""}
              onChange={(e) =>
                setValue({ ...value, terms_url: e.target.value })
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </label>
          <label className="text-sm font-bold">
            Politique de confidentialité
            <input
              value={value.privacy_url ?? ""}
              onChange={(e) =>
                setValue({ ...value, privacy_url: e.target.value })
              }
              className="mt-2 w-full rounded-xl border px-4 py-3"
            />
          </label>
        </div>
        <button
          onClick={save}
          className="mt-6 rounded-xl bg-teal-600 px-6 py-3 font-bold text-white"
        >
          {saved ? "Paramètres enregistrés" : "Enregistrer les paramètres"}
        </button>
      </section>
    </Shell>
  );
}
function FilterBar({
  search,
  onSearch,
  placeholder,
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">{children}</div>
    </div>
  );
}
function ResultCount({
  shown,
  total,
  onReset,
}: {
  shown: number;
  total: number;
  onReset: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 px-1 text-xs text-slate-500">
      <p>
        <b className="text-slate-800">{shown}</b> résultat
        {shown !== 1 ? "s" : ""} sur {total}
      </p>
      {shown !== total && (
        <button onClick={onReset} className="font-bold text-teal-700">
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}
function EmptySearch() {
  return (
    <div className="p-10 text-center">
      <Search className="mx-auto text-slate-300" size={30} />
      <p className="mt-3 font-bold text-slate-600">Aucun résultat</p>
      <p className="mt-1 text-xs text-slate-400">
        Modifiez votre recherche ou vos filtres.
      </p>
    </div>
  );
}
const Metric = ({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,42,52,.06)] transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg">
    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
      {label}
    </p>
    <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">
      {value}
    </p>
  </div>
);
