import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import webpush from "npm:web-push@3.6.7";

interface Discount {
  id: string;
  brand: string;
  payment_method: string;
  discount_clp: number;
  day_of_week: string[] | null;
  valid_to: string | null;
  is_active: boolean;
  description: string | null;
}

const DAY = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function tomorrowName(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return DAY[d.getDay()];
}

function appliesOnDay(d: Discount, dayLabel: string) {
  if (!d.day_of_week || d.day_of_week.length === 0) return true;
  return d.day_of_week.map((x) => x.toLowerCase()).includes(dayLabel);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "tomorrow"; // 'tomorrow' | 'weekly'

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublic || !vapidPrivate) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    webpush.setVapidDetails("mailto:soporte@tucombustible.cl", vapidPublic, vapidPrivate);

    // 1. Discounts to consider
    const today = new Date().toISOString().slice(0, 10);
    const { data: allDiscounts, error: dErr } = await supabase
      .from("station_discounts")
      .select("*")
      .eq("is_active", true)
      .or(`valid_to.is.null,valid_to.gte.${today}`);
    if (dErr) throw dErr;
    const discounts = (allDiscounts ?? []) as Discount[];

    let relevant: Discount[] = [];
    if (mode === "tomorrow") {
      const tomorrow = tomorrowName();
      relevant = discounts.filter((d) => appliesOnDay(d, tomorrow));
    } else {
      relevant = discounts;
    }
    if (relevant.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no discounts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Users with payment methods + alerts enabled
    const { data: prefs, error: pErr } = await supabase
      .from("user_preferences")
      .select("user_id,payment_methods,discount_alerts_enabled")
      .eq("discount_alerts_enabled", true);
    if (pErr) throw pErr;

    let sent = 0;
    for (const pref of prefs ?? []) {
      const methods = (pref.payment_methods ?? []) as string[];
      if (methods.length === 0) continue;

      const userDiscounts = relevant.filter((d) => methods.includes(d.payment_method));
      if (userDiscounts.length === 0) continue;

      // get subscriptions
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint,p256dh,auth")
        .eq("user_id", pref.user_id);
      if (!subs || subs.length === 0) continue;

      const best = userDiscounts.reduce((a, b) => (b.discount_clp > a.discount_clp ? b : a));

      let title: string;
      let body: string;
      let urlPath = "/descuentos";
      if (mode === "tomorrow") {
        title = "⛽ Mañana baja la bencina con tu tarjeta";
        body = `Con tu ${best.payment_method} en ${best.brand === "ALL" ? "estaciones participantes" : best.brand}: −$${best.discount_clp}/L. Tócame para ver dónde.`;
      } else {
        const preview = userDiscounts
          .slice(0, 3)
          .map((d) => `${d.brand}: −$${d.discount_clp}`)
          .join(" · ");
        title = "📅 Descuentos de bencina esta semana";
        body = preview;
      }

      const payload = JSON.stringify({
        title,
        body,
        url: urlPath,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-72.png",
      });

      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent++;
        } catch (err) {
          console.error("push failed", err);
        }
      }

      await supabase.from("notification_log").insert({
        user_id: pref.user_id,
        kind: "discount",
        ref_key: `${mode}-${today}`,
      });
    }

    return new Response(JSON.stringify({ sent, mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
