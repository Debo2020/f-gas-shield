-- Add expiry_date column to documents table for tracking certificate/document expiration
ALTER TABLE public.documents 
ADD COLUMN expiry_date date;

-- Create index for efficient expiry lookups
CREATE INDEX idx_documents_expiry_date ON public.documents(expiry_date) 
WHERE expiry_date IS NOT NULL;