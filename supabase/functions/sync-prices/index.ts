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
// Keys: "93", "95", "97", "DI" (+ "A93" etc. for autoservicio)
// Values: { precio: "1234.000", ... }
// attendedOnly: if true, only return attended prices (for national average)
function extractPrices(station: any, attendedOnly = false): Record<string, number> {
  const result: Record<string, number> = {};
  const precios = station.precios;
  if (!precios) return result;

  const attendedKeys: [string, string][] = [
    ["93", "gasoline93"], ["95", "gasoline95"], ["97", "gasoline97"], ["DI", "diesel"],
  ];
  const selfServiceKeys: [string, string][] = [
    ["A93", "gasoline93"], ["A95", "gasoline95"], ["A97", "gasoline97"], ["ADI", "diesel"],
  ];

  // Always process attended prices
  for (const [cneKey, fuelType] of attendedKeys) {
    const entry = precios[cneKey];
    if (!entry) continue;
    const numPrice = parseFloat(String(typeof entry === "object" ? entry.precio : entry));
    if (numPrice > 0) result[fuelType] = Math.round(numPrice);
  }

  // Only add self-service if not attendedOnly and not already set
  if (!attendedOnly) {
    for (const [cneKey, fuelType] of selfServiceKeys) {
      if (result[fuelType]) continue;
      const entry = precios[cneKey];
      if (!entry) continue;
      const numPrice = parseFloat(String(typeof entry === "object" ? entry.precio : entry));
      if (numPrice > 0) result[fuelType] = Math.round(numPrice);
    }
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

    // Log detailed precios from a few stations to verify key mapping
    for (const s of estaciones.slice(0, 5)) {
      if (s.precios) {
        const p: Record<string, string> = {};
        for (const [k, v] of Object.entries(s.precios)) {
          const entry = v as any;
          p[k] = typeof entry === "object" ? `${entry.precio} (${JSON.stringify(entry).substring(0, 100)})` : String(entry);
        }
        console.log(`Station ${s.razon_social}: precios =`, JSON.stringify(p));
      }
    }

    // Batch upsert station prices - match by place_id (cne_<codigo>)
    let stationPricesUpdated = 0;
    const batchSize = 200;
    for (let i = 0; i < estaciones.length; i += batchSize) {
      const batch = estaciones.slice(i, i + batchSize);
      const codigos = batch.filter((s: any) => s.codigo).map((s: any) => `cne_${s.codigo}`);

      const { data: matchedStations } = await supabase
        .from("gas_stations")
        .select("id, place_id")
        .in("place_id", codigos);

      if (!matchedStations || matchedStations.length === 0) continue;

      const placeIdToId = new Map(matchedStations.map((s) => [s.place_id, s.id]));

      const upsertMap = new Map<string, { station_id: string; fuel_type: string; price: number }>();
      for (const station of batch) {
        const stationId = placeIdToId.get(`cne_${station.codigo}`);
        if (!stationId) continue;
        const prices = extractPrices(station);
        for (const [ft, price] of Object.entries(prices)) {
          upsertMap.set(`${stationId}_${ft}`, { station_id: stationId, fuel_type: ft, price });
        }
      }

      const upsertRows = [...upsertMap.values()];
      if (upsertRows.length > 0) {
        const { error: upsertErr } = await supabase.from("station_prices").upsert(upsertRows, { onConflict: "station_id,fuel_type" });
        if (upsertErr) {
          console.error(`Station prices batch ${i} error:`, upsertErr.message);
        }
        stationPricesUpdated += upsertRows.length;
      }
    }

    // Compute national averages from station_prices via DB function
    const { data: avgData } = await supabase.rpc("get_fuel_price_averages");
    for (const row of avgData ?? []) {
      const avg = Number(row.avg_price);
      const oldPrice = oldPriceMap[row.fuel_type];
      const trend = oldPrice ? (avg < oldPrice ? "down" : avg > oldPrice ? "up" : "stable") : "stable";
      const changePercent = oldPrice ? Math.round(((avg - oldPrice) / oldPrice) * 10000) / 100 : 0;

      await supabase.from("fuel_prices").upsert(
        { fuel_type: row.fuel_type, price: avg, name: getFuelName(row.fuel_type), trend, previous_price: oldPrice || null, change_percent: changePercent },
        { onConflict: "fuel_type" }
      );
      console.log(`${row.fuel_type}: ${row.station_count} stations, avg $${avg}`);
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
        preciosNacionales: Object.fromEntries((avgData ?? []).map((r: any) => [r.fuel_type, Number(r.avg_price)])),
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
