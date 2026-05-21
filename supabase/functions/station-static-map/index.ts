// Returns a Google Static Map PNG centered on a station.
// Usage: POST { lat, lng, zoom?, width?, height?, brand? } → image/png
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.101.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "missing_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: "invalid_coords" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const zoom = Math.min(20, Math.max(1, Number(body.zoom) || 15));
    const width = Math.min(640, Math.max(200, Number(body.width) || 600));
    const height = Math.min(640, Math.max(120, Number(body.height) || 280));
    const color = (body.color as string)?.match(/^0x[0-9a-fA-F]{6}$/) ? body.color : "0x7C3AED";

    const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
    url.searchParams.set("center", `${lat},${lng}`);
    url.searchParams.set("zoom", String(zoom));
    url.searchParams.set("size", `${width}x${height}`);
    url.searchParams.set("scale", "2");
    url.searchParams.set("maptype", "roadmap");
    url.searchParams.set("markers", `color:${color}|${lat},${lng}`);
    url.searchParams.set("language", "es");
    url.searchParams.set("region", "CL");
    url.searchParams.set("key", key);

    const res = await fetch(url.toString());
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "upstream", status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
