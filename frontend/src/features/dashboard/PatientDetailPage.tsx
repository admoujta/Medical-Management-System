import React, { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  CalendarDays,
  Download,
  Eye,
  EyeOff,
  FileHeart,
  FileText,
  History,
  HeartPulse,
  Mail,
  MapPin,
  MessageCircle,
  Pill,
  Pencil,
  Phone,
  Printer,
  ScanLine,
  Stethoscope,
  Target,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import {
  apiCreate,
  apiDownload,
  apiGet,
  apiList,
  apiPreview,
  apiUpdate,
} from "../../lib/api";
import { getSession, logout } from "../../lib/auth";
import { showToast } from "../../lib/uiFeedback";
import { PatientScannerService } from "../../services/PatientScannerService";
import { MedecinLayout } from "./MedecinLayout";
import {
  AppointmentTimeline,
  type AppointmentHistoryItem,
} from "./AppointmentHistoryPage";

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string;
  gender: string | null;
  address: string | null;
  status: string;
  whatsapp_opt_in: boolean;
};
type MedicalSummary = {
  patient_id: string;
  primary_condition: string | null;
  active_conditions: string[];
  allergies: string[];
  current_treatments: string[];
  next_step: string | null;
  updated_at: string | null;
  updated_by_user_id: string | null;
};
type Appointment = {
  id: string;
  patient_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason: string | null;
};
type Visit = {
  id: string;
  patient_id: string;
  visit_date: string;
  reason: string | null;
  notes: string | null;
  attendance_status: "present" | "absent";
};
type Prescription = {
  id: string;
  patient_id: string;
  content: string;
  prescription_number?: string;
  consultation_date?: string | null;
  doctor_name?: string | null;
  items?: Array<{
    medication_name?: string;
    name?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
  }> | null;
  created_at: string;
};
type DocumentItem = {
  id: string;
  patient_id: string;
  title: string;
  description?: string | null;
  document_type: string;
  source?: "scanner" | "upload_manuel";
  mime_type?: string | null;
  file_size?: number | null;
  shared_with_patient?: boolean;
  confidential?: boolean;
  document_date?: string | null;
  status?: string;
  version?: number;
  archived_at?: string | null;
  created_at: string;
};
type Fee = {
  id: string;
  patient_id: string;
  title?: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
};
type Payment = {
  id: string;
  patient_id: string;
  amount: number;
  method: string;
  paid_at: string;
  status?: string;
  cheque_status?: string | null;
};
type WhatsAppMessage = {
  id: string;
  message_content: string;
  message_type: string;
  direction: string;
  status: string;
  created_by_name: string | null;
  sent_at: string | null;
  created_at: string;
};
type WhatsAppConsent = {
  patient_id: string;
  whatsapp_opt_in: boolean;
  status: "pending" | "accepted" | "refused" | "withdrawn";
  phone_number: string | null;
  opt_in_at: string | null;
  opt_out_at: string | null;
  source: string | null;
  preferred_language: "fr" | "ar";
  note: string | null;
  collected_by_name: string | null;
  created_at: string;
  updated_at: string;
};
type WhatsAppConsentLog = {
  id: string;
  previous_status: string | null;
  new_status: string;
  action: string;
  phone_number: string | null;
  source: string | null;
  performed_by_name: string | null;
  note: string | null;
  created_at: string;
};
type Tab =
  | "summary"
  | "report"
  | "appointments"
  | "visits"
  | "prescriptions"
  | "documents"
  | "finances"
  | "whatsapp"
  | "history";

const tabs: [Tab, string, typeof UserRound][] = [
  ["summary", "Résumé", UserRound],
  ["report", "Rapport patient", FileText],
  ["visits", "Visites", Stethoscope],
  ["prescriptions", "Ordonnances", FileHeart],
  ["documents", "Documents", FileText],
  ["finances", "Finances", WalletCards],
  ["whatsapp", "Conversations WhatsApp", MessageCircle],
  ["history", "Historique", History],
];
const appointmentLabels: Record<string, string> = {
  requested: "Demandé",
  planned: "Planifié",
  confirmed: "Confirmé",
  waiting: "En attente",
  in_progress: "En cours",
  completed: "Terminé",
  absent: "Absent",
  rejected: "Refusé",
  cancelled: "Annulé",
};
const money = (value: number) =>
  new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(
    value,
  );
const date = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(value.includes("T") ? value : `${value}T12:00:00`),
  );

export function PatientDetailPage({
  patientId,
  onNavigate,
}: {
  patientId: string;
  onNavigate: (path: string) => void;
}) {
  const session = getSession();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [whatsapp, setWhatsapp] = useState<WhatsAppMessage[]>([]);
  const [history, setHistory] = useState<AppointmentHistoryItem[]>([]);
  const [medicalSummary, setMedicalSummary] = useState<MedicalSummary | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [error, setError] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  useEffect(() => {
    if (!session?.accessToken) return;
    Promise.all([
      apiGet<Patient>(`/patients/${patientId}`, session.accessToken),
      apiList<Appointment>("/appointments", session.accessToken),
      apiList<Visit>("/visits", session.accessToken),
      apiList<Prescription>("/prescriptions", session.accessToken),
      apiList<DocumentItem>(
        `/doctor/patients/${patientId}/documents`,
        session.accessToken,
      ),
      apiList<Fee>("/honoraires", session.accessToken),
      apiList<Payment>("/payments", session.accessToken),
      apiList<AppointmentHistoryItem>(
        `/patients/${patientId}/appointment-history`,
        session.accessToken,
      ),
      apiList<WhatsAppMessage>(
        `/patients/${patientId}/whatsapp/messages`,
        session.accessToken,
      ),
      apiGet<MedicalSummary>(`/patients/${patientId}/medical-summary`, session.accessToken),
    ])
      .then(([p, a, v, pr, d, f, pay, h, w, summary]) => {
        setPatient(p);
        setAppointments(a.filter((x) => x.patient_id === patientId));
        setVisits(v.filter((x) => x.patient_id === patientId));
        setPrescriptions(pr.filter((x) => x.patient_id === patientId));
        setDocuments(d);
        setFees(f.filter((x) => x.patient_id === patientId));
        setPayments(pay.filter((x) => x.patient_id === patientId));
        setHistory(h);
        setWhatsapp(w);
        setMedicalSummary(summary);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Chargement impossible.",
        ),
      );
  }, [patientId, session?.accessToken]);
  const totals = useMemo(
    () => ({
      fees: fees.reduce((sum, x) => sum + x.amount, 0),
      paid: payments.filter(x=>!["ANNULE","REMBOURSE"].includes(x.status??"PAYE")&&(x.method!=="cheque"||x.cheque_status==="ENCAISSE")).reduce((sum, x) => sum + x.amount, 0),
      remaining: fees.reduce((sum, x) => sum + x.remaining_amount, 0),
    }),
    [fees, payments],
  );
  function out() {
    logout();
    onNavigate("/login");
  }
  return (
    <MedecinLayout
      cabinetName="Fiche patient"
      onNavigate={onNavigate}
      onLogout={out}
    >
      <div className="mx-auto max-w-7xl px-5 py-7 md:px-8">
        <button
          onClick={() => onNavigate("/doctor/patients")}
          className="inline-flex items-center gap-2 text-sm font-bold text-atlas-teal"
        >
          <ArrowLeft size={17} />
          Retour aux patients
        </button>
        {error && (
          <p className="mt-5 rounded-[9px] bg-red-50 p-4 font-bold text-red-700">
            {error}
          </p>
        )}
        {patient && (
          <>
            <section className="mt-5 overflow-hidden rounded-[16px] border border-atlas-line bg-white shadow-sm">
              <div className="bg-gradient-to-r from-atlas-petrol to-atlas-teal p-6 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-white/15 font-display text-xl font-bold ring-1 ring-white/25">
                      {patient.first_name[0]}
                      {patient.last_name[0]}
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-white/65">
                        Dossier patient
                      </p>
                      <h1 className="mt-1 font-display text-3xl font-bold">
                        {patient.first_name} {patient.last_name}
                      </h1>
                      <p className="mt-1 text-sm text-white/75">
                        Né(e) le {date(patient.birth_date)} ·{" "}
                        {patient.gender || "Genre non renseigné"}
                      </p>
                      {medicalSummary?.primary_condition && <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/90"><HeartPulse size={14} />Suivi principal : {medicalSummary.primary_condition}</p>}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase ${patient.status === "active" ? "bg-emerald-400/20 text-emerald-50" : "bg-white/15"}`}
                  >
                    {patient.status}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-3">
                <Info
                  icon={Phone}
                  label="Téléphone"
                  value={patient.phone || "Non renseigné"}
                />
                <Info
                  icon={Mail}
                  label="Email"
                  value={patient.email || "Non renseigné"}
                />
                <Info
                  icon={MapPin}
                  label="Adresse"
                  value={patient.address || "Non renseignée"}
                />
              </div>
            </section>
            <nav className="mt-5 flex gap-2 overflow-x-auto rounded-[12px] border border-atlas-line bg-white p-2 shadow-sm">
              {tabs.map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-[8px] px-4 py-2.5 text-sm font-bold ${tab === key ? "bg-atlas-teal text-white" : "text-slate-500 hover:bg-atlas-mist hover:text-atlas-teal"}`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
            <main className="mt-5">
              {tab === "summary" && (
                <div className="space-y-5">
                  <MedicalSummaryCard patientId={patientId} token={session?.accessToken || ""} summary={medicalSummary} onSaved={setMedicalSummary} />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric label="Rendez-vous" value={appointments.length} />
                    <Metric label="Visites" value={visits.length} />
                    <Metric label="Ordonnances" value={prescriptions.length} />
                    <Metric label="Reste à payer" value={money(totals.remaining)} tone={totals.remaining > 0 ? "due" : "default"} />
                  </div>
                </div>
              )}
              {tab === "report" && (
                <PatientReport
                  patientId={patientId}
                  token={session?.accessToken || ""}
                  patient={patient}
                  prescriptions={prescriptions}
                  fees={fees}
                  payments={payments}
                  totals={totals}
                />
              )}
              {tab === "appointments" && (
                <Panel title="Rendez-vous">
                  {appointments.map((x) => (
                    <Row
                      key={x.id}
                      title={`${date(x.date)} · ${x.start_time.slice(0, 5)}–${x.end_time.slice(0, 5)}`}
                      detail={x.reason || "Consultation générale"}
                      badge={appointmentLabels[x.status] ?? x.status}
                    />
                  ))}
                </Panel>
              )}
              {tab === "visits" && (
                <Panel title="Visites">
                  {visits.map((x) => (
                    <Row
                      key={x.id}
                      title={`${date(x.visit_date)} · ${x.reason || "Consultation générale"}`}
                      detail={x.notes || "Sans notes"}
                      badge={
                        x.attendance_status === "absent" ? "Absent" : "Présent"
                      }
                      danger={x.attendance_status === "absent"}
                    />
                  ))}
                </Panel>
              )}
              {tab === "prescriptions" && (
                <Panel title="Ordonnances">
                  {prescriptions.map((x) => (
                    <Row
                      key={x.id}
                      title={date(x.created_at)}
                      detail={x.content}
                    />
                  ))}
                </Panel>
              )}
              {tab === "documents" && (
                <DocumentsPanel
                  documents={documents}
                  token={session?.accessToken || ""}
                  onScan={() => setScanOpen(true)}
                />
              )}{" "}
              {tab === "finances" && (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Metric
                      label="Total honoraires"
                      value={money(totals.fees)}
                    />
                    <Metric label="Total payé" value={money(totals.paid)} />
                    <Metric
                      label="Reste à payer"
                      value={money(totals.remaining)}
                      tone={totals.remaining > 0 ? "due" : "default"}
                    />
                  </div>
                  <Panel title="Honoraires et paiements">
                    {fees.map((x) => (
                      <Row
                        key={x.id}
                        title={`${x.title || "Honoraire"} · ${money(x.amount)}`}
                        detail={`${money(x.paid_amount)} payé · ${money(x.remaining_amount)} restant`}
                        badge={x.status}
                      />
                    ))}
                  </Panel>
                </div>
              )}
              {tab === "whatsapp" && (
                <WhatsAppPatientTab
                  messages={whatsapp}
                  patient={patient}
                  patientId={patientId}
                  token={session?.accessToken || ""}
                  onNavigate={onNavigate}
                />
              )}{" "}
              {tab === "history" && (
                <section className="rounded-[14px] border border-atlas-line bg-slate-50 p-5 shadow-sm">
                  <AppointmentTimeline items={history} />
                </section>
              )}
            </main>
            {scanOpen && (
              <ScanDocumentModal
                patient={patient}
                patientId={patientId}
                token={session?.accessToken || ""}
                onClose={() => setScanOpen(false)}
                onSaved={(item) => {
                  setDocuments((current) => [item, ...current]);
                  setScanOpen(false);
                }}
              />
            )}
          </>
        )}
      </div>
    </MedecinLayout>
  );
}

function MedicalSummaryCard({ patientId, token, summary, onSaved }: { patientId: string; token: string; summary: MedicalSummary | null; onSaved: (summary: MedicalSummary) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ primary_condition: "", active_conditions: "", allergies: "", current_treatments: "", next_step: "" });
  const hasSummary = Boolean(summary && (summary.primary_condition || summary.active_conditions.length || summary.allergies.length || summary.current_treatments.length || summary.next_step));

  useEffect(() => {
    setForm({
      primary_condition: summary?.primary_condition ?? "",
      active_conditions: summary?.active_conditions.join("\n") ?? "",
      allergies: summary?.allergies.join("\n") ?? "",
      current_treatments: summary?.current_treatments.join("\n") ?? "",
      next_step: summary?.next_step ?? "",
    });
  }, [summary]);

  const toLines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const updated = await apiUpdate<MedicalSummary>(`/patients/${patientId}/medical-summary`, token, {
        primary_condition: form.primary_condition.trim() || null,
        active_conditions: toLines(form.active_conditions),
        allergies: toLines(form.allergies),
        current_treatments: toLines(form.current_treatments),
        next_step: form.next_step.trim() || null,
      });
      onSaved(updated);
      setEditing(false);
      showToast("Synthèse médicale mise à jour.", "success");
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Enregistrement impossible.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (editing) return <form onSubmit={save} className="overflow-hidden rounded-[14px] border border-atlas-teal/25 bg-white shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-atlas-line bg-atlas-mist/50 px-5 py-4">
      <div><p className="text-xs font-black uppercase tracking-wider text-atlas-teal">Synthèse médicale</p><h2 className="mt-1 font-display text-xl font-bold">Informations essentielles au suivi</h2><p className="mt-1 text-xs text-slate-500">Une information par ligne pour les listes. Ne renseignez que des données médicalement confirmées.</p></div>
      <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-atlas-line bg-white px-3 py-2 text-sm font-bold text-slate-600">Annuler</button>
    </div>
    <div className="grid gap-4 p-5 lg:grid-cols-2">
      <label className="lg:col-span-2"><span className="text-sm font-bold text-atlas-petrol">Motif principal de suivi</span><input name="primary_condition" maxLength={240} value={form.primary_condition} onChange={(event) => setForm({ ...form, primary_condition: event.target.value })} placeholder="Ex. Diabète de type 2" className="mt-2 w-full rounded-lg border border-atlas-line px-4 py-3 outline-none transition focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10" /></label>
      <label><span className="text-sm font-bold text-atlas-petrol">Problèmes actifs</span><textarea name="active_conditions" rows={4} value={form.active_conditions} onChange={(event) => setForm({ ...form, active_conditions: event.target.value })} placeholder={'Hypertension\nHypercholestérolémie'} className="mt-2 w-full resize-none rounded-lg border border-atlas-line px-4 py-3 outline-none transition focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10" /></label>
      <label><span className="flex items-center gap-2 text-sm font-bold text-red-700"><AlertTriangle size={16} />Allergies et contre-indications</span><textarea name="allergies" rows={4} value={form.allergies} onChange={(event) => setForm({ ...form, allergies: event.target.value })} placeholder={'Pénicilline\nAINS'} className="mt-2 w-full resize-none rounded-lg border border-red-200 bg-red-50/30 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100" /></label>
      <label><span className="text-sm font-bold text-atlas-petrol">Traitements en cours</span><textarea name="current_treatments" rows={4} value={form.current_treatments} onChange={(event) => setForm({ ...form, current_treatments: event.target.value })} placeholder={'Metformine 850 mg — 2 fois/jour\nAmlodipine 5 mg — matin'} className="mt-2 w-full resize-none rounded-lg border border-atlas-line px-4 py-3 outline-none transition focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10" /></label>
      <label><span className="text-sm font-bold text-atlas-petrol">Prochaine étape du suivi</span><textarea name="next_step" maxLength={1000} rows={4} value={form.next_step} onChange={(event) => setForm({ ...form, next_step: event.target.value })} placeholder="Ex. Contrôle HbA1c avant la prochaine consultation" className="mt-2 w-full resize-none rounded-lg border border-atlas-line px-4 py-3 outline-none transition focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10" /></label>
    </div>
    <div className="flex justify-end border-t border-atlas-line bg-slate-50 px-5 py-4"><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-atlas-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-atlas-petrol disabled:opacity-50"><HeartPulse size={17} />{saving ? "Enregistrement…" : "Enregistrer la synthèse"}</button></div>
  </form>;

  return <section className="overflow-hidden rounded-[14px] border border-atlas-line bg-white shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-atlas-line px-5 py-4">
      <div><p className="text-xs font-black uppercase tracking-wider text-atlas-teal">Vue clinique rapide</p><h2 className="mt-1 font-display text-xl font-bold">Synthèse médicale</h2>{summary?.updated_at && <p className="mt-1 text-xs text-slate-400">Mise à jour le {date(summary.updated_at)}</p>}</div>
      <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-lg border border-atlas-teal/30 bg-atlas-mist px-4 py-2.5 text-sm font-bold text-atlas-teal transition hover:border-atlas-teal"><Pencil size={16} />{hasSummary ? "Modifier" : "Renseigner"}</button>
    </div>
    {!hasSummary ? <div className="px-5 py-9 text-center"><HeartPulse className="mx-auto text-slate-300" size={34} /><p className="mt-3 font-bold text-slate-600">Aucune synthèse médicale renseignée</p><p className="mt-1 text-sm text-slate-500">Ajoutez les éléments essentiels pour préparer rapidement la prochaine consultation.</p></div> : <div className="grid gap-4 p-5 lg:grid-cols-2 xl:grid-cols-3">
      <ClinicalBlock icon={<HeartPulse size={18} />} label="Suivi principal" value={summary?.primary_condition} tone="primary" />
      <ClinicalList icon={<Stethoscope size={18} />} label="Problèmes actifs" items={summary?.active_conditions ?? []} />
      <ClinicalList icon={<AlertTriangle size={18} />} label="Allergies / alertes" items={summary?.allergies ?? []} tone="danger" />
      <ClinicalList icon={<Pill size={18} />} label="Traitements en cours" items={summary?.current_treatments ?? []} />
      <div className="lg:col-span-2 xl:col-span-2"><ClinicalBlock icon={<Target size={18} />} label="Prochaine étape" value={summary?.next_step} tone="next" /></div>
    </div>}
  </section>;
}

function ClinicalBlock({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value?: string | null; tone?: "default" | "primary" | "next" }) {
  const style = tone === "primary" ? "border-atlas-teal/25 bg-atlas-mist/50 text-atlas-petrol" : tone === "next" ? "border-blue-200 bg-blue-50 text-blue-900" : "border-atlas-line bg-slate-50 text-slate-700";
  return <div className={`h-full rounded-xl border p-4 ${style}`}><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide opacity-70">{icon}{label}</p><p className="mt-3 text-sm font-bold leading-6">{value || "Non renseigné"}</p></div>;
}

function ClinicalList({ icon, label, items, tone = "default" }: { icon: React.ReactNode; label: string; items: string[]; tone?: "default" | "danger" }) {
  const danger = tone === "danger";
  return <div className={`h-full rounded-xl border p-4 ${danger ? "border-red-200 bg-red-50 text-red-900" : "border-atlas-line bg-slate-50 text-slate-700"}`}><p className={`flex items-center gap-2 text-xs font-black uppercase tracking-wide ${danger ? "text-red-700" : "text-slate-500"}`}>{icon}{label}</p>{items.length ? <ul className="mt-3 space-y-2">{items.map((item) => <li key={item} className="flex items-start gap-2 text-sm font-semibold leading-5"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${danger ? "bg-red-500" : "bg-atlas-teal"}`} />{item}</li>)}</ul> : <p className="mt-3 text-sm font-semibold opacity-60">Non renseigné</p>}</div>;
}

function PatientReport({
  patientId,
  token,
  patient,
  prescriptions,
  fees,
  payments,
  totals,
}: {
  patientId: string;
  token: string;
  patient: Patient;
  prescriptions: Prescription[];
  fees: Fee[];
  payments: Payment[];
  totals: { fees: number; paid: number; remaining: number };
}) {
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);
  const [exportError, setExportError] = useState("");
  const validPayments = payments.filter(
    (item) =>
      !["ANNULE", "REMBOURSE"].includes(item.status ?? "PAYE") &&
      (item.method !== "cheque" || item.cheque_status === "ENCAISSE"),
  );
  async function exportReport(format: "pdf" | "xlsx") {
    setExporting(format);
    setExportError("");
    try {
      await apiDownload(
        `/patients/${patientId}/report/${format}`,
        token,
        `rapport-${patient.first_name}-${patient.last_name}.${format}`,
      );
    } catch (reason) {
      setExportError(reason instanceof Error ? reason.message : "Export impossible.");
    } finally {
      setExporting(null);
    }
  }
  return (
    <section id="patient-report" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-atlas-line bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-atlas-teal">Rapport consolidé</p>
          <h2 className="mt-1 font-display text-2xl font-bold">{patient.first_name} {patient.last_name}</h2>
          <p className="mt-1 text-sm text-slate-500">Situation financière, honoraires, ordonnances et médicaments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={exporting !== null} onClick={() => void exportReport("pdf")} className="inline-flex items-center gap-2 rounded-[9px] bg-atlas-teal px-4 py-3 font-bold text-white disabled:opacity-50">
            <Download size={18}/>{exporting === "pdf" ? "Génération…" : "Télécharger PDF"}
          </button>
          <button type="button" disabled={exporting !== null} onClick={() => void exportReport("xlsx")} className="inline-flex items-center gap-2 rounded-[9px] border border-atlas-teal bg-white px-4 py-3 font-bold text-atlas-teal disabled:opacity-50">
            <Download size={18}/>{exporting === "xlsx" ? "Génération…" : "Télécharger Excel"}
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-[9px] border border-atlas-line bg-white px-4 py-3 font-bold text-slate-600">
            <Printer size={18}/>Imprimer
          </button>
        </div>
      </div>
      {exportError && <p className="rounded-[9px] bg-red-50 p-4 text-sm font-bold text-red-700">{exportError}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total honoraires" value={money(totals.fees)}/>
        <Metric label="Total encaissé" value={money(totals.paid)}/>
        <Metric label="Reste à payer" value={money(totals.remaining)} tone={totals.remaining > 0 ? "due" : "default"}/>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Honoraires">
          {fees.map((item) => <Row key={item.id} title={`${item.title || "Honoraire"} · ${money(item.amount)}`} detail={`${money(item.paid_amount)} payé · ${money(item.remaining_amount)} restant`} badge={item.status}/>) }
        </Panel>
        <Panel title="Paiements encaissés">
          {validPayments.map((item) => <Row key={item.id} title={`${date(item.paid_at)} · ${money(item.amount)}`} detail={`Mode de paiement : ${item.method}`} badge={item.status ?? "PAYÉ"}/>) }
        </Panel>
      </div>
      <Panel title="Ordonnances et médicaments">
        {prescriptions.map((prescription) => (
          <article key={prescription.id} className="rounded-[10px] border border-atlas-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><b>{prescription.prescription_number || "Ordonnance"}</b><p className="mt-1 text-xs text-slate-500">{date(prescription.consultation_date || prescription.created_at)}{prescription.doctor_name ? ` · ${prescription.doctor_name}` : ""}</p></div>
              <span className="rounded-full bg-atlas-mist px-3 py-1 text-xs font-bold text-atlas-teal">{prescription.items?.length ?? 0} médicament(s)</span>
            </div>
            {prescription.items?.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{prescription.items.map((medicine, index) => <div key={`${prescription.id}-${index}`} className="rounded-[9px] bg-slate-50 p-4"><p className="flex items-center gap-2 font-bold text-atlas-petrol"><Pill size={16} className="text-atlas-teal"/>{medicine.medication_name || medicine.name || `Médicament ${index + 1}`}</p><p className="mt-2 text-sm text-slate-600">{[medicine.dosage, medicine.frequency, medicine.duration].filter(Boolean).join(" · ") || "Posologie non précisée"}</p>{medicine.instructions && <p className="mt-1 text-xs text-slate-500">{medicine.instructions}</p>}</div>)}</div> : <p className="mt-3 whitespace-pre-wrap rounded-[9px] bg-slate-50 p-3 text-sm text-slate-600">{prescription.content}</p>}
          </article>
        ))}
      </Panel>
    </section>
  );
}

function WhatsAppPatientTab({
  messages,
  patient,
  patientId,
  token,
  onNavigate,
}: {
  messages: WhatsAppMessage[];
  patient: Patient;
  patientId: string;
  token: string;
  onNavigate: (path: string) => void;
}) {
  const [consent, setConsent] = useState<WhatsAppConsent | null>(null);
  const [logs, setLogs] = useState<WhatsAppConsentLog[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [phone, setPhone] = useState(patient.phone ?? "");
  const [language, setLanguage] = useState<"fr" | "ar">("fr");
  const [source, setSource] = useState("cabinet_reception");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    const [c, h] = await Promise.all([
      apiGet<WhatsAppConsent>(`/patients/${patientId}/whatsapp-consent`, token),
      apiList<WhatsAppConsentLog>(
        `/patients/${patientId}/whatsapp-consent/history`,
        token,
      ),
    ]);
    setConsent(c);
    setLogs(h);
    setPhone(c.phone_number ?? patient.phone ?? "");
    setLanguage(c.preferred_language);
  }
  useEffect(() => {
    void load();
  }, [patientId, token]);
  async function act(kind: "grant" | "refuse" | "withdraw" | "preferences") {
    setSaving(true);
    setMessage("");
    try {
      if (kind === "grant")
        await apiCreate(
          `/patients/${patientId}/whatsapp-consent/grant`,
          token,
          {
            phone_number: phone,
            accepted: true,
            preferred_language: language,
            source,
            note: note || null,
            decision_confirmed: accepted,
          },
        );
      if (kind === "refuse")
        await apiCreate(
          `/patients/${patientId}/whatsapp-consent/refuse`,
          token,
          { source, note: note || null, decision_confirmed: accepted },
        );
      if (kind === "withdraw")
        await apiCreate(
          `/patients/${patientId}/whatsapp-consent/withdraw`,
          token,
          {
            reason: note || "Retrait demandé par le patient.",
            decision_confirmed: true,
          },
        );
      if (kind === "preferences")
        await apiUpdate(
          `/patients/${patientId}/whatsapp-consent/preferences`,
          token,
          {
            phone_number: phone,
            preferred_language: language,
            note: note || null,
          },
        );
      setAccepted(false);
      setMessage(
        kind === "grant"
          ? "Consentement enregistré."
          : kind === "refuse"
            ? "Refus enregistré."
            : kind === "withdraw"
              ? "Retrait enregistré."
              : "Préférences mises à jour.",
      );
      await load();
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Modification impossible.",
      );
    } finally {
      setSaving(false);
    }
  }
  const statusLabel = {
    pending: "En attente",
    accepted: "Autorisé",
    refused: "Refusé",
    withdrawn: "Retiré",
  }[consent?.status ?? "pending"];
  const statusTone =
    consent?.status === "accepted"
      ? "bg-emerald-100 text-emerald-800"
      : consent?.status === "withdrawn"
        ? "bg-red-100 text-red-700"
        : consent?.status === "refused"
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-100 text-slate-600";
  return (
    <div className="space-y-5">
      <section className="rounded-[14px] border border-atlas-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Consentement WhatsApp
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">
              Préférences de communication
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Aucun message WhatsApp n’est envoyé sans accord explicite.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone}`}
          >
            {statusLabel}
          </span>
        </div>
        {consent && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info
              icon={Phone}
              label="Numéro WhatsApp"
              value={consent.phone_number || "Non renseigné"}
            />
            <Info
              icon={MessageCircle}
              label="Langue"
              value={consent.preferred_language === "ar" ? "Arabe" : "Français"}
            />
            <Info
              icon={CalendarDays}
              label="Accord donné"
              value={consent.opt_in_at ? date(consent.opt_in_at) : "Non donné"}
            />
            <Info
              icon={UserRound}
              label="Enregistré par"
              value={consent.collected_by_name || "Non renseigné"}
            />
          </div>
        )}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">
            Numéro WhatsApp
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+212 6…"
              className="mt-2 w-full rounded-lg border border-atlas-line px-4 py-3 font-normal"
            />
          </label>
          <label className="text-sm font-bold">
            Langue préférée
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "fr" | "ar")}
              className="mt-2 w-full rounded-lg border border-atlas-line bg-white px-4 py-3 font-normal"
            >
              <option value="fr">Français</option>
              <option value="ar">Arabe</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Source
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-2 w-full rounded-lg border border-atlas-line bg-white px-4 py-3 font-normal"
            >
              <option value="accueil_cabinet">Accueil du cabinet</option>
              <option value="formulaire_patient">Formulaire patient</option>
              <option value="inscription_web">Inscription web</option>
              <option value="confirmation_whatsapp">
                Confirmation WhatsApp
              </option>
              <option value="import">Import</option>
              <option value="autre">Autre</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Commentaire
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-atlas-line px-4 py-3 font-normal"
            />
          </label>
        </div>
        {consent?.status !== "accepted" && (
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 accent-emerald-600"
            />
            <span>
              Le patient accepte de recevoir des messages WhatsApp du cabinet
              concernant ses rendez-vous, paiements, dossiers administratifs et
              échanges avec le cabinet.
            </span>
          </label>
        )}
        {message && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700">
            {message}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {consent?.status !== "accepted" && (
            <button
              disabled={saving || !accepted || !phone}
              onClick={() => void act("grant")}
              className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              Enregistrer le consentement
            </button>
          )}
          {consent?.status === "accepted" && (
            <>
              <button
                disabled={saving}
                onClick={() => void act("preferences")}
                className="rounded-lg bg-atlas-teal px-4 py-3 text-sm font-bold text-white"
              >
                Modifier les préférences
              </button>
              <button
                disabled={saving}
                onClick={() => void act("withdraw")}
                className="rounded-lg border border-red-200 px-4 py-3 text-sm font-bold text-red-700"
              >
                Retirer le consentement
              </button>
            </>
          )}{" "}
          {consent?.status !== "accepted" && consent?.status !== "refused" && (
            <button
              disabled={saving}
              onClick={() => void act("refuse")}
              className="rounded-lg border border-amber-200 px-4 py-3 text-sm font-bold text-amber-800"
            >
              Refuser
            </button>
          )}
        </div>
      </section>
      <section className="rounded-[14px] border border-atlas-line bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-bold">
          Historique du consentement
        </h2>
        <div className="mt-4 space-y-2">
          {logs.map((item) => (
            <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <b>{item.action.replaceAll("_", " ")}</b>
                <span className="text-xs text-slate-400">
                  {date(item.created_at)}
                </span>
              </div>
              <p className="mt-1 text-slate-500">
                {item.previous_status || "Aucun"} → {item.new_status}
                {item.performed_by_name ? ` · ${item.performed_by_name}` : ""}
              </p>
              {item.note && <p className="mt-1 text-slate-600">{item.note}</p>}
            </div>
          ))}
          {!logs.length && (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              Aucune modification enregistrée.
            </p>
          )}
        </div>
      </section>
      <WhatsAppHistory
        messages={messages}
        patientId={patientId}
        token={token}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function WhatsAppHistory({
  messages,
  patientId,
  token,
  onNavigate,
}: {
  messages: WhatsAppMessage[];
  patientId: string;
  token: string;
  onNavigate: (path: string) => void;
}) {
  async function open() {
    await apiCreate(`/whatsapp/conversations/patient/${patientId}`, token, {});
    onNavigate("/doctor/whatsapp/conversations");
  }
  return (
    <section className="rounded-[14px] border border-atlas-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <MessageCircle size={20} />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold">
              Conversation WhatsApp
            </h2>
            <p className="text-sm text-slate-500">
              Messages envoyés, réponses reçues et statuts Meta.
            </p>
          </div>
        </div>
        <button
          onClick={() => void open()}
          className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white"
        >
          Ouvrir la messagerie
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {messages.map((item) => (
          <article
            key={item.id}
            className={`max-w-[85%] rounded-xl p-4 ${item.direction === "entrant" ? "bg-slate-100" : "ml-auto bg-emerald-50"}`}
          >
            <div className="flex flex-wrap justify-between gap-3">
              <b className="text-sm">
                {item.direction === "entrant"
                  ? "Patient"
                  : "Cabinet · " + (item.created_by_name ?? "Utilisateur")}
              </b>
              <span className="text-xs font-bold uppercase text-emerald-700">
                {item.status}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {item.message_content}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(item.sent_at ?? item.created_at))}{" "}
              · {item.message_type.replaceAll("_", " ")}
            </p>
          </article>
        ))}
        {!messages.length && (
          <p className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
            Aucun échange WhatsApp enregistré pour ce patient.
          </p>
        )}
      </div>
    </section>
  );
}

function DocumentsPanel({
  documents,
  token,
  onScan,
}: {
  documents: DocumentItem[];
  token: string;
  onScan: () => void;
}) {
  const [rows, setRows] = useState(documents);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("TOUS");
  const [sort, setSort] = useState("recent");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    id: string;
    text: string;
    error: boolean;
  } | null>(null);
  useEffect(() => setRows(documents), [documents]);
  const visible = useMemo(
    () =>
      rows
        .filter(
          (item) =>
            (type === "TOUS" || item.document_type === type) &&
            `${item.title} ${item.description || ""}`
              .toLocaleLowerCase("fr")
              .includes(query.toLocaleLowerCase("fr")),
        )
        .sort((a, b) =>
          sort === "ancien"
            ? +new Date(a.created_at) - +new Date(b.created_at)
            : sort === "titre"
              ? a.title.localeCompare(b.title)
              : +new Date(b.created_at) - +new Date(a.created_at),
        ),
    [rows, query, type, sort],
  );
  async function preview(item: DocumentItem) {
    try {
      const result = await apiPreview(
        `/doctor/documents/${item.id}/preview`,
        token,
      );
      window.open(result.url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(result.url), 60_000);
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Aperçu impossible.",
        "error",
      );
    }
  }
  async function download(item: DocumentItem) {
    try {
      await apiDownload(
        `/doctor/documents/${item.id}/download`,
        token,
        item.title,
      );
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Téléchargement impossible.",
        "error",
      );
    }
  }
  async function changeVisibility(item: DocumentItem) {
    setSavingId(item.id);
    setMessage(null);
    try {
      const updated = await apiUpdate<DocumentItem>(
        `/doctor/documents/${item.id}`,
        token,
        { shared_with_patient: !item.shared_with_patient },
      );
      setRows((current) =>
        current.map((row) => (row.id === updated.id ? updated : row)),
      );
      setMessage({
        id: item.id,
        text: updated.shared_with_patient
          ? "Le document est maintenant visible dans l’espace patient."
          : "Le document a été retiré de l’espace patient.",
        error: false,
      });
    } catch (reason) {
      setMessage({
        id: item.id,
        text:
          reason instanceof Error
            ? reason.message
            : "Modification de la visibilité impossible.",
        error: true,
      });
    } finally {
      setSavingId(null);
    }
  }
  return (
    <section className="rounded-[14px] border border-atlas-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">
            Documents du patient
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Documents médicaux et administratifs classés et sécurisés.
          </p>
        </div>
        <button
          onClick={onScan}
          className="inline-flex items-center gap-2 rounded-[9px] bg-atlas-teal px-4 py-3 text-sm font-bold text-white"
        >
          <ScanLine size={18} />
          Importer ou scanner
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un titre…"
          className="rounded-[8px] border border-atlas-line px-4 py-3 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-[8px] border border-atlas-line bg-white px-4 py-3 text-sm"
        >
          <option value="TOUS">Toutes les catégories</option>
          {[...new Set(rows.map((x) => x.document_type))].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-[8px] border border-atlas-line bg-white px-4 py-3 text-sm"
        >
          <option value="recent">Plus récents</option>
          <option value="ancien">Plus anciens</option>
          <option value="titre">Par titre</option>
        </select>
      </div>
      <div className="mt-4 space-y-3">
        {visible.length ? (
          visible.map((item) => (
            <article
              key={item.id}
              className="rounded-[10px] border border-atlas-line p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{item.title}</b>
                    {item.version && item.version > 1 && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                        VERSION {item.version}
                      </span>
                    )}
                    {item.source === "scanner" && (
                      <span className="rounded-full bg-atlas-mist px-2.5 py-1 text-[11px] font-bold text-atlas-teal">
                        SCANNÉ
                      </span>
                    )}
                    {item.confidential && (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                        CONFIDENTIEL
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.shared_with_patient ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                    >
                      {item.shared_with_patient
                        ? "VISIBLE PATIENT"
                        : "NON VISIBLE PATIENT"}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-slate-600">
                      {item.description}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-500">
                    {item.document_type}
                    {item.document_date
                      ? ` · document du ${date(item.document_date)}`
                      : ""}{" "}
                    · importé le {date(item.created_at)}
                    {item.file_size
                      ? ` · ${(item.file_size / 1024).toFixed(0)} Ko`
                      : ""}
                  </p>
                  {message?.id === item.id && (
                    <p
                      className={`mt-2 text-xs font-bold ${message.error ? "text-red-700" : "text-emerald-700"}`}
                    >
                      {message.text}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={savingId === item.id}
                    onClick={() => void changeVisibility(item)}
                    className={`inline-flex items-center gap-2 rounded-[8px] border px-3 py-2.5 text-xs font-bold disabled:opacity-50 ${item.shared_with_patient ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
                  >
                    {item.shared_with_patient ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}{" "}
                    {savingId === item.id
                      ? "Modification…"
                      : item.shared_with_patient
                        ? "Masquer au patient"
                        : "Partager au patient"}
                  </button>
                  <button
                    onClick={() => void preview(item)}
                    className="rounded-[8px] border border-atlas-line p-2.5 text-atlas-teal"
                    title="Aperçu"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => void download(item)}
                    className="rounded-[8px] border border-atlas-line p-2.5 text-atlas-teal"
                    title="Télécharger"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-[9px] bg-slate-50 p-8 text-center text-sm text-slate-500">
            Aucun document trouvé.
          </p>
        )}
      </div>
    </section>
  );
}

function DocumentsPanelLegacy({
  documents,
  token,
  onScan,
}: {
  documents: DocumentItem[];
  token: string;
  onScan: () => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("TOUS");
  const [sort, setSort] = useState("recent");
  const visible = useMemo(
    () =>
      documents
        .filter(
          (item) =>
            (type === "TOUS" || item.document_type === type) &&
            `${item.title} ${item.description || ""}`
              .toLocaleLowerCase("fr")
              .includes(query.toLocaleLowerCase("fr")),
        )
        .sort((a, b) =>
          sort === "ancien"
            ? +new Date(a.created_at) - +new Date(b.created_at)
            : sort === "titre"
              ? a.title.localeCompare(b.title)
              : +new Date(b.created_at) - +new Date(a.created_at),
        ),
    [documents, query, type, sort],
  );
  async function preview(item: DocumentItem) {
    try {
      const result = await apiPreview(
        `/doctor/documents/${item.id}/preview`,
        token,
      );
      window.open(result.url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(result.url), 60_000);
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Aperçu impossible.",
        "error",
      );
    }
  }
  async function download(item: DocumentItem) {
    try {
      await apiDownload(
        `/doctor/documents/${item.id}/download`,
        token,
        item.title,
      );
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Téléchargement impossible.",
        "error",
      );
    }
  }
  return (
    <section className="rounded-[14px] border border-atlas-line bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">
            Documents du patient
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Documents médicaux et administratifs classés et sécurisés.
          </p>
        </div>
        <button
          onClick={onScan}
          className="inline-flex items-center gap-2 rounded-[9px] bg-atlas-teal px-4 py-3 text-sm font-bold text-white"
        >
          <ScanLine size={18} />
          Importer ou scanner
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un titre…"
          className="rounded-[8px] border border-atlas-line px-4 py-3 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-[8px] border border-atlas-line bg-white px-4 py-3 text-sm"
        >
          <option value="TOUS">Toutes les catégories</option>
          {[...new Set(documents.map((x) => x.document_type))].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-[8px] border border-atlas-line bg-white px-4 py-3 text-sm"
        >
          <option value="recent">Plus récents</option>
          <option value="ancien">Plus anciens</option>
          <option value="titre">Par titre</option>
        </select>
      </div>
      <div className="mt-4 space-y-3">
        {visible.length ? (
          visible.map((item) => (
            <article
              key={item.id}
              className="rounded-[10px] border border-atlas-line p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{item.title}</b>
                    {item.version && item.version > 1 && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                        VERSION {item.version}
                      </span>
                    )}
                    {item.source === "scanner" && (
                      <span className="rounded-full bg-atlas-mist px-2.5 py-1 text-[11px] font-bold text-atlas-teal">
                        SCANNÉ
                      </span>
                    )}
                    {item.confidential && (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700">
                        CONFIDENTIEL
                      </span>
                    )}
                    {item.shared_with_patient && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        VISIBLE PATIENT
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-slate-600">
                      {item.description}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-500">
                    {item.document_type}
                    {item.document_date
                      ? ` · document du ${date(item.document_date)}`
                      : ""}{" "}
                    · importé le {date(item.created_at)}
                    {item.file_size
                      ? ` · ${(item.file_size / 1024).toFixed(0)} Ko`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => preview(item)}
                    className="rounded-[8px] border border-atlas-line p-2.5 text-atlas-teal"
                    title="Aperçu"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => download(item)}
                    className="rounded-[8px] border border-atlas-line p-2.5 text-atlas-teal"
                    title="Télécharger"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-[9px] bg-slate-50 p-8 text-center text-sm text-slate-500">
            Aucun document trouvé.
          </p>
        )}
      </div>
    </section>
  );
}

function ScanDocumentModal({
  patient,
  patientId,
  token,
  onClose,
  onSaved,
}: {
  patient: Patient;
  patientId: string;
  token: string;
  onClose: () => void;
  onSaved: (item: DocumentItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Analyse");
  const [description, setDescription] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [confidential, setConfidential] = useState(false);
  const [shared, setShared] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : ""),
    [file],
  );
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );
  function selectDocumentType(value: string) {
    setType(value);
    if (!["CIN", "CNOPS", "CNSS/CNOPS"].includes(value)) return;
    setConfidential(true);
    if (!title.trim()) {
      setTitle(
        value === "CIN"
          ? "Carte d’identité nationale"
          : value === "CNOPS"
            ? "Pièce CNOPS"
            : "Pièce CNSS/CNOPS",
      );
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setMessage("Sélectionnez le fichier produit par le scanner.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const item = await PatientScannerService.uploadScannedDocument(
        patientId,
        file,
        {
          title: title.trim(),
          documentType: type,
          sharedWithPatient: shared,
          description,
          documentDate,
          confidential,
        },
        token,
      );
      onSaved(item);
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[16px] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-atlas-teal">
              Dossier patient · Documents
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold">
              Importer ou scanner un document
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mt-5 rounded-[10px] border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase text-emerald-700">
            Patient automatiquement rattaché
          </p>
          <p className="mt-1 font-bold text-atlas-petrol">
            {patient.first_name} {patient.last_name}
          </p>
          <p className="text-xs text-slate-500">
            Le patient ne peut pas être modifié pendant cet import.
          </p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">
            Nom du document *
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Résultats biologiques"
              className="mt-2 w-full rounded-[9px] border border-atlas-line px-4 py-3 font-normal outline-none focus:border-atlas-teal"
            />
          </label>
          <label className="text-sm font-bold">
            Catégorie *
            <select
              value={type}
              onChange={(e) => selectDocumentType(e.target.value)}
              className="mt-2 w-full rounded-[9px] border border-atlas-line bg-white px-4 py-3 font-normal"
            >
              {[
                "Analyse",
                "Radio",
                "Ordonnance",
                "Compte rendu",
                "Courrier",
                "Certificat",
                "CIN",
                "CNOPS",
                "CNSS/CNOPS",
                "Assurance",
                "Consentement",
                "Facture",
                "Reçu",
                "Autre",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Date réelle du document
            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              className="mt-2 w-full rounded-[9px] border border-atlas-line px-4 py-3 font-normal"
            />
          </label>
          <label className="text-sm font-bold">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-2 w-full rounded-[9px] border border-atlas-line px-4 py-3 font-normal"
            />
          </label>
        </div>
        <label className="mt-4 block rounded-[10px] border-2 border-dashed border-atlas-line bg-slate-50 p-6 text-center">
          <ScanLine className="mx-auto text-atlas-teal" size={30} />
          <b className="mt-2 block">Importer le fichier depuis le scanner</b>
          <span className="mt-1 block text-xs text-slate-500">
            PDF, JPG, PNG, TIFF, DOC ou DOCX · 10 Mo maximum
          </span>
          <input
            required
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mx-auto mt-4 block max-w-full text-sm"
          />
        </label>
        {file && (
          <div className="mt-4 rounded-[10px] border border-atlas-line p-3">
            <p className="mb-2 text-sm font-bold">Aperçu · {file.name}</p>
            {file.type.startsWith("image/") ? (
              <img
                src={previewUrl}
                alt="Aperçu du document"
                className="max-h-64 w-full object-contain"
              />
            ) : file.type === "application/pdf" ? (
              <iframe
                src={previewUrl}
                title="Aperçu PDF"
                className="h-64 w-full rounded border"
              />
            ) : (
              <p className="text-sm text-slate-500">
                Le fichier est prêt à être enregistré.
              </p>
            )}
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-[9px] bg-slate-50 p-4 text-sm">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
              className="mt-1 h-4 w-4 accent-atlas-teal"
            />
            <span>
              <b>Visible dans l’espace patient</b>
              <span className="block text-xs text-slate-500">
                Autoriser le patient à le consulter.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-[9px] bg-red-50 p-4 text-sm">
            <input
              type="checkbox"
              checked={confidential}
              onChange={(e) => setConfidential(e.target.checked)}
              className="mt-1 h-4 w-4 accent-red-600"
            />
            <span>
              <b>Document confidentiel</b>
              <span className="block text-xs text-slate-500">
                Accès limité aux utilisateurs autorisés.
              </span>
            </span>
          </label>
        </div>
        {message && (
          <p className="mt-4 rounded-[8px] bg-red-50 p-3 text-sm font-bold text-red-700">
            {message}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] border border-atlas-line px-5 py-3 font-bold"
          >
            Annuler
          </button>
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-[9px] bg-atlas-teal px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            <ScanLine size={18} />
            {saving ? "Enregistrement…" : "Enregistrer dans le dossier patient"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[9px] bg-slate-50 p-4">
      <Icon size={17} className="text-atlas-teal" />
      <p className="mt-2 text-[10px] font-bold uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold">{value}</p>
    </div>
  );
}
function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "due";
}) {
  return (
    <div
      className={`rounded-[12px] border p-5 shadow-sm ${tone === "due" ? "border-amber-200 bg-amber-50" : "border-atlas-line bg-white"}`}
    >
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={`mt-2 font-display text-2xl font-bold ${tone === "due" ? "text-amber-800" : "text-atlas-petrol"}`}
      >
        {value}
      </p>
    </div>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [];
  return (
    <section className="rounded-[14px] border border-atlas-line bg-white p-5 shadow-sm">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length ? (
          children
        ) : (
          <p className="rounded-[9px] bg-slate-50 p-8 text-center text-sm text-slate-500">
            Aucune donnée enregistrée.
          </p>
        )}
      </div>
    </section>
  );
}
function Row({
  title,
  detail,
  badge,
  danger = false,
}: {
  title: string;
  detail: string;
  badge?: string;
  danger?: boolean;
}) {
  return (
    <article className="rounded-[10px] border border-atlas-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <b>{title}</b>
        {badge && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${danger ? "bg-red-50 text-red-700" : "bg-atlas-mist text-atlas-teal"}`}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
        {detail}
      </p>
    </article>
  );
}
