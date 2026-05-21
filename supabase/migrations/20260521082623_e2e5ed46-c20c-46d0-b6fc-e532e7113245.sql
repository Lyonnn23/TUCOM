
-- Switch nearby_stations to SECURITY INVOKER (relies on existing public read policies)
CREATE OR REPLACE FUNCTION public.nearby_stations(
  _lat        double precision,
  _lng        double precision,
  _radius_m   integer DEFAULT 15000,
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
    LEFT JOIN public.station_prices sp
      ON sp.station_id = s.id AND sp.fuel_type = _fuel_type
   WHERE s.location IS NOT NULL
     AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography, _radius_m)
   ORDER BY distance_m ASC
   LIMIT GREATEST(_limit, 1);
$$;

-- Restrict bucket LISTING to admins (individual file URLs remain public via the public flag)
DROP POLICY IF EXISTS "Brand logos public read" ON storage.objects;
CREATE POLICY "Brand logos admin list"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'brand-logos' AND is_admin());
