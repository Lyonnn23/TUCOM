
-- Add unique constraint on fuel_type
ALTER TABLE public.fuel_prices ADD CONSTRAINT fuel_prices_fuel_type_key UNIQUE (fuel_type);

-- Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_gas_stations_updated_at ON public.gas_stations;
CREATE TRIGGER update_gas_stations_updated_at BEFORE UPDATE ON public.gas_stations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fuel_prices_updated_at ON public.fuel_prices;
CREATE TRIGGER update_fuel_prices_updated_at BEFORE UPDATE ON public.fuel_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_station_prices_updated_at ON public.station_prices;
CREATE TRIGGER update_station_prices_updated_at BEFORE UPDATE ON public.station_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
