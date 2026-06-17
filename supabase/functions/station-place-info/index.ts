// Returns up to N photo URLs for a Google Place (via Places API New).
// POST { placeId, max? } → { photos: string[] }
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const unauth = await requireUser(req);
    if (unauth) return unauth;
    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ photos: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    const placeId = String(body.placeId || "").trim();
    const max = Math.min(6, Math.max(1, Number(body.max) || 3));
    if (!placeId) {
      return new Response(JSON.stringify({ photos: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Fetch place details with photos field
    const detailsRes = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es-CL`,
      {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "photos,regularOpeningHours,priceLevel",
        },
      },
    );
    if (!detailsRes.ok) {
      return new Response(JSON.stringify({ photos: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const details = await detailsRes.json();
    const photoRefs: Array<{ name: string }> = (details.photos || []).slice(0, max);
    const photoUrls = photoRefs.map(
      (p) =>
        `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=800&key=${key}`,
    );
    return new Response(
      JSON.stringify({
        photos: photoUrls,
        openingHours: details.regularOpeningHours?.weekdayDescriptions ?? null,
        priceLevel: details.priceLevel ?? null,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400",
        },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ photos: [], error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
