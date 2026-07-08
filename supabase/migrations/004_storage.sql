-- Storage buckets and policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('hospital-documents', 'hospital-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('declaration-documents', 'declaration-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('verification-documents', 'verification-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload/read based on declaration access
CREATE POLICY storage_hospital_docs ON storage.objects FOR ALL
  USING (bucket_id IN ('hospital-documents', 'declaration-documents', 'verification-documents')
    AND auth.role() = 'authenticated');
