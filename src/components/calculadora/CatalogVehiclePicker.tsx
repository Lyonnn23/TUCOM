import { useEffect } from "react";
import {
  useCatalogBrands, useCatalogModels, useCatalogYears, useCatalogVersions,
  type CatalogVehicle,
} from "@/hooks/useVehiclesCatalog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { bodyEmoji, formatFuelType } from "@/lib/tripCalc";

interface Props {
  brand: string | null;
  model: string | null;
  year: number | null;
  versionId: string | null;
  onChange: (next: { brand: string | null; model: string | null; year: number | null; versionId: string | null; vehicle: CatalogVehicle | null }) => void;
}

const CatalogVehiclePicker = ({ brand, model, year, versionId, onChange }: Props) => {
  const brands = useCatalogBrands();
  const models = useCatalogModels(brand);
  const years = useCatalogYears(brand, model);
  const versions = useCatalogVersions(brand, model, year);

  // Auto-pick single version
  useEffect(() => {
    if (!versionId && versions.data && versions.data.length === 1) {
      const v = versions.data[0];
      onChange({ brand, model, year, versionId: v.id, vehicle: v });
    }
  }, [versions.data, versionId, brand, model, year, onChange]);

  const selectedVehicle = versions.data?.find((v) => v.id === versionId) ?? null;

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Marca</Label>
        {brands.isLoading ? (
          <Skeleton className="h-11 mt-1 rounded-xl" />
        ) : (
          <Select
            value={brand ?? ""}
            onValueChange={(v) => onChange({ brand: v, model: null, year: null, versionId: null, vehicle: null })}
          >
            <SelectTrigger className="h-11 mt-1 rounded-xl"><SelectValue placeholder="Elige una marca" /></SelectTrigger>
            <SelectContent>
              {(brands.data ?? []).map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        <Label className="text-xs">Modelo</Label>
        <Select
          value={model ?? ""}
          onValueChange={(v) => {
            const found = models.data?.find((m) => m.model === v);
            onChange({ brand, model: v, year: null, versionId: null, vehicle: null });
            // body_type emoji read via found, no other side-effect
            void found;
          }}
          disabled={!brand || models.isLoading}
        >
          <SelectTrigger className="h-11 mt-1 rounded-xl"><SelectValue placeholder={brand ? "Elige un modelo" : "Selecciona marca primero"} /></SelectTrigger>
          <SelectContent>
            {(models.data ?? []).map((m) => (
              <SelectItem key={m.model} value={m.model}>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true">{bodyEmoji(m.body_type)}</span> {m.model}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Año</Label>
          <Select
            value={year?.toString() ?? ""}
            onValueChange={(v) => onChange({ brand, model, year: Number(v), versionId: null, vehicle: null })}
            disabled={!model || years.isLoading}
          >
            <SelectTrigger className="h-11 mt-1 rounded-xl"><SelectValue placeholder="Año" /></SelectTrigger>
            <SelectContent>
              {(years.data ?? []).map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Versión / Motor</Label>
          <Select
            value={versionId ?? ""}
            onValueChange={(v) => {
              const found = versions.data?.find((x) => x.id === v) ?? null;
              onChange({ brand, model, year, versionId: v, vehicle: found });
            }}
            disabled={!year || versions.isLoading}
          >
            <SelectTrigger className="h-11 mt-1 rounded-xl"><SelectValue placeholder="Versión" /></SelectTrigger>
            <SelectContent>
              {(versions.data ?? []).map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedVehicle && (
        <p className="text-[11px] text-muted-foreground">{formatFuelType(selectedVehicle.fuel_type)}</p>
      )}
    </div>
  );
};

export default CatalogVehiclePicker;
