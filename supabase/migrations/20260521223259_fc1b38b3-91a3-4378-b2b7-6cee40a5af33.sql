
-- =========================================================
-- Organizations & Fleet Management
-- =========================================================

-- Helper: generate unique 8-char company code
CREATE OR REPLACE FUNCTION public.generate_company_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
  exists_count int;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    SELECT count(*) INTO exists_count FROM public.organizations WHERE company_code = result;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN result;
END;
$$;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_code text NOT NULL UNIQUE,
  logo_url text,
  plan text NOT NULL DEFAULT 'basico',
  max_vehicles int NOT NULL DEFAULT 3,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'driver' CHECK (role IN ('admin','driver')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);

-- Add org link to vehicles
ALTER TABLE public.user_vehicles
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_user_vehicles_org ON public.user_vehicles(organization_id);

-- Security-definer helpers
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
                 WHERE user_id = _user_id AND organization_id = _org_id);
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
                 WHERE user_id = _user_id AND organization_id = _org_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.get_user_org(_user_id uuid)
RETURNS TABLE(organization_id uuid, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id, role FROM public.organization_members
  WHERE user_id = _user_id ORDER BY joined_at ASC LIMIT 1;
$$;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- organizations policies
CREATE POLICY "Members view their org" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id) OR is_admin());

CREATE POLICY "Authenticated can create org" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Org admins update org" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), id))
  WITH CHECK (public.is_org_admin(auth.uid(), id));

CREATE POLICY "Org admins delete org" ON public.organizations
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid(), id));

-- members policies
CREATE POLICY "Users view org members of their org" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id) OR is_admin());

CREATE POLICY "Users join org or admin adds" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins update members" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id))
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins or self remove member" ON public.organization_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(auth.uid(), organization_id));

-- Extend user_vehicles/fuel_logs visibility for fleet admins
CREATE POLICY "Org admins view fleet vehicles" ON public.user_vehicles
  FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins view fleet fuel logs" ON public.fuel_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_vehicles v
    WHERE v.id = fuel_logs.vehicle_id
      AND v.organization_id IS NOT NULL
      AND public.is_org_admin(auth.uid(), v.organization_id)
  ));

-- updated_at trigger for organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fleet aggregate functions
CREATE OR REPLACE FUNCTION public.get_fleet_stats(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_org_member(auth.uid(), _org_id) OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH this_month AS (
    SELECT fl.*
    FROM public.fuel_logs fl
    JOIN public.user_vehicles v ON v.id = fl.vehicle_id
    WHERE v.organization_id = _org_id
      AND fl.logged_at >= date_trunc('month', now())
  ),
  km AS (
    SELECT vehicle_id,
           MAX(odometer_km) - MIN(odometer_km) AS km
    FROM public.fuel_logs fl
    JOIN public.user_vehicles v ON v.id = fl.vehicle_id
    WHERE v.organization_id = _org_id
      AND fl.odometer_km IS NOT NULL
    GROUP BY vehicle_id
  )
  SELECT jsonb_build_object(
    'vehicle_count', (SELECT count(*) FROM public.user_vehicles WHERE organization_id = _org_id),
    'driver_count', (SELECT count(DISTINCT user_id) FROM public.organization_members WHERE organization_id = _org_id),
    'month_spend', COALESCE((SELECT sum(total_cost) FROM this_month), 0),
    'month_liters', COALESCE((SELECT sum(liters) FROM this_month), 0),
    'total_km', COALESCE((SELECT sum(km) FROM km WHERE km > 0), 0),
    'avg_cost_per_km', CASE
      WHEN COALESCE((SELECT sum(km) FROM km WHERE km > 0), 0) > 0
      THEN (SELECT sum(total_cost) FROM public.fuel_logs fl
            JOIN public.user_vehicles v ON v.id = fl.vehicle_id
            WHERE v.organization_id = _org_id)::numeric
           / NULLIF((SELECT sum(km) FROM km WHERE km > 0), 0)
      ELSE NULL
    END
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_fleet_breakdown(_org_id uuid)
RETURNS TABLE(
  vehicle_id uuid,
  nickname text,
  brand text,
  model text,
  driver_id uuid,
  month_spend bigint,
  total_spend bigint,
  total_liters numeric,
  total_km integer,
  cost_per_km numeric,
  last_log_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_org_member(auth.uid(), _org_id) OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    v.id,
    v.nickname,
    v.brand,
    v.model,
    v.user_id,
    COALESCE(SUM(fl.total_cost) FILTER (WHERE fl.logged_at >= date_trunc('month', now())), 0)::bigint,
    COALESCE(SUM(fl.total_cost), 0)::bigint,
    COALESCE(SUM(fl.liters), 0)::numeric,
    GREATEST(COALESCE(MAX(fl.odometer_km) - MIN(fl.odometer_km), 0), 0)::int,
    CASE
      WHEN (MAX(fl.odometer_km) - MIN(fl.odometer_km)) > 0
      THEN SUM(fl.total_cost)::numeric / NULLIF(MAX(fl.odometer_km) - MIN(fl.odometer_km), 0)
      ELSE NULL
    END,
    MAX(fl.logged_at)
  FROM public.user_vehicles v
  LEFT JOIN public.fuel_logs fl ON fl.vehicle_id = v.id
  WHERE v.organization_id = _org_id
  GROUP BY v.id, v.nickname, v.brand, v.model, v.user_id
  ORDER BY month_spend DESC;
END;
$$;

-- Org logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('org-logos','org-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Org logos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'org-logos');

CREATE POLICY "Org admins upload logo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-logos'
    AND public.is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "Org admins update logo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'org-logos'
    AND public.is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid));

CREATE POLICY "Org admins delete logo" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'org-logos'
    AND public.is_org_admin(auth.uid(), ((storage.foldername(name))[1])::uuid));
