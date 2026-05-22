import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Wrench, Shield, CreditCard, Droplets, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useVehicleDocuments, type VehicleDocType } from "@/hooks/useVehicleDocuments";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

function DatePick({
  date, onSelect, placeholder = "Seleccionar fecha",
}: { date: Date | undefined; onSelect: (d: Date | undefined) => void; placeholder?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "d 'de' MMMM yyyy", { locale: es }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

const fromIso = (s?: string | null) => (s ? new Date(s + "T00:00:00") : undefined);
const toIso = (d?: Date) => (d ? d.toISOString().slice(0, 10) : null);

export default function VehicleDocumentsCard({ vehicleId }: { vehicleId: string }) {
  const { byType, upsert } = useVehicleDocuments(vehicleId);

  const revision = byType("revision_tecnica");
  const soap = byType("soap");
  const permiso = byType("permiso_circulacion");
  const aceite = byType("cambio_aceite");

  const [revDate, setRevDate] = useState<Date | undefined>(fromIso(revision?.due_date));
  const [soapDate, setSoapDate] = useState<Date | undefined>(fromIso(soap?.due_date));
  const [permPaid, setPermPaid] = useState<boolean>(!!permiso?.reminder_active);
  const [oilDate, setOilDate] = useState<Date | undefined>(fromIso(aceite?.last_done_date));
  const [oilKm, setOilKm] = useState<string>(aceite?.last_done_km?.toString() ?? "");

  const nextOilEstimate = useMemo(() => {
    if (!oilDate) return null;
    const next = new Date(oilDate); next.setMonth(next.getMonth() + 6);
    const km = oilKm ? `${(parseInt(oilKm, 10) + 5000).toLocaleString("es-CL")} km` : "+5.000 km";
    return `${format(next, "d MMM yyyy", { locale: es })} · o ${km}`;
  }, [oilDate, oilKm]);

  const saveOne = async (doc_type: VehicleDocType, patch: any) => {
    try {
      await upsert.mutateAsync({ doc_type, ...patch });
      haptic("double");
      toast.success("Guardado");
    } catch (e: any) {
      toast.error(e.message ?? "Error al guardar");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documentos y vencimientos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Revisión técnica */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" />Revisión técnica</Label>
          <div className="flex gap-2">
            <DatePick date={revDate} onSelect={setRevDate} placeholder="Próximo vencimiento" />
            <Button size="icon" onClick={() => saveOne("revision_tecnica", { due_date: toIso(revDate) })} aria-label="Guardar revisión">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SOAP */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" />SOAP (seguro)</Label>
          <div className="flex gap-2">
            <DatePick date={soapDate} onSelect={setSoapDate} placeholder="Vencimiento del seguro" />
            <Button size="icon" onClick={() => saveOne("soap", { due_date: toIso(soapDate) })} aria-label="Guardar SOAP">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Permiso */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Permiso de circulación</Label>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Checkbox
              id="perm-paid"
              checked={permPaid}
              onCheckedChange={(c) => {
                const v = !!c; setPermPaid(v);
                saveOne("permiso_circulacion", { reminder_active: true, last_done_date: v ? toIso(new Date()) : null });
              }}
            />
            <label htmlFor="perm-paid" className="text-sm cursor-pointer flex-1">
              Ya pagué este año. Recuérdame en marzo del próximo año.
            </label>
          </div>
        </div>

        {/* Aceite */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Droplets className="h-4 w-4 text-primary" />Último cambio de aceite</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <DatePick date={oilDate} onSelect={setOilDate} placeholder="Fecha último cambio" />
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Km odómetro"
              value={oilKm}
              onChange={(e) => setOilKm(e.target.value)}
            />
          </div>
          {nextOilEstimate && (
            <p className="text-xs text-muted-foreground">Próximo estimado: <strong>{nextOilEstimate}</strong></p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => saveOne("cambio_aceite", {
              last_done_date: toIso(oilDate),
              last_done_km: oilKm ? parseInt(oilKm, 10) : null,
            })}
          >
            <Save className="h-4 w-4 mr-2" />Guardar cambio de aceite
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
