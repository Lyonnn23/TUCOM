// Lightweight Places (New) autocomplete using the Maps JS API.
// Loads the JS API on first mount, fetches suggestions via AutocompleteSuggestion,
// resolves the chosen place to coordinates via Place.fetchFields.

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";

declare global { interface Window { google: any; __tucomMapsLoading?: Promise<void>; } }

async function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") return;
  if (window.google?.maps?.importLibrary) return;
  if (window.__tucomMapsLoading) return window.__tucomMapsLoading;
  window.__tucomMapsLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async&libraries=places&language=es-CL&region=CL`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("maps_load_failed"));
    document.head.appendChild(s);
  });
  return window.__tucomMapsLoading;
}

interface Suggestion {
  placeId: string;
  primary: string;
  secondary: string;
}

interface Props {
  placeholder?: string;
  initialValue?: string;
  onSelect: (place: { lat: number; lng: number; label: string }) => void;
  bias?: { lat: number; lng: number };
}

const PlacesAutocomplete = ({ placeholder = "¿A dónde vas?", initialValue = "", onSelect, bias }: Props) => {
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const sessionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-maps-key");
        if (cancelled) return;
        if (error || !data?.key) return;
        await loadGoogleMaps(data.key);
        if (cancelled) return;
        await window.google.maps.importLibrary("places");
        const { AutocompleteSessionToken } = window.google.maps.places;
        sessionRef.current = new AutocompleteSessionToken();
        setReady(true);
      } catch (e) {
        console.warn("Places init failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setValue(initialValue); }, [initialValue]);

  const fetchSuggestions = async (input: string) => {
    if (!ready || !input.trim()) {
      setSuggestions([]); return;
    }
    setLoading(true);
    try {
      const { AutocompleteSuggestion } = window.google.maps.places;
      const req: any = {
        input,
        sessionToken: sessionRef.current,
        includedRegionCodes: ["cl"],
        language: "es-CL",
      };
      if (bias) {
        req.locationBias = {
          radius: 50000,
          center: { lat: bias.lat, lng: bias.lng },
        };
      }
      const { suggestions: raw } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
      const mapped: Suggestion[] = (raw ?? [])
        .filter((s: any) => s.placePrediction)
        .slice(0, 6)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          primary: s.placePrediction.mainText?.text ?? s.placePrediction.text?.text ?? "",
          secondary: s.placePrediction.secondaryText?.text ?? "",
        }));
      setSuggestions(mapped);
      setOpen(mapped.length > 0);
    } catch (err) {
      console.warn("Autocomplete error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (next: string) => {
    setValue(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => fetchSuggestions(next), 250) as unknown as number;
  };

  const handleSelect = async (s: Suggestion) => {
    setValue(`${s.primary}${s.secondary ? `, ${s.secondary}` : ""}`);
    setOpen(false);
    try {
      const { Place } = window.google.maps.places;
      const place = new Place({ id: s.placeId, requestedLanguage: "es-CL" });
      await place.fetchFields({ fields: ["location", "displayName", "formattedAddress"] });
      const loc = place.location;
      if (!loc) return;
      onSelect({
        lat: loc.lat(),
        lng: loc.lng(),
        label: place.formattedAddress ?? place.displayName ?? s.primary,
      });
      // Reset session token after selection
      const { AutocompleteSessionToken } = window.google.maps.places;
      sessionRef.current = new AutocompleteSessionToken();
    } catch (err) {
      console.warn("Place fetch failed:", err);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="pl-9 pr-9 h-12 rounded-xl"
          aria-label={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl bg-popover border border-border shadow-elegant"
        >
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-accent flex items-start gap-2"
              >
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{s.primary}</div>
                  {s.secondary && (
                    <div className="text-xs text-muted-foreground truncate">{s.secondary}</div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlacesAutocomplete;
