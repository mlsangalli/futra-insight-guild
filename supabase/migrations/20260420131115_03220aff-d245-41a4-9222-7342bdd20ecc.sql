-- Bucket privado + policy de leitura por path (signed URLs ainda funcionam)
UPDATE storage.buckets SET public = false WHERE id = 'market-images';

CREATE POLICY "Anyone can read market-images via signed url"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'market-images');
