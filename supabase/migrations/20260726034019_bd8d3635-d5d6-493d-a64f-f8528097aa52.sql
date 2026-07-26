-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  granted_by uuid,
  is_self_grant boolean NOT NULL DEFAULT false,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE')),
  previous_role text,
  new_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org admins can view audit log for their org" ON public.admin_audit_log;
CREATE POLICY "Org admins can view audit log for their org"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE INDEX IF NOT EXISTS admin_audit_log_org_idx ON public.admin_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON public.admin_audit_log(target_user_id);

-- 2) Trigger function: records every INSERT/UPDATE on organization_members where role='admin'
CREATE OR REPLACE FUNCTION public.log_admin_role_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    INSERT INTO public.admin_audit_log (
      organization_id, target_user_id, granted_by, is_self_grant, operation, previous_role, new_role
    ) VALUES (
      NEW.organization_id, NEW.user_id, v_actor, v_actor IS NOT DISTINCT FROM NEW.user_id, 'INSERT', NULL, NEW.role
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.role = 'admin' AND OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.admin_audit_log (
      organization_id, target_user_id, granted_by, is_self_grant, operation, previous_role, new_role
    ) VALUES (
      NEW.organization_id, NEW.user_id, v_actor, v_actor IS NOT DISTINCT FROM NEW.user_id, 'UPDATE', OLD.role, NEW.role
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_admin_role_grant ON public.organization_members;
CREATE TRIGGER trg_log_admin_role_grant
  AFTER INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_role_grant();