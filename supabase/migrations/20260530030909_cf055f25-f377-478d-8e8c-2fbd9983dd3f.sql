
-- Expand vehicles_catalog backward (2010-2017) by cloning each 2018 row.
-- Older cars typically consume 3-8% more.
INSERT INTO public.vehicles_catalog (
  brand, model, year, version, fuel_type,
  consumption_city, consumption_mixed, consumption_hwy, kwh_per_km,
  engine_cc, transmission, drive_type, body_type,
  co2_city, co2_mixed, popularity_rank
)
SELECT
  v.brand, v.model, y.year, v.version, v.fuel_type,
  ROUND((v.consumption_city  * (1 - (2018 - y.year) * 0.012))::numeric, 2),
  ROUND((v.consumption_mixed * (1 - (2018 - y.year) * 0.012))::numeric, 2),
  ROUND((v.consumption_hwy   * (1 - (2018 - y.year) * 0.012))::numeric, 2),
  v.kwh_per_km,
  v.engine_cc, v.transmission, v.drive_type, v.body_type,
  v.co2_city, v.co2_mixed, v.popularity_rank
FROM public.vehicles_catalog v
CROSS JOIN (VALUES (2010),(2011),(2012),(2013),(2014),(2015),(2016),(2017)) AS y(year)
WHERE v.year = 2018
  AND v.fuel_type <> 'electric'
  AND NOT EXISTS (
    SELECT 1 FROM public.vehicles_catalog v2
    WHERE v2.brand = v.brand AND v2.model = v.model
      AND v2.year = y.year AND v2.version = v.version
  );
