import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StationPriceHistoryPoint {
  recorded_at: string;
  fuel_type: string;
  price: number;
}

/**
 * Per-station price history (last N days), grouped by fuel.
 * Fed by the `station_price_history` table — one row per real change,
 * retained for 90 days by `purge_station_price_history()`.
 */
export function useStationPriceHistory(
  stationId: string | null | undefined,
  days = 90,
  fuelType?: string
) {
  return useQuery<StationPriceHistoryPoint[]>({
    queryKey: ["station-price-history", stationId, days, fuelType ?? "all"],
    enabled: !!stationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      let q = supabase
        .from("station_price_history")
        .select("recorded_at,fuel_type,price")
        .eq("station_id", stationId!)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true })
        .limit(2000);
      if (fuelType) q = q.eq("fuel_type", fuelType);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as StationPriceHistoryPoint[];
    },
  });
}
