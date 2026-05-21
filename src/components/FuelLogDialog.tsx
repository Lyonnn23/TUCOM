import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useFuelLogs, type FuelLog, type FuelTypeKey } from "@/hooks/useFuelLogs";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { useGasStations, calculateDistance, type GasStation } from "@/hooks/useGasStations";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log?: FuelLog | null;
}

const FUELS: { value: FuelTypeKey; label: string }[] = [
  { value: "gasoline93", label: "Bencina 93" },
  { value: "gasoline95", label: "Bencina 95" },
  { value: "gasoline97", label: "Bencina 97" },
  { value: "diesel", label: "Diésel" },
  { value: "electric", label: "Eléctrico" },
];

const schema = z.object({
  liters: z.number().min(0.1, "Mínimo 0,1 L").max(500, "Máximo 500 L"),
  price_per_liter: z.number().min(100, "Mínimo $100").max(10000, "Máximo $10.000"),
  total_cost: z.number().min(100, "Mínimo $100").max(5_000_000, "Máximo $5.000.000"),
  odometer_km: z.number().int().min(0).max(2_000_000).nullable(),
});

const FuelLogDialog = ({ open, onOpenChange, log }: Props) => {
  const { create, update } = useFuelLogs();
  const { vehicles, primary } = useUserVehicles();
  const { data: stations } = useGasStations();

  const [vehicleId, setVehicleId] = useState<string>("none");
  const [stationId, setStationId] = useState<string>("none");
  const [fuelType, setFuelType] = useState<FuelTypeKey>("gasoline95");
  const [mode, setMode] = useState<"liters" | "amount">("amount");
  const [liters, setLiters] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [pricePerLiter, setPricePerLiter] = useState<string>("");
  const [odometer, setOdometer] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (log) {
      setVehicleId(log.vehicle_id ?? "none");
      setStationId(log.station_id ?? "none");
      setFuelType(log.fuel_type);
      setLiters(String(log.liters));
      setPricePerLiter(String(log.price_per_liter));
      setAmount(String(log.total_cost));
      setOdometer(log.odometer_km != null ? String(log.odometer_km) : "");
      setNote(log.note ?? "");
      setMode("liters");
    } else {
      setVehicleId(primary?.id ?? "none");
      setFuelType((primary?.fuel_type as FuelTypeKey) ?? "gasoline95");
      setStationId("none");
      setLiters("");
      setAmount("");
      setPricePerLiter("");
      setOdometer("");
      setNote("");
      setMode("amount");
    }
  }, [open, log, primary]);

  // Geo para sugerir estación más cercana
  useEffect(() => {
    if (!open || log || stationId !== "none") return;
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300_000 },
    );
  }, [open, log, stationId]);

  const sortedStations: GasStation[] = useMemo(() => {
    if (!stations) return [];
    const list = [...stations];
    if (userLoc) {
      list.forEach((s) => {
        s.distance = calculateDistance(userLoc.lat, userLoc.lng, s.lat, s.lng);
      });
      list.sort((a, b) => (a.distance ?? 9e9) - (b.distance ?? 9e9));
    }
    return list.slice(0, 200);
  }, [stations, userLoc]);

  // Auto-seleccionar la más cercana al abrir
  useEffect(() => {
    if (open && !log && stationId === "none" && sortedStations[0]?.distance != null) {
      setStationId(sortedStations[0].id);
    }
  }, [sortedStations, open, log, stationId]);

  const currentStation = useMemo(
    () => sortedStations.find((s) => s.id === stationId) ?? null,
    [sortedStations, stationId],
  );

  // Sugerir precio por litro desde la estación
  useEffect(() => {
    if (!currentStation || pricePerLiter) return;
    const p = currentStation.prices?.[fuelType];
    if (p) setPricePerLiter(String(p));
  }, [currentStation, fuelType, pricePerLiter]);

  // Auto-cálculo entre litros, monto y precio/L
  const numLiters = parseFloat(liters.replace(",", ".")) || 0;
  const numAmount = parseInt(amount.replace(/\D/g, "") || "0", 10);
  const numPpl = parseInt(pricePerLiter || "0", 10);

  useEffect(() => {
    if (mode === "amount" && numAmount > 0 && numPpl > 0) {
      setLiters((numAmount / numPpl).toFixed(2));
    } else if (mode === "liters" && numLiters > 0 && numPpl > 0) {
      setAmount(String(Math.round(numLiters * numPpl)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numAmount, numLiters, numPpl, mode]);

  const onSubmit = async () => {
    const litersN = parseFloat(liters.replace(",", ".")) || 0;
    const pplN = parseInt(pricePerLiter || "0", 10);
    const totalN = parseInt(amount || "0", 10);
    const odoN = odometer ? parseInt(odometer, 10) : null;

    const parsed = schema.safeParse({
      liters: litersN,
      price_per_liter: pplN,
      total_cost: totalN,
      odometer_km: odoN,
    });
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast.error(first ?? "Revisa los datos ingresados");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        vehicle_id: vehicleId === "none" ? null : vehicleId,
        station_id: stationId === "none" ? null : stationId,
        fuel_type: fuelType,
        liters: parsed.data.liters,
        price_per_liter: parsed.data.price_per_liter,
        total_cost: parsed.data.total_cost,
        odometer_km: parsed.data.odometer_km,
        note: note.trim() || null,
        logged_at: log?.logged_at ?? new Date().toISOString(),
      };
      if (log) {
        await update.mutateAsync({ id: log.id, patch: payload });
        toast.success("Carga actualizada");
      } else {
        await create.mutateAsync(payload);
        toast.success("Carga registrada");
      }
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar la carga");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{log ? "Editar carga" : "Registrar carga"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {vehicles.length > 0 && (
            <div className="space-y-1.5">
              <Label>Vehículo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="Sin vehículo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vehículo</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nickname || `${v.brand} ${v.model}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Estación</Label>
            <Select value={stationId} onValueChange={setStationId}>
              <SelectTrigger><SelectValue placeholder="Selecciona estación" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin estación</SelectItem>
                {sortedStations.slice(0, 50).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.brand} · {s.name}
                    {s.distance != null ? ` (${s.distance.toFixed(1)} km)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Combustible</Label>
            <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelTypeKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUELS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "liters" | "amount")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="amount">Por monto</TabsTrigger>
              <TabsTrigger value="liters">Por litros</TabsTrigger>
            </TabsList>
            <TabsContent value="amount" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="amt">Monto pagado (CLP)</Label>
                <Input
                  id="amt"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="30000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ppl1">Precio por litro (CLP)</Label>
                <Input
                  id="ppl1"
                  inputMode="numeric"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value.replace(/\D/g, ""))}
                  placeholder="1250"
                />
              </div>
              {numLiters > 0 && (
                <p className="text-xs text-muted-foreground">
                  Litros estimados: <strong>{numLiters.toFixed(2)} L</strong>
                </p>
              )}
            </TabsContent>
            <TabsContent value="liters" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="lit">Litros cargados</Label>
                <Input
                  id="lit"
                  inputMode="decimal"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value.replace(/[^0-9.,]/g, ""))}
                  placeholder="25"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ppl2">Precio por litro (CLP)</Label>
                <Input
                  id="ppl2"
                  inputMode="numeric"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value.replace(/\D/g, ""))}
                  placeholder="1250"
                />
              </div>
              {numAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total estimado: <strong>{formatPrice(numAmount)}</strong>
                </p>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-1.5">
            <Label htmlFor="odo">Odómetro (km)</Label>
            <Input
              id="odo"
              inputMode="numeric"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
            <p className="text-xs text-muted-foreground">
              Opcional, pero necesario para calcular tu consumo real.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Nota</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 140))}
              placeholder="p. ej. viaje a Viña"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="bg-gradient-primary text-primary-foreground"
          >
            {submitting ? "Guardando..." : log ? "Guardar cambios" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FuelLogDialog;
