import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";

interface Props {
  lat: number;
  lng: number;
  name: string;
  onClick?: () => void;
}

const StationStaticMap = ({ lat, lng, name, onClick }: Props) => {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("station-static-map", {
          body: { lat, lng, zoom: 15, width: 640, height: 280 },
        });
        if (cancelled) return;
        if (error || !data) {
          setError(true);
          return;
        }
        const blob = data instanceof Blob ? data : new Blob([data], { type: "image/png" });
        url = URL.createObjectURL(blob);
        setSrc(url);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [lat, lng]);

  if (error) {
    return (
      <div className="h-40 rounded-2xl bg-muted flex items-center justify-center text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 mr-2" aria-hidden="true" /> Mapa no disponible
      </div>
    );
  }

  if (!src) return <Skeleton className="h-40 rounded-2xl" />;

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full overflow-hidden rounded-2xl border border-border press-scale focus:outline-none focus:ring-2 focus:ring-primary"
      aria-label={`Ver ${name} en Google Maps`}
    >
      <img
        src={src}
        alt={`Mapa de ${name}`}
        className="w-full h-40 object-cover"
        loading="lazy"
      />
    </button>
  );
};

export default StationStaticMap;
