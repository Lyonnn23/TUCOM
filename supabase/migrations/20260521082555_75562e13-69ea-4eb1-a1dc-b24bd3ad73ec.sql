
-- 1. PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. New columns on gas_stations
ALTER TABLE public.gas_stations
  ADD COLUMN IF NOT EXISTS cne_id           text,
  ADD COLUMN IF NOT EXISTS commune          text,
  ADD COLUMN IF NOT EXISTS region           text,
  ADD COLUMN IF NOT EXISTS payment_methods  text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS services         text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS opening_hours    jsonb,
  ADD COLUMN IF NOT EXISTS cne_last_updated timestamptz,
  ADD COLUMN IF NOT EXISTS brand_logo_url   text,
  ADD COLUMN IF NOT EXISTS location         geography(Point, 4326);

CREATE UNIQUE INDEX IF NOT EXISTS gas_stations_cne_id_uq
  ON public.gas_stations (cne_id) WHERE cne_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS gas_stations_location_gix
  ON public.gas_stations USING GIST (location);

CREATE INDEX IF NOT EXISTS gas_stations_brand_idx
  ON public.gas_stations (brand);
CREATE INDEX IF NOT EXISTS gas_stations_commune_idx
  ON public.gas_stations (commune);

-- 3. Keep location in sync with lat/lng automatically
CREATE OR REPLACE FUNCTION public.gas_stations_sync_location()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.lng IS NOT NULL AND NEW.lat IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gas_stations_sync_location ON public.gas_stations;
CREATE TRIGGER trg_gas_stations_sync_location
  BEFORE INSERT OR UPDATE OF lat, lng ON public.gas_stations
  FOR EACH ROW EXECUTE FUNCTION public.gas_stations_sync_location();

-- Backfill location for existing rows
UPDATE public.gas_stations
   SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
 WHERE location IS NULL
   AND lat IS NOT NULL AND lng IS NOT NULL;

-- 4. Spatial RPC for nearby stations
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
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.brand, s.address, s.commune, s.region, s.lat, s.lng,
         ST_Distance(s.location, ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography) AS distance_m,
         sp.price,
         sp.created_at AS price_updated_at
    FROM public.gas_stations s
    LEFT JOIN public.station_prices sp
      ON sp.station_id = s.id AND sp.fuel_type = _fuel_type
   WHERE s.location IS NOT NULL
     AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography, _radius_m)
   ORDER BY distance_m ASC
   LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.nearby_stations(double precision, double precision, integer, text, integer)
  TO anon, authenticated;

-- 5. Per-station price history
CREATE TABLE IF NOT EXISTS public.station_price_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id  uuid NOT NULL,
  fuel_type   text NOT NULL,
  price       integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sph_station_fuel_recorded_idx
  ON public.station_price_history (station_id, fuel_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS sph_recorded_idx
  ON public.station_price_history (recorded_at);

ALTER TABLE public.station_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view station price history" ON public.station_price_history;
CREATE POLICY "Anyone can view station price history"
  ON public.station_price_history FOR SELECT
  TO public USING (true);

DROP POLICY IF EXISTS "Admins manage station price history" ON public.station_price_history;
CREATE POLICY "Admins manage station price history"
  ON public.station_price_history FOR ALL
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Trigger: record history on price change
CREATE OR REPLACE FUNCTION public.record_station_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.price IS DISTINCT FROM OLD.price THEN
    INSERT INTO public.station_price_history (station_id, fuel_type, price, recorded_at)
    VALUES (NEW.station_id, NEW.fuel_type, NEW.price, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_record_station_price_change ON public.station_prices;
CREATE TRIGGER trg_record_station_price_change
  AFTER INSERT OR UPDATE OF price ON public.station_prices
  FOR EACH ROW EXECUTE FUNCTION public.record_station_price_change();

-- 6. Brand logos bucket (public read, admin write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Brand logos public read" ON storage.objects;
CREATE POLICY "Brand logos public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-logos');

DROP POLICY IF EXISTS "Admins upload brand logos" ON storage.objects;
CREATE POLICY "Admins upload brand logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brand-logos' AND is_admin());

DROP POLICY IF EXISTS "Admins update brand logos" ON storage.objects;
CREATE POLICY "Admins update brand logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'brand-logos' AND is_admin())
  WITH CHECK (bucket_id = 'brand-logos' AND is_admin());

DROP POLICY IF EXISTS "Admins delete brand logos" ON storage.objects;
CREATE POLICY "Admins delete brand logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'brand-logos' AND is_admin());

-- 7. Purge old per-station history (>90 days)
CREATE OR REPLACE FUNCTION public.purge_station_price_history()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count integer;
BEGIN
  DELETE FROM public.station_price_history
   WHERE recorded_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END $$;
