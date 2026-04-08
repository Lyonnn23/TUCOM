import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FuelPrice {
  type: string;
  name: string;
  price: number;
  unit: string;
  trend: string;
  change: number;
}

const FUEL_ORDER: Record<string, number> = {
  gasoline93: 1,
  gasoline95: 2,
  gasoline97: 3,
  diesel: 4,
  electric: 5,
};

export function useFuelPrices() {
  return useQuery({
    queryKey: ["fuel-prices"],
    queryFn: async (): Promise<FuelPrice[]> => {
      const { data, error } = await supabase.from("fuel_prices").select("*");
      if (error) throw error;

      return (data ?? [])
        .map((row: any) => ({
          type: row.fuel_type,
          name: row.name || row.fuel_type,
          price: row.price,
          unit: row.unit,
          trend: row.trend || "stable",
          change: Number(row.change_percent) || 0,
        }))
        .sort((a, b) => (FUEL_ORDER[a.type] ?? 99) - (FUEL_ORDER[b.type] ?? 99));
    },
  });
}
