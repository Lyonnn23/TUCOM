import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { VEHICLE_PRESETS, VEHICLE_COLORS } from "@/lib/vehiclePresets";
import { EV_PRESETS } from "@/lib/evPresets";
import { useUserVehicles, type UserVehicle } from "@/hooks/useUserVehicles";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: UserVehicle | null;
}

const FUELS = [
  { value: "gasoline93", label: "Gasolina 93" },
  { value: "gasoline95", label: "Gasolina 95" },
  { value: "gasoline97", label: "Gasolina 97" },
  { value: "diesel", label: "Diésel" },
  { value: "electric", label: "Eléctrico" },
] as const;

const VehicleDialog = ({ open, onOpenChange, vehicle }: Props) => {
  const { create, update } = useUserVehicles();
  const [presetIdx, setPresetIdx] = useState<string>("custom");
  const [nickname, setNickname] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [fuelType, setFuelType] = useState<UserVehicle["fuel_type"]>("gasoline95");
  const [tank, setTank] = useState<string>("50");
  const [cons, setCons] = useState<string>("12");
  const [color, setColor] = useState(VEHICLE_COLORS[0]);

  useEffect(() => {
    if (!open) return;
    if (vehicle) {
      setNickname(vehicle.nickname ?? "");
      setBrand(vehicle.brand);
      setModel(vehicle.model);
      setYear(vehicle.year?.toString() ?? "");
      setFuelType(vehicle.fuel_type);
      setTank(String(vehicle.tank_size_l));
      setCons(String(vehicle.consumption_kml));
      setColor(vehicle.color);
      setPresetIdx("custom");
    } else {
      setNickname(""); setBrand(""); setModel(""); setYear("");
      setFuelType("gasoline95"); setTank("50"); setCons("12");
      setColor(VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)]);
      setPresetIdx("custom");
    }
  }, [open, vehicle]);

  const applyPreset = (key: string) => {
    setPresetIdx(key);
    if (key === "custom") return;
    if (key.startsWith("ev-")) {
      const p = EV_PRESETS[Number(key.slice(3))];
      if (!p) return;
      setBrand(p.brand); setModel(p.model);
      setFuelType("electric");
      setTank(String(p.battery_kwh));
      setCons(String(p.efficiency_kmkwh));
      return;
    }
    const p = VEHICLE_PRESETS[Number(key)];
    if (!p) return;
    setBrand(p.brand); setModel(p.model);
    setFuelType(p.fuel_type);
    setTank(String(p.tank_size_l));
    setCons(String(p.consumption_kml));
  };

  const handleSave = async () => {
    if (!brand.trim() || !model.trim()) {
      toast.error("Marca y modelo son obligatorios");
      return;
    }
    const tankNum = Number(tank);
    const consNum = Number(cons);
    const isEv = fuelType === "electric";
    if (!Number.isFinite(tankNum) || tankNum < (isEv ? 10 : 20) || tankNum > (isEv ? 200 : 200)) {
      toast.error(isEv ? "Batería: 10 a 200 kWh" : "Capacidad del estanque: 20 a 200 L");
      return;
    }
    if (!Number.isFinite(consNum) || consNum < (isEv ? 2 : 2) || consNum > (isEv ? 15 : 40)) {
      toast.error(isEv ? "Eficiencia: 2 a 15 km/kWh" : "Rendimiento: 2 a 40 km/L");
      return;
    }
    const payload = {
      nickname: nickname.trim() || null,
      brand: brand.trim(),
      model: model.trim(),
      year: year ? Number(year) : null,
      fuel_type: fuelType,
      tank_size_l: Math.round(tankNum),
      consumption_kml: Math.round(consNum * 10) / 10,
      color,
    };
    try {
      if (vehicle) {
        await update.mutateAsync({ id: vehicle.id, patch: payload });
        toast.success("Vehículo actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Vehículo agregado");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Error al guardar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Editar vehículo" : "Agregar vehículo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {!vehicle && (
            <div>
              <Label className="text-xs">Usar preset</Label>
              <Select value={presetIdx} onValueChange={applyPreset}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Elige un modelo popular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizado</SelectItem>
                  {VEHICLE_PRESETS.map((p, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {p.brand} {p.model} · {p.consumption_kml} km/L
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">Apodo (opcional)</Label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 30))}
              placeholder='p. ej. "Mi auto"'
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Marca</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Modelo</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Año</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2020"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Combustible</Label>
              <Select value={fuelType} onValueChange={(v) => setFuelType(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUELS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Estanque (L)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={tank}
                onChange={(e) => setTank(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Rendimiento (km/L)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={cons}
                onChange={(e) => setCons(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {VEHICLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
                  style={{ backgroundColor: c, borderColor: color === c ? c : "transparent" }}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
            {vehicle ? "Guardar cambios" : "Agregar vehículo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDialog;
