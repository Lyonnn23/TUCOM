import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FuelTypeKey =
  | "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric";

export interface FuelLog {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  station_id: string | null;
  fuel_type: FuelTypeKey;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer_km: number | null;
  note: string | null;
  logged_at: string;
}

export type NewFuelLog = Omit<FuelLog, "id" | "user_id">;

export function useFuelLogs() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["fuel_logs", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<FuelLog[]> => {
      const { data, error } = await supabase
        .from("fuel_logs")
        .select("*")
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FuelLog[];
    },
  });

  const create = useMutation({
    mutationFn: async (log: NewFuelLog) => {
      if (!user) throw new Error("not_authenticated");
      const { data, error } = await supabase
        .from("fuel_logs")
        .insert({ ...log, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel_logs"] });
      qc.invalidateQueries({ queryKey: ["fuel_stats"] });
      qc.invalidateQueries({ queryKey: ["fuel_monthly_spend"] });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FuelLog> }) => {
      const { error } = await supabase.from("fuel_logs").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel_logs"] });
      qc.invalidateQueries({ queryKey: ["fuel_stats"] });
      qc.invalidateQueries({ queryKey: ["fuel_monthly_spend"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel_logs"] });
      qc.invalidateQueries({ queryKey: ["fuel_stats"] });
      qc.invalidateQueries({ queryKey: ["fuel_monthly_spend"] });
    },
  });

  return { ...list, logs: list.data ?? [], create, update, remove };
}
