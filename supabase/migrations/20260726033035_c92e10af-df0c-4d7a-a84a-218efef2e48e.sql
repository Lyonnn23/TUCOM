DROP POLICY IF EXISTS "Users join org or admin adds" ON public.organization_members;

CREATE POLICY "Users join org or admin adds"
ON public.organization_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admin existente agrega a cualquiera con cualquier rol
  public.is_org_admin(auth.uid(), organization_id)
  -- Creador de la organización se agrega a sí mismo (cualquier rol, típicamente admin al crearla)
  OR (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.created_by = auth.uid()
    )
  )
  -- Self-join normal: solo como driver
  OR (user_id = auth.uid() AND role = 'driver')
);