import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MepcoAdjustment {
  id: string;
  week_of: string;
  published_at: string | null;
  direction: "up" | "down" | "neutral";
  fuel_changes: Record<string, number>;
  source_url: string | null;
  notes: string | null;
}

export function useMepco(limit = 1) {
  return useQuery({
    queryKey: ["mepco", limit],
    queryFn: async (): Promise<MepcoAdjustment[]> => {
      const { data, error } = await supabase
        .from("mepco_adjustments")
        .select("*")
        .order("week_of", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as MepcoAdjustment[];
    },
    staleTime: 60 * 60 * 1000,
  });
}
