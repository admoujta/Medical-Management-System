import { FormEvent, useCallback, useEffect, useState } from "react";
import { MailPlus, Save, UserMinus, UserPlus } from "lucide-react";
import { PaginationControls } from "../../components/PaginationControls";
import {
  apiCreate,
  apiDelete,
  apiGet,
  apiPage,
  apiUpdate,
  initialPagination,
  type PaginationMeta,
} from "../../lib/api";
import { getSession, logout } from "../../lib/auth";
import { confirmAction } from "../../lib/uiFeedback";
import { StaffLayout } from "../staff/StaffLayout";
import { MedecinLayout } from "./MedecinLayout";

type Level = "none" | "read" | "write" | "admin";
type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  account_status: string;
  staff_level: string | null;
};
const modules = [
  ["appointments", "Rendez-vous"],
  ["patients", "Patients"],
  ["visits", "Visites"],
  ["honoraires", "Honoraires"],
  ["payments", "Paiements / RAP"],
  ["prescriptions", "Ordonnances"],
  ["documents", "Documents"],
  ["cnss", "CNSS/CNOPS"],
  ["whatsapp_reminders", "Relances d’impayés"],
] as const;
const defaults: Record<string, Level> = {
  appointments: "write",
  patients: "write",
  visits: "read",
  payments: "write",
  honoraires: "read",
  documents: "read",
  prescriptions: "none",
  cnss: "read",
  whatsapp_reminders: "none",
  manage_staff: "none",
};
const levelLabels: Record<Level, { title: string; detail: string }> = {
  none: { title: "Aucun accès", detail: "Module masqué" },
  read: { title: "Consulter", detail: "Lecture seule" },
  write: {
    title: "Créer et modifier",
    detail: "Lecture + création + modification",
  },
  admin: {
    title: "Accès complet",
    detail: "Lecture + création + modification + suppression",
  },
};
const normalizePermissions = (values: Record<string, Level>) =>
  Object.fromEntries([
    ...modules.map(([key]) => [key, values[key] ?? defaults[key] ?? "none"]),
    ["manage_staff", values.manage_staff ?? "none"],
  ]) as Record<string, Level>;

export function StaffManagementPage({
  onNavigate,
  mode = "doctor",
}: {
  onNavigate: (path: string) => void;
  mode?: "doctor" | "staff";
}) {
  const session = getSession(),
    base = "/users";
  const [users, setUsers] = useState<User[]>([]),
    [selected, setSelected] = useState<User | null>(null),
    [permissions, setPermissions] = useState<Record<string, Level>>({
      ...defaults,
    }),
    [message, setMessage] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    staff_level: "standard" as "standard" | "manager",
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] =
    useState<PaginationMeta>(initialPagination);
  const load = useCallback(async () => {
    if (session?.accessToken) {
      const result = await apiPage<User>(
        `${base}?page=${page}&page_size=10&sort_by=created_at&sort_order=desc`,
        session.accessToken,
      );
      setUsers(result.items);
      setPagination(result.pagination);
    }
  }, [base, page, session?.accessToken]);
  useEffect(() => {
    load().catch((e) =>
      setMessage(e instanceof Error ? e.message : "Chargement impossible."),
    );
  }, [load]);
  async function create(e: FormEvent) {
    e.preventDefault();
    if (!session?.accessToken) return;
    setMessage("Envoi sécurisé de l’invitation en cours…");
    try {
      await apiCreate(base, session.accessToken, {
        ...form,
        role: "SECRETAIRE",
        permissions,
      });
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        staff_level: "standard",
      });
      setPermissions({ ...defaults });
      setMessage(
        `Invitation envoyée avec succès à ${form.email}. Le destinataire doit maintenant choisir son mot de passe.`,
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Invitation impossible.");
    }
  }
  async function choose(user: User) {
    if (!session?.accessToken || user.id === session.userId) return;
    try {
      setSelected(user);
      setMessage("Chargement des autorisations…");
      const data = await apiGet<{ permissions: Record<string, Level> }>(
        `${base}/${user.id}/permissions`,
        session.accessToken,
      );
      setPermissions(
        normalizePermissions({ ...defaults, ...data.permissions }),
      );
      setMessage(`Compte de ${user.first_name} ${user.last_name} sélectionné.`);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Impossible de charger les autorisations de cet utilisateur.",
      );
    }
  }
  async function save() {
    if (!selected) {
      setMessage(
        "Permissions prêtes. Elles seront appliquées lorsque vous enverrez l’invitation.",
      );
      return;
    }
    if (!session?.accessToken) return;
    try {
      await apiUpdate(
        `${base}/${selected.id}/permissions`,
        session.accessToken,
        { permissions: normalizePermissions(permissions) },
      );
      setMessage(
        `Permissions de ${selected.first_name} ${selected.last_name} mises à jour.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Modification impossible.");
    }
  }
  async function disable() {
    if (!selected || !session?.accessToken) return;
    if (
      !(await confirmAction({
        title: "Désactiver ce compte ?",
        message: `Le compte de ${selected.first_name} ${selected.last_name} sera désactivé et ses sessions seront immédiatement fermées.`,
        confirmLabel: "Désactiver",
        tone: "danger",
      }))
    )
      return;
    const name = `${selected.first_name} ${selected.last_name}`;
    try {
      setMessage("Désactivation sécurisée en cours…");
      await apiDelete(`${base}/${selected.id}`, session.accessToken);
      setSelected(null);
      setMessage(`Le compte de ${name} a été désactivé avec succès.`);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Désactivation impossible.");
    }
  }
  async function resend() {
    if (!selected || !session?.accessToken) return;
    try {
      setMessage(`Nouvel envoi vers ${selected.email}…`);
      await apiCreate(
        `${base}/${selected.id}/resend-invitation`,
        session.accessToken,
        {},
      );
      setMessage(
        `Un nouveau lien d’activation a été envoyé avec succès à ${selected.email}.`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Envoi impossible.");
    }
  }
  const messageIsPositive = /succès|sélectionné|mises à jour|permissions prêtes/i.test(message);
  const messageIsProgress = /en cours|chargement des autorisations|nouvel envoi/i.test(message);
  const messageClass = messageIsPositive
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : messageIsProgress
      ? "border-sky-200 bg-sky-50 text-sky-800"
      : "border-red-200 bg-red-50 text-red-700";

  const content = (
    <div className="mx-auto max-w-7xl px-5 py-7 md:px-8">
      <p className="text-sm font-bold uppercase text-atlas-teal">
        Administration cabinet
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold">
        Utilisateurs et permissions
      </h1>
      {message && (
        <p
          role={messageIsPositive || messageIsProgress ? "status" : "alert"}
          aria-live="polite"
          className={`mt-4 rounded-[8px] border p-4 font-semibold ${messageClass}`}
        >
          {message}
        </p>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="space-y-5">
          <form onSubmit={create} className="rounded-[8px] border bg-white p-5">
            <h2 className="font-display text-xl font-bold">
              Inviter un utilisateur
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["first_name", "Prénom", "text"],
                  ["last_name", "Nom", "text"],
                  ["email", "Email", "email"],
                  ["phone", "Téléphone", "tel"],
                ] as const
              ).map(([key, label, type]) => (
                <label key={key}>
                  <span className="text-sm font-bold">{label}</span>
                  <input
                    required={key !== "phone"}
                    type={type}
                    value={form[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                    className="mt-2 w-full rounded-[8px] border px-3 py-2"
                  />
                </label>
              ))}
            </div>
            {mode === "doctor" && (
              <label className="mt-4 block">
                <span className="text-sm font-bold">Niveau hiérarchique</span>
                <select
                  value={form.staff_level}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      staff_level: e.target.value as "standard" | "manager",
                    })
                  }
                  className="mt-2 w-full rounded-[8px] border px-3 py-2"
                >
                  <option value="standard">Secrétaire / assistante</option>
                  <option value="manager">Secrétaire responsable</option>
                </select>
              </label>
            )}
            <p className="mt-4 text-sm text-slate-500">
              Réglez les accès ci-contre avant l’envoi. La sécurité et la
              traçabilité restent exclusivement réservées au médecin
              administrateur.
            </p>
            <button className="mt-4 inline-flex items-center gap-2 rounded-[8px] bg-atlas-teal px-4 py-3 font-bold text-white">
              <UserPlus size={17} />
              Envoyer l’invitation
            </button>
          </form>
          <section className="rounded-[8px] border bg-white p-5">
            <h2 className="font-display text-xl font-bold">Équipe</h2>
            <div className="mt-3 space-y-2">
              {users.length ? (
                users.map((user) => (
                  <button
                    key={user.id}
                    disabled={
                      user.id === session?.userId ||
                      (mode === "staff" && user.staff_level === "manager")
                    }
                    onClick={() => choose(user)}
                    className={`w-full rounded-[8px] border p-3 text-left disabled:opacity-50 ${selected?.id === user.id ? "border-atlas-teal bg-atlas-mist" : ""}`}
                  >
                    <b>
                      {user.first_name} {user.last_name}
                    </b>
                    {user.staff_level === "manager" && (
                      <span className="ml-2 rounded-full bg-atlas-mist px-2 py-1 text-xs text-atlas-teal">
                        Responsable
                      </span>
                    )}
                    <p className="text-sm text-slate-500">
                      {user.email} ·{" "}
                      {user.account_status === "pending_activation"
                        ? "Invitation en attente"
                        : user.is_active
                          ? "Actif"
                          : "Désactivé"}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500">Aucun membre.</p>
              )}
            </div>
          </section>
        </section>
        <section className="h-fit rounded-[8px] border bg-white p-5">
          <h2 className="font-display text-xl font-bold">Droits par module</h2>
          <p className="mt-2 text-sm text-slate-500">
            {selected
              ? `Modification des accès de ${selected.first_name} ${selected.last_name}.`
              : "Définissez ici les accès de la prochaine invitation."}
          </p>
          <div className="mt-5 space-y-3">
            {modules.map(([key, label]) => {
              const level = permissions[key] ?? "none";
              return (
                <label
                  key={key}
                  className="grid items-center gap-3 rounded-[8px] bg-atlas-cloud p-3 sm:grid-cols-[1fr_250px]"
                >
                  <span>
                    <b className="block">{label}</b>
                    <small className="mt-1 block text-slate-500">
                      {levelLabels[level].detail}
                    </small>
                  </span>
                  <select
                    value={level}
                    onChange={(e) =>
                      setPermissions({
                        ...permissions,
                        [key]: e.target.value as Level,
                      })
                    }
                    className="rounded-[8px] border bg-white px-3 py-2"
                  >
                    {(Object.keys(levelLabels) as Level[]).map((value) => (
                      <option key={value} value={value}>
                        {levelLabels[value].title}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              className="inline-flex items-center gap-2 rounded-[8px] bg-atlas-teal px-4 py-3 font-bold text-white"
            >
              <Save size={17} />
              {selected
                ? "Enregistrer les modifications"
                : "Valider pour l’invitation"}
            </button>
            {selected?.account_status === "pending_activation" && (
              <button
                onClick={resend}
                className="inline-flex items-center gap-2 rounded-[8px] border px-4 py-3 font-bold"
              >
                <MailPlus size={17} />
                Renvoyer le lien
              </button>
            )}
            {selected && (
              <button
                onClick={disable}
                className="inline-flex items-center gap-2 rounded-[8px] border border-red-200 px-4 py-3 font-bold text-red-600"
              >
                <UserMinus size={17} />
                Désactiver
              </button>
            )}
          </div>
          {!selected && (
            <p className="mt-3 text-xs text-slate-500">
              Pour désactiver un compte, sélectionnez d’abord un membre dans la
              liste Équipe.
            </p>
          )}
        </section>
      </div>
    </div>
  );
  const pagedContent = (
    <>
      {content}
      <div className="mx-auto max-w-7xl px-5 pb-7 md:px-8">
        <div className="overflow-hidden rounded-[8px] border bg-white">
          <PaginationControls
            pagination={pagination}
            itemLabel="membre"
            onPageChange={setPage}
          />
        </div>
      </div>
    </>
  );
  const leave = () => {
    logout();
    onNavigate("/login");
  };
  return mode === "staff" ? (
    <StaffLayout cabinetName="Équipe" onNavigate={onNavigate} onLogout={leave}>
      {pagedContent}
    </StaffLayout>
  ) : (
    <MedecinLayout
      cabinetName="Équipe"
      onNavigate={onNavigate}
      onLogout={leave}
    >
      {pagedContent}
    </MedecinLayout>
  );
}
