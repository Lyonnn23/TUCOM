import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import { PAYMENT_METHODS, type StationDiscount } from "@/lib/discounts";

const BRANDS = ["COPEC", "SHELL", "ENEX", "PETROBRAS", "ARAMCO", "ALL"];

const empty = {
  brand: "COPEC",
  payment_method: PAYMENT_METHODS[0].key,
  discount_clp: 100,
  fuel_types: ["95", "93", "97", "diesel"],
  day_of_week: [] as string[],
  max_liters: null as number | null,
  valid_from: new Date().toISOString().slice(0, 10),
  valid_to: null as string | null,
  description: "",
  is_active: true,
};

const AdminDiscounts = () => {
  const [rows, setRows] = useState<StationDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("station_discounts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error("No se pudieron cargar descuentos");
    setRows((data ?? []) as StationDiscount[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const expiringSoon = useMemo(() => {
    const now = Date.now();
    return rows.filter((r) => r.valid_to && new Date(r.valid_to).getTime() - now < 7 * 86400000).length;
  }, [rows]);

  const toggleActive = async (id: string, value: boolean) => {
    const { error } = await (supabase as any).from("station_discounts").update({ is_active: value }).eq("id", id);
    if (error) toast.error("Error"); else { toast.success(value ? "Activado" : "Desactivado"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este descuento?")) return;
    const { error } = await (supabase as any).from("station_discounts").delete().eq("id", id);
    if (error) toast.error("Error"); else { toast.success("Eliminado"); load(); }
  };

  const deactivateExpired = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await (supabase as any)
      .from("station_discounts")
      .update({ is_active: false })
      .lt("valid_to", today);
    if (error) toast.error("Error"); else { toast.success("Expirados desactivados"); load(); }
  };

  const create = async () => {
    const { error } = await (supabase as any).from("station_discounts").insert(form);
    if (error) toast.error(error.message);
    else {
      toast.success("Descuento creado");
      setForm(empty);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total descuentos</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Activos</div>
          <div className="text-2xl font-bold text-fuel-green">{rows.filter((r) => r.is_active).length}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Expiran en 7 días
          </div>
          <div className="text-2xl font-bold text-amber-500">{expiringSoon}</div>
        </div>
      </div>

      {/* Quick add */}
      <section className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo descuento</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Marca</Label>
            <select className="w-full h-9 border rounded-md px-2 bg-background" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
              {BRANDS.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Método de pago</Label>
            <select className="w-full h-9 border rounded-md px-2 bg-background" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              {PAYMENT_METHODS.map((m) => <option key={m.key}>{m.key}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Descuento (CLP/L)</Label>
            <Input type="number" value={form.discount_clp} onChange={(e) => setForm({ ...form, discount_clp: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Día (opcional, ej: viernes)</Label>
            <Input value={form.day_of_week.join(",")} onChange={(e) => setForm({ ...form, day_of_week: e.target.value ? e.target.value.split(",").map((s) => s.trim().toLowerCase()) : [] })} placeholder="viernes" />
          </div>
          <div>
            <Label className="text-xs">Válido desde</Label>
            <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Válido hasta (opcional)</Label>
            <Input type="date" value={form.valid_to ?? ""} onChange={(e) => setForm({ ...form, valid_to: e.target.value || null })} />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Descripción</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <Button onClick={create}>Crear descuento</Button>
      </section>

      {/* Table */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Todos los descuentos</h2>
          <Button variant="outline" size="sm" onClick={deactivateExpired}>
            Desactivar expirados
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="text-left p-2">Marca</th>
                <th className="text-left p-2">Método</th>
                <th className="text-right p-2">$/L</th>
                <th className="text-left p-2">Días</th>
                <th className="text-left p-2">Vigencia</th>
                <th className="text-center p-2">Activo</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Cargando…</td></tr>
              ) : rows.map((r) => {
                const expiringSoon = r.valid_to && new Date(r.valid_to).getTime() - Date.now() < 7 * 86400000;
                return (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 font-semibold">{r.brand}</td>
                    <td className="p-2">{r.payment_method}</td>
                    <td className="p-2 text-right font-bold text-fuel-green">${r.discount_clp}</td>
                    <td className="p-2 text-xs">{r.day_of_week?.join(", ") || "Todos"}</td>
                    <td className={`p-2 text-xs ${expiringSoon ? "text-amber-500 font-bold" : ""}`}>
                      {r.valid_from} → {r.valid_to ?? "∞"}
                    </td>
                    <td className="p-2 text-center">
                      <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive(r.id, v)} />
                    </td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminDiscounts;
