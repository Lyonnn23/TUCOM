import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  const payload = {
    aud: audience,
    exp: now + 60 * 60 * 12,
    sub: "mailto:admin@tucom.cl",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsignedToken)
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
        "TTL": "86400",
        "Authorization": `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
        "Content-Encoding": "identity",
      },
      body: payload,
    });

    if (response.status === 410 || response.status === 404) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      console.log("Removed expired subscription");
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  // Cron/admin auth: require CRON_SECRET header or service-role bearer
  const __cronSecret = Deno.env.get("CRON_SECRET");
  const __sentSecret = req.headers.get("x-cron-secret") ?? "";
  const __auth = req.headers.get("Authorization") ?? "";
  const __serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const __okCron = !!__cronSecret && __sentSecret === __cronSecret;
  const __okService = !!__serviceKey && __auth === `Bearer ${__serviceKey}`;
  if (!__okCron && !__okService) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }


  try {
    const { title, body, data, changed_fuel_types } = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "title and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch subscriptions, optionally filtering by fuel type preferences
    let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth, fuel_types");
    const { data: subscriptions, error } = await query;

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscribers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter subscribers who care about the changed fuel types
    const changedTypes: string[] = changed_fuel_types || [];
    const relevantSubs = changedTypes.length > 0
      ? subscriptions.filter((sub: any) => {
          const prefs: string[] = sub.fuel_types || [];
          return prefs.some((f: string) => changedTypes.includes(f));
        })
      : subscriptions;

    if (relevantSubs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscribers interested in these fuel types" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const privateKey = await importVapidKeys();
    const payload = JSON.stringify({ title, body, data: data || {} });

    let sent = 0;
    for (const sub of relevantSubs) {
      const ok = await sendWebPush(sub, payload, privateKey);
      if (ok) sent++;
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: relevantSubs.length }),
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
