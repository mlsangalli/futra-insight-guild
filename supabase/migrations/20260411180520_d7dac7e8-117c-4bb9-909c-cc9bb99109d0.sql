-- Add image columns to markets table
ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS image_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_alt text DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_source text DEFAULT '';

-- Create storage bucket for market images
INSERT INTO storage.buckets (id, name, public)
VALUES ('market-images', 'market-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for market-images bucket
CREATE POLICY "Admins can upload market images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view market images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'market-images');

CREATE POLICY "Admins can delete market images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update market images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'market-images' AND public.has_role(auth.uid(), 'admin'));