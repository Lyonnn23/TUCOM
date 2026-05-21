import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Map<stationId, ISO date of latest community-verified report (last 48h)>
 */
export function useRecentReports() {
  return useQuery({
    queryKey: ["recent-reports"],
    queryFn: async () => {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("reported_prices")
        .select("station_id, created_at")
        .eq("status", "verified")
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, string>();
      for (const r of data ?? []) {
        if (!map.has(r.station_id)) map.set(r.station_id, r.created_at);
      }
      return map;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
