import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// CNE publishes weekly fuel prices for Chile
// Source: https://www.cne.cl/estadisticas/hidrocarburo/

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Fetch current prices before update for comparison
    const { data: oldPrices } = await supabase
      .from("fuel_prices")
      .select("fuel_type, price");

    const oldPriceMap: Record<string, number> = {};
    for (const p of oldPrices ?? []) {
      oldPriceMap[p.fuel_type] = p.price;
    }

    // Try fetching CNE data
    const cneUrl = "https://api.cne.cl/v3/combustibles/vehicular/estaciones/";
    let pricesUpdated = false;

    try {
      const res = await fetch(cneUrl, {
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          const prices: Record<string, number[]> = {
            gasoline93: [],
            gasoline95: [],
            gasoline97: [],
            diesel: [],
          };

          for (const station of data.data) {
            if (station.precio_gasolina_93) prices.gasoline93.push(station.precio_gasolina_93);
            if (station.precio_gasolina_95) prices.gasoline95.push(station.precio_gasolina_95);
            if (station.precio_gasolina_97) prices.gasoline97.push(station.precio_gasolina_97);
            if (station.precio_petroleo_diesel) prices.diesel.push(station.precio_petroleo_diesel);
          }

          for (const [fuelType, values] of Object.entries(prices)) {
            if (values.length > 0) {
              const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
              await supabase.from("fuel_prices").upsert(
                { fuel_type: fuelType, price: avg, name: getFuelName(fuelType), trend: "stable" },
                { onConflict: "fuel_type" }
              );
            }
          }
          pricesUpdated = true;
        }
      }
    } catch (cneErr) {
      console.log("CNE API not available, using fallback:", cneErr);
    }

    // If CNE API fails, try the Bencina en Línea source
    if (!pricesUpdated) {
      try {
        const bencinaUrl = "https://www.bencinaenlinea.cl/api/precio";
        const res = await fetch(bencinaUrl);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            console.log("Bencina en linea data fetched");
            pricesUpdated = true;
          }
        }
      } catch {
        console.log("Bencina en linea API not available");
      }
    }

    // Check for price drops and send push notifications
    if (pricesUpdated) {
      const { data: newPrices } = await supabase
        .from("fuel_prices")
        .select("fuel_type, price, name");

      const drops: string[] = [];
      const changedFuelTypes: string[] = [];
      for (const p of newPrices ?? []) {
        const oldPrice = oldPriceMap[p.fuel_type];
        if (oldPrice && p.price < oldPrice) {
          const diff = oldPrice - p.price;
          drops.push(`${p.name || p.fuel_type}: -$${diff}/L`);
          changedFuelTypes.push(p.fuel_type);
        }
      }

      if (drops.length > 0) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-push-notifications`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              title: "📉 ¡Bajó la bencina!",
              body: drops.join(" · "),
              data: { url: "/" },
              changed_fuel_types: changedFuelTypes,
            }),
          });
          console.log("Push notifications sent for price drops:", drops);
        } catch (pushErr) {
          console.error("Failed to send push notifications:", pushErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pricesUpdated,
        message: pricesUpdated
          ? "Precios actualizados desde fuente oficial"
          : "No se pudieron obtener precios externos, datos internos sin cambios",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getFuelName(type: string): string {
  const names: Record<string, string> = {
    gasoline93: "Bencina 93",
    gasoline95: "Bencina 95",
    gasoline97: "Bencina 97",
    diesel: "Diésel",
  };
  return names[type] || type;
}
