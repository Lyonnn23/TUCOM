interface Props {
  visibleBrands?: string[];
}

const LEGEND_ITEMS = [
  { label: "Más cercana", color: "#3b82f6" },
  { label: "Abiertas", color: "#22c55e" },
  { label: "Cerradas", color: "#ef4444" },
];

/** Fixed bottom-left legend: nearest (blue), open (green), closed (red). */
const MapLegend = (_props: Props) => {
  return (
    <div
      className="absolute bottom-4 left-4 z-10 bg-card/95 backdrop-blur border border-border rounded-2xl shadow-elegant p-3 max-w-[180px]"
      role="region"
      aria-label="Leyenda del mapa"
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-2">
        Leyenda
      </p>
      <ul className="space-y-1.5">
        {LEGEND_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] text-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MapLegend;
