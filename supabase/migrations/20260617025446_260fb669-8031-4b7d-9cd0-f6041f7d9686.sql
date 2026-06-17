
CREATE POLICY "Deny anon select push_subscriptions"
ON public.push_subscriptions
FOR SELECT
TO anon
USING (false);
