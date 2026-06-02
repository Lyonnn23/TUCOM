// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Eres el asistente de análisis de TÜcom, app chilena de precios de combustible. Responde siempre en español de Chile. Sé conciso, usa bullet points cuando hay múltiples puntos, y siempre cierra con recomendaciones accionables. Formatea precios como $1.234 CLP.`;

async function getContext(supabase: any, mode: string) {
  if (mode === "prices") {
    const { data: prices } = await supabase
      .from("station_prices")
      .select("fuel_type, price, created_at, station_id, gas_stations(name, brand, address)")
      .gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString())
      .order("created_at", { ascending: false })
      .limit(500);
    const { data: avg } = await supabase.rpc("get_fuel_price_averages");
    return { recent_prices: prices?.slice(0, 200) ?? [], averages: avg };
  }
  if (mode === "users") {
    const { data: ov } = await supabase.rpc("get_admin_overview");
    const { data: dau } = await supabase.rpc("get_daily_active_users", { _days: 30 });
    const { data: top } = await supabase.rpc("get_top_viewed_stations", { _limit: 10 });
    return { overview: ov, dau, top_stations: top };
  }
  // free-chat: lightweight snapshot
  const { data: ov } = await supabase.rpc("get_admin_overview");
  const { data: avg } = await supabase.rpc("get_fuel_price_averages");
  return { overview: ov, fuel_averages: avg };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const userSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userSb.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode: string = body.mode || "chat";
    const userPrompt: string = body.prompt || "Analiza los datos.";
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.history) ? body.history : [];

    const ctx = await getContext(supabase, mode);
    const ctxString = JSON.stringify(ctx).slice(0, 60000);

    const messages = [
      ...history.slice(-10),
      {
        role: "user",
        content: `Contexto de datos (JSON):\n\`\`\`json\n${ctxString}\n\`\`\`\n\nPregunta del admin:\n${userPrompt}`,
      },
    ];

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-calls": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Anthropic error", resp.status, text);
      return new Response(JSON.stringify({ error: `Anthropic API ${resp.status}`, detail: text.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await resp.json();
    const text = json?.content?.[0]?.text ?? "";
    return new Response(JSON.stringify({ text, usage: json?.usage }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("admin-ai-insights error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
