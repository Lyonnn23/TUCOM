DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p')
      AND c.relrowsecurity = false
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
      RAISE NOTICE 'RLS enabled on public.%', r.relname;
    EXCEPTION WHEN insufficient_privilege OR wrong_object_type THEN
      RAISE NOTICE 'Skipped public.% (not owner, extension-managed table)', r.relname;
    END;
  END LOOP;
END $$;