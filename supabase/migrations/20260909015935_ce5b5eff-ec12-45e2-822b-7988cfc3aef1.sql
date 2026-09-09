-- favorites
DROP POLICY IF EXISTS "Admins view all favorites" ON public.favorites;
CREATE POLICY "Admins view all favorites" ON public.favorites FOR SELECT USING (((select auth.uid()) = user_id) OR is_admin());

DROP POLICY IF EXISTS "Users can add their own favorites" ON public.favorites;
CREATE POLICY "Users can add their own favorites" ON public.favorites FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can remove their own favorites" ON public.favorites;
CREATE POLICY "Users can remove their own favorites" ON public.favorites FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites" ON public.favorites FOR SELECT USING ((select auth.uid()) = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "Anyone can insert push subscription" ON public.push_subscriptions;
CREATE POLICY "Anyone can insert push subscription" ON public.push_subscriptions FOR INSERT WITH CHECK ((((select auth.uid()) IS NULL) AND (user_id IS NULL)) OR (((select auth.uid()) IS NOT NULL) AND ((select auth.uid()) = user_id)));

DROP POLICY IF EXISTS "Authenticated users can delete own push subscription" ON public.push_subscriptions;
CREATE POLICY "Authenticated users can delete own push subscription" ON public.push_subscriptions FOR DELETE USING (((select auth.uid()) IS NOT NULL) AND ((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Authenticated users can update own push subscription" ON public.push_subscriptions;
CREATE POLICY "Authenticated users can update own push subscription" ON public.push_subscriptions FOR UPDATE USING (((select auth.uid()) IS NOT NULL) AND ((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) IS NOT NULL) AND ((select auth.uid()) = user_id));

DROP POLICY IF EXISTS "Authenticated users can view own push subscription" ON public.push_subscriptions;
CREATE POLICY "Authenticated users can view own push subscription" ON public.push_subscriptions FOR SELECT USING (((select auth.uid()) IS NOT NULL) AND ((select auth.uid()) = user_id));

-- reported_prices
DROP POLICY IF EXISTS "Authenticated users can report valid prices" ON public.reported_prices;
CREATE POLICY "Authenticated users can report valid prices" ON public.reported_prices FOR INSERT WITH CHECK (((select auth.uid()) = user_id) AND (price >= 100) AND (price <= 5000) AND (fuel_type = ANY (ARRAY['gasoline93'::text, 'gasoline95'::text, 'gasoline97'::text, 'diesel'::text, 'electric'::text])));

DROP POLICY IF EXISTS "Users can view their own reported prices" ON public.reported_prices;
CREATE POLICY "Users can view their own reported prices" ON public.reported_prices FOR SELECT USING ((select auth.uid()) = user_id);