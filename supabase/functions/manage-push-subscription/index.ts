import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Constant-time string comparison to avoid timing attacks
function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

const ALLOWED_FUELS = new Set(["gasoline93", "gasoline95", "gasoline97", "diesel", "electric"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { action, endpoint, auth, fuel_types, lat, lng } = body as {
      action?: string;
      endpoint?: string;
      auth?: string;
      fuel_types?: unknown;
      lat?: unknown;
      lng?: unknown;
    };

    if (!action || !["update", "delete"].includes(action)) {
      return jsonResponse({ error: "action must be 'update' or 'delete'" }, 400);
    }
    if (!endpoint || typeof endpoint !== "string" || endpoint.length > 2000) {
      return jsonResponse({ error: "endpoint is required" }, 400);
    }
    if (!auth || typeof auth !== "string" || auth.length > 256) {
      return jsonResponse({ error: "auth proof is required" }, 400);
    }

    // Look up the subscription by endpoint and verify the auth secret matches
    // (proof of ownership for anonymous subscriptions).
    const { data: sub, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, auth, user_id")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (subErr) {
      console.error("Lookup error:", subErr);
      return jsonResponse({ error: "Lookup failed" }, 500);
    }
    if (!sub) {
      return jsonResponse({ error: "Subscription not found" }, 404);
    }
    if (!safeEqual(sub.auth, auth)) {
      return jsonResponse({ error: "Invalid credentials" }, 403);
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint);
      if (error) {
        console.error("Delete error:", error);
        return jsonResponse({ error: "Delete failed" }, 500);
      }
      return jsonResponse({ success: true });
    }

    // action === "update": validate and apply allowed fields only
    const update: Record<string, unknown> = {};

    if (fuel_types !== undefined) {
      if (
        !Array.isArray(fuel_types) ||
        fuel_types.length === 0 ||
        fuel_types.length > 10 ||
        !fuel_types.every((f) => typeof f === "string" && ALLOWED_FUELS.has(f))
      ) {
        return jsonResponse({ error: "Invalid fuel_types" }, 400);
      }
      update.fuel_types = fuel_types;
    }

    if (lat !== undefined || lng !== undefined) {
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        !isFinite(lat) ||
        !isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return jsonResponse({ error: "Invalid coordinates" }, 400);
      }
      update.lat = lat;
      update.lng = lng;
    }

    if (Object.keys(update).length === 0) {
      return jsonResponse({ error: "No fields to update" }, 400);
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .update(update)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("Update error:", error);
      return jsonResponse({ error: "Update failed" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ error: "Unknown error" }, 500);
  }
});
