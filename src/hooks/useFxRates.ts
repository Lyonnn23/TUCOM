import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FxRate {
  rate_clp: number;
  change_pct: number;
  recorded_at: string;
}

export function useFxRates(days = 7) {
  return useQuery({
    queryKey: ["fx-rates", days],
    queryFn: async (): Promise<FxRate[]> => {
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      const { data, error } = await supabase
        .from("fx_rates")
        .select("rate_clp, change_pct, recorded_at")
        .eq("currency", "USD")
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FxRate[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
