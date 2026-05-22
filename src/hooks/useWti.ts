import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WtiPrice {
  price_usd: number;
  change_pct_week: number;
  recorded_at: string;
}

export function useWti() {
  return useQuery({
    queryKey: ["wti-latest"],
    queryFn: async (): Promise<WtiPrice | null> => {
      const { data, error } = await supabase
        .from("commodity_prices")
        .select("price_usd, change_pct_week, recorded_at")
        .eq("symbol", "WTI")
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as WtiPrice) ?? null;
    },
    staleTime: 30 * 60 * 1000,
  });
}
