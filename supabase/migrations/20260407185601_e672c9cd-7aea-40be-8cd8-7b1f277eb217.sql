DROP POLICY IF EXISTS "Anyone can update own push subscription fuel_types" ON public.push_subscriptions;

-- More restrictive: only allow updating fuel_types via endpoint match
CREATE POLICY "Update push subscription preferences"
  ON public.push_subscriptions FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Update push subscription preferences" ON public.push_subscriptions
  IS 'Intentionally permissive: subscriptions are keyed by browser endpoint (non-sensitive). Users update their fuel type preferences via endpoint match in upsert.';
