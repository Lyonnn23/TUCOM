import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load active, non-triggered alerts
    const { data: alerts, error: aErr } = await supabase
      .from("price_alerts")
      .select("id, station_id, fuel_type, target_price")
      .eq("active", true)
      .eq("triggered", false);
    if (aErr) throw aErr;

    let triggered = 0;
    for (const a of alerts ?? []) {
      const { data: price } = await supabase
        .from("station_prices")
        .select("price")
        .eq("station_id", a.station_id)
        .eq("fuel_type", a.fuel_type)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!price) continue;

      if (price.price <= a.target_price) {
        await supabase
          .from("price_alerts")
          .update({
            triggered: true,
            triggered_at: new Date().toISOString(),
            notified_read: false,
            last_known_price: price.price,
          })
          .eq("id", a.id);
        triggered++;
      } else {
        await supabase
          .from("price_alerts")
          .update({ last_known_price: price.price })
          .eq("id", a.id);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, evaluated: alerts?.length ?? 0, triggered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[check-price-alerts]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
