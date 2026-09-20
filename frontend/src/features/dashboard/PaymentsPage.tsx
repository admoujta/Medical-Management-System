import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  FileText,
  MessageCircle,
  Plus,
  Search,
  Settings2,
  Trash2,
  Upload,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  apiCreate,
  apiDelete,
  apiDownload,
  apiGet,
  apiList,
  apiPage,
  apiPreview,
  apiUpdate,
  apiUpload,
} from "../../lib/api";
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
  fee_type: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
};
type Payment = {
  id: string;
  patient_id: string;
  fee_id: string;
  invoice_id?: string | null;
  due_date_id?: string | null;
  amount: number;
  method: string;
  payment_type?: string;
  due_date?: string | null;
  installment_count?: number | null;
  installment_schedule?: Array<{
    number: number;
    due_date: string;
    amount: number;
    status: string;
  }> | null;
  paid_at: string;
  cheque_bank?: string | null;
  cheque_number?: string | null;
  cheque_owner_name?: string | null;
  cheque_owner_cin?: string | null;
  cheque_copy_filename?: string | null;
  cheque_owner_cin_filename?: string | null;
  cheque_documents_complete?: boolean;
  cheque_issue_date?: string | null;
  cheque_deposit_date?: string | null;
  cheque_cashing_date?: string | null;
  cheque_status?: string | null;
  cheque_expected_cashing_date?: string | null;
  cheque_collection_method?: "DEPOT_BANCAIRE" | "ESPECES" | null;
  cheque_rejection_reason?: string | null;
  cheque_rejected_at?: string | null;
  reference?: string | null;
  note?: string | null;
  status?: string;
  patient_name?: string | null;
  doctor_name?: string | null;
  fee_title?: string | null;
  bank_account_id?: string | null;
  bank_account_label?: string | null;
  bank_name?: string | null;
};
type BankAccount = {
  id: string;
  label: string;
  bank_name: string;
  account_holder: string;
  rib: string;
  iban?: string | null;
  is_default: boolean;
  is_active: boolean;
};
type Invoice = { id: string; fee_id: string; invoice_number: string };
type DueItem = {
  id: string;
  invoice_id: string;
  patient_id: string;
  fee_id?: string | null;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: string;
  comment?: string | null;
  guarantee_type?: "NORMAL" | "GUARANTOR" | "CHEQUE";
  guarantor_name?: string | null;
  guarantor_cin?: string | null;
  guarantee_cheque_bank?: string | null;
  guarantee_cheque_number?: string | null;
  guarantee_cheque_issue_date?: string | null;
  guarantee_cheque_due_date?: string | null;
};
type DueDateDocument = {
  id: string;
  due_date_id: string;
  patient_id: string;
  document_type: "GUARANTOR_CIN" | "CHEQUE" | "OTHER";
  title: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  uploaded_by_name: string;
  created_at: string;
};
type PaymentDocument = {
  id: string;
  payment_id: string;
  document_type: "recu" | "facture";
  document_number: string;
  generated_at: string;
};
type PaymentSettings = {
  default_method: string;
  default_settlement_type: string;
  default_due_days: number;
  default_installments: number;
  grace_days: number;
};
type Props = {
  onNavigate: (path: string) => void;
  mode?: "doctor" | "staff";
  permissionLevel?: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 2,
  }).format(value);
const numeric = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const methods: Record<string, string> = {
  cash: "Espèces",
  card: "Carte bancaire",
  transfer: "Virement",
  cheque: "Chèque",
};
const chequeStatuses: Record<string, string> = {
  RECU: "Reçu — à déposer",
  DEPOSE: "Déposé en banque",
  ENCAISSE: "Encaissé",
  REJETE: "Rejeté / impayé",
  ANNULE: "Annulé",
};
const dueStatuses: Record<string, { label: string; className: string }> = {
  A_VENIR: { label: "À venir", className: "bg-blue-50 text-blue-700" },
  EN_ATTENTE: { label: "En attente", className: "bg-slate-100 text-slate-700" },
  PARTIELLEMENT_PAYEE: {
    label: "Partiellement payée",
    className: "bg-amber-50 text-amber-700",
  },
  PAYEE: { label: "Payée", className: "bg-emerald-50 text-emerald-700" },
  EN_RETARD: { label: "En retard", className: "bg-red-50 text-red-700" },
  ANNULEE: { label: "Annulée", className: "bg-slate-100 text-slate-500" },
};
const guaranteeLabels: Record<string, string> = {
  NORMAL: "Échéance simple",
  GUARANTOR: "Garantie par un tiers",
  CHEQUE: "Garantie par chèque",
};
const maskedCin = (value?: string | null) =>
  value && value.length > 4
    ? `${value.slice(0, 2)}${"•".repeat(Math.max(2, value.length - 4))}${value.slice(-2)}`
    : value ?? "—";
const today = () => new Date().toISOString().slice(0, 10);
const fieldClass =
  "mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-4 py-3 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50";

function PaymentDetailModal({
  payment,
  patient,
  fee,
  sequence,
  documents,
  documentLoading,
  onClose,
  onPreview,
  onDownload,
  onGenerate,
}: {
  payment: Payment;
  patient?: Patient;
  fee?: Fee;
  sequence?: { index: number; total: number };
  documents: PaymentDocument[];
  documentLoading: boolean;
  onClose: () => void;
  onPreview: (document: PaymentDocument) => void;
  onDownload: (document: PaymentDocument) => void;
  onGenerate: (type: "recu" | "facture") => void;
}) {
  async function previewChequeDocument(type: "CHEQUE" | "OWNER_CIN") {
    const session = getSession();
    if (!session?.accessToken) return;
    const preview = await apiPreview(
      `/payments/${payment.id}/cheque-documents/${type}/preview`,
      session.accessToken,
    );
    window.open(preview.url, "_blank", "noopener,noreferrer");
  }
  const details = [
    [
      "Patient",
      patient
        ? `${patient.first_name} ${patient.last_name}`
        : payment.patient_name ?? "Patient",
    ],
    ["Médecin", payment.doctor_name ?? "Médecin du cabinet"],
    ["Honoraire", fee?.title ?? payment.fee_title ?? "Honoraire"],
    ["Mode de paiement", methods[payment.method] ?? payment.method],
    ...(payment.method !== "cash"
      ? [
          [
            "Compte bancaire crédité",
            [payment.bank_account_label, payment.bank_name]
              .filter(Boolean)
              .join(" · ") || "Compte non renseigné (ancien paiement)",
          ],
        ]
      : []),
    [
      "Date d’encaissement",
      new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(payment.paid_at)),
    ],
    ["Référence", payment.reference || "Non renseignée"],
    ["Statut", (payment.status ?? "PAYE").replace(/_/g, " ")],
  ];
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[16px] bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-atlas-line bg-white p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-atlas-teal">
              Détail du versement
            </p>
            <h2 id="payment-detail-title" className="mt-1 font-display text-2xl font-bold">
              Versement {sequence?.index ?? 1}
              {sequence && sequence.total > 1 ? ` sur ${sequence.total}` : ""}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <X size={20} />
          </button>
        </header>
        <div className="p-5">
          <div className={`rounded-[12px] p-5 text-white ${payment.status==="ANNULE"?"bg-slate-500":"bg-gradient-to-r from-atlas-petrol to-atlas-teal"}`}>
            <p className="text-xs font-bold uppercase tracking-wide text-white/70">
              {payment.status==="ANNULE"?"Paiement annulé":"Montant encaissé"}
            </p>
            <p className="mt-2 text-3xl font-black">{money(payment.amount)}</p>
            <p className="mt-2 text-sm text-white/75">
              {patient
                ? `${patient.first_name} ${patient.last_name}`
                : payment.patient_name ?? "Patient"}{" "}
              · {fee?.title ?? payment.fee_title ?? "Honoraire"}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-[9px] border border-atlas-line bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  {label}
                </p>
                <p className="mt-1.5 text-sm font-bold text-slate-700">{value}</p>
              </div>
            ))}
          </div>
          {payment.method === "cheque" && (
            <section className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-bold text-amber-900">Informations du chèque</h3>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p><span className="text-amber-700">Banque :</span> <b>{payment.cheque_bank ?? "—"}</b></p>
                <p><span className="text-amber-700">Numéro :</span> <b>{payment.cheque_number ?? "—"}</b></p>
                <p><span className="text-amber-700">Propriétaire :</span> <b>{payment.cheque_owner_name ?? "—"}</b></p>
                <p><span className="text-amber-700">CIN :</span> <b>{payment.cheque_owner_cin ?? "—"}</b></p>
                <p><span className="text-amber-700">Émission :</span> <b>{payment.cheque_issue_date ?? payment.cheque_deposit_date ?? "—"}</b></p>
                <p><span className="text-amber-700">Prévu :</span> <b>{payment.cheque_expected_cashing_date ?? "—"}</b></p>
                <p><span className="text-amber-700">Dépôt :</span> <b>{payment.cheque_deposit_date ?? "—"}</b></p>
                <p><span className="text-amber-700">Encaissé le :</span> <b>{payment.cheque_cashing_date ?? "—"}</b></p>
                {payment.cheque_collection_method&&<p><span className="text-amber-700">Destination :</span> <b>{payment.cheque_collection_method==="ESPECES"?"Espèces":payment.bank_account_label??"Compte bancaire du cabinet"}</b></p>}
                {payment.cheque_rejection_reason&&<p><span className="text-red-700">Motif du rejet :</span> <b>{payment.cheque_rejection_reason}</b></p>}
                <p><span className="text-amber-700">Statut :</span> <b>{chequeStatuses[payment.cheque_status ?? ""] ?? payment.cheque_status ?? "—"}</b></p>
              </div>
              {payment.cheque_documents_complete&&<div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>void previewChequeDocument("CHEQUE")} className="rounded-[8px] border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900">Voir la copie du chèque</button><button type="button" onClick={()=>void previewChequeDocument("OWNER_CIN")} className="rounded-[8px] border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900">Voir la CIN du propriétaire</button></div>}
            </section>
          )}
          {payment.note && (
            <div className="mt-4 rounded-[9px] border border-atlas-line p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">Note</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{payment.note}</p>
            </div>
          )}
          <section className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Documents associés</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {documents.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {documents.map((document) => (
                <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-atlas-line p-3">
                  <div>
                    <b className="text-sm">{document.document_number}</b>
                    <p className="mt-0.5 text-xs uppercase text-slate-400">{document.document_type === "recu" ? "Ticket de caisse" : "Facture"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onPreview(document)} className="rounded-[7px] bg-atlas-mist px-3 py-2 text-xs font-bold text-atlas-teal">Ouvrir</button>
                    <button type="button" onClick={() => onDownload(document)} className="rounded-[7px] border border-atlas-line px-3 py-2 text-xs font-bold text-slate-600">PDF</button>
                  </div>
                </div>
              ))}
              {!documents.length && (
                <p className="rounded-[9px] bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Aucun document généré pour ce versement.
                </p>
              )}
            </div>
          </section>
        </div>
        <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-atlas-line bg-white p-5">
          <button type="button" disabled={documentLoading||payment.status==="ANNULE"} onClick={() => onGenerate("recu")} className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-teal/30 px-4 py-2.5 text-sm font-bold text-atlas-teal disabled:opacity-50"><FileText size={16}/>Générer le ticket de caisse</button>
          <button type="button" disabled={documentLoading||payment.status==="ANNULE"} onClick={() => onGenerate("facture")} className="rounded-[8px] bg-atlas-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Générer une facture</button>
        </footer>
      </section>
    </div>
  );
}

export function PaymentsPage({
  onNavigate,
  mode = "doctor",
  permissionLevel,
}: Props) {
  const session = getSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [paymentDocuments, setPaymentDocuments] = useState<PaymentDocument[]>(
    [],
  );
  const [lastPayment, setLastPayment] = useState<Payment | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [expandedPaymentGroup, setExpandedPaymentGroup] = useState<
    string | null
  >(null);
  const [documentLoading, setDocumentLoading] = useState<string | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [feeId, setFeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentMainType, setPaymentMainType] = useState<"ESPECE" | "BANQUE">(
    "ESPECE",
  );
  const [dueDateId, setDueDateId] = useState("");
  const [settlesDue, setSettlesDue] = useState(false);
  const [scheduleDue, setScheduleDue] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [newDueComment, setNewDueComment] = useState("");
  const [guaranteeType, setGuaranteeType] = useState<
    "NORMAL" | "GUARANTOR" | "CHEQUE"
  >("NORMAL");
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorCin, setGuarantorCin] = useState("");
  const [guarantorCinFile, setGuarantorCinFile] = useState<File | null>(null);
  const [guaranteeChequeBank, setGuaranteeChequeBank] = useState("");
  const [guaranteeChequeNumber, setGuaranteeChequeNumber] = useState("");
  const [guaranteeChequeIssueDate, setGuaranteeChequeIssueDate] = useState(today);
  const [guaranteeChequeDueDate, setGuaranteeChequeDueDate] = useState("");
  const [guaranteeChequeFile, setGuaranteeChequeFile] = useState<File | null>(
    null,
  );
  const [otherDueFiles, setOtherDueFiles] = useState<File[]>([]);
  const [selectedDueDetail, setSelectedDueDetail] = useState<DueItem | null>(
    null,
  );
  const [dueDocuments, setDueDocuments] = useState<DueDateDocument[]>([]);
  const [dueDocumentLoading, setDueDocumentLoading] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    default_method: "cash",
    default_settlement_type: "immediate",
    default_due_days: 30,
    default_installments: 3,
    grace_days: 0,
  });
  const [chequeBank, setChequeBank] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeOwnerName, setChequeOwnerName] = useState("");
  const [chequeOwnerCin, setChequeOwnerCin] = useState("");
  const [chequeCopyFile, setChequeCopyFile] = useState<File | null>(null);
  const [chequeOwnerCinFile, setChequeOwnerCinFile] = useState<File | null>(null);
  const [chequeDepositDate, setChequeDepositDate] = useState(today);
  const [chequeCashingDate, setChequeCashingDate] = useState("");
  const [chequeActualCashingDate, setChequeActualCashingDate] = useState("");
  const [chequeActualDepositDate, setChequeActualDepositDate] = useState("");
  const [chequeCollectionMethod, setChequeCollectionMethod] = useState<"DEPOT_BANCAIRE" | "ESPECES">("DEPOT_BANCAIRE");
  const [chequeRejectionReason, setChequeRejectionReason] = useState("");
  const [chequeStatus, setChequeStatus] = useState("RECU");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [overviewView, setOverviewView] = useState<
    "all" | "payments" | "rap" | "due" | "overdue"
  >("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPagination, setPaymentPagination] = useState({
    page: 1,
    page_size: 10,
    total_items: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });
  const [collectedSummary, setCollectedSummary] = useState({
    amount: 0,
    count: 0,
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
  const feeById = useMemo(
    () => new Map(fees.map((fee) => [fee.id, fee])),
    [fees],
  );
  const paymentSequenceById = useMemo(() => {
    const grouped = new Map<string, Payment[]>();
    for (const payment of payments) {
      const group = grouped.get(payment.fee_id) ?? [];
      group.push(payment);
      grouped.set(payment.fee_id, group);
    }
    const sequence = new Map<string, { index: number; total: number }>();
    for (const group of grouped.values()) {
      const ordered = [...group].sort(
        (left, right) =>
          new Date(left.paid_at).getTime() - new Date(right.paid_at).getTime(),
      );
      ordered.forEach((payment, index) =>
        sequence.set(payment.id, { index: index + 1, total: ordered.length }),
      );
    }
    return sequence;
  }, [payments]);
  const patientRap = useMemo(() => {
    const values = new Map<string, number>();
    for (const fee of fees)
      values.set(
        fee.patient_id,
        (values.get(fee.patient_id) ?? 0) + Math.max(0, fee.remaining_amount),
      );
    return values;
  }, [fees]);
  const patientsWithRap = useMemo(
    () =>
      patients.filter(
        (patient) =>
          (patientRap.get(patient.id) ?? 0) > 0 ||
          (patient.id === patientId && Boolean(editingId)),
      ),
    [editingId, patientId, patientRap, patients],
  );

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const [
        loadedPayments,
        loadedFees,
        loadedPatients,
        loadedInvoices,
        loadedDueItems,
        loadedBankAccounts,
      ] = await Promise.all([
        apiPage<Payment>(
          `/payments?page=${paymentPage}&page_size=10&search=${encodeURIComponent(search)}${
            methodFilter !== "all"
              ? `&method=${encodeURIComponent(methodFilter)}`
              : ""
          }&sort_by=created_at&sort_order=desc`,
          session.accessToken,
        ),
        apiList<Fee>("/honoraires", session.accessToken),
        apiList<Patient>("/patients", session.accessToken),
        apiList<Invoice>("/invoices", session.accessToken),
        apiList<DueItem>("/echeances", session.accessToken),
        apiList<BankAccount>("/bank-accounts?active=true", session.accessToken),
      ]);
      const paymentPageResult = loadedPayments;
      const pagePayments = paymentPageResult.items;
      const documents = (
        await Promise.all(
          pagePayments.map((payment) =>
            apiList<PaymentDocument>(
              `/paiements/${payment.id}/documents`,
              session.accessToken,
            ).catch(() => []),
          ),
        )
      ).flat();
      setPayments(pagePayments);
      setPaymentPagination(paymentPageResult.pagination);
      setCollectedSummary({
        amount: numeric(paymentPageResult.summary?.collected_payments),
        count: numeric(paymentPageResult.summary?.collected_count),
      });
      setFees(loadedFees);
      setPatients(
        loadedPatients.filter((patient) => patient.status !== "disabled"),
      );
      setInvoices(loadedInvoices);
      setDueItems(loadedDueItems);
      setBankAccounts(loadedBankAccounts);
      setPaymentDocuments(documents);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken,paymentPage,search,methodFilter]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(()=>setPaymentPage(1),[search,methodFilter]);
  useEffect(() => {
    if (!session?.accessToken) return;
    apiGet<PaymentSettings>("/doctor/payment-settings", session.accessToken)
      .then((settings) => {
        setPaymentSettings(settings);
        setMethod(settings.default_method);
        setPaymentMainType(
          settings.default_method === "cash" ? "ESPECE" : "BANQUE",
        );
      })
      .catch(() => undefined);
  }, [session?.accessToken]);

  const patientFees = useMemo(
    () =>
      fees.filter(
        (fee) =>
          fee.patient_id === patientId &&
          (fee.remaining_amount > 0 || fee.id === feeId),
      ),
    [feeId, fees, patientId],
  );
  const selectedFee = fees.find((fee) => fee.id === feeId);
  const selectedInvoice = invoices.find((invoice) => invoice.fee_id === feeId);
  const availableDueItems = dueItems.filter(
    (item) =>
      item.invoice_id === selectedInvoice?.id &&
      !["PAYEE", "ANNULEE"].includes(item.status),
  );
  const selectedDue = dueItems.find((item) => item.id === dueDateId);
  const maximumPayment = !editingId
    ? settlesDue && selectedDue
      ? selectedDue.remaining_amount
      : selectedFee?.remaining_amount
    : undefined;
  const totalPaid = collectedSummary.amount;
  const totalRemaining = useMemo(
    () => fees.reduce((sum, fee) => sum + numeric(fee.remaining_amount), 0),
    [fees],
  );
  const dueTotals = useMemo(
    () =>
      dueItems
        .filter((item) => item.status !== "ANNULEE")
        .reduce(
          (sum, item) => ({
            expected: sum.expected + numeric(item.amount),
            paid: sum.paid + numeric(item.paid_amount),
            remaining: sum.remaining + numeric(item.remaining_amount),
            late:
              sum.late +
              (item.status === "EN_RETARD"
                ? numeric(item.remaining_amount)
                : 0),
          }),
          { expected: 0, paid: 0, remaining: 0, late: 0 },
        ),
    [dueItems],
  );
  const openRapFees = useMemo(() => {
    const feeIdByInvoice = new Map(
      invoices.map((invoice) => [invoice.id, invoice.fee_id]),
    );
    const scheduledByFee = new Map<string, number>();
    for (const item of dueItems) {
      if (["PAYEE", "ANNULEE"].includes(item.status)) continue;
      const linkedFeeId = item.fee_id ?? feeIdByInvoice.get(item.invoice_id);
      if (!linkedFeeId) continue;
      scheduledByFee.set(
        linkedFeeId,
        (scheduledByFee.get(linkedFeeId) ?? 0) + numeric(item.remaining_amount),
      );
    }
    return fees
      .map((fee) => ({
        fee,
        amount: Math.max(
          0,
          numeric(fee.remaining_amount) - (scheduledByFee.get(fee.id) ?? 0),
        ),
      }))
      .filter((item) => item.amount > 0.005);
  }, [dueItems, fees, invoices]);
  const openRapTotal = useMemo(
    () => openRapFees.reduce((sum, item) => sum + item.amount, 0),
    [openRapFees],
  );
  const overviewStats = useMemo(
    () => ({
      all: {
        count:
          paymentPagination.total_items +
          fees.filter((fee) => fee.remaining_amount > 0).length,
        amount: totalPaid + totalRemaining,
      },
      payments: { count: collectedSummary.count, amount: totalPaid },
      rap: {
        count: openRapFees.length,
        amount: openRapTotal,
      },
      due: {
        count: dueItems.filter(
          (item) => !["PAYEE", "ANNULEE"].includes(item.status),
        ).length,
        amount: dueTotals.remaining,
      },
      overdue: {
        count: dueItems.filter((item) => item.status === "EN_RETARD").length,
        amount: dueTotals.late,
      },
    }),
    [
      dueItems,
      dueTotals.late,
      dueTotals.remaining,
      fees,
      collectedSummary.count,
      openRapFees.length,
      openRapTotal,
      paymentPagination.total_items,
      totalPaid,
      totalRemaining,
    ],
  );
  const filteredDueItems = useMemo(
    () =>
      dueItems.filter((item) =>
        overviewView === "overdue"
          ? item.status === "EN_RETARD"
          : !["PAYEE", "ANNULEE"].includes(item.status),
      ),
    [dueItems, overviewView],
  );
  const visiblePayments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return payments.filter((payment) => {
      if (methodFilter !== "all" && payment.method !== methodFilter)
        return false;
      const patient = patientById.get(payment.patient_id);
      if (!query) return true;
      return `${patient?.first_name ?? ""} ${patient?.last_name ?? ""} ${patient?.phone ?? ""} ${methods[payment.method] ?? payment.method}`
        .toLocaleLowerCase("fr")
        .includes(query);
    });
  }, [methodFilter, patientById, payments, search]);
  const visiblePaymentGroups = useMemo(() => {
    const grouped = new Map<string, Payment[]>();
    for (const payment of visiblePayments) {
      const group = grouped.get(payment.fee_id) ?? [];
      group.push(payment);
      grouped.set(payment.fee_id, group);
    }
    return [...grouped.entries()]
      .map(([feeId, groupPayments]) => ({
        feeId,
        payments: [...groupPayments].sort(
          (left, right) =>
            new Date(left.paid_at).getTime() -
            new Date(right.paid_at).getTime(),
        ),
        latestAt: Math.max(
          ...groupPayments.map((payment) =>
            new Date(payment.paid_at).getTime(),
          ),
        ),
      }))
      .sort((left, right) => right.latestAt - left.latestAt);
  }, [visiblePayments]);
  const totalFees = useMemo(
    () => fees.reduce((sum, fee) => sum + numeric(fee.amount), 0),
    [fees],
  );
  const cards: Array<{
    label: string;
    value: number;
    icon: LucideIcon;
    colors: string;
  }> = [
    {
      label: "Total des honoraires",
      value: totalFees,
      icon: Banknote,
      colors: "bg-atlas-mist text-atlas-teal",
    },
    {
      label: "Paiements encaissés",
      value: totalPaid,
      icon: CheckCircle2,
      colors: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Reste à payer total (RAP)",
      value: totalRemaining,
      icon: WalletCards,
      colors: "bg-amber-50 text-amber-600",
    },
  ];

  function resetForm() {
    setEditingId(null);
    setPatientId("");
    setFeeId("");
    setDueDateId("");
    setSettlesDue(false);
    setScheduleDue(false);
    setNewDueDate("");
    setNewDueComment("");
    setGuaranteeType("NORMAL");
    setGuarantorName("");
    setGuarantorCin("");
    setGuarantorCinFile(null);
    setGuaranteeChequeBank("");
    setGuaranteeChequeNumber("");
    setGuaranteeChequeIssueDate(today());
    setGuaranteeChequeDueDate("");
    setGuaranteeChequeFile(null);
    setOtherDueFiles([]);
    setAmount("");
    setMethod(paymentSettings.default_method);
    setBankAccountId(
      paymentSettings.default_method === "cash"
        ? ""
        : (bankAccounts.find((item) => item.is_default)?.id ??
            bankAccounts[0]?.id ??
            ""),
    );
    setPaymentMainType(
      paymentSettings.default_method === "cash" ? "ESPECE" : "BANQUE",
    );
    setChequeBank("");
    setChequeNumber("");
    setChequeOwnerName("");
    setChequeOwnerCin("");
    setChequeCopyFile(null);
    setChequeOwnerCinFile(null);
    setChequeDepositDate(today());
    setChequeCashingDate("");
    setChequeActualCashingDate("");
    setChequeActualDepositDate("");
    setChequeCollectionMethod("DEPOT_BANCAIRE");
    setChequeRejectionReason("");
    setChequeStatus("RECU");
  }
  function startChequeFollowUp(payment: Payment) {
    setEditingId(payment.id);
    setPatientId(payment.patient_id);
    setFeeId(payment.fee_id);
    setDueDateId(payment.due_date_id ?? "");
    setSettlesDue(Boolean(payment.due_date_id));
    setAmount(String(payment.amount));
    setMethod(payment.method);
    setBankAccountId(payment.bank_account_id ?? "");
    setPaymentMainType(payment.method === "cash" ? "ESPECE" : "BANQUE");
    setChequeBank(payment.cheque_bank ?? "");
    setChequeNumber(payment.cheque_number ?? "");
    setChequeOwnerName(payment.cheque_owner_name ?? "");
    setChequeOwnerCin(payment.cheque_owner_cin ?? "");
    setChequeCopyFile(null);
    setChequeOwnerCinFile(null);
    setChequeDepositDate(
      payment.cheque_issue_date ?? payment.cheque_deposit_date ?? today(),
    );
    setChequeCashingDate(payment.cheque_expected_cashing_date ?? "");
    setChequeActualCashingDate(payment.cheque_cashing_date ?? "");
    setChequeActualDepositDate(payment.cheque_deposit_date ?? "");
    setChequeCollectionMethod(payment.cheque_collection_method ?? "DEPOT_BANCAIRE");
    setChequeRejectionReason(payment.cheque_rejection_reason ?? "");
    setChequeStatus(payment.cheque_status === "EN_ATTENTE" ? "RECU" : (payment.cheque_status ?? "RECU"));
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function choosePatient(value: string) {
    setPatientId(value);
    setFeeId("");
    setDueDateId("");
    setSettlesDue(false);
    setAmount("");
  }
  function chooseFee(value: string) {
    setFeeId(value);
    const fee = fees.find((item) => item.id === value);
    // Selecting an honoraire collects against its global RAP. Linking an
    // échéance must be an explicit user action.
    setSettlesDue(false);
    setDueDateId("");
    if (fee) setAmount(String(fee.remaining_amount));
  }
  function scrollToCollectionForm() {
    window.requestAnimationFrame(() =>
      document
        .getElementById("payment-collection-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }
  function startCollection(
    fee?: Fee,
    due?: DueItem,
    generalAmount?: number,
  ) {
    resetForm();
    setMessage("");
    setLastPayment(null);
    if (!fee) {
      scrollToCollectionForm();
      return;
    }
    setPatientId(fee.patient_id);
    setFeeId(fee.id);
    setScheduleDue(false);
    if (due) {
      setSettlesDue(true);
      setDueDateId(due.id);
      setAmount(
        String(Math.min(fee.remaining_amount, due.remaining_amount)),
      );
    } else if (generalAmount !== undefined) {
      setSettlesDue(false);
      setDueDateId("");
      setAmount(String(Math.min(fee.remaining_amount, generalAmount)));
    } else {
      chooseFee(fee.id);
    }
    scrollToCollectionForm();
  }
  function togglePaymentGroup(feeId: string) {
    setExpandedPaymentGroup((current) => (current === feeId ? null : feeId));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session?.accessToken || readOnly) return;
    const numericAmount = Number(amount);
    if (
      !scheduleDue &&
      !["cash", "cheque"].includes(method) &&
      !bankAccountId
    ) {
      setMessage(
        "Choisissez le compte bancaire du cabinet concerné par cette transaction.",
      );
      return;
    }
    if (scheduleDue) {
      if (
        !feeId ||
        !newDueDate ||
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0 ||
        (selectedFee && numericAmount > selectedFee.remaining_amount)
      ) {
        setMessage(
          "Renseignez une date et un montant d’échéance inférieur ou égal au RAP.",
        );
        return;
      }
      if (
        guaranteeType === "GUARANTOR" &&
        (!guarantorName.trim() ||
          !guarantorCin.trim() ||
          !guarantorCinFile)
      ) {
        setMessage(
          "Renseignez le nom, la CIN du garant et importez une copie de sa CIN.",
        );
        return;
      }
      if (
        guaranteeType === "CHEQUE" &&
        (!guaranteeChequeBank.trim() ||
          !guaranteeChequeNumber.trim() ||
          !guaranteeChequeIssueDate ||
          !guaranteeChequeDueDate ||
          !guaranteeChequeFile)
      ) {
        setMessage(
          "Renseignez le chèque de garantie et importez une copie du chèque.",
        );
        return;
      }
      if (
        guaranteeType === "CHEQUE" &&
        guaranteeChequeDueDate < guaranteeChequeIssueDate
      ) {
        setMessage(
          "La date d’échéance du chèque ne peut pas précéder sa date d’émission.",
        );
        return;
      }
      setSaving(true);
      setMessage("");
      try {
        const invoice = await apiCreate<Invoice>(
          `/invoices/from-honoraire/${feeId}`,
          session.accessToken,
          {},
        );
        const due = await apiCreate<DueItem>(
          `/invoices/${invoice.id}/echeances`,
          session.accessToken,
          {
            amount: numericAmount,
            due_date: newDueDate,
            comment: newDueComment.trim() || null,
            guarantee_type: guaranteeType,
            guarantor_name:
              guaranteeType === "GUARANTOR"
                ? guarantorName.trim()
                : null,
            guarantor_cin:
              guaranteeType === "GUARANTOR" ? guarantorCin.trim() : null,
            guarantee_cheque_bank:
              guaranteeType === "CHEQUE"
                ? guaranteeChequeBank.trim()
                : null,
            guarantee_cheque_number:
              guaranteeType === "CHEQUE"
                ? guaranteeChequeNumber.trim()
                : null,
            guarantee_cheque_issue_date:
              guaranteeType === "CHEQUE"
                ? guaranteeChequeIssueDate
                : null,
            guarantee_cheque_due_date:
              guaranteeType === "CHEQUE" ? guaranteeChequeDueDate : null,
          },
        );
        const uploads: Promise<DueDateDocument>[] = [];
        if (guaranteeType === "GUARANTOR" && guarantorCinFile) {
          uploads.push(
            apiUpload<DueDateDocument>(
              `/echeances/${due.id}/documents`,
              session.accessToken,
              {
                document_type: "GUARANTOR_CIN",
                title: `CIN du garant ${guarantorName.trim()}`,
                file: guarantorCinFile,
              },
            ),
          );
        }
        if (guaranteeType === "CHEQUE" && guaranteeChequeFile) {
          uploads.push(
            apiUpload<DueDateDocument>(
              `/echeances/${due.id}/documents`,
              session.accessToken,
              {
                document_type: "CHEQUE",
                title: `Chèque ${guaranteeChequeNumber.trim()}`,
                file: guaranteeChequeFile,
              },
            ),
          );
        }
        if (guaranteeType !== "NORMAL") {
          otherDueFiles.forEach((file, index) => {
            uploads.push(
              apiUpload<DueDateDocument>(
                `/echeances/${due.id}/documents`,
                session.accessToken,
                {
                  document_type: "OTHER",
                  title: `Justificatif complémentaire ${index + 1}`,
                  file,
                },
              ),
            );
          });
        }
        try {
          await Promise.all(uploads);
        } catch (uploadError) {
          resetForm();
          await load();
          setMessage(
            `Échéance créée, mais une pièce n’a pas pu être importée : ${
              uploadError instanceof Error
                ? uploadError.message
                : "import impossible"
            }. Vous pouvez la retrouver dans les échéances.`,
          );
          return;
        }
        resetForm();
        await load();
        setMessage(
          guaranteeType === "NORMAL"
            ? "Échéance simple créée avec succès. Aucun paiement n’a été enregistré."
            : "Échéance et justificatifs enregistrés avec succès. Aucun paiement n’a été encaissé.",
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Création de l’échéance impossible.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }
    if (settlesDue && !dueDateId) {
      setMessage("Choisissez l’échéance que ce paiement doit régler.");
      return;
    }
    if (
      settlesDue &&
      selectedDue &&
      numericAmount > selectedDue.remaining_amount
    ) {
      setMessage(
        `Le montant maximum pour cette échéance est ${money(selectedDue.remaining_amount)}.`,
      );
      setAmount(String(selectedDue.remaining_amount));
      return;
    }
    if (
      method === "cheque" &&
      (!chequeBank.trim() ||
        !chequeNumber.trim() ||
        !chequeOwnerName.trim() ||
        !chequeOwnerCin.trim() ||
        (!editingId && (!chequeCopyFile || !chequeOwnerCinFile)) ||
        !chequeDepositDate ||
        !chequeCashingDate)
    ) {
      setMessage(
        "Renseignez le chèque, son propriétaire, sa CIN et importez les copies du chèque et de la CIN.",
      );
      return;
    }
    if (method === "cheque" && chequeCashingDate < chequeDepositDate) {
      setMessage(
        "La date d’encaissement ne peut pas précéder la date d’émission.",
      );
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      let createdPayment: Payment | null = null;
      const chequeDetails =
        method === "cheque"
          ? {
              cheque_bank: chequeBank.trim(),
              cheque_number: chequeNumber.trim(),
              cheque_owner_name: chequeOwnerName.trim(),
              cheque_owner_cin: chequeOwnerCin.trim().toUpperCase(),
              cheque_issue_date: chequeDepositDate,
              cheque_expected_cashing_date: chequeCashingDate,
              cheque_deposit_date: chequeStatus === "DEPOSE" || chequeStatus === "ENCAISSE" ? chequeActualDepositDate || null : null,
              cheque_cashing_date: chequeStatus === "ENCAISSE" ? chequeActualCashingDate || null : null,
              cheque_collection_method: chequeStatus === "ENCAISSE" || chequeStatus === "DEPOSE" ? chequeCollectionMethod : null,
              cheque_rejection_reason: chequeStatus === "REJETE" ? chequeRejectionReason.trim() : null,
              cheque_status: editingId ? chequeStatus : "RECU",
            }
          : {
              cheque_bank: null,
              cheque_number: null,
              cheque_issue_date: null,
              cheque_cashing_date: null,
              cheque_status: null,
            };
      const payload = {
        amount: numericAmount,
        method,
        bank_account_id:
          method === "cash" || !bankAccountId.trim() ? null : bankAccountId,
        due_date_id: settlesDue ? dueDateId : null,
        payment_type: "immediate",
        due_date: null,
        installment_count: null,
        ...chequeDetails,
      };
      if (editingId)
        await apiUpdate<Payment>(
          `/payments/${editingId}`,
          session.accessToken,
          payload,
        );
      else
        createdPayment = await apiCreate<Payment>(
          "/payments",
          session.accessToken,
          { patient_id: patientId, fee_id: feeId, ...payload },
        );
      if (createdPayment && method === "cheque" && chequeCopyFile && chequeOwnerCinFile) {
        await apiUpload(
          `/payments/${createdPayment.id}/cheque-documents`,
          session.accessToken,
          { cheque_file: chequeCopyFile, owner_cin_file: chequeOwnerCinFile },
        );
      }
      const wasEditing = Boolean(editingId);
      resetForm();
      await load();
      if (createdPayment) setLastPayment(createdPayment);
      setMessage(
        wasEditing
          ? "Suivi du chèque enregistré avec succès."
          : "Paiement enregistré avec succès.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function remove(payment: Payment) {
    if (
      !session?.accessToken ||
      readOnly ||
      !canDelete ||
      !(await confirmAction({
        title: "Annuler ce paiement ?",
        message:
          "Le paiement restera dans l’historique avec le statut Annulé et tous les montants seront recalculés.",
        confirmLabel: "Annuler le paiement",
        tone: "danger",
      }))
    )
      return;
    try {
      await apiDelete(`/payments/${payment.id}`, session.accessToken);
      if (editingId === payment.id) resetForm();
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Suppression impossible.",
      );
    }
  }
  async function sendWhatsAppReminder(fee: Fee) {
    if (!session?.accessToken || fee.remaining_amount <= 0) return;
    try {
      const result = await apiCreate<{ status: string }>(
        `/honoraires/${fee.id}/send-payment-reminder`,
        session.accessToken,
        {},
      );
      setMessage(
        result.status === "echec"
          ? "La relance WhatsApp a échoué. Consultez le journal WhatsApp."
          : "Relance WhatsApp envoyée et enregistrée dans la fiche patient.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Relance WhatsApp impossible.",
      );
    }
  }
  async function cancelDue(item: DueItem) {
    if (
      !session?.accessToken ||
      readOnly ||
      !(await confirmAction({
        title: "Annuler cette échéance ?",
        message:
          "L’échéance sera marquée comme annulée et ne sera plus incluse dans les sommes attendues.",
        confirmLabel: "Annuler l’échéance",
        tone: "warning",
      }))
    )
      return;
    try {
      await apiCreate(`/echeances/${item.id}/cancel`, session.accessToken, {});
      await load();
      setMessage("Échéance annulée avec succès.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Annulation impossible.",
      );
    }
  }
  async function generateDocument(payment: Payment, type: "recu" | "facture") {
    if (!session?.accessToken) return;
    setDocumentLoading(`${payment.id}:${type}`);
    try {
      const document = await apiCreate<PaymentDocument>(
        `/paiements/${payment.id}/documents`,
        session.accessToken,
        { document_type: type },
      );
      await load();
      setLastPayment(null);
      setMessage(
        `${type === "recu" ? "Ticket de caisse" : "Facture"} ${document.document_number} généré${type === "recu" ? "" : "e"} avec succès.`,
      );
      const preview = await apiPreview(
        `/documents-paiement/${document.id}/preview`,
        session.accessToken,
      );
      window.open(preview.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Génération du PDF impossible.",
      );
    } finally {
      setDocumentLoading(null);
    }
  }
  async function previewDocument(document: PaymentDocument) {
    if (!session?.accessToken) return;
    try {
      const preview = await apiPreview(
        `/documents-paiement/${document.id}/preview`,
        session.accessToken,
      );
      window.open(preview.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Aperçu indisponible.",
      );
    }
  }
  async function downloadDocument(document: PaymentDocument) {
    if (!session?.accessToken) return;
    try {
      await apiDownload(
        `/documents-paiement/${document.id}/download`,
        session.accessToken,
        `${document.document_number}.pdf`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Téléchargement impossible.",
      );
    }
  }
  async function openDueDocuments(item: DueItem) {
    if (!session?.accessToken) return;
    setSelectedDueDetail(item);
    setDueDocumentLoading(true);
    try {
      setDueDocuments(
        await apiList<DueDateDocument>(
          `/echeances/${item.id}/documents`,
          session.accessToken,
        ),
      );
    } catch (error) {
      setDueDocuments([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "Chargement des justificatifs impossible.",
      );
    } finally {
      setDueDocumentLoading(false);
    }
  }
  async function previewDueDocument(document: DueDateDocument) {
    if (!session?.accessToken) return;
    try {
      const preview = await apiPreview(
        `/documents-echeance/${document.id}/preview`,
        session.accessToken,
      );
      window.open(preview.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Aperçu indisponible.",
      );
    }
  }
  async function downloadDueDocument(document: DueDateDocument) {
    if (!session?.accessToken) return;
    try {
      await apiDownload(
        `/documents-echeance/${document.id}/download`,
        session.accessToken,
        document.original_filename,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Téléchargement impossible.",
      );
    }
  }

  const content = (
    <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">
            Gestion financière
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            Paiements / RAP
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enregistrez les règlements et suivez immédiatement les restes à
            payer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => startCollection()}
            className="inline-flex items-center gap-2 rounded-[8px] bg-atlas-teal px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-atlas-petrol disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Banknote size={18} />
            Encaisser
          </button>
          {mode === "doctor" && (
            <button
              type="button"
              onClick={() =>
                onNavigate("/doctor/settings#configuration-paiements")
              }
              className="inline-flex items-center gap-2 rounded-[8px] border border-atlas-teal/30 bg-white px-4 py-2.5 text-sm font-bold text-atlas-teal shadow-sm hover:bg-atlas-mist"
            >
              <Settings2 size={17} />
              Configuration
            </button>
          )}
        </div>
      </header>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, colors }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-[12px] border border-atlas-line bg-white p-4 shadow-sm"
          >
            <span
              className={`grid h-11 w-11 place-items-center rounded-full ${colors}`}
            >
              <Icon size={21} />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <p
                className={`mt-1 text-xl font-bold ${label.includes("RAP") ? "text-amber-700" : ""}`}
              >
                {money(value)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <section className="mt-6 rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-atlas-teal">
              Pilotage financier
            </p>
            <h2 className="mt-1 font-display text-xl font-bold">
              Vue globale des paiements et RAP
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Filtrez par situation puis par mode de règlement pour retrouver
              rapidement les encaissements, RAP et retards.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["all", "Tout"],
              ["payments", "Encaissé"],
              ["rap", "RAP ouvert"],
              ["due", "Échéances"],
              ["overdue", "En retard"],
            ] as const
          ).map(([value, label]) => {
            const stat = overviewStats[value];
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setOverviewView(value);
                  if (!["all", "payments"].includes(value))
                    setMethodFilter("all");
                }}
                className={`rounded-[9px] border px-3 py-3 text-left transition ${overviewView === value ? "border-atlas-teal bg-atlas-mist text-atlas-petrol ring-2 ring-atlas-teal/10" : "border-atlas-line bg-white text-slate-600 hover:bg-slate-50"}`}
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
        {["all", "payments"].includes(overviewView) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[9px] border border-slate-200 bg-slate-50 p-2">
            <span className="px-2 text-xs font-bold text-slate-600">
              Mode :
            </span>
            {[["all", "Tous"], ...Object.entries(methods)].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethodFilter(value)}
                  className={`rounded-[7px] px-3 py-2 text-xs font-bold transition ${methodFilter === value ? "bg-white text-atlas-petrol shadow-sm ring-1 ring-atlas-teal/30" : "text-slate-500 hover:bg-white"}`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        )}
        {overviewView === "rap" ? (
          <div className="mt-4 space-y-2">
            {openRapFees.map(({ fee, amount: unscheduledAmount }) => {
              const patient = patientById.get(fee.patient_id);
              return (
                <article
                  key={fee.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-atlas-line p-4"
                >
                  <div>
                    <p className="font-bold">
                      {patient
                        ? `${patient.first_name} ${patient.last_name}`
                        : "Patient"}{" "}
                      · {fee.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Payé {money(fee.paid_amount)} sur {money(fee.amount)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-800">
                      RAP hors échéance {money(unscheduledAmount)}
                    </span>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        startCollection(fee, undefined, unscheduledAmount)
                      }
                      className="rounded-[8px] bg-atlas-teal px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-atlas-petrol disabled:opacity-40"
                    >
                      Encaisser
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : ["due", "overdue"].includes(overviewView) ? (
          filteredDueItems.length ? (
            <div className="mt-4 space-y-2">
              {filteredDueItems.map((item) => {
                const patient = patientById.get(item.patient_id);
                const fee = feeById.get(item.fee_id ?? "");
                const info = dueStatuses[item.status] ?? {
                  label: item.status,
                  className: "bg-slate-100 text-slate-700",
                };
                return (
                  <article
                    key={item.id}
                    className="rounded-[9px] border border-atlas-line p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">
                          {patient
                            ? `${patient.first_name} ${patient.last_name}`
                            : "Patient"}{" "}
                          · {fee?.title ?? "Honoraire"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Date limite :{" "}
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "long",
                          }).format(new Date(`${item.due_date}T12:00:00`))}
                          {item.comment ? ` · ${item.comment}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            {guaranteeLabels[item.guarantee_type ?? "NORMAL"]}
                          </span>
                          {item.guarantee_type === "GUARANTOR" && (
                            <span className="text-blue-700">
                              {item.guarantor_name} · CIN{" "}
                              {maskedCin(item.guarantor_cin)}
                            </span>
                          )}
                          {item.guarantee_type === "CHEQUE" && (
                            <span className="text-amber-700">
                              {item.guarantee_cheque_bank} · N°{" "}
                              {item.guarantee_cheque_number}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${info.className}`}
                        >
                          {info.label}
                        </span>
                        {fee &&
                          item.remaining_amount > 0 &&
                          item.status !== "ANNULEE" && (
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => startCollection(fee, item)}
                              className="rounded-[7px] bg-atlas-teal px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-atlas-petrol disabled:opacity-40"
                            >
                              Encaisser
                            </button>
                          )}
                        {item.status !== "ANNULEE" &&
                          item.paid_amount === 0 && (
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={() => void cancelDue(item)}
                              className="rounded-[7px] border border-red-200 px-3 py-1 text-xs font-bold text-red-600 disabled:opacity-40"
                            >
                              Annuler
                            </button>
                          )}
                        {item.guarantee_type !== "NORMAL" && (
                          <button
                            type="button"
                            onClick={() => void openDueDocuments(item)}
                            className="inline-flex items-center gap-1 rounded-[7px] border border-atlas-line px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            <FileText size={14} />
                            Justificatifs
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded-[7px] bg-slate-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Prévu
                        </p>
                        <b>{money(item.amount)}</b>
                      </div>
                      <div className="rounded-[7px] bg-emerald-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-emerald-600">
                          Payé
                        </p>
                        <b className="text-emerald-700">
                          {money(item.paid_amount)}
                        </b>
                      </div>
                      <div className="rounded-[7px] bg-amber-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-amber-600">
                          Reste
                        </p>
                        <b className="text-amber-800">
                          {money(item.remaining_amount)}
                        </b>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-[8px] bg-slate-50 p-4 text-sm text-slate-500">
              Aucun élément ne correspond à ce filtre.
            </p>
          )
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(methods).map(([value, label]) => {
              const items = payments.filter(
                (payment) => payment.method === value,
              );
              const amount = items.reduce(
                (sum, payment) => sum + payment.amount,
                0,
              );
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMethodFilter(value)}
                  className={`rounded-[9px] border p-3 text-left ${methodFilter === value ? "border-atlas-teal bg-atlas-mist" : "border-atlas-line bg-white"}`}
                >
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-black text-emerald-700">
                    {money(amount)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {items.length} paiement{items.length > 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>
      {message && (
        <p
          className={`mt-5 rounded-[8px] border px-4 py-3 text-sm font-bold ${message.includes("succès") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}
        >
          {message}
        </p>
      )}
      {selectedDueDetail && (
        <div
          className="fixed inset-0 z-[85] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="due-documents-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedDueDetail(null);
              setDueDocuments([]);
            }
          }}
        >
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[16px] bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-atlas-line bg-white p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-atlas-teal">
                  Garantie de l’échéance
                </p>
                <h2
                  id="due-documents-title"
                  className="mt-1 font-display text-2xl font-bold"
                >
                  {guaranteeLabels[
                    selectedDueDetail.guarantee_type ?? "NORMAL"
                  ]}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Échéance du {selectedDueDetail.due_date} ·{" "}
                  {money(selectedDueDetail.amount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDueDetail(null);
                  setDueDocuments([]);
                }}
                aria-label="Fermer"
                className="rounded-full bg-slate-100 p-2 text-slate-500"
              >
                <X size={20} />
              </button>
            </header>
            <div className="p-5">
              {selectedDueDetail.guarantee_type === "GUARANTOR" && (
                <div className="grid gap-3 rounded-[10px] border border-blue-200 bg-blue-50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-500">
                      Garant
                    </p>
                    <p className="mt-1 font-bold text-blue-950">
                      {selectedDueDetail.guarantor_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-blue-500">
                      CIN
                    </p>
                    <p className="mt-1 font-bold text-blue-950">
                      {maskedCin(selectedDueDetail.guarantor_cin)}
                    </p>
                  </div>
                </div>
              )}
              {selectedDueDetail.guarantee_type === "CHEQUE" && (
                <div className="grid gap-3 rounded-[10px] border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-600">
                      Banque
                    </p>
                    <p className="mt-1 font-bold text-amber-950">
                      {selectedDueDetail.guarantee_cheque_bank}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-600">
                      Numéro
                    </p>
                    <p className="mt-1 font-bold text-amber-950">
                      {selectedDueDetail.guarantee_cheque_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-600">
                      Émission
                    </p>
                    <p className="mt-1 font-bold text-amber-950">
                      {selectedDueDetail.guarantee_cheque_issue_date}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-amber-600">
                      Échéance
                    </p>
                    <p className="mt-1 font-bold text-amber-950">
                      {selectedDueDetail.guarantee_cheque_due_date}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-5 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold">
                  Pièces importées
                </h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                  {dueDocuments.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {dueDocumentLoading ? (
                  <p className="rounded-[9px] bg-slate-50 p-5 text-center text-sm text-slate-500">
                    Chargement des justificatifs…
                  </p>
                ) : dueDocuments.length ? (
                  dueDocuments.map((document) => (
                    <article
                      key={document.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[9px] border border-atlas-line p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-atlas-mist text-atlas-teal">
                          <FileText size={18} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {document.title}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {document.original_filename} ·{" "}
                            {Math.max(1, Math.round(document.file_size / 1024))} Ko
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void previewDueDocument(document)}
                          className="rounded-[7px] bg-atlas-mist px-3 py-2 text-xs font-bold text-atlas-teal"
                        >
                          Ouvrir
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadDueDocument(document)}
                          className="rounded-[7px] border border-atlas-line px-3 py-2 text-xs font-bold text-slate-600"
                        >
                          Télécharger
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-[9px] border border-dashed border-atlas-line p-5 text-center text-sm text-slate-500">
                    Aucun justificatif importé.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
      {lastPayment && (
        <section className="mt-5 rounded-[12px] border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-display text-lg font-bold text-emerald-900">
            Paiement enregistré avec succès
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            Le paiement est conservé dans l’historique. Vous pouvez maintenant
            imprimer un ticket de caisse PDF de 80 mm ou générer une facture.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(documentLoading)}
              onClick={() => void generateDocument(lastPayment, "recu")}
              className="rounded-[8px] bg-atlas-teal px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              Générer le ticket de caisse
            </button>
            <button
              type="button"
              disabled={Boolean(documentLoading)}
              onClick={() => void generateDocument(lastPayment, "facture")}
              className="rounded-[8px] bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              Générer la facture
            </button>
            <button
              type="button"
              onClick={() => setLastPayment(null)}
              className="rounded-[8px] border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800"
            >
              Aucun document
            </button>
          </div>
        </section>
      )}
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[400px_1fr]">
        <form
          id="payment-collection-form"
          onSubmit={submit}
          className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm xl:sticky xl:top-6"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-atlas-mist text-atlas-teal">
              {editingId ? <CreditCard size={19} /> : <Plus size={20} />}
            </span>
            <div>
              <h2 className="font-display text-xl font-bold">
                {editingId ? "Suivi du chèque" : "Encaisser un paiement"}
              </h2>
              <p className="text-xs text-slate-500">
                Renseignez le règlement reçu
              </p>
            </div>
          </div>
          {!editingId && (
            <div className="mt-5 rounded-[9px] border border-atlas-line bg-slate-50 p-4">
              <p className="font-bold">Créer une échéance ?</p>
              <p className="mt-1 text-xs text-slate-500">
                Une échéance planifie un montant à payer plus tard. Ce n’est pas
                un mode de règlement et aucun encaissement n’est créé
                maintenant.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[8px] bg-white p-1">
                <button
                  type="button"
                  onClick={() => setScheduleDue(false)}
                  className={`rounded-[7px] py-2.5 text-sm font-bold ${!scheduleDue ? "bg-atlas-teal text-white" : "text-slate-500"}`}
                >
                  Non
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduleDue(true);
                    setSettlesDue(false);
                    setDueDateId("");
                  }}
                  className={`rounded-[7px] py-2.5 text-sm font-bold ${scheduleDue ? "bg-atlas-teal text-white" : "text-slate-500"}`}
                >
                  Oui
                </button>
              </div>
            </div>
          )}
          <label className="mt-5 block">
            <span className="text-sm font-bold">Patient avec un RAP *</span>
            <select
              required
              disabled={readOnly || Boolean(editingId)}
              value={patientId}
              onChange={(event) => choosePatient(event.target.value)}
              className={fieldClass}
            >
              <option value="">Choisir un patient à régler</option>
              {patientsWithRap.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name} · RAP{" "}
                  {money(patientRap.get(patient.id) ?? 0)}
                  {patient.phone ? ` · ${patient.phone}` : ""}
                </option>
              ))}
            </select>
            {!patientsWithRap.length && !editingId && (
              <span className="mt-2 block rounded-[8px] bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                Aucun patient n’a de reste à payer.
              </span>
            )}
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-bold">Honoraire concerné *</span>
            <select
              required
              disabled={readOnly || Boolean(editingId) || !patientId}
              value={feeId}
              onChange={(event) => chooseFee(event.target.value)}
              className={fieldClass}
            >
              <option value="">Choisir un honoraire</option>
              {patientFees.map((fee) => (
                <option key={fee.id} value={fee.id}>
                  {fee.title} · {money(fee.amount)} · RAP{" "}
                  {money(fee.remaining_amount)}
                </option>
              ))}
            </select>
          </label>
          {selectedFee && !editingId && (
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Total
                </p>
                <p className="mt-1 text-sm font-bold">
                  {money(selectedFee.amount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Payé
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-700">
                  {money(selectedFee.paid_amount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-amber-700">
                  RAP
                </p>
                <p className="mt-1 text-sm font-bold text-amber-800">
                  {money(selectedFee.remaining_amount)}
                </p>
              </div>
            </div>
          )}
          <label className="mt-4 block">
            <span className="text-sm font-bold">
              {scheduleDue ? "Montant attendu *" : "Montant reçu *"}
            </span>
            <div className="relative mt-2">
              <input
                required
                disabled={readOnly || Boolean(editingId)}
                type="number"
                min="0.01"
                max={maximumPayment}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
                className="w-full rounded-[8px] border border-atlas-line px-4 py-3 pr-16 text-lg font-bold outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                MAD
              </span>
            </div>
          </label>
          {scheduleDue && (
            <div className="mt-4 rounded-[9px] border border-atlas-teal/30 bg-atlas-mist p-4">
              <label className="block">
                <span className="text-sm font-bold">
                  Date limite de paiement *
                </span>
                <input
                  required
                  type="date"
                  value={newDueDate}
                  onChange={(event) => setNewDueDate(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="mt-3 block">
                <span className="text-sm font-bold">Commentaire</span>
                <input
                  value={newDueComment}
                  onChange={(event) => setNewDueComment(event.target.value)}
                  placeholder="Ex. À régler le 30/07/2026"
                  className={fieldClass}
                />
              </label>
              <div className="mt-4 border-t border-atlas-teal/20 pt-4">
                <p className="text-sm font-bold">Garantie de l’échéance *</p>
                <p className="mt-1 text-xs text-slate-500">
                  Une échéance simple ne demande aucun document.
                </p>
                <div className="mt-3 grid gap-2">
                  {(
                    [
                      ["NORMAL", "Simple", "Sans document"],
                      ["GUARANTOR", "Avec garant", "CIN obligatoire"],
                      ["CHEQUE", "Par chèque", "Copie obligatoire"],
                    ] as const
                  ).map(([value, label, description]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGuaranteeType(value)}
                      className={`rounded-[8px] border p-3 text-left transition ${
                        guaranteeType === value
                          ? "border-atlas-teal bg-white text-atlas-petrol ring-2 ring-atlas-teal/10"
                          : "border-transparent bg-white/60 text-slate-600"
                      }`}
                    >
                      <span className="block text-sm font-bold">{label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {guaranteeType === "GUARANTOR" && (
                <div className="mt-4 rounded-[9px] border border-blue-200 bg-blue-50/70 p-3">
                  <p className="font-bold text-blue-900">
                    Identité du garant
                  </p>
                  <label className="mt-3 block">
                    <span className="text-sm font-bold">Nom complet *</span>
                    <input
                      required
                      value={guarantorName}
                      onChange={(event) => setGuarantorName(event.target.value)}
                      placeholder="Nom et prénom du garant"
                      className={fieldClass}
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-sm font-bold">Numéro de CIN *</span>
                    <input
                      required
                      value={guarantorCin}
                      onChange={(event) =>
                        setGuarantorCin(event.target.value.toUpperCase())
                      }
                      placeholder="Ex. AB123456"
                      className={fieldClass}
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-sm font-bold">
                      Copie de la CIN *
                    </span>
                    <span className="mt-2 flex cursor-pointer items-center gap-3 rounded-[8px] border border-dashed border-blue-300 bg-white p-3 text-sm font-semibold text-blue-800">
                      <Upload size={18} />
                      {guarantorCinFile?.name ?? "Importer PDF ou image"}
                      <input
                        required
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.doc,.docx"
                        className="sr-only"
                        onChange={(event) =>
                          setGuarantorCinFile(event.target.files?.[0] ?? null)
                        }
                      />
                    </span>
                  </label>
                </div>
              )}
              {guaranteeType === "CHEQUE" && (
                <div className="mt-4 rounded-[9px] border border-amber-200 bg-amber-50/80 p-3">
                  <p className="font-bold text-amber-900">
                    Chèque de garantie
                  </p>
                  <label className="mt-3 block">
                    <span className="text-sm font-bold">Banque *</span>
                    <input
                      required
                      value={guaranteeChequeBank}
                      onChange={(event) =>
                        setGuaranteeChequeBank(event.target.value)
                      }
                      placeholder="Nom de la banque"
                      className={fieldClass}
                    />
                  </label>
                  <label className="mt-3 block">
                    <span className="text-sm font-bold">N° du chèque *</span>
                    <input
                      required
                      value={guaranteeChequeNumber}
                      onChange={(event) =>
                        setGuaranteeChequeNumber(event.target.value)
                      }
                      placeholder="Ex. CH-45821"
                      className={fieldClass}
                    />
                  </label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className="text-sm font-bold">Émission *</span>
                      <input
                        required
                        type="date"
                        value={guaranteeChequeIssueDate}
                        onChange={(event) =>
                          setGuaranteeChequeIssueDate(event.target.value)
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label>
                      <span className="text-sm font-bold">Échéance *</span>
                      <input
                        required
                        type="date"
                        min={guaranteeChequeIssueDate}
                        value={guaranteeChequeDueDate}
                        onChange={(event) =>
                          setGuaranteeChequeDueDate(event.target.value)
                        }
                        className={fieldClass}
                      />
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className="text-sm font-bold">
                      Copie du chèque *
                    </span>
                    <span className="mt-2 flex cursor-pointer items-center gap-3 rounded-[8px] border border-dashed border-amber-300 bg-white p-3 text-sm font-semibold text-amber-900">
                      <Upload size={18} />
                      {guaranteeChequeFile?.name ?? "Importer PDF ou image"}
                      <input
                        required
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.doc,.docx"
                        className="sr-only"
                        onChange={(event) =>
                          setGuaranteeChequeFile(
                            event.target.files?.[0] ?? null,
                          )
                        }
                      />
                    </span>
                  </label>
                </div>
              )}
              {guaranteeType !== "NORMAL" && (
                <label className="mt-4 block">
                  <span className="text-sm font-bold">
                    Autres justificatifs
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Facultatif · plusieurs fichiers possibles
                  </span>
                  <span className="mt-2 flex cursor-pointer items-center gap-3 rounded-[8px] border border-dashed border-atlas-line bg-white p-3 text-sm font-semibold text-slate-600">
                    <FileText size={18} />
                    {otherDueFiles.length
                      ? `${otherDueFiles.length} fichier(s) sélectionné(s)`
                      : "Ajouter d’autres documents"}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.doc,.docx"
                      className="sr-only"
                      onChange={(event) =>
                        setOtherDueFiles(Array.from(event.target.files ?? []))
                      }
                    />
                  </span>
                </label>
              )}
            </div>
          )}
          {!scheduleDue && (
            <label className="mt-4 block">
              <span className="text-sm font-bold">Type de règlement *</span>
              <select
                required
                disabled={readOnly || Boolean(editingId)}
                value={paymentMainType}
                onChange={(event) => {
                  const value = event.target.value as "ESPECE" | "BANQUE";
                  setPaymentMainType(value);
                  setMethod(value === "ESPECE" ? "cash" : "card");
                  setBankAccountId(
                    value === "ESPECE"
                      ? ""
                      : (bankAccounts.find((item) => item.is_default)?.id ??
                          bankAccounts[0]?.id ??
                          ""),
                  );
                }}
                className={fieldClass}
              >
                <option value="ESPECE">Espèces</option>
                <option value="BANQUE">Banque</option>
              </select>
            </label>
          )}
          {!scheduleDue && (
            <label className="mt-4 block">
              <span className="text-sm font-bold">Mode de paiement *</span>
              <select
                required
                disabled={readOnly || Boolean(editingId)}
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                className={fieldClass}
              >
                {Object.entries(methods)
                  .filter(([value]) =>
                    paymentMainType === "ESPECE"
                      ? value === "cash"
                      : value !== "cash",
                  )
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {!scheduleDue && paymentMainType === "BANQUE" && (
            <label className="mt-4 block">
              <span className="text-sm font-bold">
                Compte bancaire du cabinet {method === "cheque" ? "(facultatif)" : "*"}
              </span>
              <select
                required={method !== "cheque"}
                disabled={readOnly || Boolean(editingId) || (bankAccounts.length === 0 && method !== "cheque")}
                value={bankAccountId}
                onChange={(event) => setBankAccountId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Choisir le compte crédité</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.label} · {account.bank_name}
                    {account.is_default ? " · Par défaut" : ""}
                  </option>
                ))}
              </select>
              {bankAccounts.length === 0 && method !== "cheque" && (
                <button
                  type="button"
                  onClick={() =>
                    onNavigate("/doctor/settings#configuration-paiements")
                  }
                  className="mt-2 text-xs font-bold text-amber-700 underline"
                >
                  Ajouter d’abord un compte bancaire dans Configuration
                </button>
              )}
            </label>
          )}
          {!editingId && !scheduleDue && (
            <div className="mt-4 rounded-[9px] border border-atlas-line bg-slate-50 p-4">
              <p className="font-bold">Ce paiement règle une échéance ?</p>
              <p className="mt-1 text-xs text-slate-500">
                Choisissez Oui si ce paiement doit régler une échéance
                existante. Sinon, il sera enregistré comme un paiement normal.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[8px] bg-white p-1">
                <button
                  type="button"
                  onClick={() => {
                    setSettlesDue(false);
                    setDueDateId("");
                  }}
                  className={`rounded-[7px] py-2.5 text-sm font-bold ${!settlesDue ? "bg-atlas-teal text-white" : "text-slate-500"}`}
                >
                  Non
                </button>
                <button
                  type="button"
                  disabled={!feeId}
                  onClick={() => setSettlesDue(true)}
                  className={`rounded-[7px] py-2.5 text-sm font-bold disabled:opacity-40 ${settlesDue ? "bg-atlas-teal text-white" : "text-slate-500"}`}
                >
                  Oui
                </button>
              </div>
              {settlesDue && (
                <label className="mt-3 block">
                  <span className="text-sm font-bold">Échéance à régler *</span>
                  <select
                    required
                    disabled={readOnly || !feeId}
                    value={dueDateId}
                    onChange={(event) => {
                      const id = event.target.value;
                      const due = dueItems.find((item) => item.id === id);
                      setDueDateId(id);
                      if (due) setAmount(String(due.remaining_amount));
                    }}
                    className={fieldClass}
                  >
                    <option value="">Choisir une échéance</option>
                    {availableDueItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.due_date} · prévu {money(item.amount)} · payé{" "}
                        {money(item.paid_amount)} ·{" "}
                        {item.status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                  {feeId && availableDueItems.length === 0 && (
                    <span className="mt-2 block rounded-[7px] bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      Aucune échéance ouverte. Créez-la d’abord dans l’honoraire
                      concerné.
                    </span>
                  )}
                </label>
              )}
            </div>
          )}
          {!scheduleDue && method === "cheque" && (
            <div className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50/60 p-4">
              <p className="font-bold text-amber-900">Détails du chèque</p>
              <p className="mt-1 text-xs text-amber-700">
                Tous les champs marqués d’un astérisque sont obligatoires.
              </p>
              <label className="mt-3 block">
                <span className="text-sm font-bold">Banque *</span>
                <input
                  required
                  disabled={readOnly || Boolean(editingId)}
                  value={chequeBank}
                  onChange={(event) => setChequeBank(event.target.value)}
                  placeholder="Nom de la banque"
                  className={fieldClass}
                />
              </label>
              <label className="mt-3 block">
                <span className="text-sm font-bold">Numéro du chèque *</span>
                <input
                  required
                  disabled={readOnly || Boolean(editingId)}
                  value={chequeNumber}
                  onChange={(event) => setChequeNumber(event.target.value)}
                  placeholder="Ex. CH-45821"
                  className={fieldClass}
                />
              </label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label><span className="text-sm font-bold">Propriétaire du chèque *</span><input required disabled={readOnly||Boolean(editingId)} value={chequeOwnerName} onChange={event=>setChequeOwnerName(event.target.value)} placeholder="Nom complet" className={fieldClass}/></label>
                <label><span className="text-sm font-bold">CIN du propriétaire *</span><input required disabled={readOnly||Boolean(editingId)} value={chequeOwnerCin} onChange={event=>setChequeOwnerCin(event.target.value)} placeholder="Ex. AB123456" className={fieldClass}/></label>
              </div>
              {!editingId&&<div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label><span className="text-sm font-bold">Copie du chèque *</span><span className="mt-2 flex cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-amber-300 bg-white p-3 text-xs font-bold text-amber-900"><Upload size={17}/>{chequeCopyFile?.name??"Importer PDF ou image"}<input required type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff" className="sr-only" onChange={event=>setChequeCopyFile(event.target.files?.[0]??null)}/></span></label>
                <label><span className="text-sm font-bold">Copie de la CIN *</span><span className="mt-2 flex cursor-pointer items-center gap-2 rounded-[8px] border border-dashed border-amber-300 bg-white p-3 text-xs font-bold text-amber-900"><Upload size={17}/>{chequeOwnerCinFile?.name??"Importer PDF ou image"}<input required type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff" className="sr-only" onChange={event=>setChequeOwnerCinFile(event.target.files?.[0]??null)}/></span></label>
              </div>}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-bold">Date d’émission *</span>
                  <input
                    required
                    disabled={readOnly || Boolean(editingId)}
                    type="date"
                    value={chequeDepositDate}
                    onChange={(event) =>
                      setChequeDepositDate(event.target.value)
                    }
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className="text-sm font-bold">
                    Encaissement prévu / rappel *
                  </span>
                  <input
                    required
                    disabled={readOnly || Boolean(editingId)}
                    type="date"
                    min={chequeDepositDate}
                    value={chequeCashingDate}
                    onChange={(event) =>
                      setChequeCashingDate(event.target.value)
                    }
                    className={fieldClass}
                  />
                </label>
              </div>
              {editingId && (chequeStatus === "DEPOSE" || (chequeStatus === "ENCAISSE" && chequeCollectionMethod === "DEPOT_BANCAIRE")) && <label className="mt-3 block"><span className="text-sm font-bold">Date de dépôt bancaire *</span><input required type="date" value={chequeActualDepositDate} onChange={event=>setChequeActualDepositDate(event.target.value)} className={fieldClass}/></label>}
              {editingId && chequeStatus === "ENCAISSE" && <><label className="mt-3 block"><span className="text-sm font-bold">Mode d’encaissement réel *</span><select value={chequeCollectionMethod} onChange={event=>setChequeCollectionMethod(event.target.value as "DEPOT_BANCAIRE"|"ESPECES")} className={fieldClass}><option value="DEPOT_BANCAIRE">Dépôt sur un compte bancaire du cabinet</option><option value="ESPECES">Remis en espèces</option></select></label><label className="mt-3 block"><span className="text-sm font-bold">Date d’encaissement réelle *</span><input required type="date" value={chequeActualCashingDate} onChange={event=>setChequeActualCashingDate(event.target.value)} className={fieldClass}/></label></>}
              {editingId && chequeStatus === "REJETE" && <label className="mt-3 block"><span className="text-sm font-bold">Motif du rejet *</span><textarea required value={chequeRejectionReason} onChange={event=>setChequeRejectionReason(event.target.value)} placeholder="Ex. provision insuffisante, opposition, signature non conforme…" className={fieldClass}/></label>}
              <label className="mt-3 block">
                <span className="text-sm font-bold">{editingId ? "Étape du chèque" : "Statut initial"}</span>
                <select
                  value={chequeStatus}
                  disabled={!editingId}
                  onChange={(event) => setChequeStatus(event.target.value)}
                  className={fieldClass}
                >
                  {Object.entries(chequeStatuses).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <button
            disabled={readOnly || saving}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-atlas-teal px-5 py-3.5 font-bold text-white hover:bg-atlas-petrol disabled:opacity-50"
          >
            <CheckCircle2 size={18} />
            {saving
              ? "Enregistrement…"
              : scheduleDue
                ? "Créer l’échéance"
                : editingId
                  ? "Enregistrer le suivi du chèque"
                  : "Encaisser le paiement"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[8px] border border-atlas-line px-5 py-3 font-bold text-slate-600 hover:bg-slate-50"
            >
              <X size={18} />
              Quitter le suivi
            </button>
          )}
        </form>
        <section className="overflow-hidden rounded-[12px] border border-atlas-line bg-white shadow-sm">
          <div className="border-b border-atlas-line p-5">
            <h2 className="font-display text-xl font-bold">
              Historique des paiements
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Chaque nouvel encaissement est conservé comme un versement
              distinct, sans remplacer les paiements précédents.
            </p>
            <div className="relative mt-4">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un patient ou une méthode"
                className="w-full rounded-[8px] border border-atlas-line py-3 pl-10 pr-4 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"
              />
            </div>
          </div>
          <div className="space-y-3 p-4 md:p-5">
            {loading ? (
              <p className="py-10 text-center text-sm font-semibold text-slate-500">
                Chargement des paiements…
              </p>
            ) : visiblePayments.length === 0 ? (
              <div className="py-12 text-center">
                <Banknote size={38} className="mx-auto text-slate-300" />
                <p className="mt-3 font-bold text-slate-600">
                  Aucun paiement trouvé
                </p>
              </div>
            ) : (
              visiblePaymentGroups.map((group) => {
                const fee = feeById.get(group.feeId);
                const firstPayment = group.payments[0];
                const patient = patientById.get(firstPayment.patient_id);
                const expanded = expandedPaymentGroup === group.feeId;
                return (
                  <article
                    key={group.feeId}
                    className="overflow-hidden rounded-[12px] border border-atlas-line bg-white transition hover:border-atlas-teal/40 hover:shadow-sm"
                  >
                    <header className={`${expanded ? "border-b border-atlas-line" : ""} bg-gradient-to-r from-atlas-mist/80 to-white p-4`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-atlas-teal shadow-sm">
                            <UserRound size={20} />
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-lg font-bold">
                              {patient
                                ? `${patient.first_name} ${patient.last_name}`
                                : firstPayment.patient_name ?? "Patient"}
                            </h3>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                              {fee?.title ??
                                firstPayment.fee_title ??
                                "Honoraire"}{" "}
                              ·{" "}
                              {group.payments.length} versement
                              {group.payments.length > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => togglePaymentGroup(group.feeId)}
                            aria-expanded={expanded}
                            className="inline-flex items-center gap-1.5 rounded-[8px] border border-atlas-teal/20 bg-white px-4 py-2 text-xs font-bold text-atlas-teal shadow-sm hover:bg-atlas-mist"
                          >
                            <Eye size={15} />
                            {expanded
                              ? "Masquer les versements"
                              : `Voir les ${group.payments.length} versement${group.payments.length > 1 ? "s" : ""}`}
                            <ChevronDown
                              size={15}
                              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </button>
                          {fee && fee.remaining_amount > 0 && (
                            <>
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => startCollection(fee)}
                                className="inline-flex items-center gap-1.5 rounded-[8px] bg-atlas-teal px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-atlas-petrol disabled:opacity-40"
                              >
                                <Banknote size={15} />
                                Encaisser
                              </button>
                              <button
                                type="button"
                                onClick={() => void sendWhatsAppReminder(fee)}
                                className="inline-flex items-center gap-1.5 rounded-[8px] bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                              >
                                <MessageCircle size={14} />
                                Relancer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {fee && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-full bg-white px-3 py-1.5 text-slate-600 shadow-sm">
                            Honoraire · {money(fee.amount)}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                            Payé · {money(fee.paid_amount)}
                          </span>
                          <span className={`rounded-full px-3 py-1.5 ${fee.remaining_amount > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                            RAP · {money(fee.remaining_amount)}
                          </span>
                        </div>
                      )}
                    </header>
                    {expanded && <div className="p-4">
                      <div className="relative space-y-3 before:absolute before:bottom-5 before:left-[17px] before:top-5 before:w-px before:bg-atlas-line">
                        {group.payments.map((payment) => {
                          const sequence = paymentSequenceById.get(payment.id);
                          const documents = paymentDocuments.filter(
                            (item) => item.payment_id === payment.id,
                          );
                          return (
                            <div
                              key={payment.id}
                              className="relative flex items-start gap-3"
                            >
                              <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-atlas-teal text-xs font-black text-white ring-4 ring-white">
                                {sequence?.index ?? 1}
                              </span>
                              <div className="min-w-0 flex-1 rounded-[9px] border border-slate-200 bg-slate-50/60 p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-wide text-atlas-teal">
                                      Versement {sequence?.index ?? 1}
                                      {sequence && sequence.total > 1
                                        ? ` sur ${sequence.total}`
                                        : ""}
                                    </p>
                                    <p className="mt-1 text-lg font-black text-emerald-700">
                                      {money(payment.amount)}
                                    </p>
                                    {payment.status === "ANNULE" && (
                                      <span className="mt-1 inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                                        Annulé
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    {payment.method==="cheque"&&<button
                                      type="button"
                                      disabled={readOnly||payment.status==="ANNULE"}
                                      onClick={() => startChequeFollowUp(payment)}
                                      title="Traiter le chèque"
                                      className="rounded-[7px] p-2 text-slate-400 hover:bg-atlas-mist hover:text-atlas-teal disabled:opacity-30"
                                    >
                                      <CreditCard size={16} />
                                    </button>}
                                    <button
                                      type="button"
                                      disabled={readOnly||payment.status==="ANNULE"}
                                      onClick={() => void remove(payment)}
                                      title="Annuler ce versement"
                                      className="rounded-[7px] p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                                    <CreditCard size={13} />
                                    {methods[payment.method] ?? payment.method}
                                  </span>
                                  <span className="rounded-full bg-white px-2.5 py-1">
                                    {new Intl.DateTimeFormat("fr-FR", {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    }).format(new Date(payment.paid_at))}
                                  </span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPayment(payment)}
                                    className="inline-flex items-center gap-1.5 rounded-[7px] bg-atlas-mist px-3 py-1.5 text-xs font-bold text-atlas-teal"
                                  >
                                    <Eye size={14} />
                                    Voir les détails
                                  </button>
                                  <button
                                    type="button"
                                    disabled={Boolean(documentLoading)||payment.status==="ANNULE"}
                                    onClick={() =>
                                      void generateDocument(payment, "recu")
                                    }
                                    className="rounded-[7px] border border-atlas-teal/30 bg-white px-3 py-1.5 text-xs font-bold text-atlas-teal"
                                  >
                                    Ticket de caisse
                                  </button>
                                  <button
                                    type="button"
                                    disabled={Boolean(documentLoading)||payment.status==="ANNULE"}
                                    onClick={() =>
                                      void generateDocument(payment, "facture")
                                    }
                                    className="rounded-[7px] border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                                  >
                                    Générer facture
                                  </button>
                                  {documents.map((document) => (
                                    <span
                                      key={document.id}
                                      className="inline-flex items-center gap-1 rounded-[7px] bg-white p-1"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void previewDocument(document)
                                        }
                                        className="px-2 py-1 text-xs font-bold text-atlas-teal"
                                      >
                                        {document.document_number}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void downloadDocument(document)
                                        }
                                        className="px-2 py-1 text-xs font-bold text-slate-600"
                                      >
                                        PDF
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>}
                  </article>
                );
              })
            )}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-atlas-line px-5 py-4">
            <p className="text-xs font-semibold text-slate-500">
              {paymentPagination.total_items} paiement(s) · page{" "}
              {paymentPagination.page}/{paymentPagination.total_pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!paymentPagination.has_previous || loading}
                onClick={() =>
                  setPaymentPage((currentPage) => Math.max(1, currentPage - 1))
                }
                className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-30"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={!paymentPagination.has_next || loading}
                onClick={() =>
                  setPaymentPage((currentPage) => currentPage + 1)
                }
                className="rounded-lg bg-atlas-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-30"
              >
                Suivant
              </button>
            </div>
          </footer>
        </section>
      </div>
      {selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          patient={patientById.get(selectedPayment.patient_id)}
          fee={feeById.get(selectedPayment.fee_id)}
          sequence={paymentSequenceById.get(selectedPayment.id)}
          documents={paymentDocuments.filter(
            (document) => document.payment_id === selectedPayment.id,
          )}
          documentLoading={Boolean(documentLoading)}
          onClose={() => setSelectedPayment(null)}
          onPreview={(document) => void previewDocument(document)}
          onDownload={(document) => void downloadDocument(document)}
          onGenerate={(type) => void generateDocument(selectedPayment, type)}
        />
      )}
    </div>
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
