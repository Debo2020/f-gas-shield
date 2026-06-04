CREATE POLICY "Users can delete own support attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'support-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);