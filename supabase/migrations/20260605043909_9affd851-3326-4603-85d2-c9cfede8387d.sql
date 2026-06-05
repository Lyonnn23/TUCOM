
-- 1. Lock down search_path on the only app function missing it
ALTER FUNCTION public.generate_company_code() SET search_path = public, pg_temp;

-- 2. Brand logos bucket is public; add public SELECT so direct URLs and listings work
DROP POLICY IF EXISTS "Brand logos public read" ON storage.objects;
CREATE POLICY "Brand logos public read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'brand-logos');

-- 3. Price reports: let owners delete/update their own photos (folder = auth.uid())
DROP POLICY IF EXISTS "Users can delete own price report photos" ON storage.objects;
CREATE POLICY "Users can delete own price report photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'price-reports'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own price report photos" ON storage.objects;
CREATE POLICY "Users can update own price report photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'price-reports'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'price-reports'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
