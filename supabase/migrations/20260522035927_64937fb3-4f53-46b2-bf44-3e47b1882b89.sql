-- Add columns required by the new official catalog payload
ALTER TABLE public.vehicles_catalog
  ADD COLUMN IF NOT EXISTS tank_size_l       real,
  ADD COLUMN IF NOT EXISTS popularity_rank   integer DEFAULT 99,
  ADD COLUMN IF NOT EXISTS notes             text,
  ADD COLUMN IF NOT EXISTS year_from         integer,
  ADD COLUMN IF NOT EXISTS year_to           integer;

CREATE INDEX IF NOT EXISTS idx_vc_brand        ON public.vehicles_catalog(brand);
CREATE INDEX IF NOT EXISTS idx_vc_brand_model  ON public.vehicles_catalog(brand, model);
CREATE INDEX IF NOT EXISTS idx_vc_fuel         ON public.vehicles_catalog(fuel_type);
CREATE INDEX IF NOT EXISTS idx_vc_body         ON public.vehicles_catalog(body_type);
CREATE INDEX IF NOT EXISTS idx_vc_popularity   ON public.vehicles_catalog(popularity_rank);