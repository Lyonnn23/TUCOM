CREATE OR REPLACE FUNCTION public.get_fuel_price_averages()
RETURNS TABLE(fuel_type text, avg_price bigint, station_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fuel_type, round(avg(price))::bigint as avg_price, count(*)::bigint as station_count
  FROM station_prices
  WHERE fuel_type IN ('gasoline93', 'gasoline95', 'gasoline97', 'diesel')
  GROUP BY fuel_type;
$$;