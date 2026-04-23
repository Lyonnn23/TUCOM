-- Drop the overly permissive UPDATE/DELETE policies that allowed any anonymous
-- user to modify or delete every anonymous subscription in bulk.
DROP POLICY IF EXISTS "Update own push subscription by endpoint" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Delete own push subscription" ON public.push_subscriptions;

-- Restrict UPDATE and DELETE to authenticated owners only.
-- Anonymous subscription updates/deletes must go through an edge function
-- using the service role key (with proof-of-ownership via the subscription's auth secret).
CREATE POLICY "Authenticated users can update own push subscription"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own push subscription"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Add SELECT policy so authenticated owners can verify their own subscriptions.
-- Anonymous subscriptions remain unreadable from the client (no policy match).
CREATE POLICY "Authenticated users can view own push subscription"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);