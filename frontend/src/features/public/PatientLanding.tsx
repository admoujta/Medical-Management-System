import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  HeartPulse,
  LoaderCircle,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Stethoscope,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getSession } from "../../lib/auth";
import { AudienceSwitch } from "../../components/AudienceSwitch";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import {
  AvailableDoctorsMap,
  CabinetLocationMap,
  type AvailableMapDoctor,
} from "../../components/CabinetLocationMap";

type Review = {
  id: string;
  rating: number;
  comment: string;
  author: string;
  created_at: string;
  verified: boolean;
};
type OwnReview = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
};
type Doctor = {
  id: string;
  tenant_id: string;
  name: string;
  specialty: string;
  cabinet: string;
  city: string;
  address: string;
  phone: string;
  logo_url: string | null;
  rating: number | null;
  review_count: number;
  reviews: Review[];
  is_available?: boolean;
};

type Props = {
  onDoctor: () => void;
  onLogin: () => void;
  onBook: () => void;
  onPatientSpace?: () => void;
  showAudienceSwitch?: boolean;
  audience?: "doctor" | "patient";
};
const apiUrl = import.meta.env.VITE_API_URL ?? "";

export function PatientLandingPage({
  onDoctor,
  onLogin,
  onBook,
  onPatientSpace,
  showAudienceSwitch = false,
  audience = "patient",
}: Props) {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Toutes les villes");
  const [selected, setSelected] = useState<Doctor | null>(null);
  useEffect(() => {
    fetch(`${apiUrl}/api/public/doctors`)
      .then(async (response) => {
        if (!response.ok) throw new Error(t("directoryUnavailable"));
        return response.json();
      })
      .then(setDoctors)
      .catch(() => setError(t("doctorLoadError")))
      .finally(() => setLoading(false));
  }, [t]);
  const cities = useMemo(
    () => [
      "Toutes les villes",
      ...Array.from(new Set(doctors.map((item) => item.city))).sort(),
    ],
    [doctors],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return doctors.filter(
      (item) =>
        (city === "Toutes les villes" || item.city === city) &&
        (!needle ||
          [item.name, item.specialty, item.cabinet, item.city, item.address].some((value) =>
            value.toLocaleLowerCase("fr").includes(needle),
          )),
    );
  }, [doctors, query, city]);
  return (
    <motion.main
      initial={{ opacity: 0, y: 12, filter: "blur(3px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-atlas-cloud text-atlas-ink"
    >
      <header className="sticky top-0 z-30 border-b border-atlas-line/80 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 py-3 pe-4 md:pe-8 ps-4 md:ps-8">
          <a href="#annuaire" className="shrink-0">
            <img
              src="/images/fadaa-logo.svg"
              alt="FADAA Santé"
              className="h-11 w-24 object-contain sm:w-32"
            />
          </a>
          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 lg:flex">
            <a href="#annuaire" className="hover:text-atlas-teal">
              {t("findDoctorNav")}
            </a>
            <a href="#fonctionnement" className="hover:text-atlas-teal">
              {t("howItWorks")}
            </a>
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
            {onPatientSpace ? (
              <button
                onClick={onPatientSpace}
                className="h-11 rounded-[10px] bg-atlas-petrol px-4 text-sm font-bold text-white hover:bg-atlas-teal"
              >
                {t("patientAccountSpace")}
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="hidden h-11 rounded-[10px] border border-atlas-line bg-white px-4 text-sm font-bold text-atlas-petrol hover:border-atlas-teal sm:block"
              >
                {t("login")}
              </button>
            )}
            {showAudienceSwitch && (
              <AudienceSwitch
                audience={audience}
                onChange={(value) => {
                  if (value === "doctor") onDoctor();
                }}
              />
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(46,196,182,.18),transparent_38%),linear-gradient(180deg,#f8fbfb_0%,#edf7f6_100%)]">
        <div className="mx-auto max-w-7xl px-5 py-16 text-center md:px-8 md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-atlas-teal/20 bg-white px-4 py-2 text-sm font-bold text-atlas-teal shadow-sm">
            <HeartPulse size={16} />
            {t("patientProfessionals")}
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-black tracking-tight text-atlas-petrol md:text-6xl">
            {t("findRightDoctor")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            {t("findDoctorIntro")}
          </p>
          <div className="mx-auto mt-9 grid max-w-4xl gap-3 rounded-[18px] border border-white bg-white/95 p-3 shadow-[0_20px_55px_rgba(15,82,95,.14)] sm:grid-cols-[1fr_220px_auto]">
            <label className="relative">
              <Search
                className="absolute start-4 top-1/2 -translate-y-1/2 text-atlas-teal"
                size={19}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("doctorSearchPlaceholder")}
                className="h-13 w-full rounded-[11px] border border-atlas-line py-3 pe-4 ps-12 text-sm outline-none focus:border-atlas-teal"
              />
            </label>
            <select
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-13 rounded-[11px] border border-atlas-line bg-white px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:border-atlas-teal"
            >
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item === "Toutes les villes" ? t("allCities") : item}
                </option>
              ))}
            </select>
            <a
              href="#carte-medecins"
              className="inline-flex items-center justify-center rounded-[11px] bg-atlas-teal px-6 py-3 text-sm font-bold text-white hover:bg-atlas-petrol"
            >
              {t("searchAction")}
            </a>
          </div>
        </div>
      </section>

      <section id="carte-medecins" className="border-y border-atlas-line bg-white py-10">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">Carte Leaflet · OpenStreetMap</p>
              <h2 className="mt-2 font-display text-2xl font-bold">Médecins disponibles sur la carte</h2>
              <p className="mt-2 text-sm text-slate-500">Seuls les médecins actifs qui possèdent des créneaux disponibles sont affichés.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">{filtered.filter(doctor=>doctor.is_available).length} disponible(s)</span>
          </div>
          <div className="mt-5"><AvailableDoctorsMap doctors={filtered as AvailableMapDoctor[]} selectedDoctorId={selected?.id} onSelect={doctor=>setSelected(filtered.find(item=>item.id===doctor.id)??null)}/></div>
        </div>
      </section>

      <section id="annuaire" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">
              {t("medicalDirectory")}
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold">
              {t("availableDoctors")}
            </h2>
          </div>
          <span className="rounded-full border border-atlas-line bg-white px-4 py-2 text-sm font-bold text-slate-500">
            {t("resultCount", { count: filtered.length })}
          </span>
        </div>
        {loading && (
          <div className="grid min-h-64 place-items-center">
            <LoaderCircle className="animate-spin text-atlas-teal" size={32} />
          </div>
        )}
        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="mt-8 rounded-[18px] border border-atlas-line bg-white p-10 text-center">
            <Search className="mx-auto text-slate-300" size={35} />
            <h3 className="mt-4 text-xl font-bold">{t("noDoctorFound")}</h3>
            <p className="mt-2 text-slate-500">{t("tryAnotherSearch")}</p>
          </div>
        )}
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doctor, index) => (
            <motion.article
              key={doctor.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => setSelected(doctor)}
              className="group cursor-pointer overflow-hidden rounded-[20px] border border-atlas-line bg-white shadow-sm transition hover:-translate-y-1 hover:border-atlas-teal/35 hover:shadow-panel"
            >
              <div className="h-2 bg-gradient-to-r from-atlas-petrol via-atlas-teal to-atlas-aqua" />
              <div className="p-6">
                <div className="flex gap-4">
                  <DoctorAvatar doctor={doctor} />
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-atlas-teal">
                      <BadgeCheck size={15} />
                      {t("verifiedProfile")}
                    </span>
                    <h3 className="mt-1 truncate font-display text-xl font-bold">
                      {doctor.name}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {doctor.specialty}
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-2.5 border-t border-atlas-line pt-5 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Building2 size={17} className="text-atlas-teal" />
                    {doctor.cabinet}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin size={17} className="text-atlas-teal" />
                    {doctor.city}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <Rating value={doctor.rating} count={doctor.review_count} />
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-atlas-teal">
                    {t("viewProfile")}
                    <ArrowRight
                      size={16}
                      className="transition group-hover:translate-x-1 rtl:rotate-180"
                    />
                  </span>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelected(doctor);
                  }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-[11px] bg-atlas-petrol px-4 py-3 text-sm font-bold text-white hover:bg-atlas-teal"
                >
                  <CalendarDays size={17} />
                  {t("bookAppointment")}
                </button>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section
        id="fonctionnement"
        className="relative overflow-hidden border-y border-atlas-line bg-[linear-gradient(135deg,#f8fbfb_0%,#eef8f6_48%,#f7fbfa_100%)] py-20 text-atlas-ink md:py-24"
      >
        <div className="absolute -start-32 top-0 h-80 w-80 rounded-full bg-atlas-aqua/20 blur-3xl" />
        <div className="absolute -end-24 bottom-0 h-72 w-72 rounded-full bg-atlas-sage/35 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-atlas-teal/15 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[.16em] text-atlas-teal shadow-sm">
              Simple et sécurisé
            </span>
            <h2 className="mt-5 font-display text-3xl font-black text-atlas-petrol md:text-4xl">
              Votre rendez-vous en trois étapes
            </h2>
            <p className="mt-4 leading-7 text-slate-600">
              Trouvez le bon professionnel, vérifiez les informations utiles et
              envoyez votre demande en quelques minutes.
            </p>
          </div>
          <div className="relative mt-14">
            <div className="absolute start-[16.66%] end-[16.66%] top-7 hidden h-px bg-gradient-to-r from-atlas-teal/10 via-atlas-teal/45 to-atlas-teal/10 md:block" />
            <div className="relative grid gap-5 md:grid-cols-3">
              {[
                [
                  Search,
                  "01",
                  "Trouvez votre médecin",
                  "Recherchez facilement par nom, spécialité, cabinet ou ville.",
                ],
                [
                  Stethoscope,
                  "02",
                  "Comparez les profils",
                  "Consultez les informations du cabinet et les avis de patients vérifiés.",
                ],
                [
                  CalendarDays,
                  "03",
                  "Demandez un rendez-vous",
                  "Connectez-vous puis choisissez la date et l’heure qui vous conviennent.",
                ],
              ].map(([Icon, step, title, text], index) => (
                <motion.article
                  key={String(step)}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className="group relative pt-7"
                >
                  <div className="absolute start-1/2 top-0 z-10 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-atlas-teal to-atlas-petrol font-display text-sm font-black text-white shadow-[0_0_0_1px_rgba(46,196,182,.2),0_10px_25px_rgba(15,82,95,.2)]">
                    {String(step)}
                  </div>
                  <div className="h-full rounded-[20px] border border-white bg-white/90 px-7 pb-7 pt-12 text-center backdrop-blur-sm transition duration-300 group-hover:-translate-y-1 shadow-[0_18px_50px_rgba(15,82,95,.08)] group-hover:border-atlas-teal/20 group-hover:bg-white group-hover:shadow-[0_24px_60px_rgba(15,82,95,.15)]">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-[13px] bg-atlas-mist text-atlas-teal">
                      <Icon size={24} />
                    </span>
                    <h3 className="mt-5 font-display text-xl font-bold text-atlas-petrol">
                      {String(title)}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {String(text)}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>
      <footer className="border-t border-atlas-line bg-white text-atlas-ink">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-7 text-sm md:flex-row md:px-8">
          <a
            href="#annuaire"
            className="inline-flex items-center rounded-[10px] bg-white px-2 py-1"
          >
            <img
              src="/images/fadaa-logo.svg"
              alt="FADAA Santé"
              className="h-10 w-32 object-contain"
            />
          </a>
          <p className="text-center text-slate-400">
            © 2026 FADAA Santé. Tous droits réservés.
          </p>
          <div className="flex items-center gap-5 font-semibold text-slate-500">
            <a href="#annuaire" className="transition hover:text-atlas-teal">
              Médecins
            </a>
            <a
              href="#fonctionnement"
              className="transition hover:text-atlas-teal"
            >
              Fonctionnement
            </a>
          </div>
        </div>
      </footer>
      {selected && (
        <DoctorDetails
          doctor={selected}
          onClose={() => setSelected(null)}
          onBook={() => {
            sessionStorage.setItem("fadaa_selected_doctor", selected.id);
            onBook();
          }}
          onLogin={onLogin}
          onUpdated={(updated) => {
            setSelected(updated);
            setDoctors((items) =>
              items.map((item) => (item.id === updated.id ? updated : item)),
            );
          }}
        />
      )}
    </motion.main>
  );
}

function DoctorAvatar({ doctor }: { doctor: Doctor }) {
  const [failed, setFailed] = useState(false);
  const initials = doctor.name
    .replace("Dr ", "")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return doctor.logo_url && !failed ? (
    <img
      src={`${apiUrl}${doctor.logo_url}`}
      onError={() => setFailed(true)}
      alt={`Photo de ${doctor.name}`}
      className="h-16 w-16 shrink-0 rounded-[15px] border border-atlas-line bg-white object-cover"
    />
  ) : (
    <span
      aria-label={`Avatar de ${doctor.name}`}
      className="grid h-16 w-16 shrink-0 place-items-center rounded-[15px] bg-atlas-mist font-display text-xl font-black text-atlas-teal"
    >
      {initials}
    </span>
  );
}
function Rating({ value, count }: { value: number | null; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Star
        size={17}
        className={value ? "fill-amber-400 text-amber-400" : "text-slate-300"}
      />
      <b>{value ?? "Nouveau"}</b>
      {count > 0 && <span className="text-slate-400">({count})</span>}
    </span>
  );
}

function DoctorDetails({
  doctor,
  onClose,
  onBook,
  onLogin,
  onUpdated,
}: {
  doctor: Doctor;
  onClose: () => void;
  onBook: () => void;
  onLogin: () => void;
  onUpdated: (doctor: Doctor) => void;
}) {
  const session = getSession();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ownReviews, setOwnReviews] = useState<OwnReview[]>([]);
  const [editingReview, setEditingReview] = useState<string | null>(null);
  async function submitReview() {
    if (!session) {
      setNotice(
        "Connectez-vous à votre espace patient pour publier un avis vérifié.",
      );
      return;
    }
    setSubmitting(true);
    setNotice("");
    try {
      const editing = editingReview;
      const response = await fetch(
        editing
          ? `${apiUrl}/api/patient/reviews/${editing}`
          : `${apiUrl}/api/patient/doctors/${doctor.id}/reviews`,
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ rating, comment }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Avis non enregistré");
      onUpdated(data);
      setComment("");
      setRating(5);
      setEditingReview(null);
      await loadOwnReviews();
      setNotice(
        editing
          ? "Votre avis a été modifié avec succès."
          : "Merci, votre nouvel avis vérifié a été publié.",
      );
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Avis non enregistré.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function loadOwnReviews() {
    if (!session?.accessToken) return;
    try {
      const response = await fetch(
        `${apiUrl}/api/patient/doctors/${doctor.id}/reviews`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      if (response.ok) setOwnReviews(await response.json());
    } catch {
      /* Le visiteur non connecté ne possède pas encore d’avis. */
    }
  }
  useEffect(() => {
    void loadOwnReviews();
  }, [doctor.id, session?.accessToken]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
  return createPortal(
    <div
      className="fixed inset-0 z-[5000] flex justify-end overflow-hidden bg-atlas-ink/60 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        onMouseDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        tabIndex={-1}
        className="relative z-[5001] h-dvh min-h-0 w-full max-w-2xl touch-pan-y overflow-y-auto overscroll-contain border-l border-atlas-line bg-atlas-cloud shadow-2xl [-webkit-overflow-scrolling:touch]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-atlas-line bg-white/95 px-5 py-4 backdrop-blur">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600"
          >
            <ArrowLeft size={18} />
            Retour aux résultats
          </button>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 sm:p-7">
          <section className="rounded-[20px] border border-atlas-line bg-white p-6">
            <div className="flex gap-4">
              <DoctorAvatar doctor={doctor} />
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-atlas-teal">
                  <BadgeCheck size={15} />
                  Profil vérifié
                </span>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  {doctor.name}
                </h2>
                <p className="font-bold text-slate-500">{doctor.specialty}</p>
                <div className="mt-2">
                  <Rating value={doctor.rating} count={doctor.review_count} />
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Info icon={Building2} label="Cabinet" value={doctor.cabinet} />
              <Info icon={Phone} label="Téléphone" value={doctor.phone} />
              <Info
                icon={MapPin}
                label="Adresse"
                value={`${doctor.address}, ${doctor.city}`}
                wide
              />
            </div>
            <button
              onClick={onBook}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-[11px] bg-atlas-teal px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-atlas-teal/20 hover:bg-atlas-petrol"
            >
              <CalendarDays size={18} />
              Prendre rendez-vous
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400">
              <ShieldCheck size={14} />
              Une connexion patient est requise pour continuer.
            </p>
          </section>
          <section className="mt-5 rounded-[20px] border border-atlas-line bg-white p-5">
            <div>
              <h3 className="font-display text-xl font-bold">
                Localisation du cabinet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {doctor.address}, {doctor.city}
              </p>
            </div>
            <div className="mt-4">
              <CabinetLocationMap
                address={doctor.address}
                city={doctor.city}
                cabinetName={doctor.cabinet}
                doctorName={doctor.name}
                zoom={17}
              />
            </div>
          </section>
          <section className="mt-5 rounded-[20px] border border-atlas-line bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">
                Avis des patients
              </h3>
              <Rating value={doctor.rating} count={doctor.review_count} />
            </div>
            {doctor.reviews.length ? (
              <div className="mt-5 space-y-4">
                {doctor.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-xl bg-atlas-cloud p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Patient {review.author}</span>
                      <span className="flex">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star
                            key={index}
                            size={14}
                            className={
                              index < review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200"
                            }
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {review.comment}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-atlas-teal">
                      <BadgeCheck size={13} />
                      Consultation vérifiée
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-atlas-cloud p-5 text-sm text-slate-500">
                Ce médecin n’a pas encore reçu d’avis. Aucun faux témoignage
                n’est affiché.
              </p>
            )}
            {ownReviews.length > 0 && (
              <div className="mt-6 border-t border-atlas-line pt-5">
                <h4 className="font-bold">Mes avis</h4>
                <div className="mt-3 space-y-2">
                  {ownReviews.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border border-atlas-line bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Star
                              key={value}
                              size={14}
                              className={
                                value <= item.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-200"
                              }
                            />
                          ))}
                        </span>
                        <button
                          onClick={() => {
                            setEditingReview(item.id);
                            setRating(item.rating);
                            setComment(item.comment);
                            setNotice("");
                          }}
                          className="text-xs font-bold text-atlas-teal"
                        >
                          Modifier
                        </button>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {item.comment}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 border-t border-atlas-line pt-5">
              <h4 className="font-bold">
                {editingReview
                  ? "Modifier mon avis"
                  : "Partager une nouvelle expérience"}
              </h4>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    aria-label={`${value} étoiles`}
                  >
                    <Star
                      size={22}
                      className={
                        value <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      }
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Votre commentaire après une consultation..."
                className="mt-3 min-h-24 w-full rounded-xl border border-atlas-line p-3 text-sm outline-none focus:border-atlas-teal"
              />
              <button
                disabled={submitting || comment.trim().length < 5}
                onClick={submitReview}
                className="mt-3 rounded-lg bg-atlas-petrol px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting
                  ? "Enregistrement..."
                  : editingReview
                    ? "Enregistrer la modification"
                    : "Publier un nouvel avis"}
              </button>
              {editingReview && (
                <button
                  onClick={() => {
                    setEditingReview(null);
                    setRating(5);
                    setComment("");
                  }}
                  className="ml-2 rounded-lg border border-atlas-line px-4 py-2.5 text-sm font-bold text-slate-600"
                >
                  Annuler
                </button>
              )}
              {notice && (
                <div className="mt-3 rounded-lg bg-atlas-mist p-3 text-sm font-semibold text-atlas-petrol">
                  <p>{notice}</p>
                  {!session && (
                    <button
                      type="button"
                      onClick={onLogin}
                      className="mt-3 rounded-lg bg-atlas-teal px-4 py-2 font-bold text-white"
                    >
                      Se connecter pour publier
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </motion.aside>
    </div>,
    document.body,
  );
}
function Info({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 rounded-xl bg-atlas-cloud p-4 ${wide ? "sm:col-span-2" : ""}`}
    >
      <Icon className="mt-0.5 shrink-0 text-atlas-teal" size={19} />
      <div>
        <span className="block text-xs font-bold uppercase text-slate-400">
          {label}
        </span>
        <span className="mt-1 block text-sm font-bold text-slate-700">
          {value}
        </span>
      </div>
    </div>
  );
}
