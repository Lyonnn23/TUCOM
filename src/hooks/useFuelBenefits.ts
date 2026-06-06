import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FuelBenefit {
  id: string;
  brand: string;
  payment_method: string;
  discount_description: string;
  discount_percent: number | null;
  discount_fixed: number | null;
  day_of_week: number[];
  fuel_types: string[];
  conditions: string | null;
  is_active: boolean;
}

export function useFuelBenefits() {
  return useQuery({
    queryKey: ["fuel-benefits"],
    staleTime: 60 * 60 * 1000, // 1h: benefits change rarely
    gcTime: 6 * 60 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    queryFn: async (): Promise<FuelBenefit[]> => {
      const { data, error } = await supabase
        .from("fuel_benefits")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as FuelBenefit[];
    },
  });
}
