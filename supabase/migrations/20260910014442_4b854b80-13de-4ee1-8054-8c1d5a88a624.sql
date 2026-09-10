GRANT SELECT ON public.station_prices TO authenticated;
GRANT INSERT, UPDATE ON public.station_prices TO authenticated;
GRANT ALL ON public.station_prices TO service_role;