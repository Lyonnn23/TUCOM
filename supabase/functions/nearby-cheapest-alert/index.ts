import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function importVapidKeys() {
  const privateKeyBytes = urlBase64ToUint8Array(VAPID_PRIVATE_KEY);
  const publicKeyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const x = btoa(String.fromCharCode(...publicKeyBytes.slice(1, 33)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const y = btoa(String.fromCharCode(...publicKeyBytes.slice(33, 65)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const d = btoa(String.fromCharCode(...privateKeyBytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const jwk = { kty: "EC", crv: "P-256", x, y, d };
  return await crypto.subtle.importKey(
    "jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
}

async function createVapidJwt(audience: string, privateKey: CryptoKey): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 43200, sub: "mailto:admin@tucom.cl" };
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, privateKey, encoder.encode(unsignedToken)
  );
  const sigArray = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  if (sigArray[0] === 0x30) {
    const rLen = sigArray[3];
    const rStart = 4;
    const rBytes = sigArray.slice(rStart, rStart + rLen);
    const sLenIndex = rStart + rLen + 1;
    const sLen = sigArray[sLenIndex];
    const sStart = sLenIndex + 1;
    const sBytes = sigArray.slice(sStart, sStart + sLen);
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes;
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes;
    if (r.length < 32) { const p = new Uint8Array(32); p.set(r, 32 - r.length); r = p; }
    if (s.length < 32) { const p = new Uint8Array(32); p.set(s, 32 - s.length); s = p; }
  } else {
    r = sigArray.slice(0, 32);
    s = sigArray.slice(32, 64);
  }
  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);
  const sigB64 = btoa(String.fromCharCode(...rawSig))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${unsignedToken}.${sigB64}`;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  privateKey: CryptoKey
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await createVapidJwt(audience, privateKey);
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        "Content-Encoding": "identity",
      },
      body: payload,
    });
    if (response.status === 410 || response.status === 404) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      return false;
    }
    if (!response.ok) {
      console.error(`Push failed: ${response.status} ${await response.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Push error:", err);
    return false;
  }
}

const FUEL_LABELS: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "endpoint is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get this subscriber's info
    const { data: sub, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, fuel_types, lat, lng")
      .eq("endpoint", endpoint)
      .single();

    if (subErr || !sub) {
      return new Response(
        JSON.stringify({ error: "Subscription not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sub.lat || !sub.lng) {
      return new Response(
        JSON.stringify({ error: "Location not set for this subscription" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all stations & prices
    const [stationsRes, pricesRes] = await Promise.all([
      supabase.from("gas_stations").select("*"),
      supabase.from("station_prices").select("*"),
    ]);

    if (stationsRes.error) throw stationsRes.error;
    if (pricesRes.error) throw pricesRes.error;

    const stations = stationsRes.data || [];
    const prices = pricesRes.data || [];
    const fuelPrefs: string[] = sub.fuel_types || ["gasoline93", "gasoline95", "gasoline97", "diesel"];

    // Filter stations within 10km
    const nearby = stations
      .map((s) => ({
        ...s,
        distance: haversine(sub.lat, sub.lng, s.lat, s.lng),
      }))
      .filter((s) => s.distance <= 10);

    if (nearby.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: false, message: "No stations within 10km" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For each preferred fuel type, find cheapest station nearby
    const cheapest: { fuel: string; station: string; brand: string; price: number; distance: number }[] = [];

    for (const fuelType of fuelPrefs) {
      let best: { station: any; price: number } | null = null;

      for (const station of nearby) {
        const sp = prices.find((p) => p.station_id === station.id && p.fuel_type === fuelType);
        if (!sp || sp.price <= 0) continue;
        if (!best || sp.price < best.price) {
          best = { station, price: sp.price };
        }
      }

      if (best) {
        cheapest.push({
          fuel: FUEL_LABELS[fuelType] || fuelType,
          station: best.station.name,
          brand: best.station.brand,
          price: best.price,
          distance: Math.round(best.station.distance * 10) / 10,
        });
      }
    }

    if (cheapest.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: false, message: "No prices available for preferred fuels nearby" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build notification body
    const lines = cheapest.map(
      (c) => `⛽ ${c.fuel}: $${c.price} en ${c.station} (${c.distance} km)`
    );
    const body = lines.join("\n");
    const title = "🔥 Precios más bajos cerca de ti";

    const privateKey = await importVapidKeys();
    const payload = JSON.stringify({
      title,
      body,
      data: { cheapest },
    });

    const ok = await sendWebPush(sub, payload, privateKey);

    return new Response(
      JSON.stringify({ success: true, sent: ok, cheapest }),
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
