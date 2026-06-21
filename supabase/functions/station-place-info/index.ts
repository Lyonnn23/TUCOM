// Returns up to N photo URLs for a Google Place (via Places API New).
// POST { placeId, max? } → { photos: string[], openingHours, priceLevel }
// GET  ?placeId=...&photo=<name>  → streams image bytes (proxy; key never leaves the server)
//
// Requires an authenticated Supabase user. The Google Maps API key is never
// embedded in the returned photo URLs — clients receive same-origin proxy URLs.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

async function requireUser(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const unauth = await requireUser(req);
  if (unauth) return unauth;

  const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) {
    return new Response(JSON.stringify({ photos: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // GET: photo proxy (returns image bytes; key stays server-side)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const photoName = url.searchParams.get("photo") || "";
    const maxWidth = Math.min(1600, Math.max(80, Number(url.searchParams.get("w")) || 800));
    if (!photoName || !/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photoName)) {
      return new Response("invalid photo", { status: 400, headers: corsHeaders });
    }
    const upstream = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${key}`,
      { redirect: "follow" },
    );
    if (!upstream.ok) return new Response("upstream", { status: 502, headers: corsHeaders });
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  try {
    const body = await req.json();
    const placeId = String(body.placeId || "").trim();
    const max = Math.min(6, Math.max(1, Number(body.max) || 3));
    if (!placeId) {
      return new Response(JSON.stringify({ photos: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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
    // Same-origin proxy URLs — Google Maps key is NEVER embedded.
    const base = new URL(req.url);
    const photoUrls = photoRefs.map(
      (p) => `${base.origin}${base.pathname}?photo=${encodeURIComponent(p.name)}&w=800`,
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
