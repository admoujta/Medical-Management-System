import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  FileHeart,
  FileText,
  Globe2,
  List,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import type { DateClickArg } from "@fullcalendar/interaction";
import { confirmAction } from "../../lib/uiFeedback";
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";

import {
  apiCreate,
  apiDelete,
  apiGet,
  apiList,
  apiUpdate,
} from "../../lib/api";
import { getSession, logout } from "../../lib/auth";
import { MedecinLayout } from "./MedecinLayout";
import { StaffLayout } from "../staff/StaffLayout";
import { AppointmentQrScanner, type ScannedAppointment } from "../../components/AppointmentQrScanner";
import { AppointmentPreparationCard } from "../../components/AppointmentPreparationCard";

type Patient = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email?: string | null;
  birth_date?: string;
  status: string;
};
type Appointment = {
  id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  notes: string | null;
  status: string;
  origin: "cabinet" | "online" | "patient_portal";
  reminder_enabled?: boolean | null;
  reminder_offset_minutes?: number | null;
  reminder_channels?: Array<"WHATSAPP" | "ESPACE_PATIENT"> | null;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  duration_seconds?: number | null;
  qr_scanned_at?: string | null;
};
type Visit = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  visit_date: string;
  reason: string | null;
  notes: string | null;
};
type Fee = {
  id: string;
  patient_id: string;
  amount: number;
  amount_ht: number;
  tax_rate: number;
  tax_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  title?: string;
  description?: string | null;
  fee_type?: string;
  created_at?: string;
  due_date?: string | null;
  visit_ids?: string[];
};
type Invoice = { id: string; fee_id: string };
type FeeDue = {
  enabled: boolean;
  date: string;
  amount: string;
  comment: string;
};
type Payment = {
  id: string;
  patient_id: string;
  fee_id: string;
  amount: number;
  method: string;
  payment_type: string;
  due_date?: string | null;
  installment_count?: number | null;
  installment_schedule?: Array<{
    number: number;
    due_date: string;
    amount: number;
    status: string;
  }> | null;
  paid_at: string;
  reference?: string | null;
  note?: string | null;
  cheque_bank?: string | null;
  cheque_number?: string | null;
  cheque_issue_date?: string | null;
  cheque_deposit_date?: string | null;
  cheque_cashing_date?: string | null;
  cheque_status?: string | null;
  status?: string;
};
type BankAccount = {
  id: string;
  label: string;
  bank_name: string;
  is_default: boolean;
};
type PaymentSettings = {
  default_method: string;
  default_settlement_type: string;
  default_due_days: number;
  default_installments: number;
  grace_days: number;
};
type FeeSettings = {
  prices: Record<string, number>;
  tax_rates: Record<string, number>;
};
type Prescription = {
  id: string;
  patient_id: string;
  content: string;
  created_at: string;
};
type DocumentItem = {
  id: string;
  patient_id: string;
  title: string;
  document_type: string;
  created_at: string;
};
type CNSSItem = {
  id: string;
  patient_id: string;
  reference: string | null;
  status: string;
  created_at: string;
};
type HistoryItem = {
  id: string;
  appointment_id: string | null;
  action_type: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
};
type Schedule = {
  days: Array<{
    weekday: number;
    is_working: boolean;
    start_time: string | null;
    end_time: string | null;
    break_start_time: string | null;
    break_end_time: string | null;
  }>;
  config: { default_duration_minutes: number };
};
type View = "day" | "week" | "month";
const statuses = [
  "planned",
  "confirmed",
  "waiting",
  "in_progress",
  "absent",
  "completed",
  "cancelled",
];
const statusLabels: Record<string, string> = {
  requested: "Demande à traiter",
  planned: "Planifié",
  confirmed: "Confirmé",
  waiting: "En attente",
  in_progress: "En cours",
  present: "En cours",
  absent: "Absent",
  rejected: "Refusé",
  completed: "Terminé",
  cancelled: "Annulé",
};
const statusTransitions: Record<string, string[]> = {
  requested: ["planned", "rejected"],
  planned: ["confirmed", "waiting", "absent", "cancelled"],
  confirmed: ["waiting", "in_progress", "absent", "cancelled"],
  waiting: ["in_progress", "absent", "cancelled"],
  in_progress: ["completed"],
  present: ["in_progress", "completed"],
  absent: [],
  rejected: [],
  completed: [],
  cancelled: ["planned", "confirmed"],
};
const eventColors: Record<string, string> = {
  requested: "border-violet-500 bg-violet-100 text-violet-900",
  planned: "border-atlas-teal bg-atlas-mist text-atlas-petrol",
  confirmed: "border-emerald-500 bg-emerald-100 text-emerald-900",
  waiting: "border-cyan-500 bg-cyan-100 text-cyan-900",
  in_progress: "border-amber-500 bg-amber-100 text-amber-900",
  present: "border-amber-500 bg-amber-100 text-amber-900",
  absent: "border-orange-500 bg-orange-100 text-orange-900",
  rejected: "border-red-400 bg-red-50 text-red-800",
  completed: "border-slate-500 bg-slate-200 text-slate-800",
  cancelled: "border-red-400 bg-red-100 text-red-800",
};
const statusDots: Record<string, string> = {
  requested: "bg-violet-500",
  planned: "bg-atlas-teal",
  confirmed: "bg-emerald-500",
  waiting: "bg-cyan-500",
  in_progress: "bg-amber-500",
  present: "bg-amber-500",
  absent: "bg-orange-500",
  completed: "bg-slate-500",
  cancelled: "bg-red-500",
};
const formatDuration = (seconds: number) =>
  `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const historyLabels: Record<string, string> = {
  APPOINTMENT_CREATED: "Demande de rendez-vous créée",
  APPOINTMENT_ACCEPTED: "Demande de rendez-vous acceptée",
  APPOINTMENT_REJECTED: "Demande de rendez-vous refusée",
  APPOINTMENT_UPDATED: "Rendez-vous modifié",
  APPOINTMENT_CONFIRMED: "Rendez-vous confirmé",
  PATIENT_ARRIVED: "Patient arrivé",
  CONSULTATION_STARTED: "Consultation démarrée",
  CONSULTATION_ENDED: "Consultation terminée",
  VISIT_CREATED: "Visite créée automatiquement",
  FEE_CREATED: "Honoraire créé",
  FEE_UPDATED: "Honoraire modifié",
  INVOICE_CREATED: "Facture générée",
  INVOICE_CANCELLED: "Facture annulée",
  PAYMENT_CREATED: "Paiement enregistré",
  PAYMENT_UPDATED: "Paiement modifié",
  PAYMENT_DELETED: "Paiement supprimé",
  RAP_RECALCULATED: "Reste à payer recalculé",
  APPOINTMENT_CANCELLED: "Rendez-vous annulé",
  PATIENT_MARKED_ABSENT: "Patient marqué absent",
};
const historyLabel = (action: string) =>
  historyLabels[action] ?? action.replace(/_/g, " ").toLocaleLowerCase("fr");
const historyFieldLabels: Record<string, string> = {
  patient_id: "Patient",
  doctor_id: "Médecin",
  status: "Statut",
  date: "Date",
  start_time: "Heure de début",
  end_time: "Heure de fin",
  reason: "Motif",
  notes: "Notes",
  duration_seconds: "Durée",
  visit_date: "Date de visite",
  amount: "Montant",
  amount_total: "Montant total",
  remaining_amount: "Reste à payer",
  method: "Mode de paiement",
  invoice_number: "N° de facture",
  visit_ids: "Visites liées",
  payment_id: "Paiement",
};
const historyValue = (field: string, value: unknown) => {
  if (value === null || value === undefined || value === "")
    return "Non renseigné";
  if (field === "status" && typeof value === "string")
    return statusLabels[value] ?? value;
  if (field === "duration_seconds" && typeof value === "number")
    return formatDuration(value);
  if (
    ["amount", "amount_total", "remaining_amount"].includes(field) &&
    typeof value === "number"
  )
    return `${new Intl.NumberFormat("fr-MA").format(value)} MAD`;
  if (Array.isArray(value))
    return value.length
      ? `${value.length} élément${value.length > 1 ? "s" : ""}`
      : "Aucun";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
const historyChanges = (item: HistoryItem) =>
  Array.from(
    new Set([
      ...Object.keys(item.old_value ?? {}),
      ...Object.keys(item.new_value ?? {}),
    ]),
  ).filter(
    (field) =>
      JSON.stringify(item.old_value?.[field]) !==
      JSON.stringify(item.new_value?.[field]),
  );
const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const addMinutesToTime = (value: string, minutes: number) => {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  const total = Math.min(24 * 60, hour * 60 + minute + minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
const makeEmpty = () => ({
  patient_id: "",
  date: localDate(),
  start_time: "09:00",
  end_time: "09:30",
  reason: "",
  notes: "",
  status: "planned",
  reminder_enabled: null as boolean | null,
  reminder_offset_minutes: null as number | null,
  reminder_channels: null as Array<"WHATSAPP" | "ESPACE_PATIENT"> | null,
});
const feeTypeLabels: Record<string, string> = {
  CONSULTATION: "Consultation",
  ACTE: "Acte médical",
  SOIN: "Soin",
  TRAITEMENT: "Traitement",
  AUTRE: "Autre",
};
const feeTypeLabel = (type: string) =>
  feeTypeLabels[type] ??
  type
    .toLocaleLowerCase("fr")
    .replace(/_/g, " ")
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
const makeCare = (): {
  email: string;
  disease_type: string;
  notes: string;
  fee_amount: string;
  fee_type?: string;
} => ({
  email: "",
  disease_type: "",
  notes: "",
  fee_amount: "",
  fee_type: "CONSULTATION",
});
const careFieldClass =
  "mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-3 py-3 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10";
const paymentMethodLabels: Record<string, string> = {
  cash: "Espèces",
  card: "Carte",
  transfer: "Virement",
  cheque: "Chèque",
  other: "Autre",
};
const paymentMethodLabel = (method: string) =>
  paymentMethodLabels[method] ?? method;
const money = (amount: number) =>
  new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
  }).format(amount);
const chequeStatusLabels: Record<string, string> = {
  EN_ATTENTE: "En attente",
  ENCAISSE: "Encaissé",
  REJETE: "Rejeté",
  ANNULE: "Annulé",
};
const firstHour = 0;
const lastHour = 24;
const hourHeight = 64;
const addDays = (date: Date, amount: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};
const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  copy.setHours(12, 0, 0, 0);
  return copy;
};

export function CalendarPage({
  onNavigate,
  mode = "doctor",
  permissionLevel,
}: {
  onNavigate: (path: string) => void;
  mode?: "doctor" | "staff";
  permissionLevel?: string;
}) {
  const session = getSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [cnssFiles, setCnssFiles] = useState<CNSSItem[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [billingTab, setBillingTab] = useState<"visit" | "fee" | "payments">(
    "visit",
  );
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    default_method: "cash",
    default_settlement_type: "immediate",
    default_due_days: 30,
    default_installments: 3,
    grace_days: 0,
  });
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [feeSettings, setFeeSettings] = useState<FeeSettings>({
    prices: {},
    tax_rates: {},
  });
  const [paymentForm, setPaymentForm] = useState({
    fee_id: "",
    amount: "",
    main_type: "ESPECE",
    method: "cash",
    payment_type: "immediate",
    due_date: "",
    installment_count: "3",
    reference: "",
    note: "",
    cheque_bank: "",
    cheque_number: "",
    cheque_deposit_date: localDate(),
    cheque_cashing_date: "",
    cheque_status: "EN_ATTENTE",
    bank_account_id: "",
  });
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const calendarRef = useRef<FullCalendar | null>(null);
  const [form, setForm] = useState(makeEmpty);
  const [care, setCare] = useState(makeCare);
  const [careTaxRate, setCareTaxRate] = useState("0");
  const [feeDue, setFeeDue] = useState<FeeDue>({
    enabled: false,
    date: "",
    amount: "",
    comment: "",
  });
  const [savingCare, setSavingCare] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(new Date());
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [openingLinkedAppointment, setOpeningLinkedAppointment] = useState(
    () =>
      mode === "staff" &&
      Boolean(new URLSearchParams(window.location.search).get("appointment")),
  );
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [staffPermissions, setStaffPermissions] = useState<
    Record<string, string>
  >({});
  const [originTab, setOriginTab] = useState<"all" | "cabinet" | "online">(
    "all",
  );
  const [displayMode, setDisplayMode] = useState<"agenda" | "list">("agenda");
  const [nowTick, setNowTick] = useState(Date.now());
  const [actionLoading, setActionLoading] = useState(false);
  const dashboardActionHandled = useRef(false);
  const readOnly =
    permissionLevel === "read" ||
    session?.tenantStatus === "expired" ||
    session?.tenantStatus === "suspended";
  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    try {
      const [loadedPatients, loadedAppointments] = await Promise.all([
        apiList<Patient>("/patients", session.accessToken),
        apiList<Appointment>("/appointments", session.accessToken),
      ]);
      setPatients(
        loadedPatients.filter((patient) => patient.status !== "disabled"),
      );
      setAppointments(loadedAppointments);
      const related = await Promise.allSettled([
        apiList<Visit>("/visits", session.accessToken, { silent: true }),
        apiList<Fee>("/honoraires", session.accessToken, { silent: true }),
        apiList<Payment>("/payments", session.accessToken, { silent: true }),
        apiList<Prescription>("/prescriptions", session.accessToken, { silent: true }),
        apiList<DocumentItem>("/documents", session.accessToken, { silent: true }),
        apiList<CNSSItem>("/cnss", session.accessToken, { silent: true }),
        apiList<HistoryItem>("/history", session.accessToken, { silent: true }),
      ]);
      if (related[0].status === "fulfilled") setVisits(related[0].value);
      if (related[1].status === "fulfilled") setFees(related[1].value);
      if (related[2].status === "fulfilled") setPayments(related[2].value);
      if (related[3].status === "fulfilled") setPrescriptions(related[3].value);
      if (related[4].status === "fulfilled") setDocuments(related[4].value);
      if (related[5].status === "fulfilled") setCnssFiles(related[5].value);
      if (related[6].status === "fulfilled")
        setRecentHistory(related[6].value.slice(0, 20));
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (loading || dashboardActionHandled.current || !session?.accessToken) return;
    const params = new URLSearchParams(window.location.search);
    const appointmentId = params.get("appointment");
    if (!appointmentId) {
      setOpeningLinkedAppointment(false);
      return;
    }
    dashboardActionHandled.current = true;
    const appointment = appointments.find((item) => item.id === appointmentId);
    window.history.replaceState({}, "", `/${mode}/appointments`);
    if (!appointment) {
      setMessage("Ce rendez-vous n’est plus disponible.");
      setOpeningLinkedAppointment(false);
      return;
    }
    setSelectedAppointment(appointment);
    setOpeningLinkedAppointment(false);
    if (mode !== "doctor" || params.get("action") !== "start") return;
    if (readOnly) {
      setMessage("Le cabinet est en lecture seule. La consultation ne peut pas être démarrée.");
      return;
    }
    if (appointment.status === "in_progress") {
      setMessage("Consultation en cours : le chronomètre continue.");
      return;
    }
    if (!["requested", "planned", "confirmed", "waiting", "present"].includes(appointment.status)) {
      setMessage("Cette consultation ne peut pas être démarrée dans son état actuel.");
      return;
    }
    setActionLoading(true);
    void (async () => {
      try {
        let current = appointment;
        if (["requested", "planned"].includes(current.status)) {
          current = await apiUpdate<Appointment>(`/appointments/${current.id}`, session.accessToken, { status: "confirmed" });
        }
        const started = await apiCreate<Appointment>(`/appointments/${current.id}/start`, session.accessToken, {});
        await load();
        setSelectedAppointment(started);
        setMessage("Consultation démarrée depuis le tableau de bord. Le chronomètre est lancé.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Démarrage de la consultation impossible.");
      } finally {
        setActionLoading(false);
      }
    })();
  }, [appointments, load, loading, mode, readOnly, session?.accessToken]);
  useEffect(() => {
    if (!session?.accessToken) return;
    apiGet<FeeSettings>("/doctor/fee-settings", session.accessToken, { silent: true })
      .then((settings) => {
        setFeeSettings(settings);
        const consultationAmount = settings.prices.CONSULTATION ?? 0;
        setCare((current) => ({
          ...current,
          fee_amount:
            current.fee_type === "CONSULTATION" && !current.fee_amount && consultationAmount > 0
              ? String(consultationAmount)
              : current.fee_amount,
        }));
        setCareTaxRate(String(settings.tax_rates.CONSULTATION ?? 0));
      })
      .catch(() => undefined);
    apiGet<PaymentSettings>("/doctor/payment-settings", session.accessToken, { silent: true })
      .then((settings) => {
        setPaymentSettings(settings);
        const due = new Date();
        due.setDate(due.getDate() + settings.default_due_days);
        setPaymentForm((current) => ({
          ...current,
          main_type: settings.default_method === "cash" ? "ESPECE" : "BANQUE",
          method: settings.default_method,
          payment_type: settings.default_settlement_type,
          due_date: ["single_due", "installment"].includes(
            settings.default_settlement_type,
          )
            ? localDate(due)
            : "",
          installment_count: String(settings.default_installments),
        }));
      })
      .catch(() => undefined);
    apiList<BankAccount>("/bank-accounts?active=true", session.accessToken, { silent: true })
      .then((accounts) => {
        setBankAccounts(accounts);
        setPaymentForm((current) => ({
          ...current,
          bank_account_id:
            current.main_type === "BANQUE"
              ? current.bank_account_id ||
                accounts.find((item) => item.is_default)?.id ||
                accounts[0]?.id ||
                ""
              : "",
        }));
      })
      .catch(() => setBankAccounts([]));
  }, [session?.accessToken]);
  useEffect(() => {
    if (!session?.accessToken) return;
    apiGet<Schedule>("/doctor/schedule", session.accessToken, { silent: true })
      .then(setSchedule)
      .catch(() => undefined);
    if (mode === "staff")
      apiGet<{ permissions: Record<string, string> }>(
        "/staff/me/permissions",
        session.accessToken,
      )
        .then((data) => setStaffPermissions(data.permissions))
        .catch(() => undefined);
  }, [mode, session?.accessToken]);
  const loadHistory = useCallback(
    async (appointmentId: string) => {
      if (!session?.accessToken) return;
      try {
        setHistory(
          await apiList<HistoryItem>(
            `/appointments/${appointmentId}/history`,
            session.accessToken,
          ),
        );
      } catch {
        setHistory([]);
      }
    },
    [session?.accessToken],
  );
  useEffect(() => {
    if (!selectedAppointment) {
      setHistory([]);
      return;
    }
    void loadHistory(selectedAppointment.id);
  }, [selectedAppointment, loadHistory]);
  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.appointmentView = displayMode;
    return () => {
      delete document.documentElement.dataset.appointmentView;
    };
  }, [displayMode]);
  const filteredPatients = (
    query.trim()
      ? patients.filter((patient) =>
          `${patient.first_name} ${patient.last_name} ${patient.phone ?? ""}`
            .toLocaleLowerCase("fr")
            .includes(query.toLocaleLowerCase("fr")),
        )
      : patients
  ).slice(0, 6);
  const workingDays =
    schedule?.days.filter(
      (day) => day.is_working && day.start_time && day.end_time,
    ) ?? [];
  const calendarStart = (
    workingDays.map((day) => day.start_time!).sort()[0] ?? "08:00"
  ).slice(0, 5);
  const calendarEnd = (
    workingDays
      .map((day) => day.end_time!)
      .sort()
      [workingDays.length - 1] ?? "18:00"
  ).slice(0, 5);
  const appointmentDuration = schedule?.config.default_duration_minutes ?? 30;
  const calendarDisplayEnd = addMinutesToTime(
    calendarEnd,
    Math.min(appointmentDuration, 60),
  );
  const scheduleKey = `${calendarStart}-${calendarEnd}-${appointmentDuration}-${workingDays.map((day) => `${day.weekday}:${day.start_time}:${day.end_time}:${day.break_start_time}:${day.break_end_time}`).join("|")}`;
  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api || !schedule) return;
    const working = new Set(workingDays.map((day) => day.weekday));
    const hiddenDays = Array.from({ length: 7 }, (_, weekday) => weekday)
      .filter((weekday) => !working.has(weekday))
      .map((weekday) => (weekday + 1) % 7);
    api.setOption("slotMinTime", `${calendarStart}:00`);
    api.setOption("slotMaxTime", `${calendarDisplayEnd}:00`);
    api.setOption("scrollTime", `${calendarStart}:00`);
    api.setOption(
      "slotDuration",
      `00:${String(Math.min(appointmentDuration, 60)).padStart(2, "0")}:00`,
    );
    api.setOption(
      "snapDuration",
      `00:${String(Math.min(appointmentDuration, 60)).padStart(2, "0")}:00`,
    );
    api.setOption("hiddenDays", hiddenDays.length < 7 ? hiddenDays : []);
    api.setOption(
      "businessHours",
      workingDays.map((day) => ({
        daysOfWeek: [(day.weekday + 1) % 7],
        startTime: day.start_time!,
        endTime: day.end_time!,
      })),
    );
    api.updateSize();
  }, [appointmentDuration, calendarDisplayEnd, calendarStart, scheduleKey]);
  const canWritePrescription =
    mode === "doctor" ||
    ["write", "admin"].includes(staffPermissions.prescriptions);
  const canWriteDocument =
    mode === "doctor" ||
    ["write", "admin"].includes(staffPermissions.documents);
  const canWriteCnss =
    mode === "doctor" || ["write", "admin"].includes(staffPermissions.cnss);
  const canWriteVisit =
    mode === "doctor" || ["write", "admin"].includes(staffPermissions.visits);
  const isOnline = (item: Appointment) =>
    item.origin === "online" || item.origin === "patient_portal";
  const originCounts = useMemo(
    () => ({
      all: appointments.length,
      cabinet: appointments.filter((item) => !isOnline(item)).length,
      online: appointments.filter(isOnline).length,
    }),
    [appointments],
  );
  const filteredAppointments = useMemo(
    () =>
      appointments.filter(
        (item) =>
          (originTab === "all" ||
            (originTab === "online" ? isOnline(item) : !isOnline(item))) &&
          (!statusFilter || item.status === statusFilter) &&
          (!search.trim() ||
            `${item.patient_name} ${item.reason ?? ""}`
              .toLocaleLowerCase("fr")
              .includes(search.trim().toLocaleLowerCase("fr"))),
      ),
    [appointments, originTab, search, statusFilter],
  );
  const pendingRequests = useMemo(
    () =>
      originTab === "cabinet"
        ? []
        : appointments
            .filter((item) => item.status === "requested" && isOnline(item))
            .sort((a, b) =>
              `${a.date}${a.start_time}`.localeCompare(
                `${b.date}${b.start_time}`,
              ),
            ),
    [appointments, originTab],
  );
  const calendarEvents = useMemo<EventInput[]>(
    () => [
      ...filteredAppointments
        .filter((item) => !["requested", "rejected"].includes(item.status))
        .map((item) => ({
          id: item.id,
          title: item.patient_name,
          start: `${item.date}T${item.start_time}`,
          end: `${item.date}T${item.end_time}`,
          classNames: [`appointment-${item.status}`],
          extendedProps: {
            appointment: item,
            reason: item.reason?.trim() || "Générale",
            status: item.status,
          },
        })),
      ...(schedule?.days
        .filter(
          (day) => day.is_working && day.break_start_time && day.break_end_time,
        )
        .map((day) => ({
          id: `cabinet-break-${day.weekday}`,
          title: "Pause du cabinet",
          daysOfWeek: [(day.weekday + 1) % 7],
          startTime: day.break_start_time!,
          endTime: day.break_end_time!,
          display: "background" as const,
          classNames: ["cabinet-break"],
        })) ?? []),
    ],
    [filteredAppointments, schedule],
  );
  const days =
    view === "day"
      ? [new Date(cursor)]
      : Array.from({ length: 7 }, (_, index) =>
          addDays(startOfWeek(cursor), index),
        );
  const periodLabel =
    view === "month"
      ? new Intl.DateTimeFormat("fr-FR", {
          month: "long",
          year: "numeric",
        }).format(cursor)
      : view === "day"
        ? new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(cursor)
        : `${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(days[0])} – ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(days[6])}`;
  function isScheduledSlot(date: Date, start: string, end: string) {
    if (!schedule) return true;
    const weekday = (date.getDay() + 6) % 7;
    const day = schedule.days.find((item) => item.weekday === weekday);
    if (!day?.is_working || !day.start_time || !day.end_time) return false;
    const from = start.slice(0, 5),
      to = end.slice(0, 5);
    if (from < day.start_time.slice(0, 5) || to > day.end_time.slice(0, 5))
      return false;
    return !(
      day.break_start_time &&
      day.break_end_time &&
      from < day.break_end_time.slice(0, 5) &&
      to > day.break_start_time.slice(0, 5)
    );
  }

  function openNew(date = localDate(), start = calendarStart.slice(0, 5)) {
    const [hour, minute] = start.split(":").map(Number);
    const endMinutes = hour * 60 + minute + appointmentDuration;
    setEditing(null);
    setQuery("");
    setPatientSearchOpen(false);
    setForm({
      ...makeEmpty(),
      date,
      start_time: start,
      end_time: `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`,
    });
    setMessage("");
    setFormOpen(true);
  }
  function edit(item: Appointment) {
    setSelectedAppointment(null);
    setEditing(item.id);
    setForm({
      patient_id: item.patient_id,
      date: item.date,
      start_time: item.start_time.slice(0, 5),
      end_time: item.end_time.slice(0, 5),
      reason: item.reason ?? "",
      notes: item.notes ?? "",
      status: item.status,
      reminder_enabled: item.reminder_enabled ?? null,
      reminder_offset_minutes: item.reminder_offset_minutes ?? null,
      reminder_channels: item.reminder_channels ?? null,
    });
    setQuery("");
    setMessage("");
    setFormOpen(true);
  }
  function closeForm() {
    calendarRef.current?.getApi().unselect();
    setFormOpen(false);
    setEditing(null);
    setForm(makeEmpty());
    setQuery("");
    setMessage("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session?.accessToken || readOnly || savingAppointment) return;
    if (form.end_time <= form.start_time) {
      setMessage("L’heure de fin doit être après l’heure de début.");
      return;
    }
    const appointmentDate = new Date(`${form.date}T12:00:00`);
    if (!isScheduledSlot(appointmentDate, form.start_time, form.end_time)) {
      setMessage(
        `Le rendez-vous doit rester dans les horaires du cabinet (${calendarStart}–${calendarEnd}) et hors pause.`,
      );
      return;
    }
    setSavingAppointment(true);
    try {
      if (editing)
        await apiUpdate(`/appointments/${editing}`, session.accessToken, form);
      else await apiCreate("/appointments", session.accessToken, form);
      closeForm();
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setSavingAppointment(false);
    }
  }
  async function changeStatus(item: Appointment, status: string) {
    if (!session?.accessToken || readOnly || status === item.status) return;
    try {
      await apiUpdate(`/appointments/${item.id}`, session.accessToken, {
        status,
      });
      setSelectedAppointment((current) =>
        current?.id === item.id ? { ...current, status } : current,
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Modification impossible.",
      );
    }
  }
  async function sendWhatsAppReminder() {
    if (!selectedAppointment || !session?.accessToken) return;
    setActionLoading(true);
    setMessage("");
    try {
      const result = await apiCreate<{ status: string }>(
        `/rendez-vous/${selectedAppointment.id}/send-whatsapp-reminder`,
        session.accessToken,
        {},
      );
      setMessage(
        result.status === "echec"
          ? "Le message WhatsApp a échoué. Consultez le module WhatsApp pour le détail."
          : "Rappel WhatsApp envoyé et enregistré dans l’historique patient.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Envoi WhatsApp impossible.",
      );
    } finally {
      setActionLoading(false);
    }
  }
  async function runAction(
    action: "mark-arrived" | "start" | "end" | "mark-absent",
  ) {
    if (!selectedAppointment || !session?.accessToken || readOnly) return;
    setActionLoading(true);
    setMessage("");
    try {
      const updated = await apiCreate<Appointment>(
        `/appointments/${selectedAppointment.id}/${action}`,
        session.accessToken,
        {},
      );
      setSelectedAppointment(updated);
      await load();
      setMessage(
        action === "end"
          ? "Consultation terminée et visite créée automatiquement."
          : action === "start"
            ? "Consultation démarrée."
            : action === "mark-absent"
              ? "Patient marqué absent."
              : "Patient placé en salle d’attente.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setActionLoading(false);
    }
  }
  async function cancel(item: Appointment) {
    if (
      !session?.accessToken ||
      readOnly ||
      !(await confirmAction({
        title: "Annuler ce rendez-vous ?",
        message: `Le rendez-vous de ${item.patient_name} sera annulé et l’agenda sera mis à jour.`,
        confirmLabel: "Annuler le rendez-vous",
        tone: "warning",
      }))
    )
      return;
    try {
      await apiDelete(`/appointments/${item.id}`, session.accessToken);
      setSelectedAppointment(null);
      if (editing === item.id) closeForm();
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Annulation impossible.",
      );
    }
  }
  function move(amount: number) {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    amount < 0 ? api.prev() : api.next();
  }
  function goToday() {
    calendarRef.current?.getApi().today();
  }
  function changeView(next: View) {
    setView(next);
    calendarRef.current
      ?.getApi()
      .changeView(
        next === "day"
          ? "timeGridDay"
          : next === "week"
            ? "timeGridWeek"
            : "dayGridMonth",
      );
  }
  function goToDate(date: Date) {
    setCursor(date);
    calendarRef.current?.getApi().gotoDate(date);
  }
  function syncDates(info: DatesSetArg) {
    setCursor(info.view.currentStart);
    setView(
      info.view.type === "timeGridDay"
        ? "day"
        : info.view.type === "dayGridMonth"
          ? "month"
          : "week",
    );
  }
  function handleDateClick(info: DateClickArg) {
    if (readOnly) return;
    const start = info.allDay
      ? calendarStart.slice(0, 5)
      : info.dateStr.slice(11, 16);
    const minutes =
      Number(start.slice(0, 2)) * 60 +
      Number(start.slice(3, 5)) +
      appointmentDuration;
    const end = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    if (!isScheduledSlot(info.date, start, end)) {
      setMessage(
        "Ce créneau est en dehors des horaires de travail ou pendant la pause du cabinet.",
      );
      return;
    }
    openNew(info.dateStr.slice(0, 10), start);
  }
  function handleSelect(info: DateSelectArg) {
    if (readOnly) return;
    const start = info.allDay
      ? calendarStart
      : `${String(info.start.getHours()).padStart(2, "0")}:${String(info.start.getMinutes()).padStart(2, "0")}`;
    const end = info.allDay
      ? addMinutesToTime(start, appointmentDuration)
      : `${String(info.end.getHours()).padStart(2, "0")}:${String(info.end.getMinutes()).padStart(2, "0")}`;
    if (!isScheduledSlot(info.start, start, end)) {
      calendarRef.current?.getApi().unselect();
      setMessage(
        "Ce créneau est en dehors des horaires de travail ou pendant la pause du cabinet.",
      );
      return;
    }
    setEditing(null);
    setQuery("");
    setForm({
      ...makeEmpty(),
      date: localDate(info.start),
      start_time: start,
      end_time: end,
    });
    setFormOpen(true);
  }
  function openDetails(item: Appointment) {
    const patient = patients.find((value) => value.id === item.patient_id);
    setCare({
      email: patient?.email ?? "",
      disease_type: item.reason ?? "",
      notes: "",
      fee_amount: "",
      fee_type: "CONSULTATION",
    });
    setCareTaxRate("0");
    setBillingTab("visit");
    setShowVisitForm(false);
    setShowFeeForm(false);
    setShowPaymentForm(false);
    setMessage("");
    setFormOpen(false);
    setSelectedAppointment(item);
  }
  function chooseCareFeeType(type: string) {
    const configuredAmount = feeSettings.prices[type] ?? 0;
    setCare((current) => ({
      ...current,
      fee_type: type,
      fee_amount: configuredAmount > 0 ? String(configuredAmount) : "",
    }));
    setCareTaxRate(String(feeSettings.tax_rates[type] ?? 0));
  }
  function handleEventClick(info: EventClickArg) {
    const item = appointments.find((value) => value.id === info.event.id);
    if (item) openDetails(item);
  }
  async function moveEvent(info: EventDropArg | EventResizeDoneArg) {
    if (!session?.accessToken) {
      info.revert();
      return;
    }
    const start = info.event.start;
    const end = info.event.end;
    if (!start || !end) {
      info.revert();
      return;
    }
    try {
      await apiUpdate(`/appointments/${info.event.id}`, session.accessToken, {
        date: localDate(start),
        start_time: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
        end_time: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
      });
      await load();
    } catch (error) {
      info.revert();
      setMessage(
        error instanceof Error ? error.message : "Déplacement impossible.",
      );
    }
  }

  const selectedPatient = selectedAppointment
    ? patients.find((patient) => patient.id === selectedAppointment.patient_id)
    : undefined;
  const patientVisits = selectedAppointment
    ? visits.filter(
        (item) => item.patient_id === selectedAppointment.patient_id,
      )
    : [];
  const patientFees = selectedAppointment
    ? fees.filter((item) => item.patient_id === selectedAppointment.patient_id)
    : [];
  const patientPayments = selectedAppointment
    ? payments.filter(
        (item) => item.patient_id === selectedAppointment.patient_id,
      )
    : [];
  const patientPrescriptions = selectedAppointment
    ? prescriptions.filter(
        (item) => item.patient_id === selectedAppointment.patient_id,
      )
    : [];
  const patientDocuments = selectedAppointment
    ? documents.filter(
        (item) => item.patient_id === selectedAppointment.patient_id,
      )
    : [];
  const patientCnss = selectedAppointment
    ? cnssFiles.filter(
        (item) => item.patient_id === selectedAppointment.patient_id,
      )
    : [];
  const appointmentVisit = selectedAppointment
    ? patientVisits.find(
        (item) => item.appointment_id === selectedAppointment.id,
      )
    : undefined;
  const appointmentFees = appointmentVisit
    ? patientFees.filter((item) =>
        item.visit_ids?.includes(appointmentVisit.id),
      )
    : [];
  const appointmentFee = appointmentFees[0];
  const appointmentFeeIds = new Set(appointmentFees.map((item) => item.id));
  const appointmentPayments = patientPayments.filter((item) =>
    appointmentFeeIds.has(item.fee_id),
  );
  const appointmentFeeTotals = appointmentFees.reduce(
    (total, item) => ({
      ht: total.ht + item.amount_ht,
      tax: total.tax + item.tax_amount,
      ttc: total.ttc + item.amount,
      paid: total.paid + item.paid_amount,
      rap: total.rap + item.remaining_amount,
    }),
    { ht: 0, tax: 0, ttc: 0, paid: 0, rap: 0 },
  );
  const totalRemaining = patientFees.reduce(
    (sum, item) => sum + item.remaining_amount,
    0,
  );
  const totalFees = patientFees.reduce((sum, item) => sum + item.amount, 0);
  const totalPaid = patientPayments.filter(item=>!["ANNULE","REMBOURSE"].includes(item.status??"PAYE")&&(item.method!=="cheque"||item.cheque_status==="ENCAISSE")).reduce((sum, item) => sum + item.amount, 0);
  const careAmountHt = Number(care.fee_amount) || 0;
  const numericCareTaxRate = Number(careTaxRate) || 0;
  const careTaxAmount = Math.round(careAmountHt * numericCareTaxRate) / 100;
  const careAmountTtc = Math.round((careAmountHt + careTaxAmount) * 100) / 100;
  function validFeeDue(total: number) {
    const amount = Number(feeDue.amount);
    return (
      Boolean(feeDue.date) &&
      Number.isFinite(amount) &&
      amount > 0 &&
      amount <= total
    );
  }
  async function createInvoiceWithDue(fee: Fee) {
    if (!session?.accessToken) return;
    const invoice = await apiCreate<Invoice>(
      `/invoices/from-honoraire/${fee.id}`,
      session.accessToken,
      {},
    );
    if (feeDue.enabled)
      await apiCreate(
        `/invoices/${invoice.id}/echeances`,
        session.accessToken,
        {
          amount: Number(feeDue.amount),
          due_date: feeDue.date,
          comment: feeDue.comment.trim() || null,
        },
      );
  }
  async function createCare(openHonorarium = false) {
    if (!canWriteVisit) {
      setMessage("Vous n’avez pas la permission de créer une visite. Demandez au médecin administrateur de vous accorder l’accès en écriture au module Visites.");
      return;
    }
    if (
      !selectedAppointment ||
      !session?.accessToken ||
      readOnly ||
      appointmentVisit
    )
      return;
    if (!care.disease_type.trim()) {
      setMessage("Le diagnostic est obligatoire.");
      return;
    }
    if (["absent", "cancelled"].includes(selectedAppointment.status)) {
      setMessage(
        "Une visite ne peut pas être créée pour un rendez-vous absent ou annulé. Modifiez d’abord son statut.",
      );
      return;
    }
    setSavingCare(true);
    setMessage("");
    try {
      let currentStatus = selectedAppointment.status;
      if (currentStatus === "requested" || currentStatus === "planned") {
        await apiUpdate(
          `/appointments/${selectedAppointment.id}`,
          session.accessToken,
          { status: "confirmed" },
        );
        currentStatus = "confirmed";
      }
      if (currentStatus === "confirmed") {
        await apiUpdate(
          `/appointments/${selectedAppointment.id}`,
          session.accessToken,
          { status: "present" },
        );
      }
      await apiCreate<Visit>("/visits", session.accessToken, {
        patient_id: selectedAppointment.patient_id,
        appointment_id: selectedAppointment.id,
        visit_date: selectedAppointment.date,
        reason: care.disease_type.trim(),
        notes: care.notes.trim() || null,
      });
      setShowVisitForm(false);
      await load();
      setSelectedAppointment((current) =>
        current ? { ...current, status: "completed" } : current,
      );
      setMessage("Visite enregistrée avec succès.");
      if (openHonorarium) {
        chooseCareFeeType("CONSULTATION");
        setBillingTab("fee");
      }
    } catch (error) {
      await load();
      setMessage(
        error instanceof Error
          ? error.message
          : "Création de la prise en charge impossible.",
      );
    } finally {
      setSavingCare(false);
    }
  }
  async function createHonorarium() {
    if (
      !selectedAppointment ||
      !appointmentVisit ||
      !session?.accessToken ||
      readOnly
    )
      return;
    const amount = Number(care.fee_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Saisissez un montant HT supérieur à zéro.");
      return;
    }
    if (feeDue.enabled && !validFeeDue(careAmountTtc)) {
      setMessage(
        "Renseignez une date et un montant d’échéance valide, inférieur ou égal au TTC.",
      );
      return;
    }
    setSavingCare(true);
    setMessage("");
    try {
      const fee = await apiCreate<Fee>("/honoraires", session.accessToken, {
        patient_id: selectedAppointment.patient_id,
        title: care.disease_type.trim() || feeTypeLabel(care.fee_type ?? "CONSULTATION"),
        description: care.notes.trim() || null,
        fee_type: care.fee_type ?? "CONSULTATION",
        amount_ht: amount,
        tax_rate: numericCareTaxRate,
        visit_ids: [appointmentVisit.id],
      });
      await createInvoiceWithDue(fee);
      setShowFeeForm(false);
      setFeeDue({ enabled: false, date: "", amount: "", comment: "" });
      setCare((current) => ({ ...current, fee_amount: "", notes: "" }));
      await load();
      await loadHistory(selectedAppointment.id);
      setMessage("Honoraire et facture créés avec succès.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Création de l’honoraire impossible.",
      );
    } finally {
      setSavingCare(false);
    }
  }
  async function createAppointmentPayment() {
    if (!selectedAppointment || !session?.accessToken || readOnly) return;
    const fee = appointmentFees.find((item) => item.id === paymentForm.fee_id);
    const amount = Number(paymentForm.amount);
    if (
      paymentForm.main_type === "BANQUE" &&
      paymentForm.method !== "cheque" &&
      !paymentForm.bank_account_id
    ) {
      setMessage(
        "Choisissez le compte bancaire du cabinet concerné par cette transaction.",
      );
      return;
    }
    if (
      !fee ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > fee.remaining_amount
    ) {
      setMessage(
        "Choisissez un honoraire et saisissez un montant inférieur ou égal à son RAP.",
      );
      return;
    }
    if (
      paymentForm.method === "cheque" &&
      (!paymentForm.cheque_bank.trim() ||
        !paymentForm.cheque_number.trim() ||
        !paymentForm.cheque_deposit_date ||
        !paymentForm.cheque_cashing_date)
    ) {
      setMessage(
        "Renseignez la banque, le numéro et les dates d’émission et d’encaissement du chèque.",
      );
      return;
    }
    if (
      paymentForm.method === "cheque" &&
      paymentForm.cheque_cashing_date < paymentForm.cheque_deposit_date
    ) {
      setMessage(
        "La date d’encaissement ne peut pas précéder la date d’émission.",
      );
      return;
    }
    setSavingCare(true);
    setMessage("");
    try {
      await apiCreate(`/honoraires/${fee.id}/paiements`, session.accessToken, {
        amount,
        method: paymentForm.method,
        payment_type: "immediate",
        due_date: null,
        installment_count: null,
        reference: paymentForm.reference.trim() || null,
        note: paymentForm.note.trim() || null,
        bank_account_id:
          paymentForm.main_type === "BANQUE"
            ? paymentForm.bank_account_id
            : null,
        cheque_bank:
          paymentForm.method === "cheque"
            ? paymentForm.cheque_bank.trim()
            : null,
        cheque_number:
          paymentForm.method === "cheque"
            ? paymentForm.cheque_number.trim()
            : null,
        cheque_issue_date:
          paymentForm.method === "cheque"
            ? paymentForm.cheque_deposit_date
            : null,
        cheque_cashing_date:
          paymentForm.method === "cheque"
            ? paymentForm.cheque_cashing_date
            : null,
        cheque_status:
          paymentForm.method === "cheque" ? paymentForm.cheque_status : null,
      });
      setPaymentForm({
        fee_id: "",
        amount: "",
        main_type:
          paymentSettings.default_method === "cash" ? "ESPECE" : "BANQUE",
        method: paymentSettings.default_method,
        payment_type: paymentSettings.default_settlement_type,
        due_date: "",
        installment_count: String(paymentSettings.default_installments),
        reference: "",
        note: "",
        cheque_bank: "",
        cheque_number: "",
        cheque_deposit_date: localDate(),
        cheque_cashing_date: "",
        cheque_status: "EN_ATTENTE",
        bank_account_id: "",
      });
      setShowPaymentForm(false);
      await load();
      await loadHistory(selectedAppointment.id);
      setMessage("Paiement enregistré avec succès.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Enregistrement du paiement impossible.",
      );
    } finally {
      setSavingCare(false);
    }
  }

  const content = (
    <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
      {openingLinkedAppointment && (
        <section className="grid min-h-[60vh] place-items-center" aria-live="polite">
          <div className="rounded-[14px] border border-atlas-line bg-white px-8 py-10 text-center shadow-sm">
            <CalendarDays className="mx-auto animate-pulse text-atlas-teal" size={34} />
            <p className="mt-4 font-display text-xl font-bold text-atlas-petrol">
              Ouverture du rendez-vous…
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Préparation de la fiche patient.
            </p>
          </div>
        </section>
      )}
      {!openingLinkedAppointment && !selectedAppointment && !formOpen && (
        <>
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">
                Agenda
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold">
                Rendez-vous
              </h1>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
              {mode === "doctor" && !readOnly && (
                <AppointmentQrScanner
                  onConfirmed={(appointment: ScannedAppointment) => {
                    const updated = appointment as Appointment;
                    setAppointments((current) =>
                      current.map((item) =>
                        item.id === updated.id ? updated : item,
                      ),
                    );
                    setSelectedAppointment(updated);
                    setMessage(
                      "Présence confirmée par QR : le rendez-vous et l’heure du scan sont enregistrés.",
                    );
                    void loadHistory(updated.id);
                  }}
                />
              )}
              <div className="flex rounded-[11px] border border-atlas-line bg-white p-1 shadow-sm">
              <button
                type="button"
                aria-current="page"
                className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] bg-atlas-teal px-5 py-2.5 text-sm font-bold text-white shadow-sm sm:flex-none"
              >
                <CalendarDays size={18} />
                Rendez-vous
              </button>
              <button
                type="button"
                onClick={() =>
                  onNavigate(
                    mode === "staff" ? "/staff/patients" : "/doctor/patients",
                  )
                }
                className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] px-5 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-atlas-mist hover:text-atlas-teal sm:flex-none"
              >
                <UserRound size={18} />
                Patients
              </button>
              </div>
            </div>
          </header>
          {message && !formOpen && (
            <p className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {message}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 rounded-[14px] border border-atlas-line bg-white p-2 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <nav
              aria-label="Filtrer les rendez-vous par origine"
              className="flex flex-wrap gap-2"
            >
              {(
                [
                  {
                    key: "all",
                    label: "Tous les rendez-vous",
                    icon: CalendarDays,
                  },
                  {
                    key: "cabinet",
                    label: "Créés par le cabinet",
                    icon: Building2,
                  },
                  {
                    key: "online",
                    label: "Rendez-vous en ligne",
                    icon: Globe2,
                  },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={originTab === key}
                  onClick={() => setOriginTab(key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-bold transition ${originTab === key ? "bg-atlas-teal text-white shadow-sm" : "text-slate-600 hover:bg-atlas-mist hover:text-atlas-teal"}`}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  <span
                    className={`grid min-w-6 place-items-center rounded-full px-1.5 py-0.5 text-[11px] ${originTab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}
                  >
                    {originCounts[key]}
                  </span>
                </button>
              ))}
            </nav>
            <div className="flex shrink-0 rounded-[9px] bg-slate-100 p-1">
              <button
                type="button"
                aria-pressed={displayMode === "agenda"}
                onClick={() => setDisplayMode("agenda")}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[7px] px-4 py-2 text-sm font-bold ${displayMode === "agenda" ? "bg-white text-atlas-teal shadow-sm" : "text-slate-500"}`}
              >
                <CalendarDays size={16} />
                Agenda
              </button>
              <button
                type="button"
                aria-pressed={displayMode === "list"}
                onClick={() => setDisplayMode("list")}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-[7px] px-4 py-2 text-sm font-bold ${displayMode === "list" ? "bg-white text-atlas-teal shadow-sm" : "text-slate-500"}`}
              >
                <List size={16} />
                Liste
              </button>
            </div>
          </div>
          <section className="appointment-list-panel mt-5 overflow-hidden rounded-[14px] border border-atlas-line bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-atlas-line p-4">
              <div>
                <h2 className="font-display text-xl font-bold">
                  Liste des rendez-vous
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {filteredAppointments.length} résultat
                  {filteredAppointments.length !== 1 ? "s" : ""} selon les
                  filtres actifs
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Patient ou motif"
                    className="w-44 rounded-[8px] border border-atlas-line py-2.5 pl-9 pr-3 text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-[8px] border border-atlas-line bg-white px-3 text-sm"
                >
                  <option value="">Tous les statuts</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <AppointmentList
              appointments={filteredAppointments}
              onOpen={setSelectedAppointment}
            />
          </section>
          {pendingRequests.length > 0 && (
            <section className="mt-5 rounded-[14px] border border-violet-200 bg-violet-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-violet-950">
                    Demandes de rendez-vous
                  </h2>
                  <p className="text-xs font-semibold text-violet-700">
                    Ces demandes ne sont pas encore ajoutées à l’agenda.
                  </p>
                </div>
                <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">
                  {pendingRequests.length}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {pendingRequests.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[10px] border border-violet-100 bg-white p-4 shadow-sm"
                  >
                    <p className="font-bold">{item.patient_name}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                      }).format(new Date(`${item.date}T12:00:00`))}{" "}
                      · {item.start_time.slice(0, 5)}–
                      {item.end_time.slice(0, 5)}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {item.reason || "Sans motif"}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => void changeStatus(item, "planned")}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                      >
                        <Check size={16} />
                        Accepter
                      </button>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => void changeStatus(item, "rejected")}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-[8px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700 disabled:opacity-40"
                      >
                        <X size={16} />
                        Refuser
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          <div className="appointments-layout mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[210px_minmax(0,1fr)_300px]">
            <aside className="hidden xl:block">
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => openNew(localDate(cursor))}
                  className="inline-flex w-full items-center justify-center gap-3 rounded-[14px] border border-atlas-line bg-white px-5 py-4 font-bold shadow-sm transition hover:shadow-md"
                >
                  <Plus size={22} className="text-atlas-teal" />
                  Créer un rendez-vous
                </button>
              )}
              <div className="mt-4 rounded-[12px] border border-atlas-line bg-white p-3 shadow-sm">
                <MiniCalendar cursor={cursor} onChange={goToDate} />
              </div>
              <div className="mt-4 rounded-[12px] border border-atlas-line bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold">Statuts</h3>
                <div className="mt-3 space-y-2.5">
                  {statuses
                    .filter((status) => status !== "cancelled")
                    .map((status) => (
                      <button
                        type="button"
                        key={status}
                        onClick={() =>
                          setStatusFilter((current) =>
                            current === status ? "" : status,
                          )
                        }
                        className={`flex w-full items-center gap-2 text-left text-xs font-semibold ${statusFilter && statusFilter !== status ? "opacity-40" : ""}`}
                      >
                        <span
                          className={`h-3 w-3 rounded-sm ${statusDots[status]}`}
                        />
                        {statusLabels[status]}
                      </button>
                    ))}
                </div>
              </div>
            </aside>
            <section className="min-w-0 overflow-hidden rounded-[14px] border border-atlas-line bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b border-atlas-line p-3">
                <button
                  onClick={goToday}
                  className="rounded-[8px] border border-atlas-line px-4 py-2 text-sm font-bold hover:bg-slate-50"
                >
                  Aujourd’hui
                </button>
                <button
                  onClick={() => move(-1)}
                  className="rounded-full p-2 hover:bg-slate-100"
                  title="Période précédente"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => move(1)}
                  className="rounded-full p-2 hover:bg-slate-100"
                  title="Période suivante"
                >
                  <ChevronRight size={20} />
                </button>
                <h2 className="min-w-[220px] flex-1 px-2 font-display text-lg font-bold capitalize">
                  {periodLabel}
                </h2>
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher"
                    className="w-40 rounded-[8px] border border-atlas-line py-2 pl-9 pr-3 text-sm outline-none focus:border-atlas-teal"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-[8px] border border-atlas-line px-3 py-2 text-sm"
                >
                  <option value="">Tous les statuts</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
                <div className="flex rounded-[8px] bg-slate-100 p-1">
                  {(["day", "week", "month"] as View[]).map((item) => (
                    <button
                      key={item}
                      onClick={() => changeView(item)}
                      className={`rounded-[6px] px-3 py-1.5 text-sm font-bold ${view === item ? "bg-white text-atlas-teal shadow-sm" : "text-slate-500"}`}
                    >
                      {item === "day"
                        ? "Jour"
                        : item === "week"
                          ? "Semaine"
                          : "Mois"}
                    </button>
                  ))}
                </div>
              </div>
              {loading ? (
                <div className="grid min-h-[560px] place-items-center text-sm font-semibold text-slate-500">
                  Chargement de l’agenda…
                </div>
              ) : (
                <div className="calendar-shell p-2 md:p-3">
                  {!readOnly && (
                    <p className="mb-2 flex items-center gap-2 rounded-[8px] bg-atlas-mist px-3 py-2 text-xs font-semibold text-atlas-petrol">
                      <Clock3 size={15} />
                      Créneaux du cabinet : {calendarStart.slice(0, 5)}–
                      {calendarEnd.slice(0, 5)}, durée habituelle{" "}
                      {appointmentDuration} min.
                    </p>
                  )}
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    locale={frLocale}
                    initialView="timeGridWeek"
                    headerToolbar={false}
                    events={calendarEvents}
                    nowIndicator
                    selectable={!readOnly}
                    editable={!readOnly}
                    selectMirror
                    selectMinDistance={5}
                    unselectAuto={false}
                    longPressDelay={350}
                    selectLongPressDelay={350}
                    allDaySlot={false}
                    slotMinTime={`${calendarStart.slice(0, 5)}:00`}
                    slotMaxTime={`${calendarDisplayEnd}:00`}
                    scrollTime={`${calendarStart.slice(0, 5)}:00`}
                    slotDuration={`00:${String(Math.min(appointmentDuration, 60)).padStart(2, "0")}:00`}
                    snapDuration={`00:${String(Math.min(appointmentDuration, 60)).padStart(2, "0")}:00`}
                    slotLabelInterval="01:00:00"
                    height="auto"
                    expandRows
                    dayMaxEvents={3}
                    weekends={workingDays.some((day) => day.weekday >= 5)}
                    datesSet={syncDates}
                    dateClick={handleDateClick}
                    select={handleSelect}
                    eventClick={handleEventClick}
                    eventDrop={moveEvent}
                    eventResize={moveEvent}
                    eventDidMount={(info) => {
                      if (!info.event.id.startsWith("cabinet-break"))
                        info.el.title = `${info.event.title} · ${info.timeText} · Consultation : ${String(info.event.extendedProps.reason || "Générale")}`;
                    }}
                    eventContent={(info) =>
                      info.event.id.startsWith("cabinet-break") ? null : (
                        <div className="min-w-0 px-1.5 py-1 leading-none">
                          <b className="block truncate text-[12px] font-extrabold text-slate-900">
                            {info.event.title}
                          </b>
                          <span className="mt-1 block truncate text-[10px] font-semibold text-slate-600">
                            {info.timeText}
                          </span>
                          <span className="mt-1.5 block truncate text-[10px] font-bold text-atlas-petrol">
                            <span className="text-atlas-teal">
                              Consultation
                            </span>{" "}
                            ·{" "}
                            {String(
                              info.event.extendedProps.reason || "Générale",
                            )}
                          </span>
                        </div>
                      )
                    }
                  />
                </div>
              )}
            </section>
            <aside className="appointment-history-panel max-h-[520px] lg:max-h-[calc(100vh-120px)] overflow-y-auto rounded-[14px] border border-atlas-line bg-white p-4 shadow-sm lg:sticky lg:top-5">
              <div className="flex items-center gap-2">
                <Clock3 size={19} className="text-atlas-teal" />
                <div>
                  <h2 className="font-display text-lg font-bold">Historique</h2>
                  <p className="text-[11px] text-slate-500">
                    Dernières manipulations
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                {recentHistory.length ? (
                  recentHistory.map((item) => {
                    const appointment = appointments.find(
                      (value) => value.id === item.appointment_id,
                    );
                    return (
                      <button
                        type="button"
                        key={item.id}
                        disabled={!appointment}
                        onClick={() => {
                          if (appointment) {
                            setCare({
                              email:
                                patients.find(
                                  (value) =>
                                    value.id === appointment.patient_id,
                                )?.email ?? "",
                              disease_type: appointment.reason ?? "",
                              notes: "",
                              fee_amount: "",
                            });
                            setSelectedAppointment(appointment);
                          }
                        }}
                        className="flex w-full gap-3 border-b border-atlas-line py-3 text-left last:border-0 disabled:cursor-default"
                      >
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-atlas-teal ring-4 ring-atlas-mist" />
                        <span className="min-w-0">
                          <b className="block text-xs">
                            {historyLabel(item.action_type)}
                          </b>
                          {appointment && (
                            <span className="mt-1 block truncate text-xs text-slate-500">
                              {appointment.patient_name}
                            </span>
                          )}
                          <time className="mt-1 block text-[10px] font-semibold text-slate-400">
                            {new Intl.DateTimeFormat("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(item.created_at))}
                          </time>
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="rounded-[8px] bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Aucune manipulation enregistrée.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
      {selectedAppointment && (
        <section className="mx-auto max-w-7xl">
          <div
            aria-label="Détails du rendez-vous"
            className="overflow-hidden rounded-[16px] border border-atlas-line bg-slate-50 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-atlas-line bg-white px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-atlas-teal">
                  Fiche du rendez-vous
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  Détails complets
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(
                      `/${mode === "staff" ? "staff" : "doctor"}/appointments/${selectedAppointment.id}/history`,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-[9px] bg-atlas-mist px-4 py-2.5 text-sm font-bold text-atlas-teal"
                >
                  <Clock3 size={18} />
                  Historique complet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setSelectedAppointment(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-[9px] border border-atlas-line px-4 py-2.5 text-sm font-bold text-atlas-petrol hover:bg-slate-50"
                >
                  <ChevronLeft size={18} />
                  Retour à l’agenda
                </button>
              </div>
            </div>
            <div className="p-5 md:p-6">
              {message && (
                <p
                  role="alert"
                  data-fadaa-page-alert="true"
                  className={`rounded-[8px] border px-4 py-3 text-sm font-bold ${/succès|enregistré|créés|envoyé|démarrée/i.test(message) ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
                >
                  {message}
                </p>
              )}
              <div
                className={`grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px] ${message ? "mt-4" : ""}`}
              >
                <div className="flex min-w-0 flex-col gap-4">
                  <section className="overflow-hidden rounded-[12px] border border-atlas-line bg-white shadow-sm">
                    <div className="bg-gradient-to-r from-atlas-petrol to-atlas-teal p-5 text-white">
                      <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 text-lg font-bold ring-1 ring-white/20">
                          {selectedAppointment.patient_name
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-white/70">
                            Patient
                          </p>
                          <h3 className="font-display text-xl font-bold">
                            {selectedAppointment.patient_name}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-2">
                      <Detail
                        icon={Phone}
                        label="Téléphone"
                        value={selectedPatient?.phone || "Non renseigné"}
                      />
                      <Detail
                        icon={Mail}
                        label="Email"
                        value={selectedPatient?.email || "Non renseigné"}
                      />
                    </div>
                  </section>
                  <section className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="inline-flex items-center gap-2 font-bold">
                          <CalendarDays size={18} className="text-atlas-teal" />
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "full",
                          }).format(
                            new Date(`${selectedAppointment.date}T12:00:00`),
                          )}
                        </p>
                        <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                          <Clock3 size={17} />
                          {selectedAppointment.start_time.slice(0, 5)} –{" "}
                          {selectedAppointment.end_time.slice(0, 5)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${eventColors[selectedAppointment.status] ?? eventColors.planned}`}
                      >
                        {statusLabels[selectedAppointment.status] ??
                          selectedAppointment.status}
                      </span>
                    </div>
                    <div className="mt-4 border-t border-atlas-line pt-4">
                      {selectedAppointment.qr_scanned_at && (
                        <div className="mb-4 flex items-center gap-3 rounded-[9px] border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                          <Check size={18} />
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide">
                              Présence validée par QR
                            </p>
                            <p className="mt-0.5 text-sm font-semibold">
                              Scan effectué le{" "}
                              {new Date(
                                selectedAppointment.qr_scanned_at,
                              ).toLocaleString("fr-FR")}
                            </p>
                          </div>
                        </div>
                      )}
                      <p className="text-xs font-bold text-slate-400">MOTIF</p>
                      <p className="mt-1 font-bold">
                        {selectedAppointment.reason || "Consultation générale"}
                      </p>
                      {selectedAppointment.notes && (
                        <>
                          <p className="mt-4 text-xs font-bold text-slate-400">
                            NOTES
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                            {selectedAppointment.notes}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="mt-4">
                      <AppointmentPreparationCard appointmentId={selectedAppointment.id} token={session?.accessToken || ""} mode={mode} readOnly={readOnly} />
                    </div>
                    {!readOnly && (
                      <label className="mt-4 block">
                        <span className="text-xs font-bold text-slate-500">
                          Changer le statut
                        </span>
                        <select
                          value={selectedAppointment.status}
                          disabled={
                            !statusTransitions[selectedAppointment.status]
                              ?.length
                          }
                          onChange={(event) =>
                            void changeStatus(
                              selectedAppointment,
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-[8px] border border-atlas-line px-3 py-2.5 text-sm font-bold"
                        >
                          <option value={selectedAppointment.status}>
                            {statusLabels[selectedAppointment.status]}
                          </option>
                          {statusTransitions[selectedAppointment.status]?.map(
                            (status) => (
                              <option key={status} value={status}>
                                {statusLabels[status]}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                    )}
                  </section>
                  {!readOnly && (
                    <section className="z-30 rounded-[12px] border border-atlas-line bg-white/95 p-4 shadow-lg backdrop-blur-md lg:sticky lg:top-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-atlas-teal">
                            Consultation
                          </p>
                          <h3 className="mt-1 font-display text-lg font-bold">
                            Pilotage en temps réel
                          </h3>
                        </div>
                        {selectedAppointment.actual_start_time && (
                          <strong className="rounded-[8px] bg-slate-900 px-4 py-2 font-mono text-lg text-white">
                            {formatDuration(
                              selectedAppointment.status === "in_progress"
                                ? Math.max(
                                    0,
                                    Math.floor(
                                      (nowTick -
                                        new Date(
                                          selectedAppointment.actual_start_time,
                                        ).getTime()) /
                                        1000,
                                    ),
                                  )
                                : selectedAppointment.duration_seconds || 0,
                            )}
                          </strong>
                        )}
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <button
                          type="button"
                          disabled={
                            actionLoading ||
                            !["planned", "confirmed"].includes(
                              selectedAppointment.status,
                            )
                          }
                          onClick={() => void runAction("mark-arrived")}
                          className="rounded-[8px] border border-cyan-200 bg-cyan-50 px-4 py-3 font-bold text-cyan-800 disabled:opacity-35"
                        >
                          Patient arrivé
                        </button>
                        <button
                          type="button"
                          disabled={
                            actionLoading ||
                            !["confirmed", "waiting", "present"].includes(
                              selectedAppointment.status,
                            )
                          }
                          onClick={() => void runAction("start")}
                          className="rounded-[8px] bg-atlas-teal px-4 py-3 font-bold text-white disabled:opacity-35"
                        >
                          Démarrer
                        </button>
                        <button
                          type="button"
                          disabled={
                            actionLoading ||
                            selectedAppointment.status !== "in_progress"
                          }
                          onClick={() => void runAction("end")}
                          className="rounded-[8px] bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-35"
                        >
                          Terminer
                        </button>
                        <button
                          type="button"
                          disabled={
                            actionLoading ||
                            !["planned", "confirmed", "waiting"].includes(
                              selectedAppointment.status,
                            )
                          }
                          onClick={() => void runAction("mark-absent")}
                          className="rounded-[8px] border border-orange-200 bg-orange-50 px-4 py-3 font-bold text-orange-700 disabled:opacity-35"
                        >
                          Marquer absent
                        </button>
                      </div>
                    </section>
                  )}
                  <section className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-atlas-teal">
                          Facturation du rendez-vous
                        </p>
                        <h3 className="mt-1 font-display text-lg font-bold">
                          Honoraire et paiements
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${appointmentFee ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
                      >
                        {appointmentFee
                          ? `${appointmentFees.length} honoraire${appointmentFees.length > 1 ? "s" : ""} regroupé${appointmentFees.length > 1 ? "s" : ""}`
                          : "À créer"}
                      </span>
                    </div>
                    <div className="mt-4 flex rounded-[9px] bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setBillingTab("visit")}
                        className={`flex-1 rounded-[7px] px-4 py-2.5 text-sm font-bold transition ${billingTab === "visit" ? "bg-white text-atlas-teal shadow-sm" : "text-slate-500"}`}
                      >
                        <Stethoscope className="mr-2 inline" size={17} />
                        Visite
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingTab("fee")}
                        className={`flex-1 rounded-[7px] px-4 py-2.5 text-sm font-bold transition ${billingTab === "fee" ? "bg-white text-atlas-teal shadow-sm" : "text-slate-500"}`}
                      >
                        <WalletCards className="mr-2 inline" size={17} />
                        Honoraire ({appointmentFees.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingTab("payments")}
                        className={`flex-1 rounded-[7px] px-4 py-2.5 text-sm font-bold transition ${billingTab === "payments" ? "bg-white text-atlas-teal shadow-sm" : "text-slate-500"}`}
                      >
                        <CreditCard className="mr-2 inline" size={17} />
                        Paiements ({appointmentPayments.length})
                      </button>
                    </div>
                    {billingTab === "visit" &&
                      (appointmentVisit ? (
                        <div className="mt-4 rounded-[9px] border border-atlas-line bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase text-atlas-teal">
                                Visite liée
                              </p>
                              <h4 className="mt-1 text-lg font-bold">
                                {appointmentVisit.reason ||
                                  "Consultation générale"}
                              </h4>
                            </div>
                            <time className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                              {new Intl.DateTimeFormat("fr-FR", {
                                dateStyle: "long",
                              }).format(
                                new Date(
                                  `${appointmentVisit.visit_date}T12:00:00`,
                                ),
                              )}
                            </time>
                          </div>
                          <div className="mt-4 rounded-[8px] bg-white p-4">
                            <p className="text-xs font-bold uppercase text-slate-400">
                              Compte rendu et observations
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                              {appointmentVisit.notes ||
                                "Aucun compte rendu renseigné."}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 rounded-[8px] bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                          Aucune visite n’est encore liée à ce rendez-vous.
                        </p>
                      ))}
                    {billingTab === "visit" && !appointmentVisit && canWriteVisit && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => setShowVisitForm((value) => !value)}
                          className="w-full rounded-[8px] border border-atlas-teal px-4 py-3 font-bold text-atlas-teal"
                        >
                          {showVisitForm
                            ? "Fermer le formulaire"
                            : "Ajouter une visite"}
                        </button>
                        {showVisitForm && (
                          <div className="mt-3 rounded-[9px] border border-atlas-line p-4">
                            <div>
                              <label className="block">
                                <span className="text-sm font-bold">
                                  Diagnostic *
                                </span>
                                <input
                                  value={care.disease_type}
                                  onChange={(event) =>
                                    setCare({
                                      ...care,
                                      disease_type: event.target.value,
                                    })
                                  }
                                  className={careFieldClass}
                                />
                              </label>
                            </div>
                            <label className="mt-3 block">
                              <span className="text-sm font-bold">
                                Compte rendu et observations
                              </span>
                              <textarea
                                value={care.notes}
                                onChange={(event) =>
                                  setCare({
                                    ...care,
                                    notes: event.target.value,
                                  })
                                }
                                className="mt-2 min-h-24 w-full rounded-[8px] border border-atlas-line px-3 py-3"
                              />
                            </label>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <button type="button" disabled={savingCare || !care.disease_type.trim()} onClick={() => void createCare(false)} className="rounded-[8px] border border-atlas-teal bg-white px-4 py-3 font-bold text-atlas-teal disabled:opacity-40">{savingCare ? "Création…" : "Enregistrer la visite"}</button>
                              <button type="button" disabled={savingCare || !care.disease_type.trim()} onClick={() => void createCare(true)} className="rounded-[8px] bg-atlas-teal px-4 py-3 font-bold text-white disabled:opacity-40"><WalletCards className="mr-2 inline" size={17}/>{savingCare ? "Création…" : "Enregistrer puis créer l’honoraire"}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {billingTab !== "visit" && (
                      <>
                        {appointmentFee && billingTab === "fee" && (
                          <div className="mt-4 rounded-[9px] border border-atlas-line bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase text-atlas-teal">
                              Récapitulatif fusionné
                            </p>
                            <h4 className="mt-1 font-bold">
                              {appointmentFees.length} honoraire
                              {appointmentFees.length > 1 ? "s" : ""} pour ce
                              rendez-vous
                            </h4>
                            <div className="mt-3 space-y-2">
                              {appointmentFees.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-[7px] bg-white px-3 py-2"
                                >
                                  <div className="flex flex-wrap justify-between gap-2">
                                    <b>
                                      {item.title ||
                                        "Honoraire de consultation"}
                                    </b>
                                    <span className="font-bold text-atlas-teal">
                                      {money(item.amount)}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {item.fee_type || "CONSULTATION"} · HT{" "}
                                    {money(item.amount_ht)} · TVA{" "}
                                    {money(item.tax_amount)}
                                    {item.description
                                      ? ` · ${item.description}`
                                      : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {billingTab === "fee" ? (
                          appointmentFee ? (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                              <Amount
                                label="Total HT"
                                value={money(appointmentFeeTotals.ht)}
                              />
                              <Amount
                                label="TVA cumulée"
                                value={money(appointmentFeeTotals.tax)}
                              />
                              <Amount
                                label="Total TTC"
                                value={money(appointmentFeeTotals.ttc)}
                              />
                              <Amount
                                label="Payé"
                                value={money(appointmentFeeTotals.paid)}
                                tone="paid"
                              />
                              <Amount
                                label="RAP"
                                value={money(appointmentFeeTotals.rap)}
                                tone={
                                  appointmentFeeTotals.rap > 0 ? "due" : "paid"
                                }
                              />
                            </div>
                          ) : appointmentVisit ? (
                            <div className="mt-4">
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <label>
                                  <span className="text-sm font-bold">
                                    Type d’honoraire *
                                  </span>
                                  <select
                                    value={care.fee_type ?? "CONSULTATION"}
                                    onChange={(event) =>
                                      chooseCareFeeType(event.target.value)
                                    }
                                    className={careFieldClass}
                                  >
                                    {(Object.keys(feeSettings.prices).length
                                      ? Object.keys(feeSettings.prices)
                                      : Object.keys(feeTypeLabels)
                                    ).map((value) => (
                                      <option key={value} value={value}>
                                        {feeTypeLabel(value)}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  <span className="text-sm font-bold">
                                    Titre de l’acte <span className="font-normal text-slate-400">(optionnel)</span>
                                  </span>
                                  <input
                                    value={care.disease_type}
                                    onChange={(event) =>
                                      setCare({
                                        ...care,
                                        disease_type: event.target.value,
                                      })
                                    }
                                    placeholder="Ex. Consultation générale"
                                    className={careFieldClass}
                                  />
                                </label>
                                <label>
                                  <span className="text-sm font-bold">
                                    Montant HT (MAD) *
                                  </span>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={care.fee_amount}
                                    onChange={(event) =>
                                      setCare({
                                        ...care,
                                        fee_amount: event.target.value,
                                      })
                                    }
                                    placeholder="300"
                                    className={careFieldClass}
                                  />
                                </label>
                                <label>
                                  <span className="text-sm font-bold">
                                    Taux de TVA (%)
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={careTaxRate}
                                    onChange={(event) =>
                                      setCareTaxRate(event.target.value)
                                    }
                                    className={careFieldClass}
                                  />
                                </label>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-2 rounded-[8px] bg-atlas-mist p-3 text-center">
                                <Amount
                                  label="HT"
                                  value={money(careAmountHt)}
                                />
                                <Amount
                                  label={`TVA (${numericCareTaxRate} %)`}
                                  value={money(careTaxAmount)}
                                />
                                <Amount
                                  label="TTC"
                                  value={money(careAmountTtc)}
                                />
                              </div>
                              <label className="mt-3 block">
                                <span className="text-sm font-bold">
                                  Description
                                </span>
                                <textarea
                                  value={care.notes}
                                  onChange={(event) =>
                                    setCare({
                                      ...care,
                                      notes: event.target.value,
                                    })
                                  }
                                  className="mt-2 min-h-20 w-full rounded-[8px] border border-atlas-line px-3 py-3 outline-none focus:border-atlas-teal"
                                />
                              </label>
                              <DueChoice
                                value={feeDue}
                                onChange={setFeeDue}
                                total={careAmountTtc}
                              />
                              <button
                                type="button"
                                disabled={savingCare}
                                onClick={() => void createHonorarium()}
                                className="mt-4 w-full rounded-[8px] bg-atlas-teal px-4 py-3 font-bold text-white disabled:opacity-40"
                              >
                                {savingCare
                                  ? "Création…"
                                  : "Créer l’honoraire et la facture"}
                              </button>
                            </div>
                          ) : (
                            <p className="mt-4 rounded-[8px] bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                              Créez d’abord la visite liée à ce rendez-vous pour
                              pouvoir ajouter son honoraire.
                            </p>
                          )
                        ) : (
                          <div className="mt-4 rounded-[9px] border border-atlas-line p-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <Amount
                                label="Total honoraires"
                                value={money(appointmentFeeTotals.ttc)}
                              />
                              <Amount
                                label="Total encaissé"
                                value={money(appointmentFeeTotals.paid)}
                                tone="paid"
                              />
                              <Amount
                                label="RAP"
                                value={money(appointmentFeeTotals.rap)}
                                tone={
                                  appointmentFeeTotals.rap > 0 ? "due" : "paid"
                                }
                              />
                            </div>
                            {appointmentPayments.length ? (
                              <div className="mt-3 space-y-2">
                                {appointmentPayments.map((payment) => (
                                  <PaymentRecord
                                    key={payment.id}
                                    payment={payment}
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 rounded-[8px] bg-slate-50 p-3 text-sm text-slate-500">
                                Aucun paiement enregistré pour ce rendez-vous.
                              </p>
                            )}
                          </div>
                        )}
                        {billingTab === "fee" && appointmentFee && (
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => setShowFeeForm((value) => { const next = !value; if (next) chooseCareFeeType(care.fee_type ?? "CONSULTATION"); return next })}
                              className="w-full rounded-[8px] border border-atlas-teal px-4 py-3 font-bold text-atlas-teal"
                            >
                              {showFeeForm
                                ? "Fermer le formulaire"
                                : "Ajouter un honoraire"}
                            </button>
                            {showFeeForm && (
                              <div className="mt-3 rounded-[9px] border border-atlas-line p-4">
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                  <select
                                    aria-label="Type d’honoraire"
                                    value={care.fee_type ?? "CONSULTATION"}
                                    onChange={(event) =>
                                      chooseCareFeeType(event.target.value)
                                    }
                                    className={careFieldClass}
                                  >
                                    {(Object.keys(feeSettings.prices).length
                                      ? Object.keys(feeSettings.prices)
                                      : Object.keys(feeTypeLabels)
                                    ).map((value) => (
                                      <option key={value} value={value}>
                                        {feeTypeLabel(value)}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    value={care.disease_type}
                                    onChange={(event) =>
                                      setCare({
                                        ...care,
                                        disease_type: event.target.value,
                                      })
                                    }
                                    placeholder="Titre de l’acte (optionnel)"
                                    className={careFieldClass}
                                  />
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={care.fee_amount}
                                    onChange={(event) =>
                                      setCare({
                                        ...care,
                                        fee_amount: event.target.value,
                                      })
                                    }
                                    placeholder="Montant HT"
                                    className={careFieldClass}
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    value={careTaxRate}
                                    onChange={(event) =>
                                      setCareTaxRate(event.target.value)
                                    }
                                    placeholder="TVA %"
                                    className={careFieldClass}
                                  />
                                </div>
                                <textarea
                                  value={care.notes}
                                  onChange={(event) =>
                                    setCare({
                                      ...care,
                                      notes: event.target.value,
                                    })
                                  }
                                  placeholder="Description"
                                  className="mt-3 min-h-20 w-full rounded-[8px] border border-atlas-line p-3"
                                />
                                <DueChoice
                                  value={feeDue}
                                  onChange={setFeeDue}
                                  total={careAmountTtc}
                                />
                                <button
                                  type="button"
                                  disabled={savingCare}
                                  onClick={() => void createHonorarium()}
                                  className="mt-3 w-full rounded-[8px] bg-atlas-teal px-4 py-3 font-bold text-white"
                                >
                                  Créer l’honoraire et la facture
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {billingTab === "payments" &&
                          showPaymentForm &&
                          paymentForm.method === "cheque" && (
                            <div className="mt-3 rounded-[9px] border border-amber-200 bg-amber-50/60 p-4">
                              <div>
                                <p className="font-bold text-amber-900">
                                  Informations du chèque
                                </p>
                                <p className="mt-1 text-xs text-amber-700">
                                  Ces informations sont obligatoires pour
                                  assurer le suivi de l’encaissement.
                                </p>
                              </div>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="text-sm font-bold">
                                  Banque *
                                  <input
                                    value={paymentForm.cheque_bank}
                                    onChange={(event) =>
                                      setPaymentForm({
                                        ...paymentForm,
                                        cheque_bank: event.target.value,
                                      })
                                    }
                                    placeholder="Nom de la banque"
                                    className={careFieldClass}
                                  />
                                </label>
                                <label className="text-sm font-bold">
                                  Numéro du chèque *
                                  <input
                                    value={paymentForm.cheque_number}
                                    onChange={(event) =>
                                      setPaymentForm({
                                        ...paymentForm,
                                        cheque_number: event.target.value,
                                      })
                                    }
                                    placeholder="Ex. CH-45821"
                                    className={careFieldClass}
                                  />
                                </label>
                                <label className="text-sm font-bold">
                                  Date d’émission *
                                  <input
                                    type="date"
                                    value={paymentForm.cheque_deposit_date}
                                    onChange={(event) =>
                                      setPaymentForm({
                                        ...paymentForm,
                                        cheque_deposit_date: event.target.value,
                                      })
                                    }
                                    className={careFieldClass}
                                  />
                                </label>
                                <label className="text-sm font-bold">
                                  Date prévue d’encaissement *
                                  <input
                                    type="date"
                                    min={paymentForm.cheque_deposit_date}
                                    value={paymentForm.cheque_cashing_date}
                                    onChange={(event) =>
                                      setPaymentForm({
                                        ...paymentForm,
                                        cheque_cashing_date: event.target.value,
                                      })
                                    }
                                    className={careFieldClass}
                                  />
                                </label>
                                <label className="text-sm font-bold sm:col-span-2">
                                  Statut du chèque
                                  <select
                                    value={paymentForm.cheque_status}
                                    onChange={(event) =>
                                      setPaymentForm({
                                        ...paymentForm,
                                        cheque_status: event.target.value,
                                      })
                                    }
                                    className={careFieldClass}
                                  >
                                    <option value="EN_ATTENTE">
                                      En attente
                                    </option>
                                    <option value="ENCAISSE">Encaissé</option>
                                    <option value="REJETE">Rejeté</option>
                                    <option value="ANNULE">Annulé</option>
                                  </select>
                                </label>
                              </div>
                            </div>
                          )}
                        {billingTab === "payments" &&
                          appointmentFees.length > 0 && (
                            <div className="mt-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPaymentForm((value) => !value)
                                }
                                className="w-full rounded-[8px] border border-atlas-teal px-4 py-3 font-bold text-atlas-teal"
                              >
                                {showPaymentForm
                                  ? "Fermer le formulaire"
                                  : "Ajouter un paiement"}
                              </button>
                              {showPaymentForm && (
                                <div className="mt-3 rounded-[9px] border border-atlas-line p-4">
                                  <h4 className="font-bold">
                                    Nouveau paiement
                                  </h4>
                                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <select
                                      value={paymentForm.fee_id}
                                      onChange={(event) => {
                                        const fee = appointmentFees.find(
                                          (item) =>
                                            item.id === event.target.value,
                                        );
                                        setPaymentForm({
                                          ...paymentForm,
                                          fee_id: event.target.value,
                                          amount: fee
                                            ? String(fee.remaining_amount)
                                            : "",
                                        });
                                      }}
                                      className={careFieldClass}
                                    >
                                      <option value="">
                                        Choisir l’honoraire
                                      </option>
                                      {appointmentFees
                                        .filter(
                                          (item) => item.remaining_amount > 0,
                                        )
                                        .map((item) => (
                                          <option key={item.id} value={item.id}>
                                            {item.title || "Honoraire"} · RAP{" "}
                                            {money(item.remaining_amount)}
                                          </option>
                                        ))}
                                    </select>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={paymentForm.amount}
                                      onChange={(event) =>
                                        setPaymentForm({
                                          ...paymentForm,
                                          amount: event.target.value,
                                        })
                                      }
                                      placeholder="Montant payé"
                                      className={careFieldClass}
                                    />
                                    <select
                                      aria-label="Type de règlement"
                                      value={paymentForm.main_type}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        setPaymentForm({
                                          ...paymentForm,
                                          main_type: value,
                                          method:
                                            value === "ESPECE"
                                              ? "cash"
                                              : "card",
                                          bank_account_id:
                                            value === "ESPECE"
                                              ? ""
                                              : paymentForm.bank_account_id ||
                                                bankAccounts.find(
                                                  (item) => item.is_default,
                                                )?.id ||
                                                bankAccounts[0]?.id ||
                                                "",
                                        });
                                      }}
                                      className={careFieldClass}
                                    >
                                      <option value="ESPECE">Espèces</option>
                                      <option value="BANQUE">Banque</option>
                                    </select>
                                    <select
                                      aria-label="Mode de paiement"
                                      value={paymentForm.method}
                                      onChange={(event) =>
                                        setPaymentForm({
                                          ...paymentForm,
                                          method: event.target.value,
                                        })
                                      }
                                      className={careFieldClass}
                                    >
                                      {paymentForm.main_type === "ESPECE" ? (
                                        <option value="cash">Espèces</option>
                                      ) : (
                                        <>
                                          <option value="card">
                                            Carte bancaire
                                          </option>
                                          <option value="transfer">
                                            Virement bancaire
                                          </option>
                                          <option value="cheque">Chèque</option>
                                        </>
                                      )}
                                    </select>
                                    {paymentForm.main_type === "BANQUE" && (
                                      <select
                                        required={paymentForm.method !== "cheque"}
                                        aria-label="Compte bancaire du cabinet"
                                        disabled={
                                          bankAccounts.length === 0 &&
                                          paymentForm.method !== "cheque"
                                        }
                                        value={paymentForm.bank_account_id}
                                        onChange={(event) =>
                                          setPaymentForm({
                                            ...paymentForm,
                                            bank_account_id:
                                              event.target.value,
                                          })
                                        }
                                        className={careFieldClass}
                                      >
                                        <option value="">
                                          {paymentForm.method === "cheque"
                                            ? "Compte bancaire (facultatif)"
                                            : "Choisir le compte crédité"}
                                        </option>
                                        {bankAccounts.map((account) => (
                                          <option
                                            key={account.id}
                                            value={account.id}
                                          >
                                            {account.label} ·{" "}
                                            {account.bank_name}
                                            {account.is_default
                                              ? " · Par défaut"
                                              : ""}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <input
                                      value={paymentForm.reference}
                                      onChange={(event) =>
                                        setPaymentForm({
                                          ...paymentForm,
                                          reference: event.target.value,
                                        })
                                      }
                                      placeholder="Référence"
                                      className={careFieldClass}
                                    />
                                    <input
                                      value={paymentForm.note}
                                      onChange={(event) =>
                                        setPaymentForm({
                                          ...paymentForm,
                                          note: event.target.value,
                                        })
                                      }
                                      placeholder="Note"
                                      className={careFieldClass}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    disabled={
                                      savingCare ||
                                      !paymentForm.fee_id ||
                                      !paymentForm.amount
                                    }
                                    onClick={() =>
                                      void createAppointmentPayment()
                                    }
                                    className="mt-3 w-full rounded-[8px] bg-atlas-teal px-4 py-3 font-bold text-white disabled:opacity-40"
                                  >
                                    Enregistrer le paiement
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                      </>
                    )}
                  </section>
                  <section className="order-last rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm">
                    <h3 className="font-display text-lg font-bold">
                      Dossier médical et financier
                    </h3>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Summary
                        icon={Stethoscope}
                        label="Visites"
                        value={patientVisits.length}
                      />
                      <Summary
                        icon={WalletCards}
                        label="Honoraires"
                        value={patientFees.length}
                      />
                      <Summary
                        icon={CreditCard}
                        label="Paiements"
                        value={patientPayments.length}
                      />
                      <Summary
                        icon={FileHeart}
                        label="Ordonnances"
                        value={patientPrescriptions.length}
                      />
                      <Summary
                        icon={FileText}
                        label="Documents"
                        value={patientDocuments.length}
                      />
                      <Summary
                        icon={FileText}
                        label="Dossiers CNSS/CNOPS"
                        value={patientCnss.length}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Amount
                        label="Total honoraires"
                        value={money(totalFees)}
                      />
                      <Amount
                        label="Total payé"
                        value={money(totalPaid)}
                        tone="paid"
                      />
                      <Amount
                        label="Reste à payer"
                        value={money(totalRemaining)}
                        tone={totalRemaining > 0 ? "due" : "paid"}
                      />
                    </div>
                  </section>

                  <div className="grid gap-4 md:grid-cols-2">
                    <RecordSection
                      icon={FileHeart}
                      title="Ordonnances"
                      empty="Aucune ordonnance."
                      action={
                        canWritePrescription ? (
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate(
                                `/${mode === "staff" ? "staff" : "doctor"}/prescriptions?patient=${selectedAppointment.patient_id}`,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-[8px] bg-atlas-teal px-3 py-2 text-xs font-bold text-white"
                          >
                            <Plus size={15} />
                            Ajouter
                          </button>
                        ) : undefined
                      }
                    >
                      {patientPrescriptions.map((item) => (
                        <RecordRow
                          key={item.id}
                          title={item.content}
                          meta={new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "medium",
                          }).format(new Date(item.created_at))}
                        />
                      ))}
                    </RecordSection>
                    <RecordSection
                      icon={FileText}
                      title="Documents"
                      empty="Aucun document."
                      action={
                        canWriteDocument ? (
                          <button
                            type="button"
                            onClick={() =>
                              onNavigate(
                                `/${mode === "staff" ? "staff" : "doctor"}/documents?patient=${selectedAppointment.patient_id}`,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-[8px] bg-atlas-teal px-3 py-2 text-xs font-bold text-white"
                          >
                            <Plus size={15} />
                            Ajouter
                          </button>
                        ) : undefined
                      }
                    >
                      {patientDocuments.map((item) => (
                        <RecordRow
                          key={item.id}
                          title={item.title}
                          meta={`${item.document_type} · ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(item.created_at))}`}
                        />
                      ))}
                    </RecordSection>
                  </div>
                  <RecordSection
                    icon={FileText}
                    title="Dossiers CNSS/CNOPS"
                    empty="Aucun dossier CNSS/CNOPS."
                    action={
                      canWriteCnss ? (
                        <button type="button" onClick={() => onNavigate(`/${mode === "staff" ? "staff" : "doctor"}/cnss?patient=${selectedAppointment.patient_id}`)} className="inline-flex items-center gap-1.5 rounded-[8px] bg-atlas-teal px-3 py-2 text-xs font-bold text-white">
                          <Plus size={15} />Ajouter
                        </button>
                      ) : undefined
                    }
                  >
                    {patientCnss.map((item) => (
                      <RecordRow
                        key={item.id}
                        title={item.reference || "Dossier sans référence"}
                        meta={new Intl.DateTimeFormat("fr-FR", {
                          dateStyle: "medium",
                        }).format(new Date(item.created_at))}
                        badge={item.status}
                      />
                    ))}
                  </RecordSection>
                </div>
                <aside className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm xl:sticky xl:top-5">
                  <div className="flex items-center gap-2">
                    <Clock3 size={19} className="text-atlas-teal" />
                    <h3 className="font-display text-lg font-bold">
                      Historique complet
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Toutes les manipulations liées à ce rendez-vous
                  </p>
                  {history.length ? (
                    <ol className="mt-5 space-y-0">
                      {history.map((item, index) => {
                        const changes = historyChanges(item);
                        return (
                          <li
                            key={item.id}
                            className="relative flex gap-4 pb-5 last:pb-0"
                          >
                            <div className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full bg-atlas-teal ring-4 ring-atlas-mist" />
                            {index < history.length - 1 && (
                              <span className="absolute bottom-0 left-[5px] top-4 w-px bg-atlas-line" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-atlas-ink">
                                {historyLabel(item.action_type)}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-400">
                                {new Intl.DateTimeFormat("fr-FR", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(new Date(item.created_at))}
                              </p>
                              {changes.length > 0 && (
                                <div className="mt-3 space-y-2 rounded-[8px] bg-slate-50 p-3">
                                  {changes.map((field) => (
                                    <div key={field} className="text-xs">
                                      <p className="font-bold text-slate-500">
                                        {historyFieldLabels[field] ??
                                          field.replace(/_/g, " ")}
                                      </p>
                                      {item.old_value &&
                                      field in item.old_value ? (
                                        <p className="mt-1 break-words text-slate-400">
                                          <span className="line-through">
                                            {historyValue(
                                              field,
                                              item.old_value[field],
                                            )}
                                          </span>
                                          <span className="mx-1">→</span>
                                          <strong className="text-atlas-petrol">
                                            {historyValue(
                                              field,
                                              item.new_value?.[field],
                                            )}
                                          </strong>
                                        </p>
                                      ) : (
                                        <p className="mt-1 break-words font-semibold text-atlas-petrol">
                                          {historyValue(
                                            field,
                                            item.new_value?.[field],
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="mt-4 rounded-[8px] bg-slate-50 p-4 text-sm text-slate-500">
                      Aucune opération enregistrée.
                    </p>
                  )}
                </aside>
              </div>
              {!readOnly && (
                <div className="sticky bottom-4 z-30 mt-6 rounded-[14px] border border-slate-200 bg-white/95 p-3 shadow-[0_12px_35px_rgba(15,42,56,0.16)] backdrop-blur-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="hidden min-w-0 lg:block">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Actions du rendez-vous
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-atlas-petrol">
                        {selectedAppointment.patient_name} ·{" "}
                        {selectedAppointment.start_time.slice(0, 5)}
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
                      <button
                        type="button"
                        onClick={() => edit(selectedAppointment)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] bg-atlas-teal px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-atlas-petrol"
                      >
                        <Pencil size={17} />
                        Modifier
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void sendWhatsAppReminder()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
                      >
                        <MessageCircle size={17} />
                        <span className="sm:hidden">Rappel</span>
                        <span className="hidden sm:inline">
                          Rappel WhatsApp
                        </span>
                      </button>
                      {selectedAppointment.status !== "completed" &&
                        selectedAppointment.status !== "cancelled" &&
                        (mode === "doctor" || permissionLevel === "admin") && (
                          <button
                            type="button"
                            onClick={() => void cancel(selectedAppointment)}
                            className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 sm:col-auto"
                          >
                            <Trash2 size={17} />
                            Annuler
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {formOpen && !readOnly && (
        <section className="mx-auto max-w-3xl">
          <form
            aria-label={
              editing ? "Modifier le rendez-vous" : "Créer un rendez-vous"
            }
            onSubmit={submit}
            className="rounded-[16px] border border-atlas-line bg-white p-5 shadow-sm md:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-atlas-line pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-atlas-teal">
                  {editing ? "Modification" : "Nouveau créneau"}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  {editing ? "Modifier le rendez-vous" : "Créer un rendez-vous"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex items-center gap-2 rounded-[9px] border border-atlas-line px-4 py-2.5 text-sm font-bold text-atlas-petrol hover:bg-slate-50"
              >
                <ChevronLeft size={18} />
                Retour à l’agenda
              </button>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold">Patient *</span>
                {patientSearchOpen && (
                  <span className="text-xs font-semibold text-slate-400">
                    {query.trim()
                      ? `${filteredPatients.length} résultat(s)`
                      : `${filteredPatients.length} patients récents`}
                  </span>
                )}
              </div>
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-5 text-slate-400"
                />
                <input
                  value={query}
                  onFocus={() => setPatientSearchOpen(true)}
                  onChange={(event) => {
                    setPatientSearchOpen(true);
                    setQuery(event.target.value);
                    setForm({ ...form, patient_id: "" });
                  }}
                  placeholder="Cliquez pour rechercher un patient"
                  className="mt-2 w-full rounded-[8px] border border-atlas-line py-3 pl-10 pr-3 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"
                />
              </div>
              {patientSearchOpen && (
                <div className="mt-2 max-h-56 overflow-auto rounded-[8px] border border-atlas-line bg-slate-50/50 p-1.5">
                  {filteredPatients.length ? (
                    filteredPatients.map((patient) => {
                      const selected = form.patient_id === patient.id;
                      return (
                        <button
                          type="button"
                          key={patient.id}
                          onClick={() => {
                            setForm({ ...form, patient_id: patient.id });
                            setQuery(
                              `${patient.first_name} ${patient.last_name}`,
                            );
                            setPatientSearchOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-[7px] px-3 py-2.5 text-left text-sm transition ${selected ? "bg-atlas-teal text-white shadow-sm" : "bg-white hover:bg-atlas-mist"}`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${selected ? "bg-white/20" : "bg-atlas-mist text-atlas-teal"}`}
                            >
                              {patient.first_name.charAt(0)}
                              {patient.last_name.charAt(0)}
                            </span>
                            <b className="truncate">
                              {patient.first_name} {patient.last_name}
                            </b>
                          </span>
                          <span
                            className={`shrink-0 text-xs ${selected ? "text-white/80" : "text-slate-400"}`}
                          >
                            {patient.phone || "Sans téléphone"}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="p-5 text-center text-sm text-slate-500">
                      Aucun patient trouvé.
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                onNavigate(
                  mode === "staff" ? "/staff/patients" : "/doctor/patients",
                )
              }
              className="mt-2 text-xs font-bold text-atlas-teal"
            >
              + Ajouter un nouveau patient
            </button>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="col-span-2">
                <span className="text-sm font-bold">Date *</span>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                  className="mt-2 w-full rounded-[8px] border border-atlas-line px-3 py-3 outline-none focus:border-atlas-teal"
                />
              </label>
              <label>
                <span className="text-sm font-bold">Début *</span>
                <input
                  required
                  type="time"
                  step={appointmentDuration * 60}
                  value={form.start_time}
                  onChange={(event) => {
                    const value = event.target.value;
                    const minutes =
                      Number(value.slice(0, 2)) * 60 +
                      Number(value.slice(3, 5)) +
                      appointmentDuration;
                    setForm({
                      ...form,
                      start_time: value,
                      end_time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
                    });
                  }}
                  className="mt-2 w-full rounded-[8px] border border-atlas-line px-3 py-3 outline-none focus:border-atlas-teal"
                />
              </label>
              <label>
                <span className="text-sm font-bold">
                  Fin *{" "}
                  <span className="font-medium text-slate-500">
                    (moyenne {appointmentDuration} min)
                  </span>
                </span>
                <input
                  required
                  type="time"
                  value={form.end_time}
                  onChange={(event) =>
                    setForm({ ...form, end_time: event.target.value })
                  }
                  className="mt-2 w-full rounded-[8px] border border-atlas-line px-3 py-3 outline-none focus:border-atlas-teal"
                />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-bold">Statut</span>
              <div className="relative mt-2">
                <span
                  className={`absolute left-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${statusDots[form.status]}`}
                />
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                  className="w-full appearance-none rounded-[8px] border border-atlas-line py-3 pl-10 pr-10 font-bold outline-none"
                >
                  <option value={form.status}>
                    {statusLabels[form.status]}
                  </option>
                  {(editing
                    ? statusTransitions[
                        appointments.find((item) => item.id === editing)
                          ?.status ?? form.status
                      ]
                    : ["planned", "confirmed"]
                  ).map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                />
              </div>
            </label>
            <section className="mt-4 rounded-[10px] border border-atlas-teal/25 bg-atlas-mist/20 p-4">
              <div className="flex items-center gap-2">
                <Clock3 size={17} className="text-atlas-teal" />
                <h3 className="text-sm font-bold">Rappel automatique</h3>
              </div>
              <label className="mt-3 block text-xs font-bold text-slate-600">
                Règle pour ce rendez-vous
                <select
                  value={
                    form.reminder_enabled === null
                      ? "default"
                      : form.reminder_enabled
                        ? "custom"
                        : "disabled"
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm({
                      ...form,
                      reminder_enabled:
                        value === "default" ? null : value === "custom",
                      reminder_offset_minutes:
                        value === "custom"
                          ? (form.reminder_offset_minutes ?? 1440)
                          : null,
                      reminder_channels:
                        value === "custom"
                          ? (form.reminder_channels ?? ["ESPACE_PATIENT"])
                          : null,
                    });
                  }}
                  className="mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-3 py-3 font-bold outline-none focus:border-atlas-teal"
                >
                  <option value="default">Utiliser la règle du cabinet</option>
                  <option value="custom">Personnaliser ce rendez-vous</option>
                  <option value="disabled">Ne pas envoyer de rappel</option>
                </select>
              </label>
              {form.reminder_enabled === true && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">
                    Délai
                    <select
                      value={form.reminder_offset_minutes ?? 1440}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          reminder_offset_minutes: Number(event.target.value),
                        })
                      }
                      className="mt-2 w-full rounded-[8px] border border-atlas-line bg-white px-3 py-3 font-bold"
                    >
                      <option value={180}>3 heures avant</option>
                      <option value={360}>6 heures avant</option>
                      <option value={720}>12 heures avant</option>
                      <option value={1440}>La veille (J‑1)</option>
                      <option value={2880}>2 jours avant</option>
                      <option value={4320}>3 jours avant</option>
                      <option value={10080}>7 jours avant</option>
                    </select>
                  </label>
                  <fieldset>
                    <legend className="text-xs font-bold text-slate-600">
                      Canaux
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(
                        [
                          ["ESPACE_PATIENT", "Espace patient"],
                          ["WHATSAPP", "WhatsApp"],
                        ] as const
                      ).map(([channel, label]) => {
                        const channels = form.reminder_channels ?? [
                          "ESPACE_PATIENT",
                        ];
                        return (
                          <label
                            key={channel}
                            className="flex items-center gap-2 rounded-[8px] border border-atlas-line bg-white px-3 py-2.5 text-xs font-bold"
                          >
                            <input
                              type="checkbox"
                              checked={channels.includes(channel)}
                              onChange={() => {
                                const exists = channels.includes(channel);
                                if (exists && channels.length === 1) return;
                                setForm({
                                  ...form,
                                  reminder_channels: exists
                                    ? channels.filter(
                                        (item) => item !== channel,
                                      )
                                    : [...channels, channel],
                                });
                              }}
                              className="accent-atlas-teal"
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              )}
              <p className="mt-3 text-[11px] font-semibold text-slate-500">
                Le réglage général se trouve dans Configuration → Relances
                automatiques.
              </p>
            </section>
            <label className="mt-4 block">
              <span className="text-sm font-bold">Motif</span>
              <input
                value={form.reason}
                onChange={(event) =>
                  setForm({ ...form, reason: event.target.value })
                }
                placeholder="Ex. Consultation de contrôle"
                className="mt-2 w-full rounded-[8px] border border-atlas-line px-3 py-3 outline-none focus:border-atlas-teal"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-bold">Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                className="mt-2 min-h-24 w-full rounded-[8px] border border-atlas-line px-3 py-3 outline-none focus:border-atlas-teal"
              />
            </label>
            {message && (
              <p className="mt-4 rounded-[8px] bg-red-50 p-3 text-sm font-bold text-red-600">
                {message}
              </p>
            )}
            <button
              disabled={!form.patient_id || savingAppointment}
              className="mt-5 w-full rounded-[8px] bg-atlas-teal px-4 py-3.5 font-bold text-white disabled:opacity-40"
            >
              {savingAppointment
                ? "Enregistrement…"
                : editing
                  ? "Enregistrer les modifications"
                  : "Créer le rendez-vous"}
            </button>
            {editing && (
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const item = appointments.find(
                      (value) => value.id === editing,
                    );
                    if (item) void cancel(item);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-red-600"
                >
                  <Trash2 size={15} />
                  Annuler le rendez-vous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = appointments.find(
                      (value) => value.id === editing,
                    );
                    if (item) {
                      const next = statusTransitions[item.status]?.[0];
                      if (next) void changeStatus(item, next);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-atlas-teal"
                >
                  <Pencil size={15} />
                  Statut suivant
                </button>
              </div>
            )}
          </form>
        </section>
      )}
    </div>
  );
  const out = () => {
    logout();
    onNavigate("/login");
  };
  return mode === "staff" ? (
    <StaffLayout cabinetName="Agenda" onNavigate={onNavigate} onLogout={out}>
      {content}
    </StaffLayout>
  ) : (
    <MedecinLayout cabinetName="Agenda" onNavigate={onNavigate} onLogout={out}>
      {content}
    </MedecinLayout>
  );
}

function AppointmentList({
  appointments,
  onOpen,
}: {
  appointments: Appointment[];
  onOpen: (item: Appointment) => void;
}) {
  const rows = [...appointments].sort((a, b) =>
    `${b.date}${b.start_time}`.localeCompare(`${a.date}${a.start_time}`),
  );
  const origin = (item: Appointment) =>
    item.origin === "cabinet" ? "Cabinet" : "En ligne";
  const originTone = (item: Appointment) =>
    item.origin === "cabinet"
      ? "bg-slate-100 text-slate-700"
      : "bg-blue-50 text-blue-700";
  const date = (item: Appointment) =>
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
      new Date(`${item.date}T12:00:00`),
    );
  if (!rows.length)
    return (
      <div className="grid min-h-72 place-items-center p-8 text-center">
        <div>
          <CalendarDays className="mx-auto text-slate-300" size={38} />
          <p className="mt-3 font-bold text-slate-700">
            Aucun rendez-vous dans cette sélection
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Modifiez l’origine, le statut ou la recherche.
          </p>
        </div>
      </div>
    );
  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Date et heure</th>
              <th className="px-5 py-3">Patient</th>
              <th className="px-5 py-3">Origine</th>
              <th className="px-5 py-3">Motif</th>
              <th className="px-5 py-3">Statut</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                className="border-t border-atlas-line transition hover:bg-slate-50/80"
              >
                <td className="whitespace-nowrap px-5 py-4">
                  <b>{date(item)}</b>
                  <span className="mt-1 block text-xs text-slate-500">
                    {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-atlas-petrol">
                  {item.patient_name}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${originTone(item)}`}
                  >
                    {item.origin === "cabinet" ? (
                      <Building2 size={13} />
                    ) : (
                      <Globe2 size={13} />
                    )}{" "}
                    {origin(item)}
                  </span>
                </td>
                <td className="max-w-52 truncate px-5 py-4 text-slate-600">
                  {item.reason || "Consultation"}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-2 text-xs font-bold">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${statusDots[item.status] ?? "bg-slate-400"}`}
                    />
                    {statusLabels[item.status] ?? item.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="rounded-[8px] bg-atlas-mist px-3 py-2 text-xs font-bold text-atlas-teal"
                  >
                    Voir la fiche
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-atlas-line md:hidden">
        {rows.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onOpen(item)}
            className="block w-full p-4 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-atlas-petrol">
                  {item.patient_name}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {date(item)} · {item.start_time.slice(0, 5)}–
                  {item.end_time.slice(0, 5)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${originTone(item)}`}
              >
                {origin(item)}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {item.reason || "Consultation"}
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs font-bold">
              <span
                className={`h-2.5 w-2.5 rounded-full ${statusDots[item.status] ?? "bg-slate-400"}`}
              />
              {statusLabels[item.status] ?? item.status}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeGrid({
  days,
  appointments,
  onEmptyClick,
  onEdit,
}: {
  days: Date[];
  appointments: Appointment[];
  onEmptyClick?: (date: string, start: string) => void;
  onEdit: (item: Appointment) => void;
}) {
  const hours = Array.from(
    { length: lastHour - firstHour },
    (_, index) => firstHour + index,
  );
  const today = localDate();
  const now = new Date();
  const nowTop =
    (((now.getHours() - firstHour) * 60 + now.getMinutes()) / 60) * hourHeight;
  const showNow = now.getHours() >= firstHour && now.getHours() < lastHour;
  return (
    <div className="overflow-auto">
      <div className="min-w-[760px]">
        <div
          className="sticky top-0 z-20 grid border-b border-atlas-line bg-white"
          style={{
            gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div className="border-r border-atlas-line" />
          {days.map((day) => (
            <div
              key={localDate(day)}
              className={`border-r border-atlas-line p-2 text-center ${localDate(day) === today ? "text-atlas-teal" : ""}`}
            >
              <p className="text-[11px] font-bold uppercase">
                {new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(
                  day,
                )}
              </p>
              <p
                className={`mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-lg font-bold ${localDate(day) === today ? "bg-atlas-teal text-white" : ""}`}
              >
                {day.getDate()}
              </p>
            </div>
          ))}
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))`,
          }}
        >
          <div>
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-r border-atlas-line text-right text-[11px] text-slate-400"
                style={{ height: hourHeight }}
              >
                <span className="relative -top-2 pr-2">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>
          {days.map((day) => {
            const date = localDate(day);
            const items = appointments.filter((item) => item.date === date);
            return (
              <div
                key={date}
                className="relative border-r border-atlas-line"
                style={{ height: hours.length * hourHeight }}
                onClick={(event) => {
                  if (!onEmptyClick || event.target !== event.currentTarget)
                    return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const minutes = Math.max(
                    0,
                    Math.min(
                      (lastHour - firstHour) * 60 - 30,
                      Math.floor(
                        (((event.clientY - rect.top) / hourHeight) * 60) / 15,
                      ) * 15,
                    ),
                  );
                  const hour = firstHour + Math.floor(minutes / 60);
                  onEmptyClick(
                    date,
                    `${String(hour).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
                  );
                }}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: (hour - firstHour) * hourHeight }}
                  />
                ))}
                {date === today && showNow && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-30 border-t-2 border-red-500"
                    style={{ top: nowTop }}
                  >
                    <span className="absolute -left-1 -top-[5px] h-2.5 w-2.5 rounded-full bg-red-500" />
                  </div>
                )}
                {items.map((item) => {
                  const [startH, startM] = item.start_time
                    .split(":")
                    .map(Number);
                  const [endH, endM] = item.end_time.split(":").map(Number);
                  const top =
                    (((startH - firstHour) * 60 + startM) / 60) * hourHeight;
                  const height = Math.max(
                    28,
                    (((endH - startH) * 60 + endM - startM) / 60) * hourHeight,
                  );
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(item);
                      }}
                      className={`absolute left-1 right-1 z-10 overflow-hidden rounded-[6px] border-l-4 px-2 py-1 text-left text-xs shadow-sm transition hover:z-20 hover:shadow-md ${eventColors[item.status] ?? eventColors.planned}`}
                      style={{ top, height }}
                    >
                      <p className="truncate font-bold">{item.patient_name}</p>
                      <p className="truncate text-[10px] opacity-80">
                        {item.start_time.slice(0, 5)} ·{" "}
                        {item.reason || "Consultation"}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({
  cursor,
  onChange,
}: {
  cursor: Date;
  onChange: (date: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => addDays(start, index));
  const selected = localDate(cursor);
  const today = localDate();
  function changeMonth(amount: number) {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + amount);
    onChange(next);
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold capitalize">
          {new Intl.DateTimeFormat("fr-FR", {
            month: "long",
            year: "numeric",
          }).format(cursor)}
        </h3>
        <div className="flex">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="rounded-full p-1 hover:bg-slate-100"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="rounded-full p-1 hover:bg-slate-100"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="text-[10px] font-bold text-slate-400"
          >
            {label}
          </span>
        ))}
        {days.map((day) => {
          const date = localDate(day);
          return (
            <button
              type="button"
              key={date}
              onClick={() => onChange(day)}
              className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${date === selected ? "bg-atlas-teal text-white" : date === today ? "bg-atlas-mist font-bold text-atlas-teal" : ""} ${day.getMonth() !== cursor.getMonth() ? "opacity-35" : ""}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] bg-slate-50 p-3">
      <Icon size={16} className="text-atlas-teal" />
      <p className="mt-2 text-[10px] font-bold uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-bold">{value}</p>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[9px] bg-slate-50 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-atlas-mist text-atlas-teal">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function Amount({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "paid" | "due";
}) {
  return (
    <div
      className={`rounded-[9px] border p-3 ${tone === "due" ? "border-amber-200 bg-amber-50" : tone === "paid" ? "border-emerald-200 bg-emerald-50" : "border-atlas-line bg-slate-50"}`}
    >
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p
        className={`mt-1 font-display text-lg font-bold ${tone === "due" ? "text-amber-800" : tone === "paid" ? "text-emerald-700" : "text-atlas-petrol"}`}
      >
        {value}
      </p>
    </div>
  );
}
function DueChoice({
  value,
  onChange,
  total,
}: {
  value: FeeDue;
  onChange: (value: FeeDue) => void;
  total: number;
}) {
  return (
    <div className="mt-3 rounded-[9px] border border-atlas-line bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">Cet honoraire a-t-il une échéance ?</p>
          <p className="text-xs text-slate-500">
            Une échéance est un montant attendu à une date donnée. Ce n’est pas
            encore un paiement.
          </p>
        </div>
        <div className="flex rounded-[8px] bg-white p-1">
          <button
            type="button"
            onClick={() =>
              onChange({ enabled: false, date: "", amount: "", comment: "" })
            }
            className={`rounded-[6px] px-5 py-2 text-sm font-bold ${!value.enabled ? "bg-atlas-teal text-white" : "text-slate-500"}`}
          >
            Non
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...value,
                enabled: true,
                amount: value.amount || String(total || ""),
              })
            }
            className={`rounded-[6px] px-5 py-2 text-sm font-bold ${value.enabled ? "bg-atlas-teal text-white" : "text-slate-500"}`}
          >
            Oui
          </button>
        </div>
      </div>
      {value.enabled && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="text-sm font-bold">Date d’échéance *</span>
            <input
              type="date"
              value={value.date}
              onChange={(event) =>
                onChange({ ...value, date: event.target.value })
              }
              className={careFieldClass}
            />
          </label>
          <label>
            <span className="text-sm font-bold">Montant attendu (MAD) *</span>
            <input
              type="number"
              min="0.01"
              max={total || undefined}
              step="0.01"
              value={value.amount}
              onChange={(event) =>
                onChange({ ...value, amount: event.target.value })
              }
              className={careFieldClass}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-bold">Commentaire</span>
            <input
              value={value.comment}
              onChange={(event) =>
                onChange({ ...value, comment: event.target.value })
              }
              placeholder="Ex. À régler avant la prochaine consultation"
              className={careFieldClass}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function PaymentRecord({ payment }: { payment: Payment }) {
  const cheque = payment.method === "cheque";
  const status = payment.cheque_status ?? "EN_ATTENTE";
  const badge =
    status === "REJETE" || status === "ANNULE"
      ? "bg-red-100 text-red-700"
      : status === "EN_ATTENTE"
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-700";
  return (
    <div className="rounded-[8px] bg-slate-50 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-emerald-700">{money(payment.amount)}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {paymentMethodLabel(payment.method)} ·{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(payment.paid_at))}
            {payment.reference ? ` · Réf. ${payment.reference}` : ""}
          </p>
          {payment.due_date && (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              Première échéance :{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
                new Date(`${payment.due_date}T12:00:00`),
              )}
            </p>
          )}
          {cheque && (
            <div className="mt-2 grid gap-x-5 gap-y-1 rounded-[7px] border border-amber-100 bg-white p-3 text-xs text-slate-600 sm:grid-cols-2">
              <span>
                <b>Banque :</b> {payment.cheque_bank}
              </span>
              <span>
                <b>N° du chèque :</b> {payment.cheque_number}
              </span>
              <span>
                <b>Date d’émission :</b>{" "}
                {payment.cheque_issue_date ?? payment.cheque_deposit_date}
              </span>
              <span>
                <b>Encaissement prévu :</b> {payment.cheque_cashing_date}
              </span>
            </div>
          )}
          {payment.note && (
            <p className="mt-2 text-xs text-slate-500">{payment.note}</p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge}`}>
          {cheque ? (chequeStatusLabels[status] ?? status) : "Encaissé"}
        </span>
      </div>
      {payment.installment_schedule &&
        payment.installment_schedule.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="text-xs font-bold uppercase text-atlas-teal">
              Échéancier automatique
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {payment.installment_schedule.map((item) => (
                <div
                  key={item.number}
                  className="rounded-[7px] border border-atlas-line bg-white p-2 text-xs"
                >
                  <b>Échéance {item.number}</b>
                  <p className="mt-1 text-slate-500">
                    {item.due_date} · {money(item.amount)}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700">
                    À venir
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

function RecordSection({
  icon: Icon,
  title,
  empty,
  children,
  action,
}: {
  icon: typeof UserRound;
  title: string;
  empty: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const hasItems = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);
  return (
    <section className="rounded-[12px] border border-atlas-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold">
          <Icon size={19} className="text-atlas-teal" />
          {title}
        </h3>
        {action && <div className="record-section-action">{action}</div>}
      </div>
      <div className="mt-3 space-y-2">
        {hasItems ? (
          children
        ) : (
          <p className="rounded-[8px] bg-slate-50 p-3 text-sm text-slate-400">
            {empty}
          </p>
        )}
      </div>
    </section>
  );
}

function RecordRow({
  title,
  meta,
  description,
  badge,
}: {
  title: string;
  meta: string;
  description?: string | null;
  badge?: string;
}) {
  return (
    <div className="rounded-[8px] border border-atlas-line p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="break-words text-sm font-bold">{title}</p>
        {badge && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
            {badge.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-400">{meta}</p>
      {description && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
}

function MonthGrid({
  cursor,
  appointments,
  onSelectDay,
  onEdit,
}: {
  cursor: Date;
  appointments: Appointment[];
  onSelectDay: (date: Date) => void;
  onEdit: (item: Appointment) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const gridStart = addDays(first, -((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index),
  );
  const today = localDate();
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-atlas-line bg-slate-50">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-bold text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const date = localDate(day);
          const items = appointments.filter((item) => item.date === date);
          return (
            <div
              key={date}
              onDoubleClick={() => onSelectDay(day)}
              className={`min-h-28 border-b border-r border-atlas-line p-1.5 ${day.getMonth() !== cursor.getMonth() ? "bg-slate-50/70 text-slate-400" : ""}`}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${date === today ? "bg-atlas-teal text-white" : ""}`}
              >
                {day.getDate()}
              </button>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => onEdit(item)}
                    className={`block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-bold ${eventColors[item.status] ?? eventColors.planned}`}
                  >
                    {item.start_time.slice(0, 5)} {item.patient_name}
                  </button>
                ))}
                {items.length > 3 && (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className="px-1 text-[10px] font-bold text-atlas-teal"
                  >
                    + {items.length - 3} autres
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
