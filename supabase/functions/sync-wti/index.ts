import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Yahoo Finance: latest price + ~7d history for weekly change
async function fetchYahoo(): Promise<{ price: number; prevWeek: number } | null> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=10d",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const price = Number(result?.meta?.regularMarketPrice);
    if (!Number.isFinite(price)) return null;
    const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (n: unknown) => typeof n === "number" && Number.isFinite(n),
    );
    const prevWeek = closes.length >= 6 ? closes[closes.length - 6] : closes[0] ?? price;
    return { price, prevWeek };
  } catch (e) {
    console.error("yahoo fetch error", e);
    return null;
  }
}

// Stooq fallback
async function fetchStooq(): Promise<{ price: number; prevWeek: number } | null> {
  try {
    const res = await fetch("https://stooq.com/q/d/l/?s=cl.f&i=d");
    const text = await res.text();
    const lines = text.trim().split("\n").slice(1);
    if (lines.length < 6) return null;
    const last = lines[lines.length - 1].split(",");
    const weekAgo = lines[Math.max(0, lines.length - 6)].split(",");
    const price = Number(last[4]);
    const prevWeek = Number(weekAgo[4]);
    if (!Number.isFinite(price)) return null;
    return { price, prevWeek };
  } catch (e) {
    console.error("stooq fetch error", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const wti = (await fetchYahoo()) ?? (await fetchStooq());
    if (!wti) throw new Error("WTI source unavailable");
    const change_pct_week = wti.prevWeek
      ? Number((((wti.price - wti.prevWeek) / wti.prevWeek) * 100).toFixed(3))
      : 0;
    await supabase.from("commodity_prices").insert({
      symbol: "WTI",
      price_usd: wti.price,
      change_pct_week,
    });
    return new Response(
      JSON.stringify({ ok: true, price: wti.price, change_pct_week }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-wti error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
