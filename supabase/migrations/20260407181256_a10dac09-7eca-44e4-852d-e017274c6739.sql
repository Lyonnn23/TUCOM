-- Drop overly permissive delete policy
DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON public.push_subscriptions;

-- More restrictive: only delete if you know the endpoint (implicit ownership)
-- In practice, the edge function handles deletion server-side
CREATE POLICY "Delete own push subscription"
  ON public.push_subscriptions FOR DELETE
  USING (false);

-- INSERT stays open since anonymous users need to subscribe.
-- The data is non-sensitive (browser push endpoints).
-- Mark the INSERT policy as intentionally permissive:
COMMENT ON POLICY "Anyone can insert push subscriptions" ON public.push_subscriptions 
  IS 'Intentionally permissive: anonymous visitors must be able to subscribe to push notifications. Data is non-sensitive browser endpoints.';