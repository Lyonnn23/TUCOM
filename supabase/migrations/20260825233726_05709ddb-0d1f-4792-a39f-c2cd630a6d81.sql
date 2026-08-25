DROP POLICY IF EXISTS "Authenticated can view station prices" ON public.station_prices;

CREATE POLICY "Admins can view station prices"
ON public.station_prices
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated can view reviews" ON public.station_reviews;

CREATE POLICY "Users view own reviews, admins view all"
ON public.station_reviews
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());