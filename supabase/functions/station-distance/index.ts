// Returns walking + driving distance/duration between origin and a station via Routes API.
// POST { originLat, originLng, destLat, destLng } → { driving: {meters,seconds}, walking: {meters,seconds} }
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.101.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

async function requireUser(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return null;
}


async function compute(
  key: string,
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  mode: "DRIVE" | "WALK",
) {
  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: mode,
        ...(mode === "DRIVE" ? { routingPreference: "TRAFFIC_AWARE" } : {}),
        languageCode: "es-CL",
        regionCode: "CL",
      }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route) return null;
  const secs = Number(String(route.duration ?? "0s").replace("s", ""));
  return { meters: Number(route.distanceMeters ?? 0), seconds: secs };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const unauth = await requireUser(req);
    if (unauth) return unauth;
    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "missing_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    const originLat = Number(body.originLat);
    const originLng = Number(body.originLng);
    const destLat = Number(body.destLat);
    const destLng = Number(body.destLng);
    if (![originLat, originLng, destLat, destLng].every(Number.isFinite)) {
      return new Response(JSON.stringify({ error: "invalid_coords" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const origin = { lat: originLat, lng: originLng };
    const dest = { lat: destLat, lng: destLng };
    const [driving, walking] = await Promise.all([
      compute(key, origin, dest, "DRIVE"),
      compute(key, origin, dest, "WALK"),
    ]);
    return new Response(JSON.stringify({ driving, walking }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
