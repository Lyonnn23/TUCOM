import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingDown, TrendingUp, Gauge } from "lucide-react";

interface Props {
  officialKml: number;
  vehicleId?: string | null;
}

/**
 * Compares real consumption (from fuel_logs odometer + liters) vs official catalog value.
 * Only renders when the user has 5+ logs (optionally for the given vehicle).
 */
export default function RealVsOfficialStrip({ officialKml, vehicleId }: Props) {
  const { user } = useAuth();
  const [realKml, setRealKml] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      let q = supabase
        .from("fuel_logs")
        .select("liters, odometer_km, logged_at")
        .eq("user_id", user.id)
        .not("odometer_km", "is", null)
        .order("logged_at", { ascending: true });
      if (vehicleId) q = q.eq("vehicle_id", vehicleId);
      const { data } = await q;
      if (cancelled || !data || data.length < 5) {
        setCount(data?.length ?? 0);
        return;
      }
      // Use full-to-full estimation: sum litres between first and last odometer, distance = last - first
      const first = data[0];
      const last = data[data.length - 1];
      const dist = (last.odometer_km ?? 0) - (first.odometer_km ?? 0);
      // Sum liters excluding the first refuel (since it filled the unknown tank prior)
      const liters = data.slice(1).reduce((s, r) => s + Number(r.liters || 0), 0);
      if (dist > 50 && liters > 5) {
        setRealKml(dist / liters);
      }
      setCount(data.length);
    })();
    return () => { cancelled = true; };
  }, [user, vehicleId]);

  if (!user || count < 5 || realKml === null) return null;

  const diffPct = ((realKml - officialKml) / officialKml) * 100;
  const better = diffPct >= 0;

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Gauge className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Tu rendimiento real</p>
        <p className="text-sm font-heading font-bold text-foreground tabular-nums">
          {realKml.toFixed(1)} km/L
          <span className="text-[11px] text-muted-foreground font-normal ml-2">
            oficial {officialKml.toFixed(1)} km/L
          </span>
        </p>
      </div>
      <div className={`text-right shrink-0 ${better ? "text-success" : "text-fuel-red"}`}>
        {better ? <TrendingUp className="w-3.5 h-3.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 inline" />}
        <span className="text-xs font-bold ml-1 tabular-nums">{diffPct > 0 ? "+" : ""}{diffPct.toFixed(0)}%</span>
        <p className="text-[9px] text-muted-foreground">{count} cargas</p>
      </div>
    </div>
  );
}
