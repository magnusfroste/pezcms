-- Create storage bucket for CMS images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-images', 'cms-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cms-images');

-- Allow authenticated users to update their own images
CREATE POLICY "Authenticated users can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'cms-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'cms-images');

-- Allow public read access to images
CREATE POLICY "Anyone can view cms images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'cms-images');