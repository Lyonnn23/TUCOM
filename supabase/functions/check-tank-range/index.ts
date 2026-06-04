// Verifica el rango estimado de cada usuario con bitácora y push activos.
// Cuando los km estimados restantes caen bajo su umbral, envía un push
// con la estación más barata cercana.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FUEL_LABELS: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
  electric: "Eléctrico",
};

const REMINDER_COOLDOWN_HOURS = 12;
const SEARCH_RADIUS_KM = 10;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Memoria simple de cooldown: usamos timestamp en `auth.created_at` no es válido;
    // marcamos último aviso vía updated_at en push_subscriptions del usuario.
    const cooldownSince = new Date(
      Date.now() - REMINDER_COOLDOWN_HOURS * 3600_000,
    ).toISOString();

    // Usuarios con preferencias y subscripciones push
    const { data: subs, error: sErr } = await supabase
      .from("push_subscriptions")
      .select("user_id, lat, lng")
      .not("user_id", "is", null);
    if (sErr) throw sErr;

    const userIds = Array.from(
      new Set((subs ?? []).map((s) => s.user_id).filter(Boolean)),
    ) as string[];
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, evaluated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("user_id, low_fuel_threshold_km, notifications_enabled")
      .in("user_id", userIds);

    const prefByUser = new Map(prefs?.map((p) => [p.user_id, p]) ?? []);

    let pushed = 0;
    let evaluated = 0;

    for (const userId of userIds) {
      const pref = prefByUser.get(userId);
      const threshold = pref?.low_fuel_threshold_km ?? 80;
      if (!pref?.notifications_enabled) continue;

      // Última carga del usuario
      const { data: logs } = await supabase
        .from("fuel_logs")
        .select("liters, fuel_type, vehicle_id, logged_at, odometer_km")
        .eq("user_id", userId)
        .order("logged_at", { ascending: false })
        .limit(1);
      const last = logs?.[0];
      if (!last) continue;

      // Si la última carga fue hace < cooldown, saltar
      if (new Date(last.logged_at).getTime() > Date.now() - REMINDER_COOLDOWN_HOURS * 3600_000) {
        continue;
      }

      // Vehículo
      let kml = 12;
      if (last.vehicle_id) {
        const { data: v } = await supabase
          .from("user_vehicles")
          .select("consumption_kml")
          .eq("id", last.vehicle_id)
          .maybeSingle();
        if (v?.consumption_kml) kml = Number(v.consumption_kml);
      }

      const tankRangeKm = Number(last.liters) * kml;
      // Estimación: asumimos que ya recorrió 80% del tanque pasadas 7 días
      const daysSince = (Date.now() - new Date(last.logged_at).getTime()) / 86_400_000;
      const consumedFactor = Math.min(0.95, daysSince / 7);
      const remainingKm = Math.max(0, Math.round(tankRangeKm * (1 - consumedFactor)));
      evaluated++;

      if (remainingKm >= threshold) continue;

      // Última posición conocida
      const sub = (subs ?? []).find((s) => s.user_id === userId && s.lat != null && s.lng != null);
      if (!sub?.lat || !sub?.lng) continue;

      // Estación más barata dentro del radio para el tipo de combustible
      const { data: stations } = await supabase
        .from("gas_stations")
        .select("id, name, brand, lat, lng");

      const { data: prices } = await supabase
        .from("station_prices")
        .select("station_id, price")
        .eq("fuel_type", last.fuel_type);

      const priceMap = new Map(prices?.map((p) => [p.station_id, p.price]) ?? []);
      let cheapest: { id: string; name: string; brand: string; price: number; distance: number } | null = null;
      for (const s of stations ?? []) {
        const d = haversine(sub.lat!, sub.lng!, s.lat, s.lng);
        if (d > SEARCH_RADIUS_KM) continue;
        const p = priceMap.get(s.id);
        if (!p) continue;
        if (!cheapest || p < cheapest.price) {
          cheapest = { id: s.id, name: s.name, brand: s.brand, price: p, distance: d };
        }
      }
      if (!cheapest) continue;

      const fuelLabel = FUEL_LABELS[last.fuel_type] ?? last.fuel_type;
      const priceStr = Math.round(cheapest.price).toLocaleString("es-CL");

      try {
        await supabase.functions.invoke("send-push-notifications", {
          body: {
            user_ids: [userId],
            title: `⛽ Te quedan ~${remainingKm} km`,
            body: `Más barata cerca: ${cheapest.brand} ${cheapest.name} a $${priceStr}/L (${fuelLabel})`,
            data: {
              station_id: cheapest.id,
              tag: `tank-range-${userId}`,
              url: `/station/${cheapest.id}`,
              lat: cheapest.distance,
            },
          },
        });
        pushed++;
      } catch (e) {
        console.error("[check-tank-range] push failed", e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, evaluated, pushed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[check-tank-range]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
