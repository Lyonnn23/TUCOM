REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.spatial_ref_sys FROM anon, authenticated;
GRANT SELECT ON public.spatial_ref_sys TO anon, authenticated;