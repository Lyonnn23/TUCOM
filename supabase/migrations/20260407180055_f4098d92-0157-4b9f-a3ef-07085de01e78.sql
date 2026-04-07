-- Enable pg_cron and pg_net for scheduled HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule sync-prices every 6 hours
SELECT cron.schedule(
  'sync-fuel-prices-every-6h',
  '0 */6 * * *',
  $$
  SELECT extensions.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-prices',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Function to aggregate user-reported prices into station_prices
CREATE OR REPLACE FUNCTION public.aggregate_reported_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  -- For each station+fuel combination with recent reports (last 48h),
  -- upsert the median price into station_prices
  FOR rec IN
    SELECT
      station_id,
      fuel_type,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price
    FROM reported_prices
    WHERE created_at > now() - interval '48 hours'
    GROUP BY station_id, fuel_type
  LOOP
    INSERT INTO station_prices (station_id, fuel_type, price, reported_by)
    VALUES (rec.station_id, rec.fuel_type, rec.median_price::int, NULL)
    ON CONFLICT (station_id, fuel_type)
      DO UPDATE SET price = rec.median_price::int, created_at = now()
      WHERE station_prices.price != rec.median_price::int;
  END LOOP;
END;
$$;

-- Schedule user price aggregation every 6 hours (offset by 1 hour from CNE sync)
SELECT cron.schedule(
  'aggregate-user-prices-every-6h',
  '30 */6 * * *',
  $$SELECT public.aggregate_reported_prices();$$
);