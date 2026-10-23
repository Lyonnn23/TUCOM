-- Fix: nearby_stations devolvía "permission denied for table station_prices" a visitantes
-- sin cuenta (y precios vacíos a usuarios no admin), porque desde la migración
-- 20260825233726 la tabla station_prices solo la puede leer un admin.
--
-- Los precios públicos ya se exponen de forma segura mediante la vista
-- station_prices_public (id, station_id, fuel_type, price, created_at: sin reported_by),
-- que es lo que usa el resto de la app (useGasStations). Aquí la función hace lo mismo.
-- La firma y las columnas devueltas no cambian.

CREATE OR REPLACE FUNCTION public.nearby_stations(
  _lat        double precision,
  _lng        double precision,
  _radius_m   integer DEFAULT 10000,
  _fuel_type  text    DEFAULT 'gasoline95',
  _limit      integer DEFAULT 50
)
RETURNS TABLE (
  id          uuid,
  name        text,
  brand       text,
  address     text,
  commune     text,
  region      text,
  lat         double precision,
  lng         double precision,
  distance_m  double precision,
  price       integer,
  price_updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.brand, s.address, s.commune, s.region, s.lat, s.lng,
         ST_Distance(s.location, ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography) AS distance_m,
         sp.price,
         sp.created_at
    FROM public.gas_stations s
    LEFT JOIN public.station_prices_public sp
      ON sp.station_id = s.id AND sp.fuel_type = _fuel_type
   WHERE s.location IS NOT NULL
     AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography, _radius_m)
   ORDER BY distance_m ASC
   LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.nearby_stations(double precision, double precision, integer, text, integer)
  TO anon, authenticated;
