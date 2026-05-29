import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CNE_API_EMAIL = Deno.env.get("CNE_API_EMAIL")!;
const CNE_API_PASSWORD = Deno.env.get("CNE_API_PASSWORD")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rangos de mercado Chile - Mayo 2026 (CNE Bencina en Línea)
const VALID_PRICE_RANGES: Record<string, { min: number; max: number }> = {
  gasoline93: { min: 1450, max: 1750 },
  gasoline95: { min: 1490, max: 1800 },
  gasoline97: { min: 1550, max: 1850 },
  diesel:     { min: 1430, max: 1650 },
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

function isReasonablePrice(fuelType: string, price: number): boolean {
  const range = VALID_PRICE_RANGES[fuelType];
  return Boolean(range) && Number.isFinite(price) && price >= range.min && price <= range.max;
}

function extractPrices(station: any, attendedOnly = false): Record<string, number> {
  const result: Record<string, number> = {};
  const precios = station.precios;
  if (!precios) return result;

  const attendedKeys: [string, string][] = [
    ["93", "gasoline93"],
    ["95", "gasoline95"],
    ["97", "gasoline97"],
    ["DI", "diesel"],
  ];
  const selfServiceKeys: [string, string][] = [
    ["A93", "gasoline93"],
    ["A95", "gasoline95"],
    ["A97", "gasoline97"],
    ["ADI", "diesel"],
  ];

  for (const [cneKey, fuelType] of attendedKeys) {
    const entry = precios[cneKey];
    if (!entry) continue;
    const numPrice = parseFloat(String(typeof entry === "object" ? entry.precio : entry));
    if (numPrice > 0) result[fuelType] = Math.round(numPrice);
  }

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

function createBuckets() {
  return {
    gasoline93: [] as number[],
    gasoline95: [] as number[],
    gasoline97: [] as number[],
    diesel: [] as number[],
  };
}

function computeNationalAverages(estaciones: any[]) {
  const buckets = createBuckets();

  for (const station of estaciones) {
    const prices = extractPrices(station, true);
    for (const [fuelType, price] of Object.entries(prices)) {
      if (fuelType in buckets && isReasonablePrice(fuelType, price)) {
        buckets[fuelType as keyof typeof buckets].push(price);
      }
    }
  }

  return {
    buckets,
    averages: {
      gasoline93: buckets.gasoline93.length > 0 ? Math.round(buckets.gasoline93.reduce((a, b) => a + b, 0) / buckets.gasoline93.length) : null,
      gasoline95: buckets.gasoline95.length > 0 ? Math.round(buckets.gasoline95.reduce((a, b) => a + b, 0) / buckets.gasoline95.length) : null,
      gasoline97: buckets.gasoline97.length > 0 ? Math.round(buckets.gasoline97.reduce((a, b) => a + b, 0) / buckets.gasoline97.length) : null,
      diesel: buckets.diesel.length > 0 ? Math.round(buckets.diesel.reduce((a, b) => a + b, 0) / buckets.diesel.length) : null,
    } as Record<string, number | null>,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const { buckets, averages } = computeNationalAverages(estaciones);

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
      const syncedAt = new Date().toISOString();
      const upsertMap = new Map<string, { station_id: string; fuel_type: string; price: number; created_at: string }>();

      for (const station of batch) {
        const stationId = placeIdToId.get(`cne_${station.codigo}`);
        if (!stationId) continue;

        const prices = extractPrices(station);
        for (const [fuelType, price] of Object.entries(prices)) {
          if (!isReasonablePrice(fuelType, price)) continue;
          upsertMap.set(`${stationId}_${fuelType}`, { station_id: stationId, fuel_type: fuelType, price, created_at: syncedAt });
        }
      }

      const upsertRows = [...upsertMap.values()];
      if (upsertRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("station_prices")
          .upsert(upsertRows, { onConflict: "station_id,fuel_type" });

        if (upsertErr) {
          console.error(`Station prices batch ${i} error:`, upsertErr.message);
        } else {
          stationPricesUpdated += upsertRows.length;
        }
      }
    }

    for (const fuelType of ["gasoline93", "gasoline95", "gasoline97", "diesel"]) {
      const avg = averages[fuelType];
      if (avg === null) continue;

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

      console.log(`${fuelType}: ${buckets[fuelType as keyof typeof buckets].length} stations, avg $${avg}`);
    }

    // Snapshot daily history
    const today = new Date().toISOString().slice(0, 10);
    for (const fuelType of ["gasoline93", "gasoline95", "gasoline97", "diesel"]) {
      const bucket = buckets[fuelType as keyof typeof buckets];
      if (bucket.length === 0) continue;
      const avg = averages[fuelType];
      if (avg === null) continue;
      const sorted = [...bucket].sort((a, b) => a - b);
      await supabase.from("fuel_price_history").upsert(
        {
          fuel_type: fuelType,
          avg_price: avg,
          min_price: sorted[0],
          max_price: sorted[sorted.length - 1],
          station_count: bucket.length,
          snapshot_date: today,
        },
        { onConflict: "fuel_type,snapshot_date" }
      );
    }
    console.log("Price history snapshot saved for", today);

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
      } catch (pushErr) {
        console.error("Push notification error:", pushErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalEstaciones: estaciones.length,
        stationPricesUpdated,
        preciosNacionales: averages,
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
