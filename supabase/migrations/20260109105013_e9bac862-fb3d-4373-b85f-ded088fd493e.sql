-- Force PostgREST to reload schema cache so new RLS policy takes effect immediately
NOTIFY pgrst, 'reload schema';