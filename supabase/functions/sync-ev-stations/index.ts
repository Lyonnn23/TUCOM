import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Estimated prices per kWh by operator (CLP)
const OPERATOR_PRICES: Record<string, number> = {
  "Copec Voltex": 250,
  "Enel X": 300,
  "Enel X Way": 300,
  "Shell Recharge": 280,
  "ChargePoint": 320,
  "ABB": 290,
  "Schneider Electric": 270,
  "Siemens": 280,
  "Tesla": 260,
  "BYD": 250,
  "default": 280,
};

function getEstimatedPrice(operator: string | null): number {
  if (!operator) return OPERATOR_PRICES["default"];
  for (const [key, price] of Object.entries(OPERATOR_PRICES)) {
    if (operator.toLowerCase().includes(key.toLowerCase())) return price;
  }
  return OPERATOR_PRICES["default"];
}

function detectEVBrand(operator: string | null, title: string): string {
  const text = `${operator || ""} ${title}`.toLowerCase();
  if (text.includes("copec") || text.includes("voltex")) return "Copec Voltex";
  if (text.includes("enel")) return "Enel X";
  if (text.includes("shell")) return "Shell Recharge";
  if (text.includes("tesla")) return "Tesla";
  if (text.includes("chargepoint")) return "ChargePoint";
  return operator || "Electrolinera";
}

async function fetchOpenChargeMap(): Promise<any[]> {
  // Open Charge Map API - free, no key needed for basic usage
  // Chile country code = CL, country ID = 43
  const url = "https://api.openchargemap.io/v3/poi/?output=json&countrycode=CL&maxresults=5000&compact=true&verbose=false";
  
  const res = await fetch(url, {
    headers: { "User-Agent": "TUcom-App/1.0" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Open Charge Map API failed (${res.status}): ${text}`);
  }

  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Fetching EV charging stations from Open Charge Map...");
    const stations = await fetchOpenChargeMap();
    console.log(`Fetched ${stations.length} EV stations`);

    if (stations.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No EV stations found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upsertRows: any[] = [];
    const priceRows: { place_id: string; price: number }[] = [];
    let skipped = 0;

    for (const station of stations) {
      const ai = station.AddressInfo;
      if (!ai) { skipped++; continue; }

      const lat = ai.Latitude;
      const lng = ai.Longitude;
      if (!lat || !lng) { skipped++; continue; }

      const placeId = `ocm_${station.ID}`;
      const operatorInfo = station.OperatorInfo;
      const operatorName = operatorInfo?.Title || null;
      const title = ai.Title || operatorName || "Electrolinera";
      const brand = detectEVBrand(operatorName, title);
      const address = [ai.AddressLine1, ai.Town, ai.StateOrProvince].filter(Boolean).join(", ") || "Chile";

      // Extract connector types and max power
      const connections = station.Connections || [];
      const connectorTypes: string[] = [];
      let maxPower = 0;

      for (const conn of connections) {
        const connType = conn.ConnectionType?.Title;
        if (connType && !connectorTypes.includes(connType)) {
          connectorTypes.push(connType);
        }
        const power = conn.PowerKW || 0;
        if (power > maxPower) maxPower = power;
      }

      const estimatedPrice = getEstimatedPrice(operatorName);

      upsertRows.push({
        place_id: placeId,
        name: title,
        brand,
        address,
        lat,
        lng,
        is_open: station.StatusType?.IsOperational !== false,
        has_ev_charging: true,
        ev_connector_types: connectorTypes,
        ev_power_kw: maxPower || null,
        ev_operator: operatorName || brand,
      });

      priceRows.push({ place_id: placeId, price: estimatedPrice });
    }

    console.log(`Processing ${upsertRows.length} EV stations, ${skipped} skipped`);

    // Upsert stations in batches
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < upsertRows.length; i += batchSize) {
      const batch = upsertRows.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from("gas_stations")
        .upsert(batch, { onConflict: "place_id", ignoreDuplicates: false })
        .select("id, place_id");

      if (error) {
        console.error(`Station batch ${i} error:`, error.message);
        continue;
      }

      // Now upsert prices for these stations
      if (data && data.length > 0) {
        inserted += data.length;
        const priceBatch = data
          .map((s) => {
            const priceInfo = priceRows.find((p) => p.place_id === s.place_id);
            if (!priceInfo) return null;
            return {
              station_id: s.id,
              fuel_type: "electric",
              price: priceInfo.price,
            };
          })
          .filter(Boolean);

        if (priceBatch.length > 0) {
          const { error: priceErr } = await supabase
            .from("station_prices")
            .upsert(priceBatch as any[], { onConflict: "station_id,fuel_type" });

          if (priceErr) {
            console.error(`Price batch error:`, priceErr.message);
          }
        }
      }
    }

    // Compute national average for electric
    const { data: electricPrices } = await supabase
      .from("station_prices")
      .select("price")
      .eq("fuel_type", "electric");

    if (electricPrices && electricPrices.length > 0) {
      const prices = electricPrices.map((p) => p.price);
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      const sorted = [...prices].sort((a, b) => a - b);

      // Get old price for trend
      const { data: oldPrice } = await supabase
        .from("fuel_prices")
        .select("price")
        .eq("fuel_type", "electric")
        .maybeSingle();

      const prevPrice = oldPrice?.price || null;
      const trend = prevPrice ? (avg < prevPrice ? "down" : avg > prevPrice ? "up" : "stable") : "stable";
      const changePercent = prevPrice ? Math.round(((avg - prevPrice) / prevPrice) * 10000) / 100 : 0;

      await supabase.from("fuel_prices").upsert(
        {
          fuel_type: "electric",
          price: avg,
          name: "Eléctrico",
          unit: "CLP/kWh",
          trend,
          previous_price: prevPrice,
          change_percent: changePercent,
        },
        { onConflict: "fuel_type" }
      );

      // Snapshot daily history
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from("fuel_price_history").upsert(
        {
          fuel_type: "electric",
          avg_price: avg,
          min_price: sorted[0],
          max_price: sorted[sorted.length - 1],
          station_count: prices.length,
          snapshot_date: today,
        },
        { onConflict: "fuel_type,snapshot_date" }
      );

      console.log(`Electric average: $${avg}/kWh from ${prices.length} stations`);
    }

    console.log(`EV sync complete: ${inserted} stations inserted/updated`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFromOCM: stations.length,
        processed: upsertRows.length,
        inserted,
        skipped,
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
