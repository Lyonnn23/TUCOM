import { BRAND_COLORS, PRICE_INDICATORS } from "@/lib/brandColors";

interface Props {
  visibleBrands?: string[];
}

/** Fixed bottom-left legend showing brand colors + price indicators. */
const MapLegend = ({ visibleBrands }: Props) => {
  const entries = Object.entries(BRAND_COLORS).filter(([k]) =>
    visibleBrands ? visibleBrands.map((b) => b.toUpperCase()).includes(k) : true,
  );

  return (
    <div
      className="absolute bottom-4 left-4 z-10 bg-card/95 backdrop-blur border border-border rounded-2xl shadow-elegant p-3 max-w-[180px] max-h-[60vh] overflow-y-auto"
      role="region"
      aria-label="Leyenda del mapa"
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-2">
        Leyenda
      </p>
      <ul className="space-y-1.5">
        {entries.map(([brand, color]) => (
          <li key={brand} className="flex items-center gap-2">
            <span
              aria-hidden
              className="w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-[11px] text-foreground capitalize">
              {brand.toLowerCase()}
            </span>
          </li>
        ))}
        <li className="border-t border-border my-1.5" />
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
            style={{ backgroundColor: PRICE_INDICATORS.cheapest }}
          />
          <span className="text-[11px] text-foreground">Precio más bajo</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
            style={{ backgroundColor: PRICE_INDICATORS.expensive }}
          />
          <span className="text-[11px] text-foreground">Precio más alto</span>
        </li>
      </ul>
    </div>
  );
};

export default MapLegend;
