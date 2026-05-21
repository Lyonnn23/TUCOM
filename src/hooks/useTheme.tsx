import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeCtx {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  mode: "system",
  resolved: "light",
  setMode: () => {},
  toggle: () => {},
});

const STORAGE_KEY = "tucom.theme";

const getSystem = (): "light" | "dark" =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const apply = (resolved: "light" | "dark") => {
  const el = document.documentElement;
  el.classList.toggle("dark", resolved === "dark");
  el.style.colorScheme = resolved;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system";
  });
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    mode === "system" ? getSystem() : (mode as "light" | "dark")
  );

  useEffect(() => {
    const next = mode === "system" ? getSystem() : (mode as "light" | "dark");
    setResolved(next);
    apply(next);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next = mql.matches ? "dark" : "light";
      setResolved(next);
      apply(next);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mode]);

  const setMode = (m: ThemeMode) => setModeState(m);
  const toggle = () =>
    setModeState((prev) => {
      const current = prev === "system" ? getSystem() : prev;
      return current === "dark" ? "light" : "dark";
    });

  return (
    <Ctx.Provider value={{ mode, resolved, setMode, toggle }}>{children}</Ctx.Provider>
  );
};

export const useTheme = () => useContext(Ctx);
