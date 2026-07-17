// Webhook llamado por Flow.cl (urlConfirmation) tras un intento de pago.
// Recibe { token } vía POST form-urlencoded, consulta /payment/getStatus y,
// si el pago está aprobado (status=2), activa el plan Pro del usuario.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const FLOW_API_URL = Deno.env.get("FLOW_API_URL") ?? "https://sandbox.flow.cl/api";
const FLOW_API_KEY = Deno.env.get("FLOW_API_KEY") ?? "";
const FLOW_SECRET_KEY = Deno.env.get("FLOW_SECRET_KEY") ?? "";

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
      return new Response("flow not configured", { status: 503 });
    }

    // Flow envía form-urlencoded con `token`.
    let token = "";
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      token = String(form.get("token") ?? "");
    } else {
      const body = await req.json().catch(() => ({}));
      token = String(body?.token ?? "");
    }
    if (!token) {
      return new Response("missing token", { status: 400 });
    }

    // Consultar el estado real del pago en Flow.
    const params = { apiKey: FLOW_API_KEY, token };
    const s = await signParams(params, FLOW_SECRET_KEY);
    const qs = new URLSearchParams({ ...params, s });
    const statusResp = await fetch(
      `${FLOW_API_URL}/payment/getStatus?${qs.toString()}`,
    );
    const payment = await statusResp.json();

    if (!statusResp.ok) {
      console.error("[checkout-webhook] getStatus failed", payment);
      return new Response("getStatus failed", { status: 502 });
    }

    const commerceOrder: string = payment?.commerceOrder ?? "";
    const status: number = Number(payment?.status ?? 0);
    let userId: string | null = null;
    try {
      const opt = payment?.optional
        ? typeof payment.optional === "string"
          ? JSON.parse(payment.optional)
          : payment.optional
        : null;
      userId = opt?.user_id ?? null;
    } catch {
      /* ignore */
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fallback: si no viene user_id en optional, buscarlo por external_ref.
    if (!userId && commerceOrder) {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("external_ref", commerceOrder)
        .maybeSingle();
      userId = data?.user_id ?? null;
    }

    if (!userId) {
      console.error("[checkout-webhook] user not found", { commerceOrder });
      return new Response("user not found", { status: 200 });
    }

    // Status Flow: 1 pendiente, 2 pagado, 3 rechazado, 4 anulado.
    let newStatus = "pending";
    if (status === 2) newStatus = "active";
    else if (status === 3) newStatus = "rejected";
    else if (status === 4) newStatus = "canceled";

    const nowIso = new Date().toISOString();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    if (newStatus === "active") {
      // Desactivar cualquier suscripción activa previa y activar la nueva.
      await supabase
        .from("subscriptions")
        .update({ status: "canceled", canceled_at: nowIso })
        .eq("user_id", userId)
        .eq("status", "active");

      // Upsert por external_ref (creamos un pending en create-checkout).
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("external_ref", commerceOrder)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("subscriptions")
          .update({
            plan: "pro",
            status: "active",
            started_at: nowIso,
            expires_at: expiresAt.toISOString(),
            canceled_at: null,
            provider: "flow",
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("subscriptions").insert({
          user_id: userId,
          plan: "pro",
          status: "active",
          started_at: nowIso,
          expires_at: expiresAt.toISOString(),
          provider: "flow",
          external_ref: commerceOrder,
        });
      }
    } else {
      await supabase
        .from("subscriptions")
        .update({
          status: newStatus,
          canceled_at: newStatus === "canceled" ? nowIso : null,
        })
        .eq("external_ref", commerceOrder);
    }

    // Flow espera un 200 OK simple.
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[checkout-webhook] error", err);
    return new Response("error", { status: 500 });
  }
});
