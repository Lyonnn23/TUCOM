import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FuelTypeKey } from "@/hooks/useFuelLogs";

export interface ConsumptionStats {
  real_kml: number | null;
  total_spent_6m: number;
  total_liters_6m: number;
  avg_price_paid: number | null;
  cost_per_km: number | null;
  km_driven_6m: number;
  last_odometer_km: number | null;
  last_log_at: string | null;
}

export interface MonthlySpend {
  month: string;
  total_clp: number;
  liters: number;
  avg_price: number | null;
}

export function useConsumptionStats(vehicleId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fuel_stats", user?.id, vehicleId ?? null],
    enabled: !!user?.id,
    queryFn: async (): Promise<ConsumptionStats | null> => {
      const { data, error } = await supabase.rpc("get_user_consumption_stats", {
        _user_id: user!.id,
        _vehicle_id: vehicleId ?? null,
      });
      if (error) throw error;
      return data as unknown as ConsumptionStats;
    },
  });
}

export function useMonthlySpend(months = 6) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fuel_monthly_spend", user?.id, months],
    enabled: !!user?.id,
    queryFn: async (): Promise<MonthlySpend[]> => {
      const { data, error } = await supabase.rpc("get_monthly_fuel_spend", {
        _user_id: user!.id,
        _months: months,
      });
      if (error) throw error;
      return (data ?? []) as unknown as MonthlySpend[];
    },
  });
}

export function useMarketAvgPrice(fuelType: FuelTypeKey | null) {
  return useQuery({
    queryKey: ["market_avg_price", fuelType],
    enabled: !!fuelType,
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase.rpc("get_market_avg_price", {
        _fuel_type: fuelType!,
      });
      if (error) throw error;
      return data as unknown as number | null;
    },
  });
}
