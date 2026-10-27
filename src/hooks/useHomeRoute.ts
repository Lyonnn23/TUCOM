/**
 * useHomeRoute — guarda y recupera la ruta de "casa" del usuario.
 * El usuario puede definir su destino habitual (casa, trabajo, etc.)
 * y la app puede sugerir bencineras baratas en esa ruta.
 */
import { useState, useCallback } from "react";

const KEY = "tucom_home_route_v1";

export interface HomeRoute {
  label: string; // "Casa" | "Trabajo" | custom
  destName: string;
  destLat: number;
  destLng: number;
  savedAt: string;
}

function load(): HomeRoute | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HomeRoute) : null;
  } catch {
    return null;
  }
}

function save(r: HomeRoute) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {}
}

function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function useHomeRoute() {
  const [route, setRoute] = useState<HomeRoute | null>(load);

  const saveRoute = useCallback((r: HomeRoute) => {
    save(r);
    setRoute(r);
  }, []);

  const clearRoute = useCallback(() => {
    clear();
    setRoute(null);
  }, []);

  return { route, saveRoute, clearRoute };
}
