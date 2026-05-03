import { useState } from "react";
import { ArrowLeft, Smartphone, Tablet, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Index from "./Index";

interface DeviceProfile {
  id: string;
  name: string;
  width: number;
  height: number;
  os: "iOS" | "Android" | "Desktop";
  icon: typeof Smartphone;
}

const DEVICES: DeviceProfile[] = [
  { id: "iphone-se", name: "iPhone SE", width: 320, height: 568, os: "iOS", icon: Smartphone },
  { id: "iphone-12-mini", name: "iPhone 12 mini", width: 360, height: 780, os: "iOS", icon: Smartphone },
  { id: "iphone-13", name: "iPhone 13", width: 390, height: 844, os: "iOS", icon: Smartphone },
  { id: "iphone-15-pro-max", name: "iPhone 15 Pro Max", width: 430, height: 932, os: "iOS", icon: Smartphone },
  { id: "android-small", name: "Android compacto", width: 360, height: 640, os: "Android", icon: Smartphone },
  { id: "pixel-7", name: "Pixel 7", width: 412, height: 915, os: "Android", icon: Smartphone },
  { id: "galaxy-s23-ultra", name: "Galaxy S23 Ultra", width: 384, height: 854, os: "Android", icon: Smartphone },
  { id: "ipad-mini", name: "iPad mini", width: 768, height: 1024, os: "iOS", icon: Tablet },
  { id: "desktop", name: "Desktop", width: 1280, height: 800, os: "Desktop", icon: Monitor },
];

const ResponsiveCheck = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<DeviceProfile>(DEVICES[2]);
  const [showAll, setShowAll] = useState(false);

  const previewUrl = `${window.location.origin}/`;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-bold text-foreground text-lg leading-tight tracking-tight truncate">
              Verificación responsive
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Revisa títulos, tooltips y layout en distintos anchos
            </p>
          </div>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            {showAll ? "Vista única" : "Comparar todos"}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {!showAll && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {DEVICES.map((d) => {
              const Icon = d.icon;
              const active = selected.id === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[140px]">{d.name}</span>
                  <span className="opacity-70">{d.width}px</span>
                </button>
              );
            })}
          </div>
        )}

        {showAll ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEVICES.filter((d) => d.os !== "Desktop").map((d) => (
              <DeviceFrame key={d.id} device={d} url={previewUrl} compact />
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <DeviceFrame device={selected} url={previewUrl} />
          </div>
        )}
      </main>
    </div>
  );
};

const DeviceFrame = ({
  device,
  url,
  compact = false,
}: {
  device: DeviceProfile;
  url: string;
  compact?: boolean;
}) => {
  const scale = compact ? 0.55 : 1;
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-3 inline-block">
      <div className="flex items-center justify-between mb-2 px-1">
        <p className="text-xs font-semibold text-foreground truncate max-w-[200px]">
          {device.name}
        </p>
        <p className="text-[10px] text-muted-foreground shrink-0">
          {device.width}×{device.height} · {device.os}
        </p>
      </div>
      <div
        className="relative bg-muted rounded-xl overflow-hidden border border-border"
        style={{
          width: device.width * scale,
          height: device.height * scale,
        }}
      >
        <iframe
          src={url}
          title={device.name}
          style={{
            width: device.width,
            height: device.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            border: "none",
          }}
        />
      </div>
    </div>
  );
};

export default ResponsiveCheck;
