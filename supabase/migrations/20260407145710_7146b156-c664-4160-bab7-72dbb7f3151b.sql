
ALTER TABLE public.gas_stations ADD COLUMN IF NOT EXISTS place_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS gas_stations_place_id_key ON public.gas_stations (place_id) WHERE place_id IS NOT NULL;
