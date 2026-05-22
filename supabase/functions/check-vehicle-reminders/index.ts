import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type DocRow = {
  id: string;
  vehicle_id: string;
  user_id: string;
  doc_type: "revision_tecnica" | "soap" | "permiso_circulacion" | "cambio_aceite";
  due_date: string | null;
  last_done_date: string | null;
  last_done_km: number | null;
  reminder_active: boolean;
};

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

const OIL_KM_THRESHOLD = 5000;
const OIL_KM_WARN = 4800;
const OIL_MONTHS = 6;
const AVG_KM_PER_DAY = 40; // fallback

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);
    const isoMonth = today.getMonth() + 1;
    const isoDay = today.getDate();

    const { data: docs, error } = await supabase
      .from("vehicle_documents")
      .select("*")
      .eq("reminder_active", true);
    if (error) throw error;

    const pushes: Array<{
      user_id: string;
      title: string;
      body: string;
      kind: string;
      ref_key: string;
      url: string;
    }> = [];

    // Cache vehicle nicknames
    const vehicleCache = new Map<string, { nickname: string | null; brand: string; model: string }>();
    const getVehicle = async (vid: string) => {
      if (vehicleCache.has(vid)) return vehicleCache.get(vid)!;
      const { data } = await supabase
        .from("user_vehicles").select("nickname,brand,model").eq("id", vid).maybeSingle();
      const v = data ?? { nickname: null, brand: "", model: "" };
      vehicleCache.set(vid, v);
      return v;
    };
    const vname = (v: { nickname: string | null; brand: string; model: string }) =>
      v.nickname || `${v.brand} ${v.model}`.trim() || "tu auto";

    for (const d of (docs ?? []) as DocRow[]) {
      const v = await getVehicle(d.vehicle_id);
      const name = vname(v);

      if (d.doc_type === "revision_tecnica" && d.due_date) {
        const diff = daysBetween(new Date(d.due_date), today);
        for (const n of [30, 15, 5, 1]) {
          if (diff === n) {
            pushes.push({
              user_id: d.user_id,
              title: "🔧 Revisión técnica próxima",
              body: `Tu revisión técnica vence en ${n} ${n === 1 ? "día" : "días"}. Agenda con tiempo para evitar multas.`,
              kind: "revision_tecnica",
              ref_key: `${d.id}:${n}:${d.due_date}`,
              url: `/profile/vehicle/${d.vehicle_id}`,
            });
          }
        }
      }

      if (d.doc_type === "soap" && d.due_date) {
        const diff = daysBetween(new Date(d.due_date), today);
        for (const n of [30, 15, 5]) {
          if (diff === n) {
            pushes.push({
              user_id: d.user_id,
              title: "⚠️ SOAP por vencer",
              body: `Tu SOAP vence en ${n} días. Renuévalo para circular legalmente.`,
              kind: "soap",
              ref_key: `${d.id}:${n}:${d.due_date}`,
              url: `/profile/vehicle/${d.vehicle_id}`,
            });
          }
        }
      }

      if (d.doc_type === "permiso_circulacion") {
        if (isoMonth === 3 && (isoDay === 1 || isoDay === 15)) {
          pushes.push({
            user_id: d.user_id,
            title: "💳 Permiso de circulación",
            body: "Marzo llegó. Recuerda pagar tu permiso de circulación en sii.cl",
            kind: "permiso_circulacion",
            ref_key: `${d.id}:${today.getFullYear()}-03-${isoDay}`,
            url: `/profile/vehicle/${d.vehicle_id}`,
          });
        }
      }

      if (d.doc_type === "cambio_aceite") {
        // By KM (estimated odometer)
        if (d.last_done_km != null && d.last_done_date) {
          const elapsed = daysBetween(today, new Date(d.last_done_date));
          const estimated = elapsed * AVG_KM_PER_DAY;
          if (estimated >= OIL_KM_WARN && estimated < OIL_KM_THRESHOLD + 1000) {
            const bucket = Math.floor(estimated / 200) * 200;
            pushes.push({
              user_id: d.user_id,
              title: "🛢️ Cambio de aceite",
              body: `${name} llevaría unos ${bucket.toLocaleString("es-CL")} km desde el último cambio. ¿Toca cambio de aceite?`,
              kind: "aceite_km",
              ref_key: `${d.id}:${bucket}`,
              url: `/profile/vehicle/${d.vehicle_id}`,
            });
          }
        }
        // By date (6-month mark, notify 7 days before)
        if (d.last_done_date) {
          const target = new Date(d.last_done_date);
          target.setMonth(target.getMonth() + OIL_MONTHS);
          const diff = daysBetween(target, today);
          if (diff === 7) {
            pushes.push({
              user_id: d.user_id,
              title: "🛢️ Cambio de aceite",
              body: `${name}: se cumplen 6 meses del último cambio de aceite en 7 días.`,
              kind: "aceite_fecha",
              ref_key: `${d.id}:${target.toISOString().slice(0,10)}`,
              url: `/profile/vehicle/${d.vehicle_id}`,
            });
          }
        }
      }
    }

    let sent = 0;
    for (const p of pushes) {
      // Dedup via notification_log unique constraint
      const { error: logErr } = await supabase
        .from("notification_log")
        .insert({ user_id: p.user_id, kind: p.kind, ref_key: p.ref_key });
      if (logErr) continue; // already sent

      try {
        await supabase.functions.invoke("send-push-notifications", {
          body: {
            title: p.title,
            body: p.body,
            data: { url: p.url, tag: `${p.kind}-${p.ref_key}` },
            user_ids: [p.user_id],
          },
        });
        sent++;
      } catch (err) {
        console.error("push failed", err);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, evaluated: docs?.length ?? 0, queued: pushes.length, sent, today: todayIso }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[check-vehicle-reminders]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
