import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CNE_API_EMAIL = Deno.env.get("CNE_API_EMAIL")!;
const CNE_API_PASSWORD = Deno.env.get("CNE_API_PASSWORD")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function loginCNE(): Promise<string> {
  const res = await fetch("https://api.cne.cl/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: CNE_API_EMAIL, password: CNE_API_PASSWORD }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CNE login failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.token) throw new Error("CNE login response missing token");
  return data.token;
}

async function fetchEstaciones(token: string): Promise<any[]> {
  const res = await fetch("https://api.cne.cl/api/v4/estaciones", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CNE estaciones failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // The API may return { data: [...] } or directly an array
  return Array.isArray(data) ? data : (data.data || []);
}

function getFuelName(type: string): string {
  const names: Record<string, string> = {
    gasoline93: "Bencina 93",
    gasoline95: "Bencina 95",
    gasoline97: "Bencina 97",
    diesel: "Diésel",
  };
  return names[type] || type;
}

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

    // Login to CNE API
    console.log("Logging in to CNE API...");
    const token = await loginCNE();
    console.log("CNE login successful");

    // Fetch all stations with prices
    console.log("Fetching estaciones from CNE...");
    const estaciones = await fetchEstaciones(token);
    console.log(`Fetched ${estaciones.length} estaciones from CNE`);

    if (estaciones.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No se obtuvieron estaciones de la CNE" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate national average prices by fuel type
    const prices: Record<string, number[]> = {
      gasoline93: [],
      gasoline95: [],
      gasoline97: [],
      diesel: [],
    };

    // Common field names from CNE API (may vary, try multiple)
    for (const station of estaciones) {
      const g93 = station.precio_gasolina_93 || station.gasolina_93 || station.bencina_93;
      const g95 = station.precio_gasolina_95 || station.gasolina_95 || station.bencina_95;
      const g97 = station.precio_gasolina_97 || station.gasolina_97 || station.bencina_97;
      const di = station.precio_petroleo_diesel || station.petroleo_diesel || station.diesel;

      if (g93 && Number(g93) > 0) prices.gasoline93.push(Number(g93));
      if (g95 && Number(g95) > 0) prices.gasoline95.push(Number(g95));
      if (g97 && Number(g97) > 0) prices.gasoline97.push(Number(g97));
      if (di && Number(di) > 0) prices.diesel.push(Number(di));
    }

    // Log first station to understand structure
    if (estaciones.length > 0) {
      console.log("Sample station keys:", Object.keys(estaciones[0]));
      console.log("Sample station:", JSON.stringify(estaciones[0]).substring(0, 500));
    }

    // Upsert national average prices
    for (const [fuelType, values] of Object.entries(prices)) {
      if (values.length > 0) {
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        const oldPrice = oldPriceMap[fuelType];
        const trend = oldPrice ? (avg < oldPrice ? "down" : avg > oldPrice ? "up" : "stable") : "stable";
        const changePercent = oldPrice ? Math.round(((avg - oldPrice) / oldPrice) * 10000) / 100 : 0;

        await supabase.from("fuel_prices").upsert(
          {
            fuel_type: fuelType,
            price: avg,
            name: getFuelName(fuelType),
            trend,
            previous_price: oldPrice || null,
            change_percent: changePercent,
          },
          { onConflict: "fuel_type" }
        );
        console.log(`${fuelType}: ${values.length} estaciones, promedio $${avg}`);
      }
    }

    // Also upsert individual station prices into station_prices table
    let stationPricesUpdated = 0;
    for (const station of estaciones) {
      // Try to match station by name/address in gas_stations
      const stationName = station.nombre_ee || station.razon_social || station.nombre || "";
      if (!stationName) continue;

      const { data: matchedStation } = await supabase
        .from("gas_stations")
        .select("id")
        .ilike("name", `%${stationName.substring(0, 20)}%`)
        .maybeSingle();

      if (!matchedStation) continue;

      const fuelPrices: { fuel_type: string; price: number }[] = [];
      const g93 = station.precio_gasolina_93 || station.gasolina_93 || station.bencina_93;
      const g95 = station.precio_gasolina_95 || station.gasolina_95 || station.bencina_95;
      const g97 = station.precio_gasolina_97 || station.gasolina_97 || station.bencina_97;
      const di = station.precio_petroleo_diesel || station.petroleo_diesel || station.diesel;

      if (g93 && Number(g93) > 0) fuelPrices.push({ fuel_type: "gasoline93", price: Number(g93) });
      if (g95 && Number(g95) > 0) fuelPrices.push({ fuel_type: "gasoline95", price: Number(g95) });
      if (g97 && Number(g97) > 0) fuelPrices.push({ fuel_type: "gasoline97", price: Number(g97) });
      if (di && Number(di) > 0) fuelPrices.push({ fuel_type: "diesel", price: Number(di) });

      for (const fp of fuelPrices) {
        await supabase.from("station_prices").upsert(
          { station_id: matchedStation.id, fuel_type: fp.fuel_type, price: fp.price },
          { onConflict: "station_id,fuel_type" }
        );
      }
      stationPricesUpdated++;
    }

    // Check for price drops and send push notifications
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

    return new Response(
      JSON.stringify({
        success: true,
        totalEstaciones: estaciones.length,
        stationPricesUpdated,
        preciosNacionales: {
          gasoline93: prices.gasoline93.length > 0 ? Math.round(prices.gasoline93.reduce((a, b) => a + b, 0) / prices.gasoline93.length) : null,
          gasoline95: prices.gasoline95.length > 0 ? Math.round(prices.gasoline95.reduce((a, b) => a + b, 0) / prices.gasoline95.length) : null,
          gasoline97: prices.gasoline97.length > 0 ? Math.round(prices.gasoline97.reduce((a, b) => a + b, 0) / prices.gasoline97.length) : null,
          diesel: prices.diesel.length > 0 ? Math.round(prices.diesel.reduce((a, b) => a + b, 0) / prices.diesel.length) : null,
        },
        priceDrops: drops,
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
