import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FuelPrice {
  type: string;
  name: string;
  price: number;
  unit: string;
  trend: string;
  change: number;
  updatedAt: string | null;
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
        .map((row: Record<string, unknown>) => ({
          type: String(row.fuel_type ?? ""),
          name: String(row.name || row.fuel_type || ""),
          price: Number(row.price ?? 0),
          unit: String(row.unit ?? "CLP/L"),
          trend: String(row.trend || "stable"),
          change: Number(row.change_percent) || 0,
          updatedAt: (row.updated_at ?? row.created_at ?? null) as string | null,
        }))
        .sort((a, b) => (FUEL_ORDER[a.type] ?? 99) - (FUEL_ORDER[b.type] ?? 99));
    },
  });
}
