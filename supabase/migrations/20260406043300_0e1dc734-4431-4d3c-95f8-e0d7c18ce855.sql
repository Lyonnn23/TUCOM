
ALTER TABLE public.fuel_prices ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE public.fuel_prices ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'stable';
