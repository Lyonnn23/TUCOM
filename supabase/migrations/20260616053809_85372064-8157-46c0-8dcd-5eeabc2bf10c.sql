-- Restrict anonymous access to user-identifying columns on station_prices and station_reviews.
-- Anonymous users continue to see catalog data via two new safe views; authenticated users keep full row access via existing RLS.

-- 1) station_prices: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "Anyone can view station prices" ON public.station_prices;
CREATE POLICY "Authenticated can view station prices"
  ON public.station_prices
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.station_prices FROM anon;

-- 2) station_reviews: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.station_reviews;
CREATE POLICY "Authenticated can view reviews"
  ON public.station_reviews
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.station_reviews FROM anon;

-- 3) Public-safe views (owned by postgres; default security_definer behavior bypasses RLS so anon can still read non-sensitive columns)
CREATE OR REPLACE VIEW public.station_prices_public AS
  SELECT id, station_id, fuel_type, price, created_at
  FROM public.station_prices;

CREATE OR REPLACE VIEW public.station_reviews_public AS
  SELECT id, station_id, rating, comment, created_at
  FROM public.station_reviews;

GRANT SELECT ON public.station_prices_public TO anon, authenticated;
GRANT SELECT ON public.station_reviews_public TO anon, authenticated;
