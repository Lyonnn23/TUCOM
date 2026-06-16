import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StationRating {
  avg: number;
  count: number;
}

export function useStationRatings() {
  return useQuery({
    queryKey: ["station-ratings"],
    queryFn: async (): Promise<Map<string, StationRating>> => {
      const { data, error } = await (supabase as any)
        .from("station_reviews_public")
        .select("station_id, rating");
      if (error) throw error;
      const acc = new Map<string, { sum: number; count: number }>();
      for (const row of (data ?? []) as Array<{ station_id: string; rating: number }>) {
        const cur = acc.get(row.station_id) ?? { sum: 0, count: 0 };
        cur.sum += row.rating;
        cur.count += 1;
        acc.set(row.station_id, cur);
      }
      const result = new Map<string, StationRating>();
      acc.forEach((v, k) => result.set(k, { avg: v.sum / v.count, count: v.count }));
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}
