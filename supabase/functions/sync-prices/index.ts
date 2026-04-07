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

// Extract prices from the nested precios object in CNE v4 API
function extractPrices(station: any): Record<string, number> {
  const result: Record<string, number> = {};
  const precios = station.precios;
  if (!precios) return result;

  // precios is an object with fuel names as keys
  for (const [key, val] of Object.entries(precios)) {
    const lower = key.toLowerCase();
    const price = typeof val === "object" && val !== null ? (val as any).precio || (val as any).value : Number(val);
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) continue;

    if (lower.includes("93")) result.gasoline93 = numPrice;
    else if (lower.includes("95")) result.gasoline95 = numPrice;
    else if (lower.includes("97")) result.gasoline97 = numPrice;
    else if (lower.includes("diesel") || lower.includes("petróleo") || lower.includes("petroleo"))
      result.diesel = numPrice;
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Fetch current prices for comparison
    const { data: oldPrices } = await supabase.from("fuel_prices").select("fuel_type, price");
    const oldPriceMap: Record<string, number> = {};
    for (const p of oldPrices ?? []) oldPriceMap[p.fuel_type] = p.price;

    console.log("Logging in to CNE API...");
    const token = await loginCNE();
    console.log("CNE login successful");

    console.log("Fetching estaciones from CNE...");
    const estaciones = await fetchEstaciones(token);
    console.log(`Fetched ${estaciones.length} estaciones from CNE`);

    if (estaciones.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No stations from CNE" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log a few samples to understand price keys
    const precioKeys = new Set<string>();
    for (const s of estaciones.slice(0, 200)) {
      if (s.precios) Object.keys(s.precios).forEach(k => precioKeys.add(k));
    }
    console.log("All precio keys found:", [...precioKeys]);

    // Aggregate national averages
    const buckets: Record<string, number[]> = {
      gasoline93: [], gasoline95: [], gasoline97: [], diesel: [],
    };

    for (const station of estaciones) {
      const prices = extractPrices(station);
      for (const [ft, price] of Object.entries(prices)) {
        if (buckets[ft]) buckets[ft].push(price);
      }
    }

    // Upsert national averages
    for (const [fuelType, values] of Object.entries(buckets)) {
      if (values.length === 0) continue;
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      const oldPrice = oldPriceMap[fuelType];
      const trend = oldPrice ? (avg < oldPrice ? "down" : avg > oldPrice ? "up" : "stable") : "stable";
      const changePercent = oldPrice ? Math.round(((avg - oldPrice) / oldPrice) * 10000) / 100 : 0;

      await supabase.from("fuel_prices").upsert(
        { fuel_type: fuelType, price: avg, name: getFuelName(fuelType), trend, previous_price: oldPrice || null, change_percent: changePercent },
        { onConflict: "fuel_type" }
      );
      console.log(`${fuelType}: ${values.length} stations, avg $${avg}`);
    }

    // Batch upsert station prices - match by place_id (cne_<codigo>)
    let stationPricesUpdated = 0;
    const batchSize = 50;
    for (let i = 0; i < estaciones.length; i += batchSize) {
      const batch = estaciones.slice(i, i + batchSize);
      const codigos = batch.map((s: any) => `cne_${s.codigo}`).filter(Boolean);

      const { data: matchedStations } = await supabase
        .from("gas_stations")
        .select("id, place_id")
        .in("place_id", codigos);

      if (!matchedStations || matchedStations.length === 0) continue;

      const placeIdToId = new Map(matchedStations.map((s) => [s.place_id, s.id]));

      const upsertRows: { station_id: string; fuel_type: string; price: number }[] = [];
      for (const station of batch) {
        const stationId = placeIdToId.get(`cne_${station.codigo}`);
        if (!stationId) continue;
        const prices = extractPrices(station);
        for (const [ft, price] of Object.entries(prices)) {
          upsertRows.push({ station_id: stationId, fuel_type: ft, price });
        }
      }

      if (upsertRows.length > 0) {
        await supabase.from("station_prices").upsert(upsertRows, { onConflict: "station_id,fuel_type" });
        stationPricesUpdated += upsertRows.length;
      }
    }

    // Check for price drops and send push notifications
    const { data: newPrices } = await supabase.from("fuel_prices").select("fuel_type, price, name");
    const drops: string[] = [];
    const changedFuelTypes: string[] = [];
    for (const p of newPrices ?? []) {
      const oldPrice = oldPriceMap[p.fuel_type];
      if (oldPrice && p.price < oldPrice) {
        drops.push(`${p.name || p.fuel_type}: -$${oldPrice - p.price}/L`);
        changedFuelTypes.push(p.fuel_type);
      }
    }

    if (drops.length > 0) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push-notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ title: "📉 ¡Bajó la bencina!", body: drops.join(" · "), data: { url: "/" }, changed_fuel_types: changedFuelTypes }),
        });
        console.log("Push notifications sent:", drops);
      } catch (pushErr) {
        console.error("Push notification error:", pushErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalEstaciones: estaciones.length,
        stationPricesUpdated,
        preciosNacionales: Object.fromEntries(
          Object.entries(buckets).map(([k, v]) => [k, v.length > 0 ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null])
        ),
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
