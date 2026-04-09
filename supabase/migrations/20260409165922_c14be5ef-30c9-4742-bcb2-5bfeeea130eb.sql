-- Fix push_subscriptions policies
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can view push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Update push subscription preferences" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Delete own push subscription" ON public.push_subscriptions;

CREATE POLICY "Insert own push subscription"
  ON public.push_subscriptions FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() = user_id)
  );

CREATE POLICY "Select own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Update own push subscription"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own push subscription"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix reported_prices: restrict SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view reported prices" ON public.reported_prices;

CREATE POLICY "Authenticated users can view reported prices"
  ON public.reported_prices FOR SELECT
  TO authenticated
  USING (true);