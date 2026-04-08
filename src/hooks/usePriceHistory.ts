import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PriceHistoryPoint {
  snapshot_date: string;
  fuel_type: string;
  avg_price: number;
  min_price: number;
  max_price: number;
}

export function usePriceHistory(days: number = 30) {
  return useQuery({
    queryKey: ["price-history", days],
    queryFn: async (): Promise<PriceHistoryPoint[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("fuel_price_history")
        .select("snapshot_date, fuel_type, avg_price, min_price, max_price")
        .gte("snapshot_date", since.toISOString().slice(0, 10))
        .order("snapshot_date", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PriceHistoryPoint[];
    },
    staleTime: 1000 * 60 * 10,
  });
}
