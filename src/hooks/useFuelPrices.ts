import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FuelPrice {
  type: string;
  price: number;
  change: number;
  unit: string;
}

export function useFuelPrices() {
  return useQuery({
    queryKey: ["fuel-prices"],
    queryFn: async (): Promise<FuelPrice[]> => {
      const { data, error } = await supabase
        .from("fuel_prices")
        .select("*");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        type: row.fuel_type,
        price: row.price,
        change: Number(row.change_percent),
        unit: row.unit,
      }));
    },
  });
}
