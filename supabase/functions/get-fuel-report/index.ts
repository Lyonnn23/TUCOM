import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CNE_API_EMAIL = Deno.env.get("CNE_API_EMAIL")!;
const CNE_API_PASSWORD = Deno.env.get("CNE_API_PASSWORD")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function loginCNE(): Promise<string> {
  const res = await fetch("https://api.cne.cl/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: CNE_API_EMAIL, password: CNE_API_PASSWORD }),
  });
  if (!res.ok) throw new Error("CNE login failed");
  const data = await res.json();
  return data.token;
}

interface ZoneData {
  zone: string;
  regions: string;
  fuels: {
    name: string;
    avg: number;
    min: number;
    max: number;
  }[];
}

const ZONES = [
  {
    zone: "Zona Norte",
    regions: "Arica y Parinacota, Tarapacá, Antofagasta, Atacama, Coquimbo",
    regionCodes: ["15", "01", "02", "03", "04"],
  },
  {
    zone: "Zona Centro",
    regions: "Valparaíso, O'Higgins, Maule, Ñuble, Biobío",
    regionCodes: ["05", "06", "07", "16", "08"],
  },
  {
    zone: "Metropolitana",
    regions: "Región Metropolitana de Santiago",
    regionCodes: ["13"],
  },
  {
    zone: "Zona Sur",
    regions: "La Araucanía, Los Ríos, Los Lagos, Aysén, Magallanes",
    regionCodes: ["09", "14", "10", "11", "12"],
  },
];

const FUEL_NAMES: Record<string, string> = {
  "gasoline93": "Gasolina 93",
  "gasoline95": "Gasolina 95",
  "gasoline97": "Gasolina 97",
  "diesel": "Diésel",
  "electric": "Eléctrico",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use our own station_prices data grouped by approximate region using lat ranges
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all station prices with station locations
    const { data: stationsData, error: stationsError } = await supabase
      .from("gas_stations")
      .select("id, name, brand, lat, lng, address");

    if (stationsError) throw stationsError;

    const { data: pricesData, error: pricesError } = await supabase
      .from("station_prices")
      .select("station_id, fuel_type, price")
      .gte("price", 500)
      .lte("price", 3000);

    if (pricesError) throw pricesError;

    // Map stations by id
    const stationMap = new Map<string, { lat: number; lng: number }>();
    for (const s of stationsData ?? []) {
      stationMap.set(s.id, { lat: s.lat, lng: s.lng });
    }

    // Classify stations into zones by latitude
    function getZone(lat: number): string {
      if (lat >= -27) return "Zona Norte";
      if (lat >= -33 && lat < -27) return "Zona Centro"; // Approximate
      if (lat >= -34 && lat < -33) return "Metropolitana";
      if (lat >= -36 && lat < -34) return "Zona Centro";
      return "Zona Sur";
    }

    // More accurate zone classification
    function getZoneByLat(lat: number): string {
      if (lat >= -30) return "Zona Norte"; // Arica to Coquimbo
      if (lat >= -35 && lat < -30) {
        // Check if RM (around -33.4)
        if (lat >= -33.7 && lat < -33.2) return "Metropolitana";
        return "Zona Centro";
      }
      return "Zona Sur";
    }

    // Aggregate by zone and fuel type
    const zoneAgg: Record<string, Record<string, { sum: number; count: number; min: number; max: number }>> = {};

    for (const zone of ZONES) {
      zoneAgg[zone.zone] = {};
    }

    for (const p of pricesData ?? []) {
      const station = stationMap.get(p.station_id);
      if (!station) continue;

      const zone = getZoneByLat(station.lat);
      if (!zoneAgg[zone]) continue;

      const ft = p.fuel_type;
      if (!FUEL_NAMES[ft]) continue;

      if (!zoneAgg[zone][ft]) {
        zoneAgg[zone][ft] = { sum: 0, count: 0, min: 999999, max: 0 };
      }

      zoneAgg[zone][ft].sum += p.price;
      zoneAgg[zone][ft].count++;
      zoneAgg[zone][ft].min = Math.min(zoneAgg[zone][ft].min, p.price);
      zoneAgg[zone][ft].max = Math.max(zoneAgg[zone][ft].max, p.price);
    }

    // Build response
    const zones: ZoneData[] = ZONES.map((z) => {
      const agg = zoneAgg[z.zone] || {};
      const fuelOrder = ["gasoline93", "gasoline95", "gasoline97", "diesel"];
      const fuels = fuelOrder
        .filter((ft) => agg[ft] && agg[ft].count > 0)
        .map((ft) => ({
          name: FUEL_NAMES[ft],
          key: ft,
          avg: Math.round(agg[ft].sum / agg[ft].count),
          min: agg[ft].min,
          max: agg[ft].max,
          count: agg[ft].count,
        }));

      return {
        zone: z.zone,
        regions: z.regions,
        fuels,
      };
    });

    // National averages
    const nationalAgg: Record<string, { sum: number; count: number; min: number; max: number }> = {};
    for (const p of pricesData ?? []) {
      const ft = p.fuel_type;
      if (!FUEL_NAMES[ft]) continue;
      if (!nationalAgg[ft]) {
        nationalAgg[ft] = { sum: 0, count: 0, min: 999999, max: 0 };
      }
      nationalAgg[ft].sum += p.price;
      nationalAgg[ft].count++;
      nationalAgg[ft].min = Math.min(nationalAgg[ft].min, p.price);
      nationalAgg[ft].max = Math.max(nationalAgg[ft].max, p.price);
    }

    const fuelOrder = ["gasoline93", "gasoline95", "gasoline97", "diesel"];
    const national = fuelOrder
      .filter((ft) => nationalAgg[ft] && nationalAgg[ft].count > 0)
      .map((ft) => ({
        name: FUEL_NAMES[ft],
        key: ft,
        avg: Math.round(nationalAgg[ft].sum / nationalAgg[ft].count),
        min: nationalAgg[ft].min,
        max: nationalAgg[ft].max,
        count: nationalAgg[ft].count,
      }));

    return new Response(
      JSON.stringify({ zones, national, updated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("get-fuel-report error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
