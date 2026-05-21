// Trip calculator: calls Routes API with alternatives, decodes polylines,
// intersects with TAG porticos, finds cheapest station along route, returns full breakdown.
//
// POST body:
// {
//   origin: { lat, lng },
//   destination: { lat, lng },
//   vehicle: { consumption_kml, fuel_type },        // fuel_type ∈ gasoline93/95/97/diesel/electric
//   departAt?: string (ISO),                         // default: now
//   roundTrip?: boolean
// }
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.101.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

interface LatLng { lat: number; lng: number; }
interface Vehicle { consumption_kml: number; fuel_type: string; }

// --- polyline decoding (Google encoded polyline algorithm) ---
function decodePolyline(str: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < str.length) {
    let b: number, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Distance threshold (km) to consider a portico/station "on" the route
const PORTICO_RADIUS_KM = 0.30;
const STATION_RADIUS_KM = 1.5;

// Returns "baja" | "punta" | "saturacion" given a Date in America/Santiago
function getTariffBand(date: Date): "baja" | "punta" | "saturacion" {
  // Convert to Chile time (UTC-3 or -4 depending on DST). Approximation: UTC-3 year-round.
  const cl = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  const dow = cl.getUTCDay(); // 0 Sun .. 6 Sat
  if (dow === 0 || dow === 6) return "baja";
  const mins = cl.getUTCHours() * 60 + cl.getUTCMinutes();
  // Saturación: 8:00-8:30 y 18:30-19:30
  if ((mins >= 480 && mins < 510) || (mins >= 1110 && mins < 1170)) return "saturacion";
  // Punta: 7:30-9:00 y 18:00-20:00
  if ((mins >= 450 && mins < 540) || (mins >= 1080 && mins < 1200)) return "punta";
  return "baja";
}

// Calls Routes API with alternatives.
async function fetchAlternatives(key: string, origin: LatLng, dest: LatLng, departAt: Date) {
  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.legs.steps.navigationInstruction",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: true,
        departureTime: departAt.toISOString(),
        languageCode: "es-CL",
        regionCode: "CL",
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Routes API ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.routes ?? []) as Array<any>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!key) {
      return new Response(JSON.stringify({ error: "missing_maps_key" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    const origin: LatLng = { lat: Number(body?.origin?.lat), lng: Number(body?.origin?.lng) };
    const destination: LatLng = { lat: Number(body?.destination?.lat), lng: Number(body?.destination?.lng) };
    const vehicle: Vehicle = {
      consumption_kml: Math.max(2, Math.min(40, Number(body?.vehicle?.consumption_kml) || 12)),
      fuel_type: String(body?.vehicle?.fuel_type || "gasoline95"),
    };
    const roundTrip = Boolean(body?.roundTrip);
    const departAt = body?.departAt ? new Date(body.departAt) : new Date();

    if (![origin.lat, origin.lng, destination.lat, destination.lng].every(Number.isFinite)) {
      return new Response(JSON.stringify({ error: "invalid_coords" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull TAG porticos and cheap stations (only the relevant fuel) in parallel
    const supabase = createClient(supabaseUrl, serviceKey);
    const [porticosRes, pricesRes] = await Promise.all([
      supabase.from("tag_rates").select("autopista_name, portico_id, portico_name, lat, lng, tarifa_baja, tarifa_punta, tarifa_saturacion"),
      vehicle.fuel_type === "electric"
        ? Promise.resolve({ data: [], error: null })
        : supabase
            .from("station_prices")
            .select("station_id, price, gas_stations!inner(id, name, brand, lat, lng)")
            .eq("fuel_type", vehicle.fuel_type)
            .gt("price", 0)
            .order("price", { ascending: true })
            .limit(3000),
    ]);

    const porticos = porticosRes.data ?? [];
    const stations = (pricesRes.data ?? []).map((r: any) => ({
      id: r.gas_stations.id,
      name: r.gas_stations.name,
      brand: r.gas_stations.brand,
      lat: r.gas_stations.lat,
      lng: r.gas_stations.lng,
      price: r.price,
    }));

    const band = getTariffBand(departAt);
    const routes = await fetchAlternatives(key, origin, destination, departAt);

    const summarized = routes.slice(0, 3).map((r: any, i: number) => {
      const encoded = r?.polyline?.encodedPolyline ?? "";
      const path = decodePolyline(encoded);
      // Sample every ~80m (path is dense) — but Routes returns coarser path so use as-is
      const distanceKm = (r.distanceMeters ?? 0) / 1000;
      const durationSec = Number(String(r.duration ?? "0s").replace("s", ""));

      // Find porticos near path
      const hit: Record<string, any> = {};
      for (const p of porticos) {
        if (hit[p.portico_id]) continue;
        for (const pt of path) {
          if (haversineKm(pt, p) <= PORTICO_RADIUS_KM) {
            const tarifa = band === "saturacion" ? p.tarifa_saturacion
                          : band === "punta" ? p.tarifa_punta : p.tarifa_baja;
            hit[p.portico_id] = { ...p, tarifa };
            break;
          }
        }
      }
      const porticosHit = Object.values(hit) as Array<any>;
      const tagSingle = porticosHit.reduce((s, p) => s + p.tarifa, 0);

      // Find cheapest station near path
      let cheapestStation: any = null;
      for (const s of stations) {
        for (const pt of path) {
          if (haversineKm(pt, s) <= STATION_RADIUS_KM) {
            if (!cheapestStation || s.price < cheapestStation.price) cheapestStation = s;
            break;
          }
        }
        if (cheapestStation && cheapestStation.price === stations[0]?.price) break;
      }

      // Fuel calc
      const pricePerL = cheapestStation?.price ?? 0;
      const km = roundTrip ? distanceKm * 2 : distanceKm;
      const liters = vehicle.consumption_kml > 0 ? km / vehicle.consumption_kml : 0;
      const fuelCost = Math.round(liters * pricePerL);
      const tagCost = roundTrip ? tagSingle * 2 : tagSingle;
      const totalCost = fuelCost + tagCost;

      return {
        index: i,
        description: r.description ?? null,
        distance_km: Math.round(distanceKm * 10) / 10,
        duration_min: Math.round(durationSec / 60),
        polyline: encoded,
        tariff_band: band,
        porticos: porticosHit.map((p) => ({
          portico_id: p.portico_id,
          name: p.portico_name,
          autopista: p.autopista_name,
          lat: p.lat,
          lng: p.lng,
          tarifa: p.tarifa,
        })),
        tag_cost: tagCost,
        liters: Math.round(liters * 10) / 10,
        fuel_cost: fuelCost,
        total_cost: totalCost,
        cheapest_station: cheapestStation,
      };
    });

    return new Response(JSON.stringify({
      band,
      depart_at: departAt.toISOString(),
      routes: summarized,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("trip-calculator error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
