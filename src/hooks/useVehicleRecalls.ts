import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Recall {
  id: string;
  brand: string;
  model: string;
  year_from: number | null;
  year_to: number | null;
  description: string;
  official_url: string | null;
  severity: "low" | "medium" | "high" | "critical";
  source: string | null;
}

export function useVehicleRecalls(opts: { brand?: string; model?: string; year?: number | null } | null) {
  const enabled = !!opts?.brand && !!opts?.model;
  return useQuery({
    queryKey: ["recalls", opts?.brand, opts?.model, opts?.year],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Recall[]> => {
      const { data, error } = await supabase
        .from("recalls")
        .select("*")
        .ilike("brand", opts!.brand!)
        .ilike("model", opts!.model!);
      if (error) throw error;
      const list = (data ?? []) as Recall[];
      if (!opts?.year) return list;
      return list.filter((r) =>
        (r.year_from == null || opts.year! >= r.year_from) &&
        (r.year_to == null || opts.year! <= r.year_to)
      );
    },
  });
}
