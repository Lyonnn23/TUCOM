# MEPCO Prediction & Macro Tracking

Build a price-prediction system that surfaces the weekly MEPCO adjustment, USD/CLP, and WTI oil prices, with push alerts and per-station projections.

## 1. Database (migration)

New tables:
- `mepco_adjustments` — `week_of` (date, Thu), `published_at`, `direction` (up/down/neutral), `fuel_changes` (jsonb: `{gasoline93: 28, gasoline95: 28, gasoline97: 30, diesel: -5}`), `source_url`, `notes`. Public read; admin write.
- `fx_rates` — `currency` (text, 'USD'), `rate_clp` (numeric), `change_pct` (numeric), `recorded_at` (timestamptz). Public read; service-role write.
- `commodity_prices` — `symbol` (text, 'WTI'), `price_usd` (numeric), `change_pct_week` (numeric), `recorded_at`. Public read; service-role write.
- `macro_explainers` — `topic` (text unique: 'fx_fuel', 'wti_fuel'), `body_es` (text), `updated_at`. Cached Claude output. Public read.

Add to `user_preferences`:
- `mepco_alert_enabled` boolean default true
- `fx_spike_alert_enabled` boolean default false
- `weekly_price_summary_enabled` boolean default true

## 2. Edge functions

- `sync-mepco` (cron: Tue 18:00 CL / 21:00 UTC) — fetch CNE MEPCO publication, upsert next Thursday row, then call internal push for opted-in users using existing push subscription stack. Notification copy varies by direction (up/down/neutral) and lists affected fuels.
- `sync-fx-rates` (cron: every 30 min) — exchangerate-api.com free endpoint, insert latest USD/CLP, compute daily delta. If `fx_spike_alert_enabled` and |Δday| > 2%, send push.
- `sync-wti` (cron: every 6h) — Alpha Vantage `WTI` or fallback `OIL_PRICE`. Requires `ALPHA_VANTAGE_API_KEY` secret.
- `macro-explainer` — on-demand; if cached row >7 days old or missing, calls Lovable AI (`google/gemini-2.5-flash`) to regenerate the FX→fuel or WTI→fuel paragraph in Chilean Spanish and stores it.

## 3. Frontend widgets (home, below station list, collapsible)

- `MepcoWidget.tsx` — current week adjustment, traffic-light dot, big delta, fuel badges, "¿Qué es el MEPCO?" opens a `Sheet` with explainer. Empty state for unpublished weeks.
- `FxWidget.tsx` — compact row with 7-day sparkline (recharts, 80px). Tap expands to 30-day chart + Claude explainer fetched from `macro-explainer`.
- `WtiWidget.tsx` — compact row, tap shows explainer sheet.
- Wrap in a single `MacroWidgets` section on `Index.tsx` with `Collapsible` cards.

Hooks: `useMepco`, `useFxRates`, `useWti`, `useMacroExplainer(topic)`.

## 4. Station detail projection

In `StationDetail` add a `PriceTrendChart`:
- Pull last 30 days from `station_price_history` for that station/fuel.
- Linear regression on last 14 days → extrapolate 7 days, then offset day-of-Thursday by next MEPCO delta.
- Recharts LineChart: solid violet for actual, dashed violet for projection.
- 3 scenarios row computed from FX sensitivity (~0.7 CLP/L per 1% USD move as heuristic): `dólar +2% / igual / -2%`.
- Disclaimer text.

## 5. `/mepco-info` page

Standalone page with the full explainer + history table of last 8 weeks, linked from push deep-link.

## 6. Settings

Add three toggles to existing notification preferences UI bound to the new `user_preferences` columns.

## Technical notes
- Secrets needed: `ALPHA_VANTAGE_API_KEY`. `exchangerate-api.com` free endpoint requires no key (using `open.er-api.com/v6/latest/USD`).
- Cron jobs registered via `supabase--insert` calling `pg_cron.schedule` + `pg_net.http_post` (per project convention).
- Push reuses existing web-push infra and `notification_log` for dedupe (`kind='mepco'`, `ref_key=week_of`).
- All copy in Spanish chileno; tokens via design system (violet primary, traffic-light using `--success`, `--warning`, `--destructive`).
- CNE doesn't expose a clean MEPCO JSON — initial sync will scrape the weekly bulletin PDF/HTML; if parsing fails, the widget shows the "no publicado" state and admin can insert manually.
