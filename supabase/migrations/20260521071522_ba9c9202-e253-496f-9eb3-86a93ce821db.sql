
-- POINTS
CREATE TABLE IF NOT EXISTS public.user_points (
  user_id uuid PRIMARY KEY,
  total_points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view points" ON public.user_points FOR SELECT USING (true);

-- BADGES
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view badges" ON public.user_badges FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

-- REVIEW REPORTS
CREATE TABLE IF NOT EXISTS public.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, user_id)
);
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own review reports" ON public.review_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own review reports" ON public.review_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- LEADERBOARD OPT-IN
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean NOT NULL DEFAULT true;

-- AWARD POINTS + BADGES ON VERIFIED REPORT
CREATE OR REPLACE FUNCTION public.award_report_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.status = 'verified'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'verified')
     AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_points (user_id, total_points, updated_at)
    VALUES (NEW.user_id, 10, now())
    ON CONFLICT (user_id) DO UPDATE
      SET total_points = public.user_points.total_points + 10,
          updated_at = now();

    SELECT count(*) INTO v_count
      FROM public.reported_prices
      WHERE user_id = NEW.user_id AND status = 'verified';

    IF v_count >= 1 THEN
      INSERT INTO public.user_badges (user_id, badge_key)
      VALUES (NEW.user_id, 'primer_reporte') ON CONFLICT DO NOTHING;
    END IF;
    IF v_count >= 10 THEN
      INSERT INTO public.user_badges (user_id, badge_key)
      VALUES (NEW.user_id, 'diez_reportes') ON CONFLICT DO NOTHING;
    END IF;
    IF v_count >= 50 THEN
      INSERT INTO public.user_badges (user_id, badge_key)
      VALUES (NEW.user_id, 'cincuenta_reportes') ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_report_points_trigger ON public.reported_prices;
CREATE TRIGGER award_report_points_trigger
AFTER INSERT OR UPDATE ON public.reported_prices
FOR EACH ROW EXECUTE FUNCTION public.award_report_points();

-- FAVORITE BADGE
CREATE OR REPLACE FUNCTION public.check_favorite_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.favorites WHERE user_id = NEW.user_id;
  IF v_count >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_key)
    VALUES (NEW.user_id, 'favorito_frecuente') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_favorite_badge_trigger ON public.favorites;
CREATE TRIGGER check_favorite_badge_trigger
AFTER INSERT ON public.favorites
FOR EACH ROW EXECUTE FUNCTION public.check_favorite_badge();

-- MONTHLY LEADERBOARD
CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard()
RETURNS TABLE(user_id uuid, points bigint, reports bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rp.user_id,
         (count(*) * 10)::bigint AS points,
         count(*)::bigint AS reports
  FROM public.reported_prices rp
  LEFT JOIN public.user_preferences up ON up.user_id = rp.user_id
  WHERE rp.status = 'verified'
    AND rp.created_at >= date_trunc('month', now())
    AND COALESCE(up.leaderboard_opt_in, true) = true
  GROUP BY rp.user_id
  ORDER BY points DESC
  LIMIT 10;
$$;
