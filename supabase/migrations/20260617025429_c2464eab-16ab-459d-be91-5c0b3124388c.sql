
-- station_views: restrict INSERT
DROP POLICY IF EXISTS "Anyone can log view" ON public.station_views;
CREATE POLICY "Anyone can log view"
ON public.station_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- share_events: restrict INSERT
DROP POLICY IF EXISTS "Anyone can insert share events" ON public.share_events;
CREATE POLICY "Anyone can insert share events"
ON public.share_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- Make public views run as invoker (not definer)
ALTER VIEW public.station_prices_public SET (security_invoker = true);
ALTER VIEW public.station_reviews_public SET (security_invoker = true);
