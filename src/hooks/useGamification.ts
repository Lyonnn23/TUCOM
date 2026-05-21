import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type BadgeKey =
  | "primer_reporte"
  | "diez_reportes"
  | "cincuenta_reportes"
  | "favorito_frecuente"
  | "ahorron_del_mes";

export const BADGE_META: Record<
  BadgeKey,
  { label: string; description: string; emoji: string }
> = {
  primer_reporte: { label: "Primer reporte", description: "Tu primer reporte aprobado", emoji: "🥇" },
  diez_reportes: { label: "10 reportes", description: "10 reportes verificados", emoji: "🔟" },
  cincuenta_reportes: { label: "50 reportes", description: "50 reportes verificados", emoji: "🏆" },
  favorito_frecuente: { label: "Favorito frecuente", description: "10+ estaciones favoritas", emoji: "❤️" },
  ahorron_del_mes: { label: "Ahorrón del mes", description: "#1 del ranking mensual", emoji: "💸" },
};

export type Level = "Bronze" | "Silver" | "Gold" | "Platinum";

export const getLevel = (points: number): { level: Level; next: number | null; progress: number } => {
  if (points >= 500) return { level: "Platinum", next: null, progress: 1 };
  if (points >= 200) return { level: "Gold", next: 500, progress: (points - 200) / 300 };
  if (points >= 50) return { level: "Silver", next: 200, progress: (points - 50) / 150 };
  return { level: "Bronze", next: 50, progress: points / 50 };
};

export function useUserPoints() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-points", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.total_points ?? 0;
    },
  });
}

export function useUserBadges() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("badge_key, earned_at")
        .eq("user_id", user!.id)
        .order("earned_at", { ascending: false });
      return (data ?? []) as { badge_key: BadgeKey; earned_at: string }[];
    },
  });
}

export function useMonthlyLeaderboard() {
  return useQuery({
    queryKey: ["monthly-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monthly_leaderboard");
      if (error) throw error;
      return (data ?? []) as { user_id: string; points: number; reports: number }[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
