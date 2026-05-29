import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPTS: Record<string, string> = {
  fx_fuel:
    "Explica en UN solo párrafo, en español formal, claro y orientado a usuarios de Chile, por qué el tipo de cambio dólar/peso afecta el precio de los combustibles. Menciona la cadena: petróleo WTI cotiza en dólares, importación/refinación, costos mayoristas y MEPCO como mecanismo de suavización parcial. Máximo 90 palabras. Sin listas, sin títulos.",
  wti_fuel:
    "Explica en UN solo párrafo, en español formal, claro y orientado a usuarios de Chile, cómo el precio internacional del petróleo WTI incide en el precio final de los combustibles. Menciona refinación, importación, tipo de cambio y MEPCO. Máximo 90 palabras. Sin listas, sin títulos.",
};

const MAX_AGE_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { topic } = await req.json();
    if (!topic || !PROMPTS[topic]) {
      return new Response(JSON.stringify({ error: "invalid topic" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cached } = await supabase
      .from("macro_explainers")
      .select("body_es, updated_at")
      .eq("topic", topic)
      .maybeSingle();

    const fresh =
      cached &&
      Date.now() - new Date(cached.updated_at).getTime() < MAX_AGE_DAYS * 86400_000;

    if (fresh) {
      return new Response(JSON.stringify({ body_es: cached.body_es, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Eres un periodista económico chileno experto en combustibles." },
          { role: "user", content: PROMPTS[topic] },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      if (cached) {
        return new Response(JSON.stringify({ body_es: cached.body_es, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI unavailable" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const body_es: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!body_es) throw new Error("empty AI response");

    await supabase.from("macro_explainers").upsert(
      { topic, body_es, updated_at: new Date().toISOString() },
      { onConflict: "topic" },
    );

    return new Response(JSON.stringify({ body_es, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("macro-explainer error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
