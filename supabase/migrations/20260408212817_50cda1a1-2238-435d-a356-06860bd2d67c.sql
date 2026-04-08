
-- Add EV charging columns to gas_stations
ALTER TABLE public.gas_stations 
ADD COLUMN IF NOT EXISTS has_ev_charging boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ev_connector_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ev_power_kw numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ev_operator text DEFAULT NULL;

-- Create index for EV stations filtering
CREATE INDEX IF NOT EXISTS idx_gas_stations_ev ON public.gas_stations (has_ev_charging) WHERE has_ev_charging = true;
