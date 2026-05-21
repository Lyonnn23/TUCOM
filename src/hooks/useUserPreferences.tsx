import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserPreferences {
  preferred_fuel: string;
  search_radius_km: number;
  notifications_enabled: boolean;
  onboarding_completed: boolean;
  leaderboard_opt_in: boolean;
}

const DEFAULTS: UserPreferences = {
  preferred_fuel: "gasoline95",
  search_radius_km: 10,
  notifications_enabled: false,
  onboarding_completed: false,
  leaderboard_opt_in: true,
};

export function useUserPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["user-preferences", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserPreferences | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_preferences")
        .select("preferred_fuel,search_radius_km,notifications_enabled,onboarding_completed,leaderboard_opt_in")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as UserPreferences) ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      if (!user) throw new Error("Not authenticated");
      const payload = { ...DEFAULTS, ...(query.data ?? {}), ...prefs, user_id: user.id };
      const { error } = await supabase
        .from("user_preferences")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-preferences", user?.id] }),
  });

  return { preferences: query.data, isLoading: query.isLoading, save: save.mutateAsync, defaults: DEFAULTS };
}
