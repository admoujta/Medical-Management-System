import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  MessageCircle,
  Plus,
  Search,
  Settings2,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  apiCreate,
  apiDelete,
  apiGet,
  apiList,
  apiPage,
  initialPagination,
  type PaginationMeta,
} from "../../lib/api";
import { PaginationControls } from "../../components/PaginationControls";
import { getSession, logout } from "../../lib/auth";
import { confirmAction } from "../../lib/uiFeedback";
import { MedecinLayout } from "./MedecinLayout";
import { StaffLayout } from "../staff/StaffLayout";

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
};
type Fee = {
  id: string;
  patient_id: string;
  title: string;
  description: string | null;
  fee_type: string;
  amount: number;
  amount_ht: number;
  tax_rate: number;
  tax_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
};
type Invoice = { id: string; fee_id: string };
type DueItem = {
  id: string;
  invoice_id: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string;
  comment?: string | null;
};
type Props = {
  onNavigate: (path: string) => void;
  mode?: "doctor" | "staff";
  permissionLevel?: string;
};
type FeePrices = {
  prices: Record<string, number>;
  tax_rates: Record<string, number>;
};
type BankAccount = {
  id: string;
  label: string;
  bank_name: string;
  is_default: boolean;
};

const money = (value: number) =>
  new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(value);
const feeTypeLabel = (type: string) =>
  type
    .toLocaleLowerCase("fr")
    .replace(/_/g, " ")
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
const statusInfo: Record<string, { label: string; className: string }> = {
  paid: { label: "Payé", className: "bg-emerald-50 text-emerald-700" },
  partial: {
    label: "Partiellement payé",
    className: "bg-amber-50 text-amber-700",
  },
  partially_paid: {
    label: "Partiellement payé",
    className: "bg-amber-50 text-amber-700",
  },
  unpaid: { label: "Non payé", className: "bg-red-50 text-red-700" },
  in_progress: { label: "En cours", className: "bg-blue-50 text-blue-700" },
  draft: { label: "Brouillon", className: "bg-slate-100 text-slate-700" },
  cancelled: { label: "Annulé", className: "bg-red-50 text-red-700" },
};

export function FeesPage({
  onNavigate,
  mode = "doctor",
  permissionLevel,
}: Props) {
  const session = getSession();
  const [fees, setFees] = useState<Fee[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] =
    useState<PaginationMeta>(initialPagination);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [amount, setAmount] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [title, setTitle] = useState("Consultation");
  const [description, setDescription] = useState("");
  const [hasDue, setHasDue] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueAmount, setDueAmount] = useState("");
  const [dueComment, setDueComment] = useState("");
  const [editingDueId, setEditingDueId] = useState<string | null>(null);
  const [feeType, setFeeType] = useState("CONSULTATION");
  const [feePrices, setFeePrices] = useState<FeePrices>({
    prices: {},
    tax_rates: {},
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [financialView, setFinancialView] = useState<
    "all" | "due" | "rap" | "paid"
  >("all");
  const [dueTiming, setDueTiming] = useState<
    "all" | "overdue" | "upcoming" | "settled"
  >("all");
  const [paymentFee, setPaymentFee] = useState<Fee | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "cash",
    reference: "",
    note: "",
    due_date_id: "",
    bank_account_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const readOnly =
    permissionLevel === "read" ||
    session?.tenantStatus === "expired" ||
    session?.tenantStatus === "suspended";
  const canDelete = mode === "doctor" || permissionLevel === "admin";
  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );
  const patientBalances = useMemo(() => {
    const balances = new Map<
      string,
      { total: number; paid: number; rap: number }
    >();
    for (const fee of fees) {
      const current = balances.get(fee.patient_id) ?? {
        total: 0,
        paid: 0,
        rap: 0,
      };
      current.total += fee.amount;
      current.paid += fee.paid_amount;
      current.rap += Math.max(0, fee.remaining_amount);
      balances.set(fee.patient_id, current);
    }
    return balances;
  }, [fees]);
  const selectedPatientBalance = patientBalances.get(patientId) ?? {
    total: 0,
    paid: 0,
    rap: 0,
  };

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const [
        loadedFees,
        loadedPatients,
        loadedPrices,
        loadedInvoices,
        loadedDueItems,
        loadedBankAccounts,
      ] = await Promise.all([
        apiPage<Fee>(
          `/honoraires?page=${page}&page_size=10&search=${encodeURIComponent(search)}&sort_by=created_at&sort_order=desc`,
          session.accessToken,
        ),
        apiList<Patient>("/patients", session.accessToken),
        apiGet<FeePrices>("/doctor/fee-settings", session.accessToken),
        apiList<Invoice>("/invoices", session.accessToken),
        apiList<DueItem>("/echeances", session.accessToken),
        apiList<BankAccount>("/bank-accounts?active=true", session.accessToken),
      ]);
      setFees(loadedFees.items);
      setPagination(loadedFees.pagination);
      setPatients(
        loadedPatients.filter((patient) => patient.status !== "disabled"),
      );
      setFeePrices(loadedPrices);
      setInvoices(loadedInvoices);
      setDueItems(loadedDueItems);
      setBankAccounts(loadedBankAccounts);
      if (!editingId) {
        const price = loadedPrices.prices.CONSULTATION ?? 0;
        if (price > 0) setAmount(String(price));
        setTaxRate(String(loadedPrices.tax_rates.CONSULTATION ?? 0));
      }
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, page, search]);
  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () =>
      fees.reduce(
        (result, fee) => ({
          total: result.total + fee.amount,
          paid: result.paid + fee.paid_amount,
          remaining: result.remaining + fee.remaining_amount,
        }),
        { total: 0, paid: 0, remaining: 0 },
      ),
    [fees],
  );
  const summaryCards: Array<{
    label: string;
    value: number;
    icon: LucideIcon;
    colors: string;
  }> = [
    {
      label: "Total facturé",
      value: totals.total,
      icon: CircleDollarSign,
      colors: "bg-atlas-mist text-atlas-teal",
    },
    {
      label: "Total payé",
      value: totals.paid,
      icon: CheckCircle2,
      colors: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Reste à payer",
      value: totals.remaining,
      icon: WalletCards,
      colors: "bg-amber-50 text-amber-600",
    },
  ];
  const duesByFee = useMemo(() => {
    const feeByInvoice = new Map(
      invoices.map((invoice) => [invoice.id, invoice.fee_id]),
    );
    const result = new Map<string, DueItem[]>();
    for (const due of dueItems) {
      const feeId = feeByInvoice.get(due.invoice_id);
      if (!feeId) continue;
      result.set(feeId, [...(result.get(feeId) ?? []), due]);
    }
    for (const dues of result.values())
      dues.sort((a, b) => a.due_date.localeCompare(b.due_date));
    return result;
  }, [dueItems, invoices]);
  const viewStats = useMemo(() => {
    const groups = {
      all: fees,
      due: fees.filter((fee) => (duesByFee.get(fee.id)?.length ?? 0) > 0),
      rap: fees.filter(
        (fee) => fee.remaining_amount > 0 && !duesByFee.get(fee.id)?.length,
      ),
      paid: fees.filter((fee) => fee.remaining_amount <= 0),
    };
    return Object.fromEntries(
      Object.entries(groups).map(([key, rows]) => [
        key,
        {
          count: rows.length,
          amount: rows.reduce(
            (sum, fee) =>
              sum +
              (key === "paid"
                ? fee.paid_amount
                : key === "all"
                  ? fee.amount
                  : fee.remaining_amount),
            0,
          ),
        },
      ]),
    ) as Record<
      "all" | "due" | "rap" | "paid",
      { count: number; amount: number }
    >;
  }, [duesByFee, fees]);
  const paymentDueOptions = paymentFee
    ? (duesByFee.get(paymentFee.id) ?? []).filter(
        (due) => due.amount - due.paid_amount > 0.005,
      )
    : [];
  const dueTimingStats = useMemo(() => {
    const todayKey = new Date().toLocaleDateString("en-CA");
    const stats = { all: 0, overdue: 0, upcoming: 0, settled: 0 };
    for (const fee of fees) {
      const dues = duesByFee.get(fee.id) ?? [];
      if (!dues.length) continue;
      stats.all += 1;
      const outstanding = dues.filter(
        (due) => due.amount - due.paid_amount > 0.005,
      );
      if (!outstanding.length) stats.settled += 1;
      else if (outstanding.some((due) => due.due_date < todayKey))
        stats.overdue += 1;
      else stats.upcoming += 1;
    }
    return stats;
  }, [duesByFee, fees]);
  const visibleFees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    const todayKey = new Date().toLocaleDateString("en-CA");
    return fees.filter((fee) => {
      const dues = duesByFee.get(fee.id) ?? [];
      const hasDue = dues.length > 0;
      if (financialView === "due" && !hasDue) return false;
      if (financialView === "due" && dueTiming !== "all") {
        const outstanding = dues.filter(
          (due) => due.amount - due.paid_amount > 0.005,
        );
        const overdue = outstanding.some((due) => due.due_date < todayKey);
        if (dueTiming === "overdue" && !overdue) return false;
        if (dueTiming === "upcoming" && (!outstanding.length || overdue))
          return false;
        if (dueTiming === "settled" && outstanding.length > 0) return false;
      }
      if (financialView === "rap" && (hasDue || fee.remaining_amount <= 0))
        return false;
      if (financialView === "paid" && fee.remaining_amount > 0) return false;
      if (!query) return true;
      const patient = patientById.get(fee.patient_id);
      return `${patient?.first_name ?? ""} ${patient?.last_name ?? ""} ${patient?.phone ?? ""}`
        .toLocaleLowerCase("fr")
        .includes(query);
    });
  }, [dueTiming, duesByFee, fees, financialView, patientById, search]);

  const amountHt = Number(amount) || 0;
  const numericTaxRate = Number(taxRate) || 0;
  const taxAmount = Math.round(amountHt * numericTaxRate) / 100;
  const amountTtc = Math.round((amountHt + taxAmount) * 100) / 100;
  function resetForm() {
    setEditingId(null);
    setEditingDueId(null);
    setPatientId("");
    const configured = feePrices.prices.CONSULTATION ?? 0;
    setAmount(configured > 0 ? String(configured) : "");
    setTaxRate(String(feePrices.tax_rates.CONSULTATION ?? 0));
    setTitle("Consultation");
    setDescription("");
    setFeeType("CONSULTATION");
    setHasDue(false);
    setDueDate("");
    setDueAmount("");
    setDueComment("");
  }
  function chooseFeeType(type: string) {
    setFeeType(type);
    const configured = feePrices.prices[type] ?? 0;
    setAmount(configured > 0 ? String(configured) : "");
    setTaxRate(String(feePrices.tax_rates[type] ?? 0));
    if (!editingId) setTitle(feeTypeLabel(type));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session?.accessToken || readOnly) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        amount_ht: amountHt,
        tax_rate: numericTaxRate,
        title,
        description: description || null,
        fee_type: feeType,
      };
      const fee = await apiCreate<Fee>("/honoraires", session.accessToken, {
        patient_id: patientId,
        ...payload,
      });
      await apiCreate<Invoice>(
        `/invoices/from-honoraire/${fee.id}`,
        session.accessToken,
        {},
      );
      resetForm();
      await load();
      setMessage("Honoraire ajouté avec succès.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(fee: Fee) {
    if (
      !session?.accessToken ||
      readOnly ||
      !canDelete ||
      !(await confirmAction({
        title: "Supprimer cet honoraire ?",
        message:
          "L’honoraire et ses informations de facturation seront supprimés définitivement.",
        confirmLabel: "Supprimer",
        tone: "danger",
      }))
    )
      return;
    try {
      await apiDelete(`/honoraires/${fee.id}`, session.accessToken);
      if (editingId === fee.id) resetForm();
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Suppression impossible.",
      );
    }
  }

  async function sendWhatsApp(fee: Fee) {
    if (!session?.accessToken || fee.remaining_amount <= 0) return;
    setMessage("");
    try {
      const result = await apiCreate<{ status: string }>(
        `/honoraires/${fee.id}/send-payment-reminder`,
        session.accessToken,
        {},
      );
      setMessage(
        result.status === "echec"
          ? "La relance WhatsApp a échoué. Consultez le module WhatsApp."
          : "Relance WhatsApp envoyée et enregistrée dans l’historique patient.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Relance WhatsApp impossible.",
      );
    }
  }

  function openPayment(fee: Fee) {
    const outstandingDues = (duesByFee.get(fee.id) ?? []).filter(
      (due) => due.amount - due.paid_amount > 0.005,
    );
    const due = outstandingDues[0];
    const payable = due
      ? Math.min(fee.remaining_amount, due.amount - due.paid_amount)
      : fee.remaining_amount;
    setPaymentFee(fee);
    setPaymentForm({
      amount: String(Math.max(0, payable)),
      method: "cash",
      reference: "",
      note: "",
      due_date_id: due?.id ?? "",
      bank_account_id: "",
    });
    setMessage("");
  }

  async function submitQuickPayment(event: FormEvent) {
    event.preventDefault();
    if (!session?.accessToken || !paymentFee || readOnly) return;
    const paymentAmount = Number(paymentForm.amount);
    if (paymentForm.method !== "cash" && !paymentForm.bank_account_id) {
      setMessage(
        "Choisissez le compte bancaire du cabinet concerné par cette transaction.",
      );
      return;
    }
    const selectedDue = paymentDueOptions.find(
      (due) => due.id === paymentForm.due_date_id,
    );
    const maximum = selectedDue
      ? Math.min(
          paymentFee.remaining_amount,
          selectedDue.amount - selectedDue.paid_amount,
        )
      : paymentFee.remaining_amount;
    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0 ||
      paymentAmount > maximum + 0.005
    ) {
      setMessage(`Le montant doit être compris entre 0 et ${money(maximum)}.`);
      return;
    }
    setPaymentSaving(true);
    try {
      await apiCreate(
        `/honoraires/${paymentFee.id}/paiements`,
        session.accessToken,
        {
          amount: paymentAmount,
          method: paymentForm.method,
          payment_type:
            paymentAmount < paymentFee.remaining_amount
              ? "partial"
              : "immediate",
          reference: paymentForm.reference.trim() || null,
          note: paymentForm.note.trim() || null,
          due_date_id: paymentForm.due_date_id || null,
          bank_account_id:
            paymentForm.method === "cash"
              ? null
              : paymentForm.bank_account_id,
        },
      );
      const patient = patientById.get(paymentFee.patient_id);
      setPaymentFee(null);
      await load();
      setMessage(
        `Paiement de ${money(paymentAmount)} enregistré pour ${patient ? `${patient.first_name} ${patient.last_name}` : "le patient"}. Le RAP et l’échéance ont été recalculés sans modifier l’historique.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Paiement impossible.",
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  const content = (
    <>
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">
              Gestion financière
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold">Honoraires</h1>
            <p className="mt-2 text-sm text-slate-600">
              Ajoutez un montant et suivez facilement ce qui est payé ou reste à
              payer.
            </p>
          </div>
          {mode === "doctor" && (
            <button
              type="button"
              onClick={() => onNavigate("/doctor/settings#tarifs-honoraires")}
              className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-teal/30 bg-white px-4 py-2.5 text-sm font-bold text-atlas-teal shadow-sm hover:bg-atlas-mist"
            >
              <Settings2 size={17} />
              Configuration
            </button>
          )}
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {summaryCards.map(({ label, value, icon: Icon, colors }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-[12px] border border-atlas-line bg-white p-4 shadow-sm"
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${colors}`}
              >
                <Icon size={21} />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-atlas-ink">
                  {money(value)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {message && (
          <p
            className={`mt-5 rounded-[8px] border px-4 py-3 text-sm font-bold ${message.includes("succès") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}
          >
            {message}
          </p>
        )}

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[390px_1fr]">
          <form
            onSubmit={submit}
            className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm xl:sticky xl:top-6"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-atlas-mist text-atlas-teal">
                <Plus size={20} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold">
                  Nouvel honoraire
                </h2>
                <p className="text-xs text-slate-500">
                  Acte facturable indépendant des rendez-vous
                </p>
              </div>
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-bold">Patient *</span>
              <select
                required
                disabled={readOnly || Boolean(editingId)}
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                className="mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-4 py-3 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"
              >
                <option value="">Choisir un patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name} · RAP{" "}
                    {money(patientBalances.get(patient.id)?.rap ?? 0)}
                    {patient.phone ? ` · ${patient.phone}` : ""}
                  </option>
                ))}
              </select>
            </label>
            {patientId && (
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Honoraires
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {money(selectedPatientBalance.total)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Payé
                  </p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    {money(selectedPatientBalance.paid)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-700">
                    RAP actuel
                  </p>
                  <p className="mt-1 text-sm font-bold text-amber-800">
                    {money(selectedPatientBalance.rap)}
                  </p>
                </div>
              </div>
            )}
            <label className="mt-4 block">
              <span className="text-sm font-bold">
                Montant hors taxe (HT) *
              </span>
              <div className="relative mt-2">
                <input
                  required
                  disabled={readOnly}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-[8px] border border-atlas-line px-4 py-3 pr-16 text-lg font-bold outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  MAD
                </span>
              </div>
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold">Taux de TVA</span>
              <div className="relative mt-2">
                <input
                  required
                  disabled={readOnly}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                  className="w-full rounded-[8px] border border-atlas-line px-4 py-3 pr-12 font-bold"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
                  %
                </span>
              </div>
            </label>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-[8px] bg-atlas-mist p-3 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  HT
                </p>
                <p className="mt-1 text-sm font-bold">{money(amountHt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  TVA
                </p>
                <p className="mt-1 text-sm font-bold">{money(taxAmount)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-atlas-teal">
                  TTC
                </p>
                <p className="mt-1 text-sm font-bold text-atlas-petrol">
                  {money(amountTtc)}
                </p>
              </div>
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-bold">Libellé *</span>
              <input
                required
                disabled={readOnly}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-[8px] border border-atlas-line px-4 py-3"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold">Type *</span>
              <select
                value={feeType}
                disabled={readOnly}
                onChange={(event) => chooseFeeType(event.target.value)}
                className="mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-4 py-3"
              >
                {feePrices.prices[feeType] === undefined && editingId && (
                  <option value={feeType}>{feeTypeLabel(feeType)}</option>
                )}
                {Object.keys(feePrices.prices).map((type) => (
                  <option key={type} value={type}>
                    {feeTypeLabel(type)}
                  </option>
                ))}
              </select>
              {feePrices.prices[feeType] !== undefined && (
                <span className="mt-1.5 block text-xs font-semibold text-atlas-teal">
                  Tarif configuré : {money(feePrices.prices[feeType] ?? 0)} HT ·
                  TVA {feePrices.tax_rates[feeType] ?? 0} %
                </span>
              )}
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold">Description</span>
              <textarea
                disabled={readOnly}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-2 min-h-20 w-full rounded-[8px] border border-atlas-line px-4 py-3"
              />
            </label>
            {editingId && (
              <p className="mt-3 rounded-[8px] bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Le nouveau montant ne peut pas être inférieur à la somme déjà
                payée.
              </p>
            )}
            <button
              disabled={readOnly || saving}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-atlas-teal px-5 py-3.5 font-bold text-white hover:bg-atlas-petrol disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              {saving
                ? "Enregistrement…"
                : "Ajouter l’honoraire"}
            </button>
          </form>

          <section className="overflow-hidden rounded-[12px] border border-atlas-line bg-white shadow-sm">
            <div className="border-b border-atlas-line p-5">
              <h2 className="font-display text-xl font-bold">
                Liste des honoraires
              </h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {(
                  [
                    ["all", "Tous"],
                    ["due", "Avec échéance"],
                    ["rap", "RAP hors échéance"],
                    ["paid", "Payés"],
                  ] as const
                ).map(([value, label]) => {
                  const stat = viewStats[value];
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={financialView === value}
                      onClick={() => setFinancialView(value)}
                      className={`rounded-[9px] border px-3 py-3 text-left transition ${financialView === value ? "border-atlas-teal bg-atlas-mist text-atlas-petrol ring-2 ring-atlas-teal/10" : "border-atlas-line bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      <span className="flex items-center justify-between gap-2 text-xs font-bold">
                        {label}
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] shadow-sm">
                          {stat.count}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm font-black">
                        {money(stat.amount)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {financialView === "due" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[9px] border border-blue-100 bg-blue-50/60 p-2">
                  <span className="px-2 text-xs font-bold text-blue-800">
                    Afficher :
                  </span>
                  {(
                    [
                      ["all", "Toutes"],
                      ["overdue", "En retard"],
                      ["upcoming", "À venir"],
                      ["settled", "Réglées"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={dueTiming === value}
                      onClick={() => setDueTiming(value)}
                      className={`inline-flex items-center gap-2 rounded-[7px] border px-3 py-2 text-xs font-bold transition ${dueTiming === value ? "border-blue-500 bg-white text-blue-800 shadow-sm" : "border-transparent text-slate-600 hover:border-blue-100 hover:bg-white/70"}`}
                    >
                      {label}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${dueTiming === value ? "bg-blue-100 text-blue-800" : "bg-white text-slate-500"}`}
                      >
                        {dueTimingStats[value]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="relative mt-4">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Rechercher un patient"
                  className="w-full rounded-[8px] border border-atlas-line py-3 pl-10 pr-4 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"
                />
              </div>
            </div>
            <div className="space-y-3 p-4 md:p-5">
              {loading ? (
                <p className="py-10 text-center text-sm font-semibold text-slate-500">
                  Chargement des honoraires…
                </p>
              ) : visibleFees.length === 0 ? (
                <div className="py-12 text-center">
                  <Banknote size={38} className="mx-auto text-slate-300" />
                  <p className="mt-3 font-bold text-slate-600">
                    Aucun honoraire trouvé
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Le prochain honoraire apparaîtra ici.
                  </p>
                </div>
              ) : (
                visibleFees.map((fee) => {
                  const patient = patientById.get(fee.patient_id);
                  const info = statusInfo[fee.status] ?? statusInfo.unpaid;
                  const dues = duesByFee.get(fee.id) ?? [];
                  const outstandingDues = dues.filter(
                    (due) => due.amount - due.paid_amount > 0.005,
                  );
                  const currentDue = outstandingDues[0] ?? dues.at(-1);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dueDay = currentDue
                    ? new Date(`${currentDue.due_date}T00:00:00`)
                    : null;
                  const daysToDue = dueDay
                    ? Math.round(
                        (dueDay.getTime() - today.getTime()) / 86400000,
                      )
                    : null;
                  const dueSettled =
                    dues.length > 0 && outstandingDues.length === 0;
                  const dueLabel = dueSettled
                    ? "Échéance réglée"
                    : daysToDue === null
                      ? ""
                      : daysToDue < 0
                        ? `En retard de ${Math.abs(daysToDue)} jour${Math.abs(daysToDue) > 1 ? "s" : ""}`
                        : daysToDue === 0
                          ? "Échéance aujourd’hui"
                          : `À venir dans ${daysToDue} jour${daysToDue > 1 ? "s" : ""}`;
                  const dueTone = dueSettled
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : (daysToDue ?? 0) < 0
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-blue-200 bg-blue-50 text-blue-800";
                  return (
                    <article
                      key={fee.id}
                      className="rounded-[10px] border border-atlas-line p-4 transition hover:border-atlas-teal/40 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-atlas-mist text-atlas-teal">
                          <UserRound size={19} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="font-bold">{fee.title}</h3>
                              <p className="text-xs text-slate-500">
                                {patient
                                  ? `${patient.first_name} ${patient.last_name}`
                                  : "Patient"}{" "}
                                · {fee.fee_type} ·{" "}
                                {new Date(fee.created_at).toLocaleDateString(
                                  "fr-FR",
                                )}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${info.className}`}
                            >
                              {info.label}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-3 gap-2 rounded-[8px] bg-slate-50 p-3 text-center text-sm">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-slate-400">
                                Montant total
                              </p>
                              <p className="mt-1 font-bold">
                                {money(fee.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase text-slate-400">
                                Payé
                              </p>
                              <p className="mt-1 font-bold text-emerald-700">
                                {money(fee.paid_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase text-amber-600">
                                RAP
                              </p>
                              <p className="mt-1 font-bold text-amber-700">
                                {money(fee.remaining_amount)}
                              </p>
                            </div>
                          </div>
                          {currentDue && (
                            <div
                              className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[8px] border px-3 py-2.5 text-xs ${dueTone}`}
                            >
                              <div className="flex items-center gap-2">
                                <CalendarClock size={16} />
                                <div>
                                  <p className="font-black">{dueLabel}</p>
                                  <p className="mt-0.5 font-semibold opacity-75">
                                    Date : {dueDay?.toLocaleDateString("fr-FR")}
                                    {dues.length > 1
                                      ? ` · ${dues.length} échéances`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-black">
                                  {money(
                                    Math.max(
                                      0,
                                      currentDue.amount -
                                        currentDue.paid_amount,
                                    ),
                                  )}
                                </p>
                                <p className="font-semibold opacity-75">
                                  restant sur l’échéance
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {fee.remaining_amount > 0 && (
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => openPayment(fee)}
                              className="rounded-[8px] bg-atlas-teal px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-atlas-petrol disabled:opacity-40"
                            >
                              Encaisser
                            </button>
                          )}
                          {fee.remaining_amount > 0 && (
                            <button
                              type="button"
                              onClick={() => void sendWhatsApp(fee)}
                              title="Envoyer une relance WhatsApp"
                              className="rounded-[8px] bg-emerald-50 p-2 text-emerald-700"
                            >
                              <MessageCircle size={17} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate(
                                `${mode === "staff" ? "/staff" : "/doctor"}/honoraires/${fee.id}`,
                              )
                            }
                            className="rounded-[8px] px-3 py-2 text-xs font-bold text-atlas-teal hover:bg-atlas-mist"
                          >
                            Voir
                          </button>
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => void remove(fee)}
                            title="Supprimer"
                            className="rounded-[8px] p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            <PaginationControls
              pagination={pagination}
              loading={loading}
              itemLabel="honoraire"
              onPageChange={setPage}
            />
          </section>
        </div>
      </div>
      {paymentFee && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitQuickPayment}
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[16px] bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-atlas-line p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-atlas-teal">
                  Encaissement rapide
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  Enregistrer un paiement
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {patientById.get(paymentFee.patient_id)?.first_name}{" "}
                  {patientById.get(paymentFee.patient_id)?.last_name} ·{" "}
                  {paymentFee.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentFee(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </header>
            <div className="p-5">
              <div className="grid grid-cols-3 gap-2 rounded-[10px] bg-slate-50 p-3 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Total
                  </p>
                  <p className="mt-1 font-bold">{money(paymentFee.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-600">
                    Déjà payé
                  </p>
                  <p className="mt-1 font-bold text-emerald-700">
                    {money(paymentFee.paid_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-amber-600">
                    RAP
                  </p>
                  <p className="mt-1 font-bold text-amber-800">
                    {money(paymentFee.remaining_amount)}
                  </p>
                </div>
              </div>
              {paymentDueOptions.length > 0 ? (
                <label className="mt-4 block text-sm font-bold">
                  Échéance concernée
                  <select
                    value={paymentForm.due_date_id}
                    onChange={(event) => {
                      const due = paymentDueOptions.find(
                        (item) => item.id === event.target.value,
                      );
                      setPaymentForm((current) => ({
                        ...current,
                        due_date_id: event.target.value,
                        amount: due
                          ? String(
                              Math.min(
                                paymentFee.remaining_amount,
                                due.amount - due.paid_amount,
                              ),
                            )
                          : String(paymentFee.remaining_amount),
                      }));
                    }}
                    className="mt-2 w-full rounded-[9px] border border-atlas-line bg-white px-4 py-3"
                  >
                    <option value="">
                      RAP général, sans affecter une échéance
                    </option>
                    {paymentDueOptions.map((due) => {
                      const remaining = Math.max(
                        0,
                        due.amount - due.paid_amount,
                      );
                      const dueDate = new Date(`${due.due_date}T00:00:00`);
                      const late =
                        dueDate.getTime() <
                        new Date(new Date().toDateString()).getTime();
                      return (
                        <option key={due.id} value={due.id}>
                          {dueDate.toLocaleDateString("fr-FR")} · reste{" "}
                          {money(remaining)}
                          {late ? " · en retard" : " · à venir"}
                        </option>
                      );
                    })}
                  </select>
                </label>
              ) : (
                <p className="mt-4 rounded-[9px] border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  Ce paiement sera affecté au RAP général : aucune échéance
                  ouverte n’est liée à cet honoraire.
                </p>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">
                  Montant reçu (MAD) *
                  <input
                    required
                    type="number"
                    min="0.01"
                    max={paymentFee.remaining_amount}
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-[9px] border border-atlas-line px-4 py-3 text-lg font-bold"
                  />
                </label>
                <label className="text-sm font-bold">
                  Mode de paiement *
                  <select
                    value={paymentForm.method}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        method: event.target.value,
                        bank_account_id:
                          event.target.value === "cash"
                            ? ""
                            : paymentForm.bank_account_id ||
                              bankAccounts.find((item) => item.is_default)?.id ||
                              bankAccounts[0]?.id ||
                              "",
                      })
                    }
                    className="mt-2 w-full rounded-[9px] border border-atlas-line bg-white px-4 py-3"
                  >
                    <option value="cash">Espèces</option>
                    <option value="card">Carte</option>
                    <option value="transfer">Virement</option>
                    <option value="other">Autre</option>
                  </select>
                </label>
                {paymentForm.method !== "cash" && (
                  <label className="text-sm font-bold sm:col-span-2">
                    Compte bancaire du cabinet *
                    <select
                      required
                      disabled={bankAccounts.length === 0}
                      value={paymentForm.bank_account_id}
                      onChange={(event) =>
                        setPaymentForm({
                          ...paymentForm,
                          bank_account_id: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-[9px] border border-atlas-line bg-white px-4 py-3"
                    >
                      <option value="">Choisir le compte crédité</option>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.label} · {account.bank_name}
                          {account.is_default ? " · Par défaut" : ""}
                        </option>
                      ))}
                    </select>
                    {bankAccounts.length === 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate(
                            "/doctor/settings#configuration-paiements",
                          )
                        }
                        className="mt-2 block text-xs text-amber-700 underline"
                      >
                        Ajouter un compte bancaire dans Configuration
                      </button>
                    )}
                  </label>
                )}
                <label className="text-sm font-bold">
                  Référence
                  <input
                    value={paymentForm.reference}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        reference: event.target.value,
                      })
                    }
                    placeholder="Reçu, virement, transaction…"
                    className="mt-2 w-full rounded-[9px] border border-atlas-line px-4 py-3"
                  />
                </label>
                <label className="text-sm font-bold">
                  Note
                  <input
                    value={paymentForm.note}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        note: event.target.value,
                      })
                    }
                    placeholder="Observation facultative"
                    className="mt-2 w-full rounded-[9px] border border-atlas-line px-4 py-3"
                  />
                </label>
              </div>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPaymentFee(null)}
                  className="rounded-[9px] border border-atlas-line px-5 py-3 text-sm font-bold text-slate-600"
                >
                  Annuler
                </button>
                <button
                  disabled={paymentSaving}
                  className="rounded-[9px] bg-atlas-teal px-6 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                >
                  {paymentSaving
                    ? "Enregistrement…"
                    : "Enregistrer le paiement"}
                </button>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Le paiement sera ajouté à l’historique. L’échéance initiale, sa
                date et les paiements précédents ne seront pas supprimés.
              </p>
            </div>
          </form>
        </div>
      )}
    </>
  );
  const out = () => {
    logout();
    onNavigate("/login");
  };
  return mode === "staff" ? (
    <StaffLayout
      cabinetName="Espace secrétaire"
      onNavigate={onNavigate}
      onLogout={out}
    >
      {content}
    </StaffLayout>
  ) : (
    <MedecinLayout
      cabinetName="Espace médecin"
      onNavigate={onNavigate}
      onLogout={out}
    >
      {content}
    </MedecinLayout>
  );
}
