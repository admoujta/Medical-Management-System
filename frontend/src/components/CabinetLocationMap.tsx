import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { ExternalLink, LocateFixed, MapPin } from "lucide-react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type Coordinates = { lat: number; lng: number };
export type AvailableMapDoctor = {
  id: string;
  tenant_id: string;
  name: string;
  specialty: string;
  cabinet: string;
  city: string;
  address?: string | null;
  is_available?: boolean;
};

type Props = {
  address?: string | null;
  city?: string | null;
  cabinetName?: string | null;
  doctorName?: string | null;
  compact?: boolean;
  zoom?: number;
};

const cabinetMarker = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function cacheKey(query: string) {
  return `fadaa-map:${query.toLocaleLowerCase("fr")}`;
}

async function geocode(
  query: string,
  signal: AbortSignal,
): Promise<Coordinates | null> {
  const key = cacheKey(query);
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as Coordinates;
  } catch {
    // Le cache navigateur est facultatif.
  }
  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "ma",
    q: query,
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { signal, headers: { Accept: "application/json" } },
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!rows.length) return null;
  const result = { lat: Number(rows[0].lat), lng: Number(rows[0].lon) };
  if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) return null;
  try {
    sessionStorage.setItem(key, JSON.stringify(result));
  } catch {
    // La carte reste utilisable sans cache.
  }
  return result;
}

function FitLocations({ points }: { points: Coordinates[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((point) => [point.lat, point.lng])),
      { padding: [35, 35], maxZoom: 14 },
    );
  }, [map, points]);
  return null;
}

export function AvailableDoctorsMap({
  doctors,
  selectedDoctorId,
  onSelect,
}: {
  doctors: AvailableMapDoctor[];
  selectedDoctorId?: string | null;
  onSelect: (doctor: AvailableMapDoctor) => void;
}) {
  const cabinets = useMemo(() => {
    const grouped = new Map<
      string,
      {
        key: string;
        query: string;
        cabinet: string;
        doctors: AvailableMapDoctor[];
      }
    >();
    for (const doctor of doctors.filter((item) => item.is_available)) {
      const query = [doctor.address, doctor.city, "Maroc"]
        .filter(Boolean)
        .join(", ");
      if (!query) continue;
      const key = `${doctor.tenant_id}:${query}`;
      const current = grouped.get(key);
      if (current) current.doctors.push(doctor);
      else
        grouped.set(key, {
          key,
          query,
          cabinet: doctor.cabinet,
          doctors: [doctor],
        });
    }
    return [...grouped.values()];
  }, [doctors]);
  const [locations, setLocations] = useState<
    Array<(typeof cabinets)[number] & Coordinates>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLocations([]);
    setLoading(Boolean(cabinets.length));
    void (async () => {
      const resolved: Array<(typeof cabinets)[number] & Coordinates> = [];
      for (const cabinet of cabinets) {
        if (controller.signal.aborted) return;
        try {
          const point = await geocode(cabinet.query, controller.signal);
          if (point) {
            resolved.push({ ...cabinet, ...point });
            setLocations([...resolved]);
          }
        } catch (reason) {
          if (reason instanceof DOMException && reason.name === "AbortError")
            return;
        }
        if (cabinets.length > 1)
          await new Promise((resolve) => window.setTimeout(resolve, 1100));
      }
      if (!controller.signal.aborted) setLoading(false);
    })();
    return () => controller.abort();
  }, [cabinets]);

  if (!cabinets.length)
    return (
      <div className="grid h-72 place-items-center rounded-[18px] border border-atlas-line bg-slate-50 text-center">
        <div>
          <MapPin className="mx-auto text-slate-300" size={36} />
          <p className="mt-3 font-bold text-slate-500">
            Aucun médecin disponible à afficher.
          </p>
        </div>
      </div>
    );

  return (
    <section className="relative isolate z-0 overflow-hidden rounded-[18px] border border-atlas-line bg-white shadow-sm">
      <MapContainer
        center={[31.7917, -7.0926]}
        zoom={5}
        scrollWheelZoom
        className="relative z-0 h-[430px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitLocations points={locations} />
        {locations.map((location) => (
          <Marker
            key={location.key}
            position={[location.lat, location.lng]}
            icon={cabinetMarker}
            eventHandlers={{
              click: () => {
                if (location.doctors.length === 1)
                  onSelect(location.doctors[0]);
              },
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -30]}
              opacity={1}
              className="fadaa-map-tooltip"
            >
              <div className="min-w-48 py-1">
                <strong className="block text-sm text-atlas-petrol">
                  {location.cabinet}
                </strong>
                <span className="mt-1 block text-xs text-slate-500">
                  {location.query}
                </span>
                <span className="mt-2 block text-xs font-bold text-atlas-teal">
                  {location.doctors.length === 1
                    ? `${location.doctors[0].name} · ${location.doctors[0].specialty}`
                    : `${location.doctors.length} médecins disponibles`}
                </span>
                <span className="mt-1 block text-[10px] font-semibold text-slate-400">
                  Cliquez pour voir les informations
                </span>
              </div>
            </Tooltip>
            <Popup>
              <div className="min-w-52">
                <strong className="text-sm">{location.cabinet}</strong>
                <span className="mt-1 block text-xs text-slate-500">
                  {location.query}
                </span>
                <div className="mt-3 space-y-2">
                  {location.doctors.map((doctor) => (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => onSelect(doctor)}
                      aria-label={`Voir les informations de ${doctor.name}`}
                      className={`block w-full rounded-md px-3 py-2 text-left text-xs font-bold ${
                        selectedDoctorId === doctor.id
                          ? "bg-atlas-teal text-white"
                          : "bg-atlas-mist text-atlas-teal"
                      }`}
                    >
                      {doctor.name} · {doctor.specialty}
                    </button>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {loading && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-atlas-teal shadow-lg">
          Localisation des cabinets disponibles…
        </div>
      )}
      {!loading && !locations.length && (
        <div className="absolute inset-x-4 bottom-4 z-[500] rounded-xl bg-white/95 p-4 text-center text-sm font-bold text-slate-600 shadow-lg">
          Les médecins sont disponibles, mais leurs adresses ne sont pas
          localisables.
        </div>
      )}
    </section>
  );
}

export function CabinetLocationMap({
  address,
  city,
  cabinetName,
  doctorName,
  compact = false,
  zoom = 16,
}: Props) {
  const query = useMemo(
    () => [address, city, "Maroc"].filter(Boolean).join(", "),
    [address, city],
  );
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(Boolean(address || city));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!address && !city) {
      setCoordinates(null);
      setLoading(false);
      setError("Adresse du cabinet non renseignée.");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    geocode(query, controller.signal)
      .then((result) => {
        if (!result) throw new Error("Adresse introuvable sur la carte.");
        setCoordinates(result);
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setCoordinates(null);
        setError(
          reason instanceof Error
            ? reason.message
            : "Localisation indisponible.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [address, city, query]);

  const mapsSearch = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const directions = coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`
    : mapsSearch;

  if (loading)
    return (
      <div
        className={`grid place-items-center rounded-xl border border-atlas-line bg-slate-50 text-center ${compact ? "h-40" : "h-56"}`}
      >
        <div>
          <LocateFixed
            className="mx-auto animate-pulse text-atlas-teal"
            size={26}
          />
          <p className="mt-2 text-xs font-bold text-slate-500">
            Localisation du cabinet…
          </p>
        </div>
      </div>
    );

  if (!coordinates)
    return (
      <div className="rounded-xl border border-dashed border-atlas-line bg-slate-50 p-4 text-center">
        <MapPin className="mx-auto text-slate-300" size={25} />
        <p className="mt-2 text-xs font-semibold text-slate-500">{error}</p>
        {(address || city) && (
          <a
            href={mapsSearch}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-atlas-teal"
          >
            Rechercher l’adresse <ExternalLink size={13} />
          </a>
        )}
      </div>
    );

  return (
    <section className="relative isolate z-0 overflow-hidden rounded-xl border border-atlas-line bg-white">
      <MapContainer
        key={`${coordinates.lat}-${coordinates.lng}`}
        center={[coordinates.lat, coordinates.lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        className={compact ? "relative z-0 h-40 w-full" : "relative z-0 h-56 w-full"}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[coordinates.lat, coordinates.lng]}
          icon={cabinetMarker}
        >
          <Popup>
            <strong>{cabinetName || "Cabinet médical"}</strong>
            {doctorName && <span className="mt-1 block">{doctorName}</span>}
            <span className="mt-1 block text-xs">{query}</span>
          </Popup>
        </Marker>
      </MapContainer>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-atlas-line bg-white px-3 py-2.5">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-500">
          {query}
        </p>
        <a
          href={directions}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-atlas-mist px-3 py-2 text-xs font-bold text-atlas-teal"
        >
          Itinéraire <ExternalLink size={13} />
        </a>
      </div>
    </section>
  );
}
