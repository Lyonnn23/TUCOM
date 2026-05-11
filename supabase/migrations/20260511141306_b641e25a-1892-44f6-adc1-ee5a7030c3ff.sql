
-- 1. Add columns to reported_prices
ALTER TABLE public.reported_prices
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.reported_prices
  DROP CONSTRAINT IF EXISTS reported_prices_status_check;
ALTER TABLE public.reported_prices
  ADD CONSTRAINT reported_prices_status_check
  CHECK (status IN ('pending','verified','needs_review','rejected'));

-- 2. Refresh insert policy to allow electric + wider range
DROP POLICY IF EXISTS "Authenticated users can report valid prices" ON public.reported_prices;
CREATE POLICY "Authenticated users can report valid prices"
ON public.reported_prices
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND price >= 100 AND price <= 5000
  AND fuel_type IN ('gasoline93','gasoline95','gasoline97','diesel','electric')
);

-- 3. Update aggregation function to only use verified reports
CREATE OR REPLACE FUNCTION public.aggregate_reported_prices()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      station_id,
      fuel_type,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median_price
    FROM reported_prices
    WHERE created_at > now() - interval '48 hours'
      AND status = 'verified'
    GROUP BY station_id, fuel_type
  LOOP
    INSERT INTO station_prices (station_id, fuel_type, price, reported_by)
    VALUES (rec.station_id, rec.fuel_type, rec.median_price::int, NULL)
    ON CONFLICT (station_id, fuel_type)
      DO UPDATE SET price = rec.median_price::int, created_at = now()
      WHERE station_prices.price != rec.median_price::int;
  END LOOP;
END;
$function$;

-- 4. Storage bucket for price report photos (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('price-reports', 'price-reports', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS policies: each user can read/write only their own folder
DROP POLICY IF EXISTS "Users can upload own price report photos" ON storage.objects;
CREATE POLICY "Users can upload own price report photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'price-reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view own price report photos" ON storage.objects;
CREATE POLICY "Users can view own price report photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'price-reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
