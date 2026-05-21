import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Car, Footprints } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  origin: { lat: number; lng: number } | null;
  dest: { lat: number; lng: number };
}

interface Leg {
  meters: number;
  seconds: number;
}

const fmtDist = (m: number) =>
  m >= 1000
    ? `${(m / 1000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} km`
    : `${Math.round(m)} m`;

const fmtDur = (s: number) => {
  const mins = Math.max(1, Math.round(s / 60));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return `${h} h ${r ? `${r} min` : ""}`.trim();
};

const StationDistanceInfo = ({ origin, dest }: Props) => {
  const [driving, setDriving] = useState<Leg | null>(null);
  const [walking, setWalking] = useState<Leg | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("station-distance", {
        body: {
          originLat: origin.lat,
          originLng: origin.lng,
          destLat: dest.lat,
          destLng: dest.lng,
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setDriving(data.driving);
          setWalking(data.walking);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [origin?.lat, origin?.lng, dest.lat, dest.lng]);

  if (!origin) {
    return (
      <p className="text-xs text-muted-foreground">
        Activa tu ubicación para calcular la distancia en auto y caminando.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    );
  }

  if (!driving && !walking) {
    return <p className="text-xs text-muted-foreground">No se pudo calcular la distancia.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2" aria-live="polite">
      {driving && (
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Car className="w-3.5 h-3.5" aria-hidden="true" /> En auto
          </div>
          <div className="font-heading font-bold text-foreground text-base mt-0.5">
            {fmtDur(driving.seconds)}
          </div>
          <div className="text-[11px] text-muted-foreground">{fmtDist(driving.meters)}</div>
        </div>
      )}
      {walking && (
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Footprints className="w-3.5 h-3.5" aria-hidden="true" /> Caminando
          </div>
          <div className="font-heading font-bold text-foreground text-base mt-0.5">
            {fmtDur(walking.seconds)}
          </div>
          <div className="text-[11px] text-muted-foreground">{fmtDist(walking.meters)}</div>
        </div>
      )}
    </div>
  );
};

export default StationDistanceInfo;
