import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CNE_API_EMAIL = Deno.env.get("CNE_API_EMAIL")!;
const CNE_API_PASSWORD = Deno.env.get("CNE_API_PASSWORD")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Normalize CNE brand to one of the canonical labels used in the UI
const CANONICAL_BRANDS = [
  "Copec", "Enex", "Shell", "Petrobras", "Terpel",
  "Abastible", "Aramco", "Esmax", "Uno-X", "Independiente",
];

function detectBrand(distribuidor: any, razonSocial: string): string {
  const marca = (distribuidor?.marca || "").toString();
  const text = `${marca} ${razonSocial}`.toLowerCase();
  if (text.includes("copec")) return "Copec";
  if (text.includes("shell")) return "Shell";
  if (text.includes("aramco")) return "Aramco";
  if (text.includes("petrobras")) return "Petrobras";
  if (text.includes("terpel")) return "Terpel";
  if (text.includes("enex")) return "Enex";
  if (text.includes("esmax")) return "Esmax";
  if (text.includes("uno-x") || text.includes("unox")) return "Uno-X";
  if (text.includes("abastible")) return "Abastible";
  if (marca && marca.trim().length > 0) {
    // Capitalize first letter
    return marca.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Independiente";
}

// CNE servicios -> short tags
function mapServices(servicios: any): string[] {
  if (!servicios) return [];
  const tags = new Set<string>();
  const flat = Array.isArray(servicios) ? servicios : Object.values(servicios);
  for (const s of flat) {
    const v = typeof s === "string" ? s : (s?.nombre || s?.servicio || "");
    const t = String(v).toLowerCase();
    if (!t) continue;
    if (t.includes("lavado")) tags.add("lavado");
    else if (t.includes("market") || t.includes("tienda")) tags.add("minimarket");
    else if (t.includes("cajero") || t.includes("atm")) tags.add("cajero");
    else if (t.includes("aire") || t.includes("compres")) tags.add("aire");
    else if (t.includes("ba\u00f1o") || t.includes("bano") || t.includes("wc")) tags.add("baños");
    else if (t.includes("electr") || t.includes("ev") || t.includes("carga")) tags.add("ev");
    else if (t.includes("24")) tags.add("24h");
  }
  return [...tags];
}

function mapPaymentMethods(medios: any): string[] {
  if (!medios) return [];
  const tags = new Set<string>();
  const flat = Array.isArray(medios) ? medios : Object.values(medios);
  for (const m of flat) {
    const v = typeof m === "string" ? m : (m?.nombre || m?.medio || "");
    const t = String(v).toLowerCase();
    if (!t) continue;
    if (t.includes("efectivo")) tags.add("efectivo");
    else if (t.includes("d\u00e9bito") || t.includes("debito")) tags.add("debito");
    else if (t.includes("cr\u00e9dito") || t.includes("credito")) tags.add("credito");
    else if (t.includes("tarjeta")) tags.add("tarjeta");
    else if (t.includes("app") || t.includes("mobile") || t.includes("qr")) tags.add("app");
    else if (t.includes("cheque")) tags.add("cheque");
  }
  return [...tags];
}

function mapHours(horario: any): Record<string, string> | null {
  if (!horario || typeof horario !== "object") return null;
  // Try to coerce common CNE shapes to {mon,tue,...}
  const keysMap: Record<string, string> = {
    lunes: "mon", martes: "tue", miercoles: "wed", "miércoles": "wed",
    jueves: "thu", viernes: "fri", sabado: "sat", "sábado": "sat", domingo: "sun",
  };
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(horario)) {
    const key = keysMap[k.toLowerCase()] ?? k.toLowerCase();
    out[key] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return Object.keys(out).length ? out : null;
}

async function loginCNE(): Promise<string> {
  const res = await fetch("https://api.cne.cl/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email: CNE_API_EMAIL, password: CNE_API_PASSWORD }),
  });
  if (!res.ok) throw new Error(`CNE login failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (!data.token) throw new Error("CNE login response missing token");
  return data.token;
}

async function fetchEstaciones(token: string): Promise<any[]> {
  const res = await fetch("https://api.cne.cl/api/v4/estaciones", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`CNE estaciones failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.data || []);
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


  const t0 = Date.now();
  try {
    const token = await loginCNE();
    const estaciones = await fetchEstaciones(token);
    console.log(`Fetched ${estaciones.length} estaciones from CNE`);

    if (estaciones.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No stations returned from CNE" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stationMap = new Map<string, any>();
    let skipped = 0;

    for (const s of estaciones) {
      const codigo = s.codigo;
      if (!codigo) { skipped++; continue; }

      const razonSocial = s.razon_social || "Estación";
      const ubicacion = s.ubicacion || {};
      const lat = parseFloat(ubicacion.latitud || ubicacion.lat || "0");
      const lng = parseFloat(ubicacion.longitud || ubicacion.lng || ubicacion.lon || "0");
      if (!lat || !lng) { skipped++; continue; }

      const placeId = `cne_${codigo}`;
      if (stationMap.has(placeId)) { skipped++; continue; }

      const brand = detectBrand(s.distribuidor, razonSocial);
      const address = ubicacion.direccion || ubicacion.calle || "";
      const commune = ubicacion.nombre_comuna || ubicacion.comuna || null;
      const region = ubicacion.nombre_region || ubicacion.region || null;
      const cneLast = s.fecha_hora_actualizacion || s.fecha_actualizacion || null;

      stationMap.set(placeId, {
        place_id: placeId,
        cne_id: String(codigo),
        name: razonSocial,
        brand,
        address,
        commune,
        region,
        lat,
        lng,
        is_open: s.en_mantenimiento === 0,
        payment_methods: mapPaymentMethods(s.metodos_de_pago || s.medios_pago),
        services: mapServices(s.servicios),
        opening_hours: mapHours(s.horario_atencion || s.horarios),
        cne_last_updated: cneLast ? new Date(cneLast).toISOString() : null,
      });
    }

    const upsertRows = [...stationMap.values()];
    let upserted = 0;
    const errors: string[] = [];
    const batchSize = 200;
    for (let i = 0; i < upsertRows.length; i += batchSize) {
      const batch = upsertRows.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from("gas_stations")
        .upsert(batch, { onConflict: "place_id", ignoreDuplicates: false })
        .select("id");
      if (error) errors.push(`batch ${i}: ${error.message}`);
      else upserted += data?.length ?? 0;
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - t0,
      total_from_cne: estaciones.length,
      stations_processed: upsertRows.length,
      stations_updated: upserted,
      skipped,
      errors,
      canonical_brands: CANONICAL_BRANDS,
    };
    console.log("Sync result:", JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sync-cne-stations error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
        duration_ms: Date.now() - t0,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
