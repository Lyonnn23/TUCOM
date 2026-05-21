
-- Extensiones para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Tabla principal
CREATE TABLE public.fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vehicle_id uuid,
  station_id uuid,
  fuel_type text NOT NULL CHECK (fuel_type IN ('gasoline93','gasoline95','gasoline97','diesel','electric')),
  liters numeric(8,3) NOT NULL CHECK (liters > 0 AND liters <= 500),
  price_per_liter integer NOT NULL CHECK (price_per_liter >= 100 AND price_per_liter <= 10000),
  total_cost integer NOT NULL CHECK (total_cost >= 100 AND total_cost <= 5000000),
  odometer_km integer CHECK (odometer_km IS NULL OR (odometer_km >= 0 AND odometer_km <= 2000000)),
  note text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fuel_logs_user_logged_at ON public.fuel_logs (user_id, logged_at DESC);
CREATE INDEX idx_fuel_logs_vehicle_logged_at ON public.fuel_logs (vehicle_id, logged_at DESC);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own fuel logs"
  ON public.fuel_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users insert own fuel logs"
  ON public.fuel_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own fuel logs"
  ON public.fuel_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own fuel logs"
  ON public.fuel_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_fuel_logs_updated_at
  BEFORE UPDATE ON public.fuel_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Preferencias adicionales
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS low_fuel_threshold_km integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS fuel_log_email_optin boolean NOT NULL DEFAULT false;

-- Función: estadísticas de consumo de un usuario (opcionalmente por vehículo)
CREATE OR REPLACE FUNCTION public.get_user_consumption_stats(_user_id uuid, _vehicle_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_real_kml numeric;
  v_total_spent integer;
  v_total_liters numeric;
  v_avg_price numeric;
  v_cost_per_km numeric;
  v_km_driven numeric;
  v_last_odo integer;
  v_last_log timestamptz;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH logs AS (
    SELECT * FROM public.fuel_logs
     WHERE user_id = _user_id
       AND (_vehicle_id IS NULL OR vehicle_id = _vehicle_id)
       AND logged_at >= now() - interval '6 months'
     ORDER BY logged_at ASC
  ),
  pairs AS (
    SELECT
      l.odometer_km - lag(l.odometer_km) OVER (ORDER BY l.logged_at) AS km_delta,
      l.liters
    FROM logs l
    WHERE l.odometer_km IS NOT NULL
  )
  SELECT
    COALESCE(SUM(CASE WHEN km_delta > 0 AND km_delta < 5000 THEN km_delta END) /
             NULLIF(SUM(CASE WHEN km_delta > 0 AND km_delta < 5000 THEN liters END), 0), NULL),
    COALESCE(SUM(CASE WHEN km_delta > 0 AND km_delta < 5000 THEN km_delta END), 0)
  INTO v_real_kml, v_km_driven
  FROM pairs;

  SELECT
    COALESCE(SUM(total_cost), 0),
    COALESCE(SUM(liters), 0),
    CASE WHEN SUM(liters) > 0 THEN SUM(total_cost) / SUM(liters) END,
    MAX(odometer_km),
    MAX(logged_at)
  INTO v_total_spent, v_total_liters, v_avg_price, v_last_odo, v_last_log
  FROM public.fuel_logs
  WHERE user_id = _user_id
    AND (_vehicle_id IS NULL OR vehicle_id = _vehicle_id)
    AND logged_at >= now() - interval '6 months';

  IF v_km_driven > 0 THEN
    v_cost_per_km := v_total_spent::numeric / v_km_driven;
  END IF;

  RETURN jsonb_build_object(
    'real_kml', v_real_kml,
    'total_spent_6m', v_total_spent,
    'total_liters_6m', v_total_liters,
    'avg_price_paid', v_avg_price,
    'cost_per_km', v_cost_per_km,
    'km_driven_6m', v_km_driven,
    'last_odometer_km', v_last_odo,
    'last_log_at', v_last_log
  );
END $$;

-- Función: gasto mensual últimos N meses
CREATE OR REPLACE FUNCTION public.get_monthly_fuel_spend(_user_id uuid, _months integer DEFAULT 6)
RETURNS TABLE(month date, total_clp bigint, liters numeric, avg_price numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT date_trunc('month', d)::date AS month
    FROM generate_series(
      date_trunc('month', now() - ((_months - 1) || ' months')::interval),
      date_trunc('month', now()),
      '1 month'
    ) d
  )
  SELECT m.month,
         COALESCE(SUM(fl.total_cost), 0)::bigint AS total_clp,
         COALESCE(SUM(fl.liters), 0)::numeric AS liters,
         CASE WHEN SUM(fl.liters) > 0 THEN (SUM(fl.total_cost) / SUM(fl.liters))::numeric END AS avg_price
    FROM months m
    LEFT JOIN public.fuel_logs fl
      ON fl.user_id = _user_id
     AND date_trunc('month', fl.logged_at)::date = m.month
   GROUP BY m.month
   ORDER BY m.month ASC;
END $$;

-- Función: promedio de mercado para un tipo de combustible
CREATE OR REPLACE FUNCTION public.get_market_avg_price(_fuel_type text)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT AVG(price)::numeric
    FROM public.station_prices
   WHERE fuel_type = _fuel_type;
$$;
