import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PLAN_LIMITS, type PlanTier } from "@/lib/planLimits";

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanTier;
  status: "active" | "canceled" | "expired" | "pending";
  started_at: string;
  expires_at: string | null;
  canceled_at: string | null;
  provider: string | null;
  external_ref: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Subscription | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Subscription | null;
    },
  });

  const isPro =
    !!data &&
    data.plan === "pro" &&
    data.status === "active" &&
    (!data.expires_at || new Date(data.expires_at) > new Date());

  const plan: PlanTier = isPro ? "pro" : "free";
  const limits = PLAN_LIMITS[isPro ? "pro" : "free"];

  return {
    subscription: data,
    plan,
    isPro,
    limits,
    isLoading,
    refresh: () => qc.invalidateQueries({ queryKey: ["subscription", user?.id] }),
  };
}

export function useRouteSearchUsage() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["route-search-usage", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      if (!user) return 0;
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from("route_search_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("searched_at", start.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
}
