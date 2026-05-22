CREATE TABLE public.vehicles_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  version text NOT NULL,
  fuel_type text NOT NULL CHECK (fuel_type IN ('gasoline93','gasoline95','gasoline97','diesel','electric','hybrid')),
  consumption_city real,
  consumption_mixed real,
  consumption_hwy real,
  kwh_per_km real,
  engine_cc integer,
  transmission text,
  drive_type text,
  body_type text,
  co2_city real,
  co2_mixed real,
  cit_code text,
  source text NOT NULL DEFAULT 'consumovehicular.cl',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_brand ON public.vehicles_catalog(brand);
CREATE INDEX idx_catalog_brand_model ON public.vehicles_catalog(brand, model);
CREATE INDEX idx_catalog_fuel ON public.vehicles_catalog(fuel_type);
CREATE INDEX idx_catalog_brand_model_year ON public.vehicles_catalog(brand, model, year DESC);

ALTER TABLE public.vehicles_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads catalog"
  ON public.vehicles_catalog FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins manage catalog"
  ON public.vehicles_catalog FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());