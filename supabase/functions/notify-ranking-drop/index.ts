// Cron semanal: detecta usuarios que bajaron de posición en el ranking mensual
// y les envía un push motivándolos a reportar un precio para recuperar su lugar.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Ranking actual (mensual)
    const { data: leaderboard, error: lbErr } = await supabase.rpc("get_monthly_leaderboard");
    if (lbErr) throw lbErr;

    const current = (leaderboard ?? []) as Array<{ user_id: string; points: number; reports: number }>;
    // Ordenado descendente por puntos en la RPC; asignar posiciones 1-based
    const positions = new Map<string, number>();
    current.forEach((row, i) => positions.set(row.user_id, i + 1));

    if (positions.size === 0) {
      return new Response(JSON.stringify({ ok: true, notified: 0, reason: "empty_leaderboard" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Últimas posiciones registradas
    const userIds = Array.from(positions.keys());
    const { data: prev, error: prevErr } = await supabase
      .from("ranking_snapshots")
      .select("user_id, position")
      .in("user_id", userIds);
    if (prevErr) throw prevErr;

    const prevMap = new Map<string, number>();
    (prev ?? []).forEach((r: { user_id: string; position: number }) => prevMap.set(r.user_id, r.position));

    // 3. Usuarios opt-in a notificaciones
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("user_id")
      .eq("notifications_enabled", true)
      .in("user_id", userIds);
    const optedIn = new Set((prefs ?? []).map((p: { user_id: string }) => p.user_id));

    // 4. Detectar caídas y notificar
    let notified = 0;
    for (const userId of userIds) {
      const newPos = positions.get(userId)!;
      const oldPos = prevMap.get(userId);
      if (oldPos == null) continue; // primera vez: solo se registra baseline
      if (newPos <= oldPos) continue; // igual o mejor
      if (!optedIn.has(userId)) continue;

      try {
        await supabase.functions.invoke("send-push-notifications", {
          body: {
            user_ids: [userId],
            title: `📉 Bajaste al puesto #${newPos} en el ranking`,
            body: "¡Reporta un precio para recuperar tu lugar!",
            data: { type: "ranking_drop", position: newPos, url: "/perfil" },
          },
        });
        notified++;
      } catch (e) {
        console.error("push failed for", userId, e);
      }
    }

    // 5. Upsert nuevas posiciones para todos los usuarios activos
    const rows = current.map((r, i) => ({
      user_id: r.user_id,
      position: i + 1,
      snapshot_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      const { error: upErr } = await supabase
        .from("ranking_snapshots")
        .upsert(rows, { onConflict: "user_id" });
      if (upErr) console.error("upsert snapshots failed", upErr);
    }

    return new Response(
      JSON.stringify({ ok: true, notified, tracked: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("notify-ranking-drop error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
