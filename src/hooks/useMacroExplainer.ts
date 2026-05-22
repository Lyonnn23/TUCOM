import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MacroTopic = "fx_fuel" | "wti_fuel";

export function useMacroExplainer(topic: MacroTopic, enabled = true) {
  return useQuery({
    queryKey: ["macro-explainer", topic],
    enabled,
    queryFn: async (): Promise<string> => {
      // Try cache first
      const { data: cached } = await supabase
        .from("macro_explainers")
        .select("body_es, updated_at")
        .eq("topic", topic)
        .maybeSingle();
      const fresh =
        cached && Date.now() - new Date(cached.updated_at).getTime() < 7 * 86400_000;
      if (fresh) return cached!.body_es;

      // Otherwise invoke edge function (will regenerate + cache)
      const { data, error } = await supabase.functions.invoke("macro-explainer", {
        body: { topic },
      });
      if (error) {
        if (cached) return cached.body_es;
        throw error;
      }
      return (data?.body_es as string) ?? "";
    },
    staleTime: 24 * 60 * 60 * 1000,
  });
}
