import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Activity, Flag, BellRing, MapPin, RefreshCw, Send, Download, Play, Pause, FileDown } from "lucide-react";
import { toast } from "sonner";

type Overview = {
  total_users: number; active_users_7d: number;
  total_reports: number; pending_reports: number;
  total_alerts: number; active_alerts: number;
};

const Stat = ({ icon: Icon, label, value, hint, accent }: any) => (
  <Card>
    <CardContent className="pt-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />
      </div>
      <div className="text-2xl font-bold mt-1">{value ?? "—"}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </CardContent>
  </Card>
);

type FeedItem = { id: string; icon: string; text: string; ts: string };

export default function AdminOverview() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [stationCount, setStationCount] = useState<number>(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [paused, setPaused] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { (async () => {
    const [{ data }, { count }, { data: maxUp }] = await Promise.all([
      supabase.rpc("get_admin_overview"),
      supabase.from("gas_stations").select("*", { count: "exact", head: true }),
      supabase.from("gas_stations").select("updated_at").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (data) setOv(data as unknown as Overview);
    setStationCount(count ?? 0);
    setLastSync(maxUp?.updated_at ?? null);
  })(); }, []);

  // Realtime feed
  useEffect(() => {
    if (paused) return;
    const channels = [
      supabase.channel("admin-feed-reports")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "reported_prices" }, (p) => {
          const r: any = p.new;
          setFeed(prev => [{ id: r.id, icon: "🏷️", text: `Nuevo reporte de precio ${r.fuel_type.replace("gasoline", "")} → $${r.price}`, ts: new Date().toISOString() }, ...prev].slice(0, 20));
        }).subscribe(),
      supabase.channel("admin-feed-alerts")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "price_alerts" }, (p) => {
          const r: any = p.new;
          setFeed(prev => [{ id: r.id, icon: "🔔", text: `Nueva alerta para ${r.fuel_type.replace("gasoline", "")} a $${r.target_price}`, ts: new Date().toISOString() }, ...prev].slice(0, 20));
        }).subscribe(),
      supabase.channel("admin-feed-prefs")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_preferences" }, (p) => {
          const r: any = p.new;
          setFeed(prev => [{ id: r.id, icon: "👤", text: `Nuevo usuario registrado`, ts: new Date().toISOString() }, ...prev].slice(0, 20));
        }).subscribe(),
    ];
    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [paused]);

  const syncCNE = async () => {
    setSyncing(true);
    const { error } = await supabase.functions.invoke("sync-prices");
    setSyncing(false);
    if (error) return toast.error(`Error: ${error.message}`);
    toast.success("Sincronización CNE iniciada");
    setLastSync(new Date().toISOString());
  };

  const sendGlobalPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) return toast.error("Título y mensaje requeridos");
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-global-push", { body: { title: pushTitle, body: pushBody } });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Enviado a ${data?.sent ?? 0} usuarios`);
    setPushOpen(false); setPushTitle(""); setPushBody("");
  };

  const exportCsv = async (kind: "users" | "stations" | "reports") => {
    let rows: any[] = []; let name = "";
    if (kind === "stations") {
      const { data } = await supabase.from("gas_stations").select("id, name, brand, address, lat, lng, is_open, updated_at").limit(5000);
      rows = data ?? []; name = "estaciones.csv";
    } else if (kind === "reports") {
      const { data } = await supabase.from("reported_prices").select("id, station_id, fuel_type, price, status, created_at").limit(5000);
      rows = data ?? []; name = "reportes.csv";
    } else {
      const { data } = await supabase.rpc("admin_search_users", { _query: "" });
      rows = (data as any[]) ?? []; name = "usuarios.csv";
    }
    if (!rows.length) return toast.info("Sin datos");
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon={Users} label="Usuarios" value={ov?.total_users} hint="Total registrados" accent="text-primary" />
        <Stat icon={Activity} label="Activos (7d)" value={ov?.active_users_7d} accent="text-green-500" />
        <Stat icon={Flag} label="Reportes" value={ov?.pending_reports} hint={`${ov?.total_reports ?? 0} totales`} accent="text-amber-500" />
        <Stat icon={BellRing} label="Alertas activas" value={ov?.active_alerts} hint={`${ov?.total_alerts ?? 0} totales`} accent="text-pink-500" />
        <Stat icon={MapPin} label="Estaciones" value={stationCount} hint="Sincronizadas" accent="text-cyan-500" />
        <Stat icon={RefreshCw} label="Último sync" value={lastSync ? new Date(lastSync).toLocaleDateString("es-CL") : "—"} hint={lastSync ? new Date(lastSync).toLocaleTimeString("es-CL") : ""} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inset-0 rounded-full ${paused ? "bg-muted-foreground" : "bg-green-500 animate-ping"} opacity-75`} />
                <span className={`relative rounded-full h-2 w-2 ${paused ? "bg-muted-foreground" : "bg-green-500"}`} />
              </span>
              Actividad en vivo
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setPaused(p => !p)}>
              {paused ? <><Play className="h-3.5 w-3.5 mr-1" />Reanudar</> : <><Pause className="h-3.5 w-3.5 mr-1" />Pausar</>}
            </Button>
          </CardHeader>
          <CardContent>
            {feed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Esperando eventos… (los nuevos reportes, alertas y registros aparecerán aquí)</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {feed.map(f => (
                  <li key={f.id} className="flex items-start gap-2 text-sm p-2 rounded-md hover:bg-muted/50">
                    <span className="text-lg leading-none">{f.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{f.text}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(f.ts).toLocaleTimeString("es-CL")}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Acciones rápidas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={syncCNE} disabled={syncing} className="w-full justify-start" variant="secondary">
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando…" : "Sincronizar CNE ahora"}
            </Button>

            <Dialog open={pushOpen} onOpenChange={setPushOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start" variant="secondary"><Send className="h-4 w-4 mr-2" />Notificación global</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Enviar notificación push</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Título" value={pushTitle} onChange={e => setPushTitle(e.target.value)} maxLength={50} />
                  <Textarea placeholder="Mensaje" value={pushBody} onChange={e => setPushBody(e.target.value)} maxLength={140} rows={3} />
                  <p className="text-xs text-muted-foreground">Se enviará a todos los usuarios suscritos a notificaciones.</p>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setPushOpen(false)}>Cancelar</Button>
                  <Button onClick={sendGlobalPush} disabled={sending}>{sending ? "Enviando…" : "Enviar"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full justify-start" variant="secondary"><Download className="h-4 w-4 mr-2" />Exportar datos</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportCsv("users")}><FileDown className="h-4 w-4 mr-2" />CSV usuarios</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv("stations")}><FileDown className="h-4 w-4 mr-2" />CSV estaciones</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCsv("reports")}><FileDown className="h-4 w-4 mr-2" />CSV reportes</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
