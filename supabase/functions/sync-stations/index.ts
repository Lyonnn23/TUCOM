import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.101.0/cors";

const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  regularOpeningHours?: { openNow?: boolean };
}

async function searchGasStations(lat: number, lng: number, brand: string): Promise<PlaceResult[]> {
  const url = "https://places.googleapis.com/v1/places:searchNearby";
  const body = {
    includedTypes: ["gas_station"],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 25000.0,
      },
    },
    languageCode: "es",
  };

  // If brand specified, use text search instead
  if (brand) {
    const textUrl = "https://places.googleapis.com/v1/places:searchText";
    const textBody = {
      textQuery: `${brand} gasolinera estación de servicio`,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 50000.0,
        },
      },
      includedType: "gas_station",
      maxResultCount: 20,
      languageCode: "es",
    };

    const res = await fetch(textUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.regularOpeningHours",
      },
      body: JSON.stringify(textBody),
    });
    const data = await res.json();
    return data.places || [];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.regularOpeningHours",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.places || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return new Response(JSON.stringify({ error: "GOOGLE_MAPS_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { lat, lng, brands } = await req.json();
    
    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: "lat and lng required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandList = brands || ["Copec", "Shell", "Aramco", "Petrobras", "Terpel"];
    const allPlaces: PlaceResult[] = [];

    // Search for each brand
    for (const brand of brandList) {
      const places = await searchGasStations(lat, lng, brand);
      allPlaces.push(...places);
    }

    // Also do a generic nearby search
    const genericPlaces = await searchGasStations(lat, lng, "");
    allPlaces.push(...genericPlaces);

    // Deduplicate by place_id
    const uniquePlaces = new Map<string, PlaceResult>();
    for (const place of allPlaces) {
      if (place.id && !uniquePlaces.has(place.id)) {
        uniquePlaces.set(place.id, place);
      }
    }

    // Upsert into database
    let inserted = 0;
    for (const place of uniquePlaces.values()) {
      if (!place.location) continue;

      const name = place.displayName?.text || "Estación";
      const brand = detectBrand(name);

      const { error } = await supabase.from("gas_stations").upsert(
        {
          name,
          brand,
          address: place.formattedAddress || "",
          lat: place.location.latitude,
          lng: place.location.longitude,
          place_id: place.id,
          is_open: place.regularOpeningHours?.openNow ?? true,
        },
        { onConflict: "place_id" }
      );

      if (!error) inserted++;
    }

    return new Response(
      JSON.stringify({ success: true, found: uniquePlaces.size, inserted }),
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

function detectBrand(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("copec")) return "Copec";
  if (n.includes("shell")) return "Shell";
  if (n.includes("aramco")) return "Aramco";
  if (n.includes("petrobras")) return "Petrobras";
  if (n.includes("terpel")) return "Terpel";
  if (n.includes("enex")) return "Enex";
  return "Otro";
}
