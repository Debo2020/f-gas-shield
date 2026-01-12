-- Allow authenticated users to read files from their company folder
CREATE POLICY "Company members can read their documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'compliance-documents' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to upload to their company folder
CREATE POLICY "Company members can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'compliance-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their company's documents
CREATE POLICY "Company members can delete their documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'compliance-documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.profiles WHERE user_id = auth.uid()
  )
);