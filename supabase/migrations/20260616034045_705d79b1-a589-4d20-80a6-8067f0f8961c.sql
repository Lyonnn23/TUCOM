DROP POLICY IF EXISTS "Anyone can view badges" ON public.user_badges;
CREATE POLICY "Authenticated can view badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.user_badges FROM anon;

DROP POLICY IF EXISTS "Anyone can view points" ON public.user_points;
CREATE POLICY "Authenticated can view points"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.user_points FROM anon;