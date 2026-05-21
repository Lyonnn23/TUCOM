import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldOff } from "lucide-react";

export default function AdminUsers() {
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
  useEffect(() => { search(""); /* eslint-disable-next-line */ }, []);

  const toggleAdmin = async (u: any) => {
    if (!confirm(u.is_admin ? "¿Revocar admin?" : "¿Otorgar admin?")) return;
    const { error } = await supabase.rpc("admin_set_user_role", { _target: u.user_id, _role: "admin" as any, _grant: !u.is_admin });
    if (error) return toast.error(error.message);
    toast.success("Rol actualizado"); search();
  };
  const suspend = async (u: any) => {
    if (u.is_suspended) {
      await supabase.from("user_suspensions").delete().eq("user_id", u.user_id);
      toast.success("Suspensión retirada");
    } else {
      const reason = prompt("Motivo:") || "Sin motivo";
      const { error } = await supabase.from("user_suspensions").insert({ user_id: u.user_id, reason });
      if (error) return toast.error(error.message);
      toast.success("Suspendido");
    }
    search();
  };
  const exportUserData = async (u: any) => {
    const [{ data: rep }, { data: fav }, { data: alerts }, { data: veh }, { data: fl }] = await Promise.all([
      supabase.from("reported_prices").select("*").eq("user_id", u.user_id),
      supabase.from("favorites").select("*").eq("user_id", u.user_id),
      supabase.from("price_alerts").select("*").eq("user_id", u.user_id),
      supabase.from("user_vehicles").select("*").eq("user_id", u.user_id),
      supabase.from("fuel_logs").select("*").eq("user_id", u.user_id),
    ]);
    const payload = { user: { id: u.user_id, email: u.email }, reports: rep, favorites: fav, alerts, vehicles: veh, fuel_logs: fl, exported_at: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `user-${u.user_id}.json`; a.click();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Usuarios</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={e => { e.preventDefault(); search(); }} className="flex gap-2">
          <Input placeholder="Buscar por email…" value={q} onChange={e => setQ(e.target.value)} />
          <Button type="submit"><Search className="h-4 w-4 mr-2" />Buscar</Button>
        </form>
        <div className="overflow-x-auto">
          {loading ? <p className="text-sm text-muted-foreground">Cargando…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Email</TableHead><TableHead>Registrado</TableHead><TableHead>Último ingreso</TableHead>
                <TableHead>Rep.</TableHead><TableHead>Fav.</TableHead><TableHead>Alertas</TableHead>
                <TableHead>Estado</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell className="text-xs">{new Date(u.created_at).toLocaleDateString("es-CL")}</TableCell>
                    <TableCell className="text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("es-CL") : "—"}</TableCell>
                    <TableCell>{u.reports}</TableCell><TableCell>{u.favorites}</TableCell><TableCell>{u.alerts}</TableCell>
                    <TableCell>
                      {u.is_admin && <Badge className="mr-1">Admin</Badge>}
                      {u.is_suspended && <Badge variant="destructive">Suspendido</Badge>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => toggleAdmin(u)}>
                        {u.is_admin ? <><ShieldOff className="h-4 w-4 mr-1" />Quitar admin</> : <><ShieldCheck className="h-4 w-4 mr-1" />Hacer admin</>}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => suspend(u)}>{u.is_suspended ? "Reactivar" : "Suspender"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => exportUserData(u)}>Exportar</Button>
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
}
