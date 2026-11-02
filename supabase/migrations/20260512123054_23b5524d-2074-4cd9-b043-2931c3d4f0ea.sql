DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can read project assets'
  ) THEN
    CREATE POLICY "Authenticated users can read project assets"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'project-assets');
  END IF;
END $$;