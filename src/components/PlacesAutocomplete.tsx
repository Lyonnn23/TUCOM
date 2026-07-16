// Places (New) autocomplete built on the shared @vis.gl/react-google-maps loader.
// Uses APIProvider + useMapsLibrary so the Maps JS API is loaded exactly once
// across the app (StationMap and this component share the same loader).

import { useEffect, useRef, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";

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

const PlacesAutocompleteInner = ({
  placeholder = "¿A dónde vas?",
  initialValue = "",
  onSelect,
  bias,
}: Props) => {
  const placesLib = useMapsLibrary("places");
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    sessionRef.current = new placesLib.AutocompleteSessionToken();
  }, [placesLib]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const fetchSuggestions = async (input: string) => {
    if (!placesLib || !input.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
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
      const { suggestions: raw } =
        await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
      const mapped: Suggestion[] = (raw ?? [])
        .filter((s: any) => s.placePrediction)
        .slice(0, 6)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          primary:
            s.placePrediction.mainText?.text ??
            s.placePrediction.text?.text ??
            "",
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
    timerRef.current = window.setTimeout(
      () => fetchSuggestions(next),
      250,
    ) as unknown as number;
  };

  const handleSelect = async (s: Suggestion) => {
    setValue(`${s.primary}${s.secondary ? `, ${s.secondary}` : ""}`);
    setOpen(false);
    if (!placesLib) return;
    try {
      const place = new placesLib.Place({
        id: s.placeId,
        requestedLanguage: "es-CL",
      });
      await place.fetchFields({
        fields: ["location", "displayName", "formattedAddress"],
      });
      const loc = place.location;
      if (!loc) return;
      onSelect({
        lat: loc.lat(),
        lng: loc.lng(),
        label: place.formattedAddress ?? place.displayName ?? s.primary,
      });
      sessionRef.current = new placesLib.AutocompleteSessionToken();
    } catch (err) {
      console.warn("Place fetch failed:", err);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          aria-hidden="true"
        />
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
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
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
                <MapPin
                  className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {s.primary}
                  </div>
                  {s.secondary && (
                    <div className="text-xs text-muted-foreground truncate">
                      {s.secondary}
                    </div>
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

const PlacesAutocomplete = (props: Props) => {
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke("get-maps-key")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.key) setApiKey(data.key);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!apiKey) {
    // Render the input in a disabled-looking state until the key resolves.
    return (
      <div className="relative">
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={props.initialValue ?? ""}
          readOnly
          placeholder={props.placeholder ?? "¿A dónde vas?"}
          className="pl-9 pr-9 h-12 rounded-xl"
          aria-label={props.placeholder ?? "¿A dónde vas?"}
        />
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places"]} language="es-CL" region="CL">
      <PlacesAutocompleteInner {...props} />
    </APIProvider>
  );
};

export default PlacesAutocomplete;
