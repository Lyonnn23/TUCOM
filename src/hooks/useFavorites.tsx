import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const FAVORITES_KEY = ["favorites"];

export function useFavorites() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [...FAVORITES_KEY, user?.id ?? "anon"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("station_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ids = new Set((query.data ?? []).map((r) => r.station_id));

  const toggle = useMutation({
    mutationFn: async (stationId: string) => {
      if (!user) throw new Error("not-authenticated");
      if (ids.has(stationId)) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("station_id", stationId);
        if (error) throw error;
        return { stationId, added: false };
      }
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, station_id: stationId });
      if (error) throw error;
      return { stationId, added: true };
    },
    onSuccess: (res) => {
      toast.success(res.added ? "Añadido a favoritos ❤️" : "Eliminado de favoritos");
      qc.invalidateQueries({ queryKey: FAVORITES_KEY });
      if (res.added) {
        import("@/lib/analytics").then((m) => m.analytics.addFavorite(res.stationId)).catch(() => {});
      }
    },
    onError: (err: any) => {
      if (err?.message === "not-authenticated") {
        toast.error("Inicia sesión para guardar favoritos");
      } else {
        toast.error("No se pudo actualizar favoritos");
      }
    },
  });

  return {
    favoriteIds: ids,
    favorites: query.data ?? [],
    isFavorite: (id: string) => ids.has(id),
    toggle: toggle.mutate,
    toggling: toggle.isPending,
    loading: query.isLoading,
  };
}
