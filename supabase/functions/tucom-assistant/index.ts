// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Eres el asistente de TÜcom, app chilena de combustible. Respondes en español chileno informal. Eres conciso (máximo 4 oraciones). Siempre das el dato más útil primero.

Datos que tienes disponibles en el contexto de cada mensaje:
- Precios actuales de estaciones cercanas al usuario
- Vehículo del usuario: marca, modelo, rendimiento km/L, combustible preferido
- Historial de cargas del usuario (últimas 5)
- Próximo ajuste MEPCO (si está disponible)

Para calcular costo de viaje: precio_litro × (km_ruta / rendimiento_km_L).
Para rutas: asume 1.25× la distancia en línea recta como estimado de ruta real.
Si no tienes datos precisos, da un rango y recomienda verificar en el mapa de TÜcom.`;

const FREE_DAILY_LIMIT = 10;

function isPro(sub: any): boolean {
  if (!sub) return false;
  if (sub.plan !== "pro" || sub.status !== "active") return false;
  if (sub.expires_at && new Date(sub.expires_at) <= new Date()) return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userSb.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: Array<{ role: "user" | "assistant"; content: string }> =
      Array.isArray(body.messages) ? body.messages.slice(-8) : [];
    const context = body.context ?? {};

    if (!messages.length || messages[messages.length - 1]?.role !== "user") {
      return new Response(JSON.stringify({ error: "Mensaje inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check subscription
    const { data: sub } = await admin
      .from("subscriptions").select("plan,status,expires_at").eq("user_id", user.id).maybeSingle();
    const pro = isPro(sub);

    // Usage check / increment
    let usedToday = 0;
    if (!pro) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: pref } = await admin
        .from("user_preferences")
        .select("ai_chat_count, ai_chat_count_date")
        .eq("user_id", user.id).maybeSingle();
      const sameDay = pref?.ai_chat_count_date === today;
      usedToday = sameDay ? (pref?.ai_chat_count ?? 0) : 0;
      if (usedToday >= FREE_DAILY_LIMIT) {
        return new Response(JSON.stringify({ error: "limit_reached", used: usedToday, limit: FREE_DAILY_LIMIT }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.from("user_preferences").upsert({
        user_id: user.id,
        ai_chat_count: usedToday + 1,
        ai_chat_count_date: today,
      }, { onConflict: "user_id" });
    }

    // Inject context into the latest user message
    const ctxString = JSON.stringify(context).slice(0, 8000);
    const enrichedMessages = messages.map((m, i) =>
      i === messages.length - 1
        ? { role: m.role, content: `Contexto (JSON):\n\`\`\`json\n${ctxString}\n\`\`\`\n\nPregunta:\n${m.content}` }
        : m
    );

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        stream: true,
        messages: enrichedMessages,
      }),
    });

    if (!resp.ok || !resp.body) {
      const text = await resp.text().catch(() => "");
      console.error("Anthropic error", resp.status, text);
      return new Response(JSON.stringify({ error: `Anthropic ${resp.status}`, detail: text.slice(0, 300) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Anthropic SSE → simple SSE with `data: {"delta":"..."}` lines
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let buf = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);
              if (!line.startsWith("data:")) continue;
              const json = line.slice(5).trim();
              if (!json) continue;
              try {
                const evt = JSON.parse(json);
                if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: evt.delta.text })}\n\n`));
                } else if (evt.type === "message_stop") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                }
              } catch { /* ignore */ }
            }
          }
        } catch (e) {
          console.error("stream err", e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Used-Today": String(pro ? 0 : usedToday + 1),
        "X-Daily-Limit": String(pro ? 0 : FREE_DAILY_LIMIT),
        "X-Is-Pro": pro ? "1" : "0",
      },
    });
  } catch (err: any) {
    console.error("tucom-assistant error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
