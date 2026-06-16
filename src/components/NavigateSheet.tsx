import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Navigation, ExternalLink, Map as MapIcon, Apple } from "lucide-react";
import {
  isIOS,
  openNavApp,
  setPreferredNavApp,
  type NavApp,
} from "@/lib/navigateApp";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lat: number;
  lng: number;
  stationName?: string;
}

const APPS: { key: NavApp; label: string; emoji: string; iosOnly?: boolean }[] = [
  { key: "waze", label: "Waze", emoji: "🚗" },
  { key: "google", label: "Google Maps", emoji: "🗺️" },
  { key: "apple", label: "Apple Maps", emoji: "🍎", iosOnly: true },
  { key: "web", label: "Ver en web", emoji: "🌐" },
];

const NavigateSheet = ({ open, onOpenChange, lat, lng, stationName }: Props) => {
  const [always, setAlways] = useState(false);
  const ios = isIOS();

  const pick = (app: NavApp) => {
    if (always) setPreferredNavApp(app);
    openNavApp(app, lat, lng);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Abrir con...
          </SheetTitle>
          {stationName && (
            <p className="text-xs text-muted-foreground">{stationName}</p>
          )}
        </SheetHeader>

        <div className="grid grid-cols-1 gap-2 mt-4">
          {APPS.filter((a) => !a.iosOnly || ios).map((a) => (
            <button
              key={a.key}
              onClick={() => pick(a.key)}
              className="flex items-center justify-between w-full rounded-xl border border-border bg-card hover:bg-muted/60 px-4 py-3 text-left transition-colors min-h-12"
            >
              <span className="flex items-center gap-3 font-semibold text-sm text-foreground">
                <span className="text-xl" aria-hidden="true">{a.emoji}</span>
                {a.label}
              </span>
              <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 mt-4 text-xs text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={always}
            onChange={(e) => setAlways(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-primary"
          />
          Usar siempre esta app
        </label>
      </SheetContent>
    </Sheet>
  );
};

export default NavigateSheet;
