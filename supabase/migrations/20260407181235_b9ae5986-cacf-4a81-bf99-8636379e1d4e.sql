-- Add previous_price column to fuel_prices
ALTER TABLE public.fuel_prices ADD COLUMN IF NOT EXISTS previous_price integer;

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (even anonymous)
CREATE POLICY "Anyone can insert push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (true);

-- Anyone can view their own subscription by endpoint
CREATE POLICY "Anyone can view push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (true);

-- Anyone can delete their own subscription by endpoint
CREATE POLICY "Anyone can delete push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (true);

-- Trigger to save previous price before update
CREATE OR REPLACE FUNCTION public.save_previous_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.previous_price := OLD.price;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_save_previous_price
  BEFORE UPDATE ON public.fuel_prices
  FOR EACH ROW
  WHEN (OLD.price IS DISTINCT FROM NEW.price)
  EXECUTE FUNCTION public.save_previous_price();