import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserVehicle {
  id: string;
  user_id: string;
  nickname: string | null;
  brand: string;
  model: string;
  year: number | null;
  fuel_type: "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric";
  tank_size_l: number;
  consumption_kml: number;
  color: string;
  is_primary: boolean;
  created_at: string;
}

export const MAX_FREE_VEHICLES = 3;

export function useUserVehicles() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["user_vehicles", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserVehicle[]> => {
      const { data, error } = await supabase
        .from("user_vehicles")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as UserVehicle[];
    },
  });

  const create = useMutation({
    mutationFn: async (v: Omit<UserVehicle, "id" | "user_id" | "created_at" | "is_primary"> & { is_primary?: boolean }) => {
      if (!user) throw new Error("not_authenticated");
      const isFirst = (list.data?.length ?? 0) === 0;
      const { data, error } = await supabase
        .from("user_vehicles")
        .insert({ ...v, user_id: user.id, is_primary: v.is_primary ?? isFirst })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_vehicles"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<UserVehicle> }) => {
      const { error } = await supabase.from("user_vehicles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_vehicles"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_vehicles"] }),
  });

  const setPrimary = useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      await supabase.from("user_vehicles").update({ is_primary: false }).eq("user_id", user.id);
      const { error } = await supabase.from("user_vehicles").update({ is_primary: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_vehicles"] }),
  });

  const primary = list.data?.find((v) => v.is_primary) ?? list.data?.[0] ?? null;

  return { ...list, vehicles: list.data ?? [], primary, create, update, remove, setPrimary };
}
