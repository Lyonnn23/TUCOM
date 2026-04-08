import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FuelReportItem {
  name: string;
  key: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface ZoneReport {
  zone: string;
  regions: string;
  fuels: FuelReportItem[];
}

export interface FuelReportData {
  zones: ZoneReport[];
  national: FuelReportItem[];
  updated_at: string;
}

export function useFuelReport() {
  return useQuery({
    queryKey: ["fuel-report"],
    queryFn: async (): Promise<FuelReportData> => {
      const { data, error } = await supabase.functions.invoke("get-fuel-report");
      if (error) throw error;
      return data as FuelReportData;
    },
    staleTime: 1000 * 60 * 10,
  });
}
