import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Trash2, Pencil, Check, X } from "lucide-react";

type Station = {
  id: string; name: string; brand: string; address: string; is_open: boolean; updated_at: string;
  reports_count?: number;
};

export default function AdminStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ stationId: string; fuel: string } | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [prices, setPrices] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data: st } = await supabase.from("gas_stations")
      .select("id, name, brand, address, is_open, updated_at")
      .order("updated_at", { ascending: false }).limit(500);
    const { data: rp } = await supabase.from("reported_prices").select("station_id").limit(5000);
    const counts: Record<string, number> = {};
    (rp || []).forEach((r: any) => { counts[r.station_id] = (counts[r.station_id] || 0) + 1; });
    setStations((st || []).map(s => ({ ...s, reports_count: counts[s.id] || 0 })));
    if (st?.length) {
      const ids = st.map(s => s.id);
      const { data: sp } = await supabase.from("station_prices")
        .select("station_id, fuel_type, price").in("station_id", ids);
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

  const brands = useMemo(() => Array.from(new Set(stations.map(s => s.brand))).sort(), [stations]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return stations.filter(s => {
      if (brandFilter !== "all" && s.brand !== brandFilter) return false;
      if (statusFilter === "open" && !s.is_open) return false;
      if (statusFilter === "closed" && s.is_open) return false;
      if (needle && !s.name.toLowerCase().includes(needle) && !s.brand.toLowerCase().includes(needle) && !s.address.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [stations, q, brandFilter, statusFilter]);

  const ageBadge = (updated: string) => {
    const days = (Date.now() - new Date(updated).getTime()) / 86400000;
    if (days > 30) return <Badge variant="destructive" className="text-[10px]">+30d</Badge>;
    if (days > 7) return <Badge className="text-[10px] bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">+7d</Badge>;
    return <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-700 dark:text-green-300">Reciente</Badge>;
  };

  const savePrice = async () => {
    if (!editing) return;
    const price = parseInt(editPrice, 10);
    if (!Number.isFinite(price) || price < 100 || price > 5000) { toast.error("Precio inválido"); return; }
    const { error } = await supabase.from("station_prices").upsert(
      { station_id: editing.stationId, fuel_type: editing.fuel, price } as any,
      { onConflict: "station_id,fuel_type" } as any
    );
    if (error) { toast.error(error.message); return; }
    setPrices(prev => ({ ...prev, [editing.stationId]: { ...(prev[editing.stationId] || {}), [editing.fuel]: price } }));
    setEditing(null);
    toast.success("Precio actualizado");
  };

  const toggleClosed = async (s: Station) => {
    const { error } = await supabase.from("gas_stations").update({ is_open: !s.is_open }).eq("id", s.id);
    if (error) return toast.error(error.message);
    setStations(prev => prev.map(x => x.id === s.id ? { ...x, is_open: !s.is_open } : x));
  };

  const removeStation = async (s: Station) => {
    if (!confirm(`¿Eliminar "${s.name}"?`)) return;
    const { error } = await supabase.from("gas_stations").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    setStations(prev => prev.filter(x => x.id !== s.id));
  };

  const handleCsvImport = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return toast.error("CSV vacío");
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const idx = (k: string) => headers.indexOf(k);
    const required = ["name", "brand", "address", "lat", "lng"];
    if (required.some(r => idx(r) === -1)) return toast.error(`Faltan: ${required.join(", ")}`);
    let ok = 0, errors = 0;
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
      ok++;
      for (const fuel of ["gasoline93", "gasoline95", "gasoline97", "diesel"]) {
        const v = row[fuel] || row[fuel.replace("gasoline", "")];
        const price = v ? parseInt(v, 10) : NaN;
        if (Number.isFinite(price) && price >= 100 && price <= 5000) {
          await supabase.from("station_prices").insert({ station_id: st.id, fuel_type: fuel, price });
        }
      }
    }
    toast.success(`${ok} importadas, ${errors} errores`);
    load();
  };

  const fuels = ["gasoline93", "gasoline95", "gasoline97", "diesel"];

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center gap-3">
        <CardTitle className="flex-1">Gestión de estaciones ({filtered.length})</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)} className="md:w-64" />
          <select className="border rounded-md px-2 py-1 text-sm bg-background" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
            <option value="all">Todas las marcas</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="border rounded-md px-2 py-1 text-sm bg-background" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="open">Abiertas</option>
            <option value="closed">Cerradas</option>
          </select>
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
                <TableHead>Actualizada</TableHead>
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
                            <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="w-20 h-8" autoFocus
                              onKeyDown={e => { if (e.key === "Enter") savePrice(); if (e.key === "Escape") setEditing(null); }} />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={savePrice}><Check className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        ) : (
                          <button className="hover:underline text-sm" onClick={() => { setEditing({ stationId: s.id, fuel: f }); setEditPrice(String(v || "")); }}>
                            {v ? `$${v}` : <Pencil className="h-3.5 w-3.5 inline opacity-50" />}
                          </button>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell>{ageBadge(s.updated_at)}</TableCell>
                  <TableCell>{s.is_open ? <Badge variant="secondary">Abierta</Badge> : <Badge variant="destructive">Cerrada</Badge>}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => toggleClosed(s)}>{s.is_open ? "Cerrar" : "Abrir"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => removeStation(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
}
