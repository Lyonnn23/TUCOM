import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CatalogVehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  version: string;
  fuel_type: "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric" | "hybrid";
  consumption_city: number | null;
  consumption_mixed: number | null;
  consumption_hwy: number | null;
  kwh_per_km: number | null;
  engine_cc: number | null;
  transmission: string | null;
  drive_type: string | null;
  body_type: string | null;
  co2_city: number | null;
  co2_mixed: number | null;
}

export function useCatalogBrands() {
  return useQuery({
    queryKey: ["catalog-brands"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles_catalog")
        .select("brand")
        .order("brand")
        .limit(20000);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r: any) => r.brand))).sort();
    },
  });
}

export function useCatalogModels(brand: string | null) {
  return useQuery({
    queryKey: ["catalog-models", brand],
    enabled: !!brand,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles_catalog")
        .select("model, body_type")
        .eq("brand", brand!)
        .order("model")
        .limit(20000);
      if (error) throw error;
      const map = new Map<string, string | null>();
      for (const r of data ?? []) map.set((r as any).model, (r as any).body_type);
      return Array.from(map, ([model, body_type]) => ({ model, body_type })).sort((a, b) => a.model.localeCompare(b.model));
    },
  });
}

export function useCatalogYears(brand: string | null, model: string | null) {
  return useQuery({
    queryKey: ["catalog-years", brand, model],
    enabled: !!brand && !!model,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles_catalog")
        .select("year")
        .eq("brand", brand!)
        .eq("model", model!)
        .order("year", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r: any) => r.year as number)));
    },
  });
}

export function useCatalogVersions(brand: string | null, model: string | null, year: number | null) {
  return useQuery<CatalogVehicle[]>({
    queryKey: ["catalog-versions", brand, model, year],
    enabled: !!brand && !!model && !!year,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles_catalog")
        .select("*")
        .eq("brand", brand!)
        .eq("model", model!)
        .eq("year", year!)
        .order("version");
      if (error) throw error;
      return (data ?? []) as CatalogVehicle[];
    },
  });
}

/** Top N most-common vehicles for comparison tab (one row per brand+model, latest year). */
export function useCatalogTop(limit = 12) {
  return useQuery<CatalogVehicle[]>({
    queryKey: ["catalog-top", limit],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles_catalog")
        .select("*")
        .order("popularity_rank", { ascending: true, nullsFirst: false })
        .order("year", { ascending: false })
        .limit(500);
      if (error) throw error;
      const seen = new Set<string>();
      const out: CatalogVehicle[] = [];
      for (const v of (data ?? []) as CatalogVehicle[]) {
        const key = `${v.brand}|${v.model}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(v);
        if (out.length >= limit) break;
      }
      return out;
    },
  });
}
