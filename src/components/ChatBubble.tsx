import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { useFuelLogs } from "@/hooks/useFuelLogs";
import { useCheapestStations } from "@/hooks/useNearbyStations";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "tucom_chat_history";
const SEEN_KEY = "tucom_chat_seen";
const FREE_DAILY_LIMIT = 20;
const MAX_MESSAGE_CHARS = 500;

const STARTERS = [
  "¿Cuánto me cuesta ir a Viña del Mar?",
  "¿Cuándo conviene cargar esta semana?",
  "¿Cuál es la más barata cerca de mí?",
  "¿Cuánto ahorro al mes si cambio de estación?",
];

function loadHistory(): Msg[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function MarkdownBox({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

export default function ChatBubble() {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { primary } = useUserVehicles();
  const { logs } = useFuelLogs();
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { /* ignore */ },
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 8000 }
    );
  }, []);

  const { data: cheapest } = useCheapestStations(
    loc?.lat ?? null, loc?.lng ?? null, 10000,
    (primary?.fuel_type as any) ?? "gasoline95", 3,
  );

  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY) !== "1"; } catch { return true; }
  });
  const [messages, setMessages] = useState<Msg[]>(loadHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const todayKey = () => `tucom_chat_used_${new Date().toISOString().slice(0, 10)}`;
  const [usedToday, setUsedToday] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(todayKey());
      return v != null ? Math.max(0, parseInt(v, 10) || 0) : 0;
    } catch { return 0; }
  });
  useEffect(() => {
    if (usedToday == null) return;
    try { localStorage.setItem(todayKey(), String(usedToday)); } catch { /* noop */ }
  }, [usedToday]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* ignore */ }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpen = () => {
    setOpen(true);
    haptic("light");
    if (pulse) {
      setPulse(false);
      try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    }
  };

  const buildContext = () => ({
    user_vehicle: primary ? {
      brand: primary.brand,
      model: primary.model,
      fuel_type: primary.fuel_type,
      consumption_km_l: primary.consumption_kml,
      tank_size_l: primary.tank_size_l,
    } : null,
    nearby_cheapest: (cheapest ?? []).map((s) => ({
      name: s.name,
      commune: s.commune,
      brand: s.brand,
      price: s.price,
      fuel_type: primary?.fuel_type ?? "gasoline95",
      distance_km: Math.round((s.distance_m / 1000) * 10) / 10,
    })),
    last_fillup: logs?.[0] ? {
      station_id: logs[0].station_id,
      price_per_liter: logs[0].price_per_liter,
      liters: logs[0].liters,
      total_cost: logs[0].total_cost,
      date: logs[0].logged_at,
      fuel_type: logs[0].fuel_type,
    } : null,
    next_mepco: null,
    user_location: loc,
  });

  const send = async (text: string) => {
    // Strip HTML tags and control chars, cap at 500 chars
    const sanitized = text
      .replace(/<[^>]*>/g, "")
      .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
      .slice(0, MAX_MESSAGE_CHARS);
    const trimmed = sanitized.trim();
    if (!trimmed || streaming) return;
    if (!user) {
      toast.error("Inicia sesión para usar el asistente");
      return;
    }
    const next: Msg[] = [...messages.slice(-7), { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    haptic("light");
    import("@/lib/analytics").then((m) => m.analytics.useAi(trimmed.length)).catch(() => {});

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tucom-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, context: buildContext() }),
      });
      if (resp.status === 429) {
        const j = await resp.json().catch(() => ({}));
        setUsedToday(j.used ?? FREE_DAILY_LIMIT);
        setStreaming(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}));
        const errMsg = j.error ?? j.detail ?? `Error del asistente (${resp.status})`;
        toast.error(errMsg);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `⚠️ **No pude responder.** ${errMsg}\n\nIntenta de nuevo en unos segundos. Si persiste, avísanos.`,
        }]);
        setStreaming(false);
        return;
      }
      const usedHdr = resp.headers.get("X-Used-Today");
      if (usedHdr) setUsedToday(parseInt(usedHdr, 10));

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let done = false;
      while (!done) {
        const r = await reader.read();
        if (r.done) break;
        buf += decoder.decode(r.value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          if (payload === "[DONE]") { done = true; break; }
          try {
            const evt = JSON.parse(payload);
            if (evt.delta) {
              assistantText += evt.delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch { /* partial */ }
        }
      }
      haptic("double");
    } catch (e: any) {
      const errMsg = e?.message ?? "Error de red";
      toast.error(errMsg);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `⚠️ **Error de conexión.** ${errMsg}\n\nRevisa tu internet e intenta de nuevo.`,
      }]);
    } finally {
      setStreaming(false);
    }
  };

  const reset = () => {
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  const atLimit = !isPro && usedToday !== null && usedToday >= FREE_DAILY_LIMIT;

  return (
    <>
      <button
        type="button"
        aria-label="Abrir asistente TÜcom"
        onClick={handleOpen}
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-[#6366F1] text-white shadow-xl flex items-center justify-center spring-pop hover:scale-105 transition-transform md:bottom-6"
      >
        {pulse && (
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" aria-hidden />
        )}
        <Sparkles className="h-6 w-6 relative" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="p-0 w-full sm:max-w-[400px] flex flex-col gap-0 h-[100dvh]"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-[#6366F1] flex items-center justify-center text-white shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm leading-tight">Asistente TÜcom</h2>
                <p className="text-[11px] text-muted-foreground truncate">Pregúntame sobre precios y ahorro</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" onClick={reset} aria-label="Nueva conversación">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground px-1">
                  Hola{user ? "" : ""} 👋 Soy tu asistente. Prueba con una pregunta:
                </p>
                <div className="flex flex-col gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={streaming || atLimit}
                      className="text-left text-sm px-3 py-2 rounded-xl border bg-card hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-3 rounded-2xl text-sm animate-fade-in-up ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-muted mr-8"
                }`}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : m.content ? (
                  <MarkdownBox text={m.content} />
                ) : (
                  <div className="flex gap-1 py-1" aria-label="Escribiendo">
                    <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "240ms" }} />
                  </div>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {atLimit ? (
            <UpgradeCard onClose={() => setOpen(false)} />
          ) : (
            <div className="border-t p-3 space-y-2">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="Escribe tu pregunta..."
                  rows={1}
                  maxLength={MAX_MESSAGE_CHARS}
                  className="resize-none min-h-[40px] max-h-32"
                  disabled={streaming}
                />
                <Button
                  size="icon"
                  onClick={() => send(input)}
                  disabled={streaming || !input.trim()}
                  className="shrink-0"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {!isPro && usedToday !== null && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Te quedan {Math.max(0, FREE_DAILY_LIMIT - usedToday)} consultas hoy ·{" "}
                  <Link to="/planes" className="text-primary underline">Pasa a Pro</Link>
                </p>
              )}
              {!isPro && usedToday === null && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Plan gratis: {FREE_DAILY_LIMIT} consultas al día
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function UpgradeCard({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="border-t p-4 bg-gradient-to-br from-primary/10 to-[#6366F1]/10">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Has alcanzado el límite diario de 20 consultas</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Se reinicia mañana. Gracias por usar TÜcom. O pasa a Pro para consultas ilimitadas.
          </p>
          <Button
            size="sm"
            className="w-full"
            onClick={() => { onClose(); navigate("/planes"); }}
          >
            Ver Planes
          </Button>
        </div>
      </div>
    </div>
  );
}
