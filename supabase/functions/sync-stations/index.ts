import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.101.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CNE_API_EMAIL = Deno.env.get("CNE_API_EMAIL")!;
const CNE_API_PASSWORD = Deno.env.get("CNE_API_PASSWORD")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

function detectBrand(name: string, distribuidor?: string): string {
  const text = `${name} ${distribuidor || ""}`.toLowerCase();
  if (text.includes("copec")) return "Copec";
  if (text.includes("shell")) return "Shell";
  if (text.includes("aramco")) return "Aramco";
  if (text.includes("petrobras")) return "Petrobras";
  if (text.includes("terpel")) return "Terpel";
  if (text.includes("enex")) return "Enex";
  if (text.includes("esmax")) return "Esmax";
  if (text.includes("uno-x") || text.includes("unox")) return "Uno-X";
  return distribuidor || "Otro";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Logging in to CNE API...");
    const token = await loginCNE();
    console.log("CNE login successful");

    console.log("Fetching all estaciones from CNE (nationwide)...");
    const estaciones = await fetchEstaciones(token);
    console.log(`Fetched ${estaciones.length} estaciones from CNE`);

    if (estaciones.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No stations returned from CNE" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log sample station to understand structure
    if (estaciones.length > 0) {
      console.log("Sample station keys:", Object.keys(estaciones[0]));
      console.log("Sample station:", JSON.stringify(estaciones[0]).substring(0, 800));
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const station of estaciones) {
      // Extract station data - try common CNE field names
      const name = station.nombre_ee || station.razon_social || station.nombre || "Estación";
      const address = station.direccion_ee || station.direccion || "";
      const lat = parseFloat(station.latitud || station.lat || "0");
      const lng = parseFloat(station.longitud || station.lng || station.lon || "0");
      const distribuidor = station.nombre_distribuidor || station.distribuidor || "";
      const brand = detectBrand(name, distribuidor);

      // Skip if no valid coordinates
      if (!lat || !lng || lat === 0 || lng === 0) {
        skipped++;
        continue;
      }

      // Use CNE station ID as a stable identifier
      const cneId = station.id?.toString() || station.id_ee?.toString() || null;
      const placeId = cneId ? `cne_${cneId}` : null;

      if (placeId) {
        // Check if already exists by place_id
        const { data: existing } = await supabase
          .from("gas_stations")
          .select("id")
          .eq("place_id", placeId)
          .maybeSingle();

        if (existing) {
          // Update existing station
          await supabase
            .from("gas_stations")
            .update({ name, brand, address, lat, lng, is_open: true })
            .eq("id", existing.id);
          updated++;
        } else {
          // Insert new station
          const { error } = await supabase.from("gas_stations").insert({
            name,
            brand,
            address,
            lat,
            lng,
            place_id: placeId,
            is_open: true,
          });
          if (!error) inserted++;
          else console.error("Insert error:", error.message);
        }
      } else {
        // No ID, try to match by proximity
        const { data: nearby } = await supabase
          .from("gas_stations")
          .select("id")
          .gte("lat", lat - 0.0005)
          .lte("lat", lat + 0.0005)
          .gte("lng", lng - 0.0005)
          .lte("lng", lng + 0.0005)
          .maybeSingle();

        if (!nearby) {
          const { error } = await supabase.from("gas_stations").insert({
            name,
            brand,
            address,
            lat,
            lng,
            is_open: true,
          });
          if (!error) inserted++;
        } else {
          updated++;
        }
      }
    }

    console.log(`Sync complete: ${inserted} inserted, ${updated} updated, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        totalFromCNE: estaciones.length,
        inserted,
        updated,
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
