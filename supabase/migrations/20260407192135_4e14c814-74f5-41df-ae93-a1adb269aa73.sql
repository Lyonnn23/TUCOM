DROP INDEX IF EXISTS gas_stations_place_id_key;
CREATE UNIQUE INDEX gas_stations_place_id_uq ON public.gas_stations (place_id);