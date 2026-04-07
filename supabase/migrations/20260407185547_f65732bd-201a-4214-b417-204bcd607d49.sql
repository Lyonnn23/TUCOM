ALTER TABLE public.push_subscriptions
ADD COLUMN fuel_types text[] NOT NULL DEFAULT '{gasoline93,gasoline95,gasoline97,diesel}'::text[];

-- Allow upsert to update fuel_types
CREATE POLICY "Anyone can update own push subscription fuel_types"
  ON public.push_subscriptions FOR UPDATE
  USING (true)
  WITH CHECK (true);
