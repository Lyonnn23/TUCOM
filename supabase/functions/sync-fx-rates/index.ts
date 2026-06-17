import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Cron/admin auth: require CRON_SECRET header or service-role bearer
  const __cronSecret = Deno.env.get("CRON_SECRET");
  const __sentSecret = req.headers.get("x-cron-secret") ?? "";
  const __auth = req.headers.get("Authorization") ?? "";
  const __serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const __okCron = !!__cronSecret && __sentSecret === __cronSecret;
  const __okService = !!__serviceKey && __auth === `Bearer ${__serviceKey}`;
  if (!__okCron && !__okService) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const json = await res.json();
    const clp = Number(json?.rates?.CLP);
    if (!Number.isFinite(clp)) throw new Error("Bad FX response");

    // previous day for delta
    const { data: prev } = await supabase
      .from("fx_rates")
      .select("rate_clp, recorded_at")
      .eq("currency", "USD")
      .lte("recorded_at", new Date(Date.now() - 22 * 3600 * 1000).toISOString())
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const change_pct = prev?.rate_clp ? Number((((clp - prev.rate_clp) / prev.rate_clp) * 100).toFixed(3)) : 0;

    await supabase.from("fx_rates").insert({
      currency: "USD",
      rate_clp: clp,
      change_pct,
    });

    // Spike alert
    if (Math.abs(change_pct) >= 2) {
      const { data: optedIn } = await supabase
        .from("user_preferences")
        .select("user_id")
        .eq("fx_spike_alert_enabled", true);

      const dir = change_pct > 0 ? "subió" : "bajó";
      const emoji = change_pct > 0 ? "📈" : "📉";
      const title = `${emoji} Dólar ${dir} ${Math.abs(change_pct).toFixed(1)}% hoy`;
      const body = `USD/CLP ahora en $${Math.round(clp)}. Puede impactar el precio de la bencina próxima semana.`;

      if (optedIn && optedIn.length > 0) {
        await supabase.functions.invoke("send-push-notifications", {
          body: { title, body, data: { type: "fx_spike", url: "/" } },
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, rate: clp, change_pct }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-fx-rates error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
