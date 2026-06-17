import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUEL_LABEL: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
};

function nextThursday(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = (4 - day + 7) % 7 || 7; // next Thu
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Best-effort MEPCO fetch from CNE site. If unavailable, returns null
 *  and the row is left for admin entry. */
async function fetchPublishedMepco(): Promise<{
  direction: "up" | "down" | "neutral";
  fuel_changes: Record<string, number>;
  source_url: string;
} | null> {
  try {
    const url = "https://www.cne.cl/tarificacion/hidrocarburos/mepco/";
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    // Heuristic: look for "$" followed by a sign and digits per fuel keyword
    const txt = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const find = (re: RegExp) => {
      const m = txt.match(re);
      return m ? Number(m[1].replace(",", ".")) : null;
    };
    const g93 = find(/(?:93|gasolina\s*93)[^$]{0,80}\$?\s*([+-]?\d+[.,]?\d*)/i);
    const g95 = find(/(?:95|gasolina\s*95)[^$]{0,80}\$?\s*([+-]?\d+[.,]?\d*)/i);
    const g97 = find(/(?:97|gasolina\s*97)[^$]{0,80}\$?\s*([+-]?\d+[.,]?\d*)/i);
    const di = find(/(?:di[eé]sel)[^$]{0,80}\$?\s*([+-]?\d+[.,]?\d*)/i);
    const fuel_changes: Record<string, number> = {};
    if (g93 !== null) fuel_changes.gasoline93 = g93;
    if (g95 !== null) fuel_changes.gasoline95 = g95;
    if (g97 !== null) fuel_changes.gasoline97 = g97;
    if (di !== null) fuel_changes.diesel = di;
    if (Object.keys(fuel_changes).length === 0) return null;
    const vals = Object.values(fuel_changes);
    const sum = vals.reduce((a, b) => a + b, 0);
    const dir = sum > 0.5 ? "up" : sum < -0.5 ? "down" : "neutral";
    return { direction: dir, fuel_changes, source_url: url };
  } catch (e) {
    console.error("MEPCO scrape failed", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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
    const week_of = nextThursday();
    const data = await fetchPublishedMepco();

    if (!data) {
      return new Response(
        JSON.stringify({ ok: false, reason: "MEPCO publication not parseable", week_of }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("mepco_adjustments").upsert(
      {
        week_of,
        published_at: new Date().toISOString(),
        direction: data.direction,
        fuel_changes: data.fuel_changes,
        source_url: data.source_url,
      },
      { onConflict: "week_of" },
    );

    // Compose push
    const changedLabels = Object.entries(data.fuel_changes)
      .filter(([, v]) => Math.abs(Number(v)) > 0)
      .map(([k, v]) => `${FUEL_LABEL[k] ?? k} ${Number(v) > 0 ? "↑" : "↓"}$${Math.abs(Number(v)).toFixed(0)}`)
      .join(" · ");

    const maxAbs = Math.max(...Object.values(data.fuel_changes).map((v) => Math.abs(Number(v))));
    let title = "";
    let body = "";
    if (data.direction === "up") {
      title = `⛽ La bencina sube $${maxAbs.toFixed(0)} el jueves`;
      body = `Conviene cargar antes del miércoles. ${changedLabels}`;
    } else if (data.direction === "down") {
      title = `📉 La bencina baja $${maxAbs.toFixed(0)} el jueves`;
      body = `Si puedes, espera al jueves para cargar. ${changedLabels}`;
    } else {
      title = "ℹ️ La bencina no cambia este jueves";
      body = "MEPCO publicó ajuste neutro para esta semana.";
    }

    // Only notify users with mepco_alert_enabled = true (default true)
    const { data: optedIn } = await supabase
      .from("user_preferences")
      .select("user_id")
      .eq("mepco_alert_enabled", true);

    if (optedIn && optedIn.length > 0) {
      await supabase.functions.invoke("send-push-notifications", {
        body: { title, body, data: { type: "mepco", url: "/mepco-info" } },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, week_of, direction: data.direction, fuel_changes: data.fuel_changes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-mepco error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
