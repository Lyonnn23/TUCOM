import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const STORAGE_KEY = "tucom_admin_ai_chat";

type Msg = { role: "user" | "assistant"; content: string };

function MarkdownBox({ text }: { text: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function AnalysisPanel({ mode, quickQuestions, autoPrompt }: { mode: "prices" | "users"; quickQuestions: string[]; autoPrompt: string }) {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const run = async (prompt: string) => {
    setLoading(true); setOutput("");
    const { data, error } = await supabase.functions.invoke("admin-ai-insights", { body: { mode, prompt } });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    setOutput(data?.text ?? "");
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run(autoPrompt)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {loading ? "Analizando…" : "Generar análisis"}
        </Button>
        {quickQuestions.map(q => (
          <Button key={q} variant="outline" size="sm" disabled={loading} onClick={() => run(q)}>{q}</Button>
        ))}
      </div>
      <Card>
        <CardContent className="pt-5 min-h-[200px]">
          {output ? <MarkdownBox text={output} /> :
            <p className="text-sm text-muted-foreground">Haz clic en "Generar análisis" o una pregunta rápida para que Claude analice los datos.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function FreeChat() {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim(); if (!text) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-ai-insights", {
      body: { mode: "chat", prompt: text, history: messages.slice(-8) },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (data?.error) { toast.error(data.error); return; }
    setMessages([...next, { role: "assistant", content: data?.text ?? "" }]);
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Pregúntale a Claude sobre tus datos: "¿Qué marca subió más esta semana?", "¿Dónde están los usuarios más activos?", etc.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`p-3 rounded-lg ${m.role === "user" ? "bg-primary/10 ml-8" : "bg-muted mr-8"}`}>
              <div className="text-[11px] uppercase font-medium text-muted-foreground mb-1">{m.role === "user" ? "Tú" : "Claude"}</div>
              {m.role === "user" ? <p className="text-sm whitespace-pre-wrap">{m.content}</p> : <MarkdownBox text={m.content} />}
            </div>
          ))}
          {loading && <div className="p-3 rounded-lg bg-muted mr-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Pensando…</div>}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2">
          <Textarea placeholder="Escribe tu pregunta…" value={input} onChange={e => setInput(e.target.value)} rows={2}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
          <Button onClick={send} disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
        </div>
        <p className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter para enviar · Historial se guarda solo durante la sesión</p>
      </CardContent>
    </Card>
  );
}

export default function AdminInsights() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />IA Insights</CardTitle>
          <p className="text-sm text-muted-foreground">Análisis con Claude Sonnet 4 sobre datos en vivo de TÜcom.</p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="prices">
        <TabsList>
          <TabsTrigger value="prices">Análisis de precios</TabsTrigger>
          <TabsTrigger value="users">Análisis de usuarios</TabsTrigger>
          <TabsTrigger value="chat">Chat libre</TabsTrigger>
        </TabsList>
        <TabsContent value="prices" className="mt-4">
          <AnalysisPanel
            mode="prices"
            autoPrompt="Analiza las tendencias de precios de combustible en Chile esta semana. Identifica los principales movimientos por marca y comuna, anomalías o precios fuera de rango, y entrega recomendaciones para los usuarios de la app."
            quickQuestions={["¿Qué marcas subieron más?", "¿Qué comunas son más caras?", "Detectar anomalías de precio"]}
          />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <AnalysisPanel
            mode="users"
            autoPrompt="Analiza el comportamiento de los usuarios de TÜcom: horas pico, áreas más buscadas, retención, posibles puntos de abandono. Sugiere acciones concretas para mejorar la retención."
            quickQuestions={["Cómo mejorar retención", "Hora pico de uso", "Top usuarios activos"]}
          />
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <FreeChat />
        </TabsContent>
      </Tabs>
    </div>
  );
}
