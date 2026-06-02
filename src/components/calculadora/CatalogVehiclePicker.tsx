import { useEffect, useState, useMemo } from "react";
import {
  useCatalogBrands, useCatalogModels, useCatalogYears, useCatalogVersions,
  useCatalogSearch,
  type CatalogVehicle,
} from "@/hooks/useVehiclesCatalog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X } from "lucide-react";
import { bodyEmoji, formatFuelType } from "@/lib/tripCalc";

interface Props {
  brand: string | null;
  model: string | null;
  year: number | null;
  versionId: string | null;
  onChange: (next: { brand: string | null; model: string | null; year: number | null; versionId: string | null; vehicle: CatalogVehicle | null }) => void;
}

const YEAR_OPTIONS = Array.from({ length: 2024 - 2005 + 1 }, (_, i) => 2024 - i);

const CatalogVehiclePicker = ({ brand, model, year, versionId, onChange }: Props) => {
  const brands = useCatalogBrands();
  const models = useCatalogModels(brand);
  const years = useCatalogYears(brand, model);
  const versions = useCatalogVersions(brand, model, year);

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const searchResults = useCatalogSearch(search, yearFilter);

  // Auto-pick single version
  useEffect(() => {
    if (!versionId && versions.data && versions.data.length === 1) {
      const v = versions.data[0];
      onChange({ brand, model, year, versionId: v.id, vehicle: v });
    }
  }, [versions.data, versionId, brand, model, year, onChange]);

  const selectedVehicle = versions.data?.find((v) => v.id === versionId) ?? null;

  const showSearchList = useMemo(
    () => search.trim().length >= 2 || yearFilter !== null,
    [search, yearFilter],
  );

  const pickFromSearch = (v: CatalogVehicle) => {
    onChange({ brand: v.brand, model: v.model, year: v.year, versionId: v.id, vehicle: v });
    setSearch("");
    setYearFilter(null);
  };

  // Filter brand list by search text for quick narrowing
  const filteredBrands = useMemo(() => {
    const list = brands.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q || showSearchList) return list;
    return list.filter((b) => b.toLowerCase().includes(q));
  }, [brands.data, search, showSearchList]);

  return (
    <div className="space-y-3">
      {/* Search + Year filter */}
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr,110px] gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar marca o modelo…"
              className="h-11 pl-9 pr-9 rounded-xl"
              aria-label="Buscar vehículo"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-accent"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Select
            value={yearFilter?.toString() ?? "all"}
            onValueChange={(v) => setYearFilter(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Año" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Todos</SelectItem>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showSearchList && (
          <div className="rounded-xl border bg-card max-h-72 overflow-y-auto">
            {searchResults.isLoading ? (
              <div className="p-3 space-y-2">
                <Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" />
              </div>
            ) : (searchResults.data ?? []).length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground text-center">Sin resultados</p>
            ) : (
              <ul className="divide-y">
                {searchResults.data!.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => pickFromSearch(v)}
                      className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between gap-2"
                    >
                      <span className="inline-flex items-center gap-2 text-sm min-w-0">
                        <span aria-hidden>{bodyEmoji(v.body_type)}</span>
                        <span className="truncate">
                          <strong>{v.brand}</strong> {v.model} · {v.version}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">{v.year}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {!showSearchList && (
        <>
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
                  {filteredBrands.map((b) => (
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
              onValueChange={(v) => onChange({ brand, model: v, year: null, versionId: null, vehicle: null })}
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
                    <SelectItem key={v.id} value={v.id}>{v.version}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedVehicle && (
            <p className="text-[11px] text-muted-foreground">{formatFuelType(selectedVehicle.fuel_type)}</p>
          )}
        </>
      )}
    </div>
  );
};

export default CatalogVehiclePicker;
