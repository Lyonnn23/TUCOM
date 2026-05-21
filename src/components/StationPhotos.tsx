import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  placeId: string | null | undefined;
  name: string;
}

const StationPhotos = ({ placeId, name }: Props) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!placeId) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    supabase.functions
      .invoke("station-place-info", { body: { placeId, max: 3 } })
      .then(({ data }) => {
        if (cancelled) return;
        setPhotos(Array.isArray(data?.photos) ? data.photos : []);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  if (!loaded || photos.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-2xl shadow-soft p-5">
      <h2 className="font-heading font-bold text-foreground mb-3">Fotos</h2>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Foto de ${name} ${i + 1}`}
            className="w-full h-24 object-cover rounded-xl border border-border"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">Fuente: Google Places</p>
    </section>
  );
};

export default StationPhotos;
