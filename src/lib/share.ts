import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatKm } from "@/lib/format";
import { toast } from "sonner";

export const SHARE_URL = "https://tucombustible.cl";
export const SHARE_TITLE = "TÜcom — Bencina barata en Chile";

export type ShareFuelKey = "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric";

const FUEL_LABEL: Record<ShareFuelKey, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
  electric: "EV",
};

export interface ShareStationPayload {
  stationId?: string;
  stationName: string;
  brand?: string;
  fuelType?: ShareFuelKey;
  price?: number;
  distanceKm?: number;
}

export function buildShareText(p: ShareStationPayload): string {
  const fuel = p.fuelType ? FUEL_LABEL[p.fuelType] : "bencina";
  const unit = p.fuelType === "electric" ? "/kWh" : "/L";
  const parts: string[] = [];
  if (p.price && p.price > 0) {
    parts.push(`Encontré ${fuel} a ${formatPrice(p.price)}${unit} en ${p.stationName}`);
  } else {
    parts.push(`Mira ${p.stationName} en TÜcom`);
  }
  if (p.distanceKm !== undefined) parts[0] += `, ${formatKm(p.distanceKm)}`;
  parts.push(`Descarga TÜcom: ${SHARE_URL}`);
  return parts.join(". ");
}

async function logShare(p: ShareStationPayload, channel: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("share_events" as any).insert({
      user_id: user?.id ?? null,
      station_id: p.stationId ?? null,
      fuel_type: p.fuelType ?? null,
      price: p.price ?? null,
      channel,
    });
  } catch {
    /* non-blocking */
  }
}

/** Render a 1080x1080 PNG share card. */
export async function renderShareImage(p: ShareStationPayload): Promise<Blob | null> {
  try {
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Purple gradient background
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, "#7C3AED");
    grad.addColorStop(1, "#6366F1");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle accent circle
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.arc(size * 0.85, size * 0.15, 220, 0, Math.PI * 2);
    ctx.fill();

    // Logo / brand
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 64px system-ui, -apple-system, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("TÜcom", 80, 80);

    ctx.font = "500 28px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("Bencina barata en Chile", 80, 160);

    // Fuel chip
    const fuelLabel = p.fuelType ? FUEL_LABEL[p.fuelType] : "Combustible";
    ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
    const chipText = fuelLabel.toUpperCase();
    const chipPadX = 32;
    const chipMetrics = ctx.measureText(chipText);
    const chipW = chipMetrics.width + chipPadX * 2;
    const chipH = 64;
    const chipX = 80;
    const chipY = 360;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, chipX, chipY, chipW, chipH, 16);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(chipText, chipX + chipPadX, chipY + 14);

    // Price (huge)
    if (p.price && p.price > 0) {
      const unit = p.fuelType === "electric" ? "/kWh" : "/L";
      ctx.font = "bold 200px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(formatPrice(p.price), 80, 460);

      ctx.font = "500 40px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(unit, 80, 700);
    }

    // Station name
    ctx.font = "bold 48px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    wrapText(ctx, p.stationName, 80, 800, size - 160, 56);

    // Watermark
    ctx.font = "500 32px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("tucombustible.cl", 80, size - 90);

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png", 0.95)
    );
  } catch {
    return null;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
      if (yy > y + lineHeight * 2) break;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export async function shareStation(payload: ShareStationPayload) {
  const text = buildShareText(payload);
  const blob = await renderShareImage(payload);
  const files: File[] = blob ? [new File([blob], "tucom.png", { type: "image/png" })] : [];
  const shareData: ShareData = { title: SHARE_TITLE, text, url: SHARE_URL };
  const withFiles: any = files.length ? { ...shareData, files } : shareData;

  try {
    const nav: any = navigator;
    if (nav.share && files.length && nav.canShare?.({ files })) {
      await nav.share(withFiles);
      logShare(payload, "native_image");
      return;
    }
    if (nav.share) {
      await nav.share(shareData);
      logShare(payload, "native");
      return;
    }
  } catch {
    /* user cancelled */
    return;
  }

  try {
    await navigator.clipboard.writeText(`${text} ${SHARE_URL}`);
    toast.success("¡Copiado!");
    logShare(payload, "clipboard");
  } catch {
    toast.error("No se pudo compartir");
  }
}

export function shareViaWhatsApp(payload: ShareStationPayload) {
  const text = buildShareText(payload);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  logShare(payload, "whatsapp");
}
