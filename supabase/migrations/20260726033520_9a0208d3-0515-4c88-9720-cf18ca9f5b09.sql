CREATE OR REPLACE FUNCTION public.is_org_creator(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org_id AND created_by = _user_id);
$$;

REVOKE EXECUTE ON FUNCTION public.is_org_creator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_creator(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users join org or admin adds" ON public.organization_members;

CREATE POLICY "Users join org or admin adds"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_org_admin(auth.uid(), organization_id)
  OR (user_id = auth.uid() AND public.is_org_creator(auth.uid(), organization_id))
  OR (user_id = auth.uid() AND role = 'driver')
);