
-- user_badges: restrict SELECT to owner
DROP POLICY IF EXISTS "Authenticated can view badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
CREATE POLICY "Users can view own badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- user_points: restrict SELECT to owner
DROP POLICY IF EXISTS "Authenticated can view points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
CREATE POLICY "Users can view own points"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- station_reviews: hide reviewer user_id from public projections via column-level privileges
REVOKE SELECT ON public.station_reviews FROM anon, authenticated;
GRANT SELECT (id, station_id, rating, comment, created_at) ON public.station_reviews TO anon, authenticated;
-- Owners can still read their own user_id column via this grant (RLS row scoping unchanged)
GRANT SELECT (user_id) ON public.station_reviews TO authenticated;

-- station_prices: hide reporter user_id from public projections
REVOKE SELECT ON public.station_prices FROM anon, authenticated;
GRANT SELECT (id, station_id, fuel_type, price, created_at) ON public.station_prices TO anon, authenticated;
GRANT SELECT (reported_by) ON public.station_prices TO authenticated;
