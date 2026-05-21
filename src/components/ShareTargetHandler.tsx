import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Handles incoming Web Share Target invocations.
 * When a user shares a location URL from Google Maps (or similar) into TÜcom,
 * we try to extract coordinates and center the map / search on them.
 */
const COORD_REGEX = /(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/;
const AT_REGEX = /@(-?\d{1,2}\.\d{3,}),(-?\d{1,3}\.\d{3,})/;

function extractCoords(...inputs: (string | null | undefined)[]): { lat: number; lng: number } | null {
  for (const raw of inputs) {
    if (!raw) continue;
    const atMatch = raw.match(AT_REGEX);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (isFinite(lat) && isFinite(lng)) return { lat, lng };
    }
    const m = raw.match(COORD_REGEX);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (isFinite(lat) && isFinite(lng)) return { lat, lng };
    }
  }
  return null;
}

const ShareTargetHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("shared") !== "1") return;

    const title = params.get("shared_title");
    const text = params.get("shared_text");
    const url = params.get("shared_url");

    const coords = extractCoords(url, text, title);
    if (coords) {
      try {
        sessionStorage.setItem(
          "tucom_shared_location",
          JSON.stringify({ ...coords, ts: Date.now() })
        );
      } catch { /* noop */ }
      toast.success("Ubicación compartida recibida", {
        description: "Buscando estaciones cercanas…",
      });
      navigate(`/?tab=estaciones&lat=${coords.lat}&lng=${coords.lng}`, { replace: true });
    } else if (title || text || url) {
      toast.info("No pudimos detectar coordenadas en lo compartido", {
        description: text || url || title || "",
      });
      navigate("/?tab=estaciones", { replace: true });
    }
  }, [location.search, navigate]);

  return null;
};

export default ShareTargetHandler;
