import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Upload, Trash2, Pencil, Check, X, ShieldCheck, ShieldOff, Search } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Overview = {
  total_users: number;
  active_users_7d: number;
  total_reports: number;
  pending_reports: number;
  total_alerts: number;
  active_alerts: number;
};

const Stat = ({ label, value, hint }: { label: string; value: number | string; hint?: string }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">{label}</CardTitle></CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const Admin = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dau, setDau] = useState<Array<{ day: string; users: number }>>([]);
  const [topStations, setTopStations] = useState<Array<{ name: string; brand: string; views: number }>>([]);
  const [heatmap, setHeatmap] = useState<Array<{ lat: number; lng: number }>>([]);

  useEffect(() => { (async () => {
    const [{ data: ov }, { data: d }, { data: ts }, { data: hm }] = await Promise.all([
      supabase.rpc("get_admin_overview"),
      supabase.rpc("get_daily_active_users", { _days: 30 }),
      supabase.rpc("get_top_viewed_stations", { _limit: 10 }),
      supabase.rpc("get_search_heatmap"),
    ]);
    if (ov) setOverview(ov as unknown as Overview);
    if (d) setDau((d as any[]).map(r => ({ day: r.day, users: Number(r.users) })));
    if (ts) setTopStations((ts as any[]).map(r => ({ name: r.name, brand: r.brand, views: Number(r.views) })));
    if (hm) setHeatmap(hm as any[]);
  })(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Link to="/"><Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">Panel de administración</h1>
        <Badge variant="secondary" className="ml-2">Admin</Badge>
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Usuarios" value={overview?.total_users ?? "—"} />
          <Stat label="Activos (7d)" value={overview?.active_users_7d ?? "—"} hint="Inicio de sesión reciente" />
          <Stat label="Reportes" value={overview?.total_reports ?? "—"} hint={`${overview?.pending_reports ?? 0} pendientes`} />
          <Stat label="Alertas" value={overview?.total_alerts ?? "—"} hint={`${overview?.active_alerts ?? 0} activas`} />
        </section>

        <Tabs defaultValue="stations">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="stations">Estaciones</TabsTrigger>
            <TabsTrigger value="reports">Moderación de reportes</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
            <TabsTrigger value="analytics">Analítica</TabsTrigger>
          </TabsList>

          <TabsContent value="stations" className="mt-4"><StationsTab /></TabsContent>
          <TabsContent value="reports" className="mt-4"><ReportsTab /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
          <TabsContent value="analytics" className="mt-4">
            <AnalyticsTab dau={dau} topStations={topStations} heatmap={heatmap} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

/* ---------------- Stations ---------------- */

type Station = {
  id: string;
  name: string;
  brand: string;
  address: string;
  is_open: boolean;
  updated_at: string;
  reports_count?: number;
};

const StationsTab = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ stationId: string; fuel: string } | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [prices, setPrices] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: st } = await supabase
      .from("gas_stations")
      .select("id, name, brand, address, is_open, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    const { data: rp } = await supabase
      .from("reported_prices")
      .select("station_id")
      .limit(5000);
    const counts: Record<string, number> = {};
    (rp || []).forEach((r: any) => { counts[r.station_id] = (counts[r.station_id] || 0) + 1; });
    setStations((st || []).map(s => ({ ...s, reports_count: counts[s.id] || 0 })));

    if (st && st.length) {
      const ids = st.map(s => s.id);
      const { data: sp } = await supabase
        .from("station_prices")
        .select("station_id, fuel_type, price")
        .in("station_id", ids);
      const map: Record<string, Record<string, number>> = {};
      (sp || []).forEach((p: any) => {
        map[p.station_id] = map[p.station_id] || {};
        map[p.station_id][p.fuel_type] = p.price;
      });
      setPrices(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return stations;
    return stations.filter(s =>
      s.name.toLowerCase().includes(needle) ||
      s.brand.toLowerCase().includes(needle) ||
      s.address.toLowerCase().includes(needle));
  }, [stations, q]);

  const startEdit = (stationId: string, fuel: string) => {
    setEditing({ stationId, fuel });
    setEditPrice(String(prices[stationId]?.[fuel] || ""));
  };

  const savePrice = async () => {
    if (!editing) return;
    const price = parseInt(editPrice, 10);
    if (!Number.isFinite(price) || price < 100 || price > 5000) {
      toast.error("Precio inválido"); return;
    }
    const { error } = await supabase.from("station_prices").upsert({
      station_id: editing.stationId, fuel_type: editing.fuel, price,
    } as any, { onConflict: "station_id,fuel_type" } as any);
    if (error) { toast.error(error.message); return; }
    setPrices(prev => ({
      ...prev,
      [editing.stationId]: { ...(prev[editing.stationId] || {}), [editing.fuel]: price },
    }));
    setEditing(null);
    toast.success("Precio actualizado");
  };

  const toggleClosed = async (s: Station) => {
    const { error } = await supabase.from("gas_stations")
      .update({ is_open: !s.is_open }).eq("id", s.id);
    if (error) return toast.error(error.message);
    setStations(prev => prev.map(x => x.id === s.id ? { ...x, is_open: !s.is_open } : x));
    toast.success(!s.is_open ? "Marcada como abierta" : "Marcada como cerrada");
  };

  const removeStation = async (s: Station) => {
    if (!confirm(`¿Eliminar la estación "${s.name}"?`)) return;
    const { error } = await supabase.from("gas_stations").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    setStations(prev => prev.filter(x => x.id !== s.id));
    toast.success("Estación eliminada");
  };

  const handleCsvImport = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return toast.error("CSV vacío");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const idx = (k: string) => headers.indexOf(k);
    const required = ["name", "brand", "address", "lat", "lng"];
    if (required.some(r => idx(r) === -1)) {
      return toast.error(`Faltan columnas: ${required.join(", ")}`);
    }
    let inserted = 0, priced = 0, errors = 0;
    for (const line of lines.slice(1)) {
      const cols = line.split(",").map(c => c.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cols[i]; });
      const lat = parseFloat(row.lat), lng = parseFloat(row.lng);
      if (!row.name || !isFinite(lat) || !isFinite(lng)) { errors++; continue; }
      const { data: st, error } = await supabase.from("gas_stations").insert({
        name: row.name, brand: row.brand || "Otro", address: row.address || "",
        lat, lng, is_open: true,
      }).select("id").single();
      if (error || !st) { errors++; continue; }
      inserted++;
      for (const fuel of ["gasoline93", "gasoline95", "gasoline97", "diesel"]) {
        const key = fuel.replace("gasoline", "");
        const v = row[fuel] || row[key];
        const price = v ? parseInt(v, 10) : NaN;
        if (Number.isFinite(price) && price >= 100 && price <= 5000) {
          await supabase.from("station_prices").insert({
            station_id: st.id, fuel_type: fuel, price,
          });
          priced++;
        }
      }
    }
    toast.success(`Importadas ${inserted} estaciones (${priced} precios, ${errors} errores)`);
    load();
  };

  const fuels = ["gasoline93", "gasoline95", "gasoline97", "diesel"];

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center gap-3">
        <CardTitle className="flex-1">Gestión de estaciones</CardTitle>
        <div className="flex gap-2">
          <Input placeholder="Buscar nombre, marca, dirección…" value={q} onChange={e => setQ(e.target.value)} className="md:w-72" />
          <label>
            <input type="file" accept=".csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvImport(f); e.currentTarget.value = ""; }} />
            <Button asChild variant="secondary"><span><Upload className="h-4 w-4 mr-2" />Importar CSV</span></Button>
          </label>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estación</TableHead>
                <TableHead>Marca</TableHead>
                {fuels.map(f => <TableHead key={f}>{f.replace("gasoline", "")}</TableHead>)}
                <TableHead>Reportes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 100).map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-xs">{s.address}</div>
                  </TableCell>
                  <TableCell>{s.brand}</TableCell>
                  {fuels.map(f => {
                    const isEd = editing?.stationId === s.id && editing.fuel === f;
                    const v = prices[s.id]?.[f];
                    return (
                      <TableCell key={f}>
                        {isEd ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-20 h-8" />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={savePrice}><Check className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <button className="hover:underline text-sm" onClick={() => startEdit(s.id, f)}>
                            {v ? `$${v}` : <Pencil className="h-3.5 w-3.5 inline opacity-50" />}
                          </button>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell><Badge variant="outline">{s.reports_count}</Badge></TableCell>
                  <TableCell>{s.is_open
                    ? <Badge variant="secondary">Abierta</Badge>
                    : <Badge variant="destructive">Cerrada</Badge>}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => toggleClosed(s)}>
                      {s.is_open ? "Cerrar" : "Abrir"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeStation(s)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          CSV: <code>name,brand,address,lat,lng,gasoline93,gasoline95,gasoline97,diesel</code>
        </p>
      </CardContent>
    </Card>
  );
};

/* ---------------- Reports moderation ---------------- */

const ReportsTab = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [threshold, setThreshold] = useState<number>(5);
  const [savingT, setSavingT] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reported_prices")
      .select("id, station_id, fuel_type, price, user_id, photo_path, created_at, status")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data?.length) {
      const ids = [...new Set(data.map(r => r.station_id))];
      const { data: st } = await supabase
        .from("gas_stations").select("id, name, brand").in("id", ids);
      const map = Object.fromEntries((st || []).map(s => [s.id, s]));
      const { data: sp } = await supabase
        .from("station_prices").select("station_id, fuel_type, price")
        .in("station_id", ids);
      const priceMap: Record<string, number> = {};
      (sp || []).forEach((p: any) => { priceMap[`${p.station_id}:${p.fuel_type}`] = p.price; });
      setRows(data.map(r => ({
        ...r,
        station: map[r.station_id],
        current_price: priceMap[`${r.station_id}:${r.fuel_type}`],
      })));
    } else setRows([]);
    const { data: settings } = await supabase
      .from("admin_settings").select("value").eq("key", "auto_approve_threshold_pct").maybeSingle();
    if (settings?.value != null) setThreshold(Number(settings.value));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveThreshold = async () => {
    setSavingT(true);
    const { error } = await supabase.from("admin_settings")
      .upsert({ key: "auto_approve_threshold_pct", value: threshold as any });
    setSavingT(false);
    if (error) return toast.error(error.message);
    toast.success("Umbral guardado");
  };

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("admin_verify_report", { _report_id: id });
    if (error) return toast.error(error.message);
    toast.success("Reporte aprobado");
    setRows(prev => prev.filter(r => r.id !== id));
  };
  const reject = async (id: string) => {
    const { error } = await supabase.rpc("admin_reject_report", { _report_id: id });
    if (error) return toast.error(error.message);
    toast.success("Reporte rechazado");
    setRows(prev => prev.filter(r => r.id !== id));
  };
  const autoApprove = async () => {
    let n = 0;
    for (const r of rows) {
      if (!r.current_price) continue;
      const diff = Math.abs(r.price - r.current_price) / r.current_price * 100;
      if (diff <= threshold) {
        const { error } = await supabase.rpc("admin_verify_report", { _report_id: r.id });
        if (!error) n++;
      }
    }
    toast.success(`Auto-aprobados ${n} reportes`);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderación de reportes ({rows.length} pendientes)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-muted/40">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Umbral auto-aprobación (±%)</label>
            <Input type="number" min={0} max={50} value={threshold}
              onChange={e => setThreshold(Number(e.target.value))} className="w-24" />
          </div>
          <Button onClick={saveThreshold} disabled={savingT} variant="secondary">Guardar umbral</Button>
          <Button onClick={autoApprove} variant="default">Auto-aprobar elegibles</Button>
        </div>

        <div className="overflow-x-auto">
          {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> :
           rows.length === 0 ? <p className="text-sm text-muted-foreground">No hay reportes pendientes.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estación</TableHead>
                  <TableHead>Combustible</TableHead>
                  <TableHead>Reportado</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Δ%</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => {
                  const diff = r.current_price ? ((r.price - r.current_price) / r.current_price * 100) : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.station?.name || "?"}</div>
                        <div className="text-xs text-muted-foreground">{r.station?.brand}</div>
                      </TableCell>
                      <TableCell>{r.fuel_type.replace("gasoline", "")}</TableCell>
                      <TableCell className="font-semibold">${r.price}</TableCell>
                      <TableCell>{r.current_price ? `$${r.current_price}` : "—"}</TableCell>
                      <TableCell>
                        {diff != null ? (
                          <Badge variant={Math.abs(diff) <= threshold ? "secondary" : "destructive"}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {r.photo_path ? (
                          <a href={supabase.storage.from("price-reports").getPublicUrl(r.photo_path).data.publicUrl}
                             target="_blank" rel="noreferrer" className="text-primary underline text-xs">ver</a>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("es-CL")}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button size="sm" variant="default" onClick={() => approve(r.id)}>Aprobar</Button>
                        <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>Rechazar</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* ---------------- Users ---------------- */

const UsersTab = () => {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (term = q) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_search_users", { _query: term });
    setLoading(false);
    if (error) return toast.error(error.message);
    setRows(data || []);
  };

  useEffect(() => { search(""); }, []);

  const toggleAdmin = async (u: any) => {
    const { error } = await supabase.rpc("admin_set_user_role", {
      _target: u.user_id, _role: "admin", _grant: !u.is_admin,
    });
    if (error) return toast.error(error.message);
    toast.success(u.is_admin ? "Admin revocado" : "Admin otorgado");
    search();
  };

  const suspend = async (u: any) => {
    if (u.is_suspended) {
      await supabase.from("user_suspensions").delete().eq("user_id", u.user_id);
      toast.success("Suspensión retirada");
    } else {
      const reason = prompt("Motivo de suspensión:") || "Sin motivo";
      const { error } = await supabase.from("user_suspensions").insert({
        user_id: u.user_id, reason,
      });
      if (error) return toast.error(error.message);
      toast.success("Usuario suspendido");
    }
    search();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={e => { e.preventDefault(); search(); }} className="flex gap-2">
          <Input placeholder="Buscar por email…" value={q} onChange={e => setQ(e.target.value)} />
          <Button type="submit"><Search className="h-4 w-4 mr-2" />Buscar</Button>
        </form>
        <div className="overflow-x-auto">
          {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Registrado</TableHead>
                  <TableHead>Último ingreso</TableHead>
                  <TableHead>Reportes</TableHead>
                  <TableHead>Fav.</TableHead>
                  <TableHead>Alertas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-xs">{new Date(u.created_at).toLocaleDateString("es-CL")}</TableCell>
                    <TableCell className="text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("es-CL") : "—"}</TableCell>
                    <TableCell>{u.reports}</TableCell>
                    <TableCell>{u.favorites}</TableCell>
                    <TableCell>{u.alerts}</TableCell>
                    <TableCell>
                      {u.is_admin && <Badge className="mr-1">Admin</Badge>}
                      {u.is_suspended && <Badge variant="destructive">Suspendido</Badge>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u)}>
                        {u.is_admin ? <><ShieldOff className="h-4 w-4 mr-1" />Quitar admin</> : <><ShieldCheck className="h-4 w-4 mr-1" />Hacer admin</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => suspend(u)}>
                        {u.is_suspended ? "Reactivar" : "Suspender"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* ---------------- Analytics ---------------- */

const AnalyticsTab = ({ dau, topStations, heatmap }: {
  dau: Array<{ day: string; users: number }>;
  topStations: Array<{ name: string; brand: string; views: number }>;
  heatmap: Array<{ lat: number; lng: number }>;
}) => {
  // Simple heatmap aggregation: bucket by 0.1° grid for the SVG
  const buckets = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; n: number }>();
    heatmap.forEach(p => {
      const k = `${p.lat.toFixed(1)}_${p.lng.toFixed(1)}`;
      const cur = m.get(k);
      if (cur) cur.n++;
      else m.set(k, { lat: Math.round(p.lat * 10) / 10, lng: Math.round(p.lng * 10) / 10, n: 1 });
    });
    return Array.from(m.values());
  }, [heatmap]);

  const maxBucket = Math.max(1, ...buckets.map(b => b.n));
  // Chile bounding box (approx)
  const latMin = -56, latMax = -17, lngMin = -76, lngMax = -66;
  const W = 320, H = 600;
  const proj = (lat: number, lng: number) => ({
    x: ((lng - lngMin) / (lngMax - lngMin)) * W,
    y: H - ((lat - latMin) / (latMax - latMin)) * H,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>Usuarios activos diarios (30d)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dau}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="day" tickFormatter={d => d?.slice(5)} fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="#7C3AED" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top 10 estaciones más vistas (30d)</CardTitle></CardHeader>
        <CardContent>
          {topStations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay registros de visitas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topStations} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" fontSize={11} />
                <YAxis dataKey="name" type="category" width={120} fontSize={11} />
                <Tooltip />
                <Bar dataKey="views" fill="#6366F1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Mapa de calor — ¿desde dónde buscan? ({heatmap.length} puntos)</CardTitle>
        </CardHeader>
        <CardContent>
          {buckets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos de geolocalización aún.</p>
          ) : (
            <div className="flex justify-center">
              <svg width={W} height={H} className="bg-muted/30 rounded-lg">
                <rect x={0} y={0} width={W} height={H} fill="hsl(var(--muted))" opacity={0.15} />
                {buckets.map((b, i) => {
                  const { x, y } = proj(b.lat, b.lng);
                  const intensity = b.n / maxBucket;
                  return (
                    <circle key={i} cx={x} cy={y} r={6 + intensity * 14}
                      fill="#7C3AED" opacity={0.25 + intensity * 0.55} />
                  );
                })}
              </svg>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
