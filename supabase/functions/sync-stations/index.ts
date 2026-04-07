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

function detectBrand(distribuidor: any, razonSocial: string): string {
  const marca = distribuidor?.marca || "";
  const text = `${marca} ${razonSocial}`.toLowerCase();
  if (text.includes("copec")) return "Copec";
  if (text.includes("shell")) return "Shell";
  if (text.includes("aramco")) return "Aramco";
  if (text.includes("petrobras")) return "Petrobras";
  if (text.includes("terpel")) return "Terpel";
  if (text.includes("enex")) return "Enex";
  if (text.includes("esmax")) return "Esmax";
  if (text.includes("uno-x") || text.includes("unox")) return "Uno-X";
  if (text.includes("abastible")) return "Abastible";
  return marca || "Otro";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Logging in to CNE API...");
    const token = await loginCNE();
    console.log("CNE login successful");

    console.log("Fetching all estaciones from CNE...");
    const estaciones = await fetchEstaciones(token);
    console.log(`Fetched ${estaciones.length} estaciones from CNE`);

    if (estaciones.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No stations returned from CNE" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log sample to debug
    if (estaciones.length > 0) {
      console.log("Sample ubicacion:", JSON.stringify(estaciones[0].ubicacion));
      console.log("Sample distribuidor:", JSON.stringify(estaciones[0].distribuidor));
    }

    // Batch process stations - deduplicate by codigo
    const stationMap = new Map<string, any>();
    let skipped = 0;

    for (const station of estaciones) {
      const codigo = station.codigo;
      if (!codigo) { skipped++; continue; }

      const razonSocial = station.razon_social || "Estación";
      const ubicacion = station.ubicacion || {};
      const lat = parseFloat(ubicacion.latitud || ubicacion.lat || "0");
      const lng = parseFloat(ubicacion.longitud || ubicacion.lng || ubicacion.lon || "0");
      const address = ubicacion.direccion || ubicacion.calle || "";
      const brand = detectBrand(station.distribuidor, razonSocial);

      if (!lat || !lng || lat === 0 || lng === 0) { skipped++; continue; }

      const placeId = `cne_${codigo}`;
      if (stationMap.has(placeId)) { skipped++; continue; }

      stationMap.set(placeId, {
        place_id: placeId,
        name: razonSocial,
        brand,
        address,
        lat,
        lng,
        is_open: station.en_mantenimiento === 0,
      });
    }

    const upsertRows = [...stationMap.values()];
    }

    // Batch upsert in chunks
    let inserted = 0;
    let updated = 0;
    const batchSize = 100;

    for (let i = 0; i < upsertRows.length; i += batchSize) {
      const batch = upsertRows.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from("gas_stations")
        .upsert(batch, { onConflict: "place_id", ignoreDuplicates: false })
        .select("id");

      if (error) {
        console.error(`Batch ${i} error:`, error.message);
      } else {
        inserted += data?.length || 0;
      }
    }

    console.log(`Sync complete: ${upsertRows.length} processed, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFromCNE: estaciones.length,
        processed: upsertRows.length,
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
