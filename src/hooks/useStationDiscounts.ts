import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StationDiscount } from "@/lib/discounts";

export function useStationDiscounts() {
  return useQuery({
    queryKey: ["station-discounts"],
    queryFn: async (): Promise<StationDiscount[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("station_discounts")
        .select("*")
        .eq("is_active", true)
        .or(`valid_to.is.null,valid_to.gte.${today}`);
      if (error) throw error;
      return (data ?? []) as StationDiscount[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
