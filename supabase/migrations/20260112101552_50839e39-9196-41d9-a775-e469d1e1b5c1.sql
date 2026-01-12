-- Add profile_id to documents table for personal qualification certificates
ALTER TABLE public.documents 
ADD COLUMN profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for efficient profile document lookups
CREATE INDEX idx_documents_profile_id ON public.documents(profile_id);

-- Add RLS policy for users to view their own profile documents
CREATE POLICY "Users can view their own profile documents" 
ON public.documents 
FOR SELECT 
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Add RLS policy for users to create their own profile documents
CREATE POLICY "Users can create their own profile documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (
  (company_id = get_user_company_id(auth.uid())) 
  AND (profile_id IS NULL OR profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
);

-- Add RLS policy for users to delete their own profile documents  
CREATE POLICY "Users can delete their own profile documents"
ON public.documents
FOR DELETE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));