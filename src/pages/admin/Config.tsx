import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Trash2, Wrench } from "lucide-react";

type Setting = { key: string; value: any };

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("admin_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}
async function setSetting(key: string, value: any) {
  return supabase.from("admin_settings").upsert({ key, value });
}

export default function AdminConfig() {
  const [syncHours, setSyncHours] = useState(6);
  const [autoApprove, setAutoApprove] = useState(8);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [alertThrottle, setAlertThrottle] = useState(3);
  const [proPrice, setProPrice] = useState(2990);
  const [freeAlerts, setFreeAlerts] = useState(3);
  const [freeVehicles, setFreeVehicles] = useState(1);
  const [maintenance, setMaintenance] = useState(false);
  const [digestDay, setDigestDay] = useState("monday");
  const [digestHour, setDigestHour] = useState(9);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => {
    setSyncHours(await getSetting("cne_sync_hours", 6));
    setAutoApprove(await getSetting("auto_approve_threshold_pct", 8));
    setPushEnabled(await getSetting("global_push_enabled", true));
    setAlertThrottle(await getSetting("alert_throttle_per_day", 3));
    setProPrice(await getSetting("pro_plan_price_clp", 2990));
    setFreeAlerts(await getSetting("free_plan_max_alerts", 3));
    setFreeVehicles(await getSetting("free_plan_max_vehicles", 1));
    setMaintenance(await getSetting("maintenance_mode", false));
    setDigestDay(await getSetting("weekly_digest_day", "monday"));
    setDigestHour(await getSetting("weekly_digest_hour", 9));
  })(); }, []);

  const saveAll = async () => {
    setSaving(true);
    const entries: [string, any][] = [
      ["cne_sync_hours", syncHours],
      ["auto_approve_threshold_pct", autoApprove],
      ["global_push_enabled", pushEnabled],
      ["alert_throttle_per_day", alertThrottle],
      ["pro_plan_price_clp", proPrice],
      ["free_plan_max_alerts", freeAlerts],
      ["free_plan_max_vehicles", freeVehicles],
      ["maintenance_mode", maintenance],
      ["weekly_digest_day", digestDay],
      ["weekly_digest_hour", digestHour],
    ];
    for (const [k, v] of entries) await setSetting(k, v);
    setSaving(false);
    toast.success("Configuración guardada");
  };

  const purgeHistory = async () => {
    if (!confirm("¿Borrar historial de precios >90 días? Esto es irreversible.")) return;
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const { error } = await supabase.from("fuel_price_history").delete().lt("snapshot_date", cutoff);
    if (error) return toast.error(error.message);
    toast.success("Historial purgado");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Sincronización</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Frecuencia de sync CNE</Label>
            <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-background" value={syncHours} onChange={e => setSyncHours(Number(e.target.value))}>
              <option value={4}>Cada 4 horas</option>
              <option value={6}>Cada 6 horas</option>
              <option value={12}>Cada 12 horas</option>
              <option value={24}>Cada 24 horas</option>
            </select>
          </div>
          <div>
            <Label className="text-sm">Umbral auto-aprobación de reportes: ±{autoApprove}%</Label>
            <Slider value={[autoApprove]} onValueChange={v => setAutoApprove(v[0])} min={0} max={20} step={1} className="mt-2" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notificaciones</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Push global habilitado</Label>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
          </div>
          <div>
            <Label className="text-sm">Máximo alertas por usuario/día</Label>
            <Input type="number" min={1} max={20} value={alertThrottle} onChange={e => setAlertThrottle(Number(e.target.value))} className="mt-1 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Día digest semanal</Label>
              <select className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-background" value={digestDay} onChange={e => setDigestDay(e.target.value)}>
                {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm">Hora (0-23)</Label>
              <Input type="number" min={0} max={23} value={digestHour} onChange={e => setDigestHour(Number(e.target.value))} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Planes</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label className="text-sm">Precio Pro (CLP)</Label><Input type="number" value={proPrice} onChange={e => setProPrice(Number(e.target.value))} className="mt-1" /></div>
          <div><Label className="text-sm">Alertas plan Free</Label><Input type="number" value={freeAlerts} onChange={e => setFreeAlerts(Number(e.target.value))} className="mt-1" /></div>
          <div><Label className="text-sm">Vehículos plan Free</Label><Input type="number" value={freeVehicles} onChange={e => setFreeVehicles(Number(e.target.value))} className="mt-1" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" />Mantenimiento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Modo mantenimiento</Label>
              <p className="text-xs text-muted-foreground">Muestra pantalla de mantenimiento a usuarios.</p>
            </div>
            <Switch checked={maintenance} onCheckedChange={setMaintenance} />
          </div>
          <Button variant="destructive" onClick={purgeHistory}><Trash2 className="h-4 w-4 mr-2" />Purgar historial &gt; 90 días</Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={saveAll} disabled={saving} className="shadow-lg">
          <Save className="h-4 w-4 mr-2" />{saving ? "Guardando…" : "Guardar todo"}
        </Button>
      </div>
    </div>
  );
}
