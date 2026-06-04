CREATE POLICY "Org members can update asset photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'asset-photos' AND is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid))
WITH CHECK (bucket_id = 'asset-photos' AND is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid));