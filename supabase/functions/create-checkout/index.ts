// Integración con Flow.cl para generar una orden de pago del plan Pro.
// Firma los parámetros con HMAC-SHA256 usando FLOW_SECRET_KEY y llama a
// POST {FLOW_API_URL}/payment/create. Devuelve { checkout_url, token }.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FLOW_API_URL = Deno.env.get("FLOW_API_URL") ?? "https://sandbox.flow.cl/api";
const FLOW_API_KEY = Deno.env.get("FLOW_API_KEY") ?? "";
const FLOW_SECRET_KEY = Deno.env.get("FLOW_SECRET_KEY") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://tucombustible.cl";

// Flow.cl firma: concatena params ordenados alfabéticamente como
// "key1value1key2value2..." y aplica HMAC-SHA256(secret) → hex.
async function signParams(params: Record<string, string>, secret: string) {
  const keys = Object.keys(params).sort();
  const toSign = keys.map((k) => `${k}${params[k]}`).join("");
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(toSign));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!FLOW_API_KEY || !FLOW_SECRET_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Flow.cl no está configurado. Falta FLOW_API_KEY o FLOW_SECRET_KEY.",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } =
      await supabaseAuth.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "";

    // Precio Pro desde admin_settings.
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: setting } = await admin
      .from("admin_settings")
      .select("value")
      .eq("key", "pro_plan_price_clp")
      .maybeSingle();

    const rawPrice =
      typeof setting?.value === "number"
        ? setting.value
        : typeof setting?.value === "string"
          ? parseInt(setting.value, 10)
          : (setting?.value as { amount?: number } | null)?.amount;
    const amount = Number.isFinite(rawPrice) && (rawPrice as number) > 0
      ? Math.round(rawPrice as number)
      : 2990;

    // commerceOrder debe ser único por intento. Prefijo tucom-<userId corto>-<timestamp>
    const commerceOrder = `tucom-${userId.slice(0, 8)}-${Date.now()}`;

    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] ?? "";
    const urlConfirmation = `https://${projectRef}.supabase.co/functions/v1/checkout-webhook`;
    const urlReturn = `${SITE_URL}/planes?checkout=return`;

    const params: Record<string, string> = {
      apiKey: FLOW_API_KEY,
      commerceOrder,
      subject: "TÜcom Pro - Suscripción mensual",
      currency: "CLP",
      amount: String(amount),
      email: userEmail,
      urlConfirmation,
      urlReturn,
      optional: JSON.stringify({ user_id: userId }),
    };
    const s = await signParams(params, FLOW_SECRET_KEY);

    const body = new URLSearchParams({ ...params, s });
    const resp = await fetch(`${FLOW_API_URL}/payment/create`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const flowJson = await resp.json();

    if (!resp.ok || !flowJson?.url || !flowJson?.token) {
      console.error("[create-checkout] flow error", flowJson);
      return new Response(
        JSON.stringify({
          error: "No se pudo crear la orden en Flow.cl.",
          detail: flowJson,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Registro previo (pending) para poder reconciliar en el webhook.
    await admin.from("subscriptions").insert({
      user_id: userId,
      plan: "pro",
      status: "pending",
      started_at: new Date().toISOString(),
      provider: "flow",
      external_ref: commerceOrder,
    });

    const checkoutUrl = `${flowJson.url}?token=${flowJson.token}`;

    return new Response(
      JSON.stringify({
        checkout_url: checkoutUrl,
        provider: "flow",
        token: flowJson.token,
        commerce_order: commerceOrder,
        amount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[create-checkout] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
