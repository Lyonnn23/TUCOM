import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function AdminReports() {
  const [rows, setRows] = useState<any[]>([]);
  const [threshold, setThreshold] = useState<number>(8);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("pending");
  const [stats, setStats] = useState({ pending: 0, approvedToday: 0, rejectedToday: 0 });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("reported_prices")
      .select("id, station_id, fuel_type, price, user_id, photo_path, created_at, status")
      .eq("status", status as any).order("created_at", { ascending: false }).limit(100);
    if (data?.length) {
      const ids = [...new Set(data.map(r => r.station_id))];
      const { data: st } = await supabase.from("gas_stations").select("id, name, brand").in("id", ids);
      const map = Object.fromEntries((st || []).map(s => [s.id, s]));
      const { data: sp } = await supabase.from("station_prices").select("station_id, fuel_type, price").in("station_id", ids);
      const priceMap: Record<string, number> = {};
      (sp || []).forEach((p: any) => { priceMap[`${p.station_id}:${p.fuel_type}`] = p.price; });
      setRows(data.map(r => ({ ...r, station: map[r.station_id], current_price: priceMap[`${r.station_id}:${r.fuel_type}`] })));
    } else setRows([]);
    const { data: settings } = await supabase.from("admin_settings").select("value").eq("key", "auto_approve_threshold_pct").maybeSingle();
    if (settings?.value != null) setThreshold(Number(settings.value));

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [pend, app, rej] = await Promise.all([
      supabase.from("reported_prices").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("reported_prices").select("*", { count: "exact", head: true }).eq("status", "verified").gte("verified_at", today.toISOString()),
      supabase.from("reported_prices").select("*", { count: "exact", head: true }).eq("status", "rejected").gte("created_at", today.toISOString()),
    ]);
    setStats({ pending: pend.count ?? 0, approvedToday: app.count ?? 0, rejectedToday: rej.count ?? 0 });
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const saveThreshold = async () => {
    const { error } = await supabase.from("admin_settings").upsert({ key: "auto_approve_threshold_pct", value: threshold as any });
    if (error) return toast.error(error.message);
    toast.success("Umbral guardado");
  };
  const approve = async (id: string) => {
    const { error } = await supabase.rpc("admin_verify_report", { _report_id: id });
    if (error) return toast.error(error.message);
    toast.success("Aprobado"); setRows(prev => prev.filter(r => r.id !== id));
  };
  const reject = async (id: string) => {
    const { error } = await supabase.rpc("admin_reject_report", { _report_id: id });
    if (error) return toast.error(error.message);
    toast.success("Rechazado"); setRows(prev => prev.filter(r => r.id !== id));
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
    toast.success(`Auto-aprobados ${n}`); load();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Pendientes</div><div className="text-2xl font-bold">{stats.pending}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Aprobados hoy</div><div className="text-2xl font-bold text-green-600">{stats.approvedToday}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Rechazados hoy</div><div className="text-2xl font-bold text-destructive">{stats.rejectedToday}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Umbral auto</div><div className="text-2xl font-bold">±{threshold}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moderación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-muted/40">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Estado</label>
              <select className="border rounded-md px-2 py-1.5 text-sm bg-background" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="pending">Pendientes</option>
                <option value="verified">Aprobados</option>
                <option value="rejected">Rechazados</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Umbral auto-aprobación (±%)</label>
              <Input type="number" min={0} max={50} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-24" />
            </div>
            <Button onClick={saveThreshold} variant="secondary">Guardar umbral</Button>
            {status === "pending" && <Button onClick={autoApprove}>Auto-aprobar elegibles</Button>}
          </div>

          <div className="overflow-x-auto">
            {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> :
             rows.length === 0 ? <p className="text-sm text-muted-foreground">Sin reportes.</p> : (
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
                          {status === "pending" && <>
                            <Button size="sm" variant="default" onClick={() => approve(r.id)}>Aprobar</Button>
                            <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>Rechazar</Button>
                          </>}
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
    </div>
  );
}
