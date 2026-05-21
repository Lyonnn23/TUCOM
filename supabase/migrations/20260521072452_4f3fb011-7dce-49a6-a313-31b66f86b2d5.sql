
-- 1. Roles enum + table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. Station views
CREATE TABLE IF NOT EXISTS public.station_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL,
  user_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_station_views_station ON public.station_views(station_id);
CREATE INDEX IF NOT EXISTS idx_station_views_viewed_at ON public.station_views(viewed_at);
ALTER TABLE public.station_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can log view" ON public.station_views;
CREATE POLICY "Anyone can log view" ON public.station_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins view all views" ON public.station_views;
CREATE POLICY "Admins view all views" ON public.station_views FOR SELECT TO authenticated
  USING (public.is_admin());

-- 3. Admin settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read settings" ON public.admin_settings;
CREATE POLICY "Admins read settings" ON public.admin_settings FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins write settings" ON public.admin_settings;
CREATE POLICY "Admins write settings" ON public.admin_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.admin_settings (key, value) VALUES
  ('auto_approve_threshold_pct', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. User suspensions
CREATE TABLE IF NOT EXISTS public.user_suspensions (
  user_id uuid PRIMARY KEY,
  reason text,
  suspended_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage suspensions" ON public.user_suspensions;
CREATE POLICY "Admins manage suspensions" ON public.user_suspensions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Admin overrides on existing tables
DROP POLICY IF EXISTS "Admins manage stations" ON public.gas_stations;
CREATE POLICY "Admins manage stations" ON public.gas_stations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage station prices" ON public.station_prices;
CREATE POLICY "Admins manage station prices" ON public.station_prices FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins view all reports" ON public.reported_prices;
CREATE POLICY "Admins view all reports" ON public.reported_prices FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update reports" ON public.reported_prices;
CREATE POLICY "Admins update reports" ON public.reported_prices FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins delete reports" ON public.reported_prices;
CREATE POLICY "Admins delete reports" ON public.reported_prices FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins view all alerts" ON public.price_alerts;
CREATE POLICY "Admins view all alerts" ON public.price_alerts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins view all favorites" ON public.favorites;
CREATE POLICY "Admins view all favorites" ON public.favorites FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins view all preferences" ON public.user_preferences;
CREATE POLICY "Admins view all preferences" ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 6. Admin RPCs
CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'active_users_7d', (SELECT count(*) FROM auth.users WHERE last_sign_in_at >= now() - interval '7 days'),
    'total_reports', (SELECT count(*) FROM public.reported_prices),
    'pending_reports', (SELECT count(*) FROM public.reported_prices WHERE status = 'pending'),
    'total_alerts', (SELECT count(*) FROM public.price_alerts),
    'active_alerts', (SELECT count(*) FROM public.price_alerts WHERE active = true)
  ) INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_daily_active_users(_days int DEFAULT 30)
RETURNS TABLE(day date, users bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT d::date AS day,
           (SELECT count(DISTINCT u.id) FROM auth.users u
              WHERE u.last_sign_in_at::date = d::date)::bigint AS users
    FROM generate_series((now() - (_days || ' days')::interval)::date, now()::date, '1 day') d;
END $$;

CREATE OR REPLACE FUNCTION public.get_top_viewed_stations(_limit int DEFAULT 10)
RETURNS TABLE(station_id uuid, name text, brand text, views bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT sv.station_id, gs.name, gs.brand, count(*)::bigint AS views
    FROM public.station_views sv
    JOIN public.gas_stations gs ON gs.id = sv.station_id
    WHERE sv.viewed_at >= now() - interval '30 days'
    GROUP BY sv.station_id, gs.name, gs.brand
    ORDER BY views DESC
    LIMIT _limit;
END $$;

CREATE OR REPLACE FUNCTION public.get_search_heatmap()
RETURNS TABLE(lat double precision, lng double precision, weight int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT ps.lat, ps.lng, 1::int
    FROM public.push_subscriptions ps
    WHERE ps.lat IS NOT NULL AND ps.lng IS NOT NULL
    LIMIT 5000;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target uuid, _role public.app_role, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_target, _role)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _target AND role = _role;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_verify_report(_report_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.reported_prices WHERE id = _report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'report not found'; END IF;
  UPDATE public.reported_prices
     SET status = 'verified', verified_at = now()
   WHERE id = _report_id;
  INSERT INTO public.station_prices (station_id, fuel_type, price, reported_by)
  VALUES (r.station_id, r.fuel_type, r.price, r.user_id);
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_report(_report_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.reported_prices SET status = 'rejected' WHERE id = _report_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_search_users(_query text)
RETURNS TABLE(user_id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, is_admin boolean, is_suspended boolean, reports bigint, favorites bigint, alerts bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT u.id,
           u.email::text,
           u.created_at,
           u.last_sign_in_at,
           EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin') AS is_admin,
           EXISTS(SELECT 1 FROM public.user_suspensions s WHERE s.user_id = u.id) AS is_suspended,
           (SELECT count(*) FROM public.reported_prices rp WHERE rp.user_id = u.id)::bigint,
           (SELECT count(*) FROM public.favorites f WHERE f.user_id = u.id)::bigint,
           (SELECT count(*) FROM public.price_alerts pa WHERE pa.user_id = u.id)::bigint
    FROM auth.users u
    WHERE (_query IS NULL OR _query = '' OR u.email ILIKE '%' || _query || '%')
    ORDER BY u.created_at DESC
    LIMIT 50;
END $$;
