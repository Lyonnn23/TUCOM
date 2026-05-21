import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PriceAlert {
  id: string;
  user_id: string;
  station_id: string;
  fuel_type: string;
  target_price: number;
  active: boolean;
  triggered: boolean;
  triggered_at: string | null;
  notified_read: boolean;
  last_known_price: number | null;
  created_at: string;
}

export const PRICE_ALERTS_KEY = ["price_alerts"];

export function usePriceAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [...PRICE_ALERTS_KEY, user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_alerts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PriceAlert[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { station_id: string; fuel_type: string; target_price: number }) => {
      if (!user) throw new Error("not-authenticated");
      const { error } = await supabase
        .from("price_alerts" as any)
        .insert({ ...input, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alerta creada");
      qc.invalidateQueries({ queryKey: PRICE_ALERTS_KEY });
    },
    onError: (e: any) => toast.error(e?.message ?? "No se pudo crear la alerta"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_alerts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alerta eliminada");
      qc.invalidateQueries({ queryKey: PRICE_ALERTS_KEY });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("price_alerts" as any)
        .update({ notified_read: true })
        .eq("user_id", user.id)
        .eq("triggered", true)
        .eq("notified_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PRICE_ALERTS_KEY }),
  });

  const alerts = query.data ?? [];
  const unreadCount = alerts.filter((a) => a.triggered && !a.notified_read).length;

  return {
    alerts,
    unreadCount,
    loading: query.isLoading,
    create: create.mutate,
    creating: create.isPending,
    remove: remove.mutate,
    markAllRead: markAllRead.mutate,
  };
}
