
-- Create storage bucket for project assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read files (public bucket)
CREATE POLICY "Public read access for project assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-assets');

-- Allow anyone to upload files (no auth required for now)
CREATE POLICY "Allow upload to project assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-assets');

-- Allow anyone to delete files
CREATE POLICY "Allow delete from project assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-assets');
