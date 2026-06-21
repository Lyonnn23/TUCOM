// Verify a user-submitted price report using Lovable AI.
// - Validates plausible price ranges per fuel type.
// - If a photo is attached, asks Gemini Vision to confirm fuel type + price visible.
// - Updates reported_prices.status (verified | needs_review | rejected).
// - On 'verified', refreshes station_prices via aggregate_reported_prices().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FUEL_LABELS: Record<string, string> = {
  gasoline93: "Gasolina 93 octanos",
  gasoline95: "Gasolina 95 octanos",
  gasoline97: "Gasolina 97 octanos",
  diesel: "Diésel / Petróleo Diésel",
  electric: "Carga eléctrica (kWh)",
};

// Plausible ranges (CLP). Liquids: per liter. Electric: per kWh.
const RANGES: Record<string, { min: number; max: number }> = {
  gasoline93: { min: 1450, max: 1750 },
  gasoline95: { min: 1490, max: 1800 },
  gasoline97: { min: 1550, max: 1850 },
  diesel:     { min: 1430, max: 1650 },
  electric:   { min: 50,   max: 1000 },
};

interface VerifyBody {
  reportId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    // Require an authenticated user. The report owner is identified by the JWT.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const authed = createClient(SUPABASE_URL, ANON_KEY);
    const { data: userData, error: userErr } = await authed.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const callerId = userData.user.id;

    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    const { reportId } = (await req.json()) as VerifyBody;
    if (!reportId || typeof reportId !== "string") {
      return json({ error: "reportId is required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Load the report
    const { data: report, error: reportErr } = await admin
      .from("reported_prices")
      .select("id, station_id, fuel_type, price, note, photo_path, user_id, status")
      .eq("id", reportId)
      .maybeSingle();

    if (reportErr) throw reportErr;
    if (!report) return json({ error: "Report not found" }, 404);
    // Only the report owner or an admin can trigger verification.
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (report.user_id !== callerId && !isAdmin) {
      return json({ error: "forbidden" }, 403);
    }
    if (report.status !== "pending") {
      return json({ status: report.status, message: "Already processed" });
    }

    // 2. Range plausibility
    const range = RANGES[report.fuel_type];
    if (!range || report.price < range.min || report.price > range.max) {
      await updateStatus(admin, report.id, "rejected", "Precio fuera del rango plausible.");
      return json({ status: "rejected", reason: "out_of_range" });
    }

    // 3. Compare with current price for that station
    const { data: current } = await admin
      .from("station_prices")
      .select("price")
      .eq("station_id", report.station_id)
      .eq("fuel_type", report.fuel_type)
      .maybeSingle();

    const currentPrice = current?.price ?? null;
    const drift =
      currentPrice && currentPrice > 0
        ? Math.abs(report.price - currentPrice) / currentPrice
        : 0;

    const requiresPhoto = drift > 0.25; // >25% off requires photo

    // 4. If photo present, ask Gemini Vision to inspect it
    let aiVerdict: "verified" | "needs_review" | "rejected" | null = null;
    let aiNotes = "";

    if (report.photo_path) {
      const { data: signed, error: signErr } = await admin.storage
        .from("price-reports")
        .createSignedUrl(report.photo_path, 60);
      if (signErr) {
        aiNotes = "No se pudo leer la imagen.";
      } else {
        const visionResult = await callVision(
          LOVABLE_API_KEY,
          signed.signedUrl,
          report.fuel_type,
          report.price,
        );
        aiVerdict = visionResult.verdict;
        aiNotes = visionResult.notes;
      }
    } else if (requiresPhoto) {
      await updateStatus(
        admin,
        report.id,
        "needs_review",
        `Diferencia del ${(drift * 100).toFixed(0)}% vs precio actual. Se recomienda enviar foto.`,
      );
      return json({ status: "needs_review", reason: "large_drift_no_photo" });
    }

    // 5. Final decision
    let finalStatus: "verified" | "needs_review" | "rejected";
    if (aiVerdict) {
      finalStatus = aiVerdict;
    } else if (drift <= 0.15) {
      finalStatus = "verified";
      aiNotes ||= "Precio dentro del rango habitual; aceptado automáticamente.";
    } else {
      finalStatus = "needs_review";
      aiNotes ||= "Variación moderada vs precio actual; requiere revisión.";
    }

    await updateStatus(admin, report.id, finalStatus, aiNotes);

    if (finalStatus === "verified") {
      // Refresh aggregated station prices
      await admin.rpc("aggregate_reported_prices");
    }

    return json({ status: finalStatus, notes: aiNotes });
  } catch (e) {
    console.error("verify-price-report error:", e);
    return json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      500,
    );
  }
});

async function updateStatus(
  admin: ReturnType<typeof createClient>,
  id: string,
  status: "verified" | "needs_review" | "rejected",
  notes: string,
) {
  await admin
    .from("reported_prices")
    .update({
      status,
      verification_notes: notes,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id);
}

async function callVision(
  apiKey: string,
  imageUrl: string,
  fuelType: string,
  reportedPrice: number,
): Promise<{
  verdict: "verified" | "needs_review" | "rejected";
  notes: string;
}> {
  const label = FUEL_LABELS[fuelType] ?? fuelType;
  const systemPrompt =
    "Eres un verificador de precios de combustible en Chile. Analizas fotos de tótems, surtidores o pantallas de electrolineras. Debes ser estricto: solo aprueba si realmente se observa un combustible y un precio coherente. Si no hay foto válida, rechaza.";

  const userPrompt = `Verifica este reporte:
- Combustible reportado: ${label}
- Precio reportado: ${reportedPrice} CLP ${fuelType === "electric" ? "por kWh" : "por litro"}

Responde llamando a la función "report_verdict" con tu evaluación. Sé estricto: la foto debe mostrar inequívocamente un tótem o surtidor de combustible.`;

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "report_verdict",
          description: "Veredicto sobre la veracidad del reporte de precio.",
          parameters: {
            type: "object",
            properties: {
              shows_fuel_station: {
                type: "boolean",
                description: "¿La imagen muestra un tótem o surtidor de combustible?",
              },
              fuel_type_visible: {
                type: "string",
                enum: ["yes", "no", "unclear"],
                description: "¿Se observa el tipo de combustible reportado?",
              },
              price_visible: {
                type: "string",
                enum: ["matches", "differs", "not_visible"],
                description:
                  "¿Se observa un precio numérico que coincide (±20 CLP) con el reportado?",
              },
              verdict: {
                type: "string",
                enum: ["verified", "needs_review", "rejected"],
                description:
                  "verified si la foto respalda claramente el reporte; rejected si no es una foto válida o el precio difiere mucho; needs_review si es ambiguo.",
              },
              reasoning: {
                type: "string",
                description: "Explicación breve en español (máx 200 caracteres).",
              },
            },
            required: ["shows_fuel_station", "verdict", "reasoning"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "report_verdict" } },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("AI gateway error", resp.status, txt);
    return {
      verdict: "needs_review",
      notes: `IA no disponible (${resp.status}); requiere revisión manual.`,
    };
  }

  const data = await resp.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) {
    return {
      verdict: "needs_review",
      notes: "Respuesta de IA sin estructura; requiere revisión.",
    };
  }
  try {
    const args = JSON.parse(call.function.arguments);
    const verdict = (args.verdict as "verified" | "needs_review" | "rejected") ??
      "needs_review";
    return {
      verdict,
      notes: `IA: ${args.reasoning ?? "sin detalle"}`.slice(0, 500),
    };
  } catch {
    return {
      verdict: "needs_review",
      notes: "No se pudo parsear la respuesta de IA.",
    };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
