import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FUEL_LABELS: Record<string, string> = {
  "93": "93",
  "95": "95",
  "97": "97",
  diesel: "Diésel",
  kerosene: "Kerosene",
  glp: "GLP",
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: alerts, error: aErr } = await supabase
      .from("price_alerts")
      .select("id, user_id, station_id, fuel_type, target_price")
      .eq("active", true)
      .eq("triggered", false);
    if (aErr) throw aErr;

    let triggered = 0;
    const pushQueue: Array<{
      title: string;
      body: string;
      data: Record<string, unknown>;
      user_id: string;
    }> = [];

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

        const { data: station } = await supabase
          .from("gas_stations")
          .select("name, brand, lat, lng")
          .eq("id", a.station_id)
          .maybeSingle();

        const stationName = station?.name || station?.brand || "una estación";
        const fuelLabel = FUEL_LABELS[a.fuel_type] || a.fuel_type;
        const priceStr = Math.round(price.price).toLocaleString("es-CL");
        const targetStr = Math.round(a.target_price).toLocaleString("es-CL");

        pushQueue.push({
          user_id: a.user_id,
          title: `📉 Bajó el precio en ${stationName}`,
          body: `La ${fuelLabel} bajó a $${priceStr}/L — tu alerta era $${targetStr}`,
          data: {
            station_id: a.station_id,
            station_name: stationName,
            fuel_type: a.fuel_type,
            price: price.price,
            target_price: a.target_price,
            lat: station?.lat,
            lng: station?.lng,
            tag: `alert-${a.id}`,
            url: `/station/${a.station_id}`,
          },
        });
      } else {
        await supabase
          .from("price_alerts")
          .update({ last_known_price: price.price })
          .eq("id", a.id);
      }
    }

    // Fire-and-forget push deliveries
    for (const p of pushQueue) {
      try {
        await supabase.functions.invoke("send-push-notifications", {
          body: {
            title: p.title,
            body: p.body,
            data: p.data,
            user_ids: [p.user_id],
            changed_fuel_types: [p.data.fuel_type],
          },
        });
      } catch (err) {
        console.error("[check-price-alerts] push failed", err);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, evaluated: alerts?.length ?? 0, triggered, pushed: pushQueue.length }),
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
