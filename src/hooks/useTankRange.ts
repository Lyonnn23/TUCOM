import { useMemo } from "react";
import { useFuelLogs } from "@/hooks/useFuelLogs";
import { useConsumptionStats } from "@/hooks/useFuelStats";
import { useUserVehicles } from "@/hooks/useUserVehicles";

/**
 * Estima km restantes en el estanque desde la última carga registrada.
 *
 * - Usa consumo real (km/L) si hay datos; si no, el del vehículo primario.
 * - Asume que tras la última carga, el conductor pudo haber recorrido
 *   `liters * kml` km. No tenemos telemetría real: es una estimación.
 */
export function useTankRange() {
  const { primary } = useUserVehicles();
  const { logs } = useFuelLogs();
  const { data: stats } = useConsumptionStats(primary?.id ?? null);

  return useMemo(() => {
    if (!logs.length || !primary) return null;
    const last = logs[0];
    const kml = stats?.real_kml ?? primary.consumption_kml ?? 12;
    const tankRangeKm = last.liters * kml;
    return {
      remainingKm: Math.max(0, Math.round(tankRangeKm)),
      kml,
      lastLog: last,
      vehicle: primary,
    };
  }, [logs, primary, stats]);
}
