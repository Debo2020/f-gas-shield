-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

-- Allow authenticated users to view all logos (public bucket)
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow company owners to upload their company logo
CREATE POLICY "Owners can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.companies 
    WHERE id = public.get_user_company_id(auth.uid())
  )
  AND public.has_role(auth.uid(), 'owner')
);

-- Allow company owners to update their company logo
CREATE POLICY "Owners can update company logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.companies 
    WHERE id = public.get_user_company_id(auth.uid())
  )
  AND public.has_role(auth.uid(), 'owner')
);

-- Allow company owners to delete their company logo
CREATE POLICY "Owners can delete company logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM public.companies 
    WHERE id = public.get_user_company_id(auth.uid())
  )
  AND public.has_role(auth.uid(), 'owner')
);