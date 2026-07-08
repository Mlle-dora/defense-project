-- eBirth Cameroon: Seed Data for Development
-- Run after migrations 001-004
-- Safe to re-run: uses ON CONFLICT DO NOTHING

-- Hospitals
INSERT INTO hospitals (id, name, code, region, division, address, contact_phone, contact_email) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Centre Hospitalier Universitaire de Yaoundé', 'CHUY', 'Centre', 'Mfoundi', 'Avenue Henri Dunant, Yaoundé', '+237222234567', 'contact@chuy.cm'),
  ('a0000000-0000-0000-0000-000000000002', 'Hôpital Général de Douala', 'HGD', 'Littoral', 'Wouri', 'Boulevard de la Liberté, Douala', '+237233456789', 'contact@hgd.cm'),
  ('a0000000-0000-0000-0000-000000000003', 'Hôpital Régional de Bafoussam', 'HRB', 'Ouest', 'Mifi', 'Quartier Tamdja, Bafoussam', '+237233678901', 'contact@hrb.cm')
ON CONFLICT (id) DO NOTHING;

-- Civil Status Centers
INSERT INTO civil_status_centers (id, name, reference_number, region, division, subdivision, address, officer_name, contact_phone, contact_email) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Centre d''État Civil Yaoundé I', 'CEC-YDE-001', 'Centre', 'Mfoundi', 'Yaoundé I', 'Mairie de Yaoundé I', 'M. Jean Baptiste Nkomo', '+237222111222', 'cec.yde1@mairie.cm'),
  ('b0000000-0000-0000-0000-000000000002', 'Centre d''État Civil Douala III', 'CEC-DLA-003', 'Littoral', 'Wouri', 'Douala III', 'Mairie de Douala III', 'Mme Marie Essomba', '+237233222333', 'cec.dla3@mairie.cm'),
  ('b0000000-0000-0000-0000-000000000003', 'Centre d''État Civil Bafoussam', 'CEC-BAF-001', 'Ouest', 'Mifi', 'Bafoussam', 'Mairie de Bafoussam', 'M. Paul Fotsing', '+237233444555', 'cec.baf@mairie.cm')
ON CONFLICT (id) DO NOTHING;

-- System Settings
INSERT INTO system_settings (key, value, description, is_sensitive) VALUES
  ('reminder_days_before_deadline', '{"days": 30}', 'Days before registration deadline to send reminder', false),
  ('registration_deadline_days', '{"days": 90}', 'Legal deadline for birth registration in days', false),
  ('platform_name', '{"en": "eBirth Cameroon", "fr": "eBirth Cameroun"}', 'Platform display name', false),
  ('notification_retry_max', '{"max": 3}', 'Maximum notification retry attempts', false),
  ('sms_provider', '{"provider": "mock"}', 'Active SMS provider', true)
ON CONFLICT (key) DO NOTHING;

-- Note: Test users must be created via Supabase Auth dashboard or admin API.
-- After creating auth users, update their profiles:
--
-- Super Admin:
-- UPDATE profiles SET role = 'super_admin', full_name = 'Admin User' WHERE email = 'admin@ebirth.cm';
--
-- Hospital User:
-- UPDATE profiles SET role = 'hospital', hospital_id = 'a0000000-0000-0000-0000-000000000001', full_name = 'Dr. Alice Hospital' WHERE email = 'hospital@ebirth.cm';
--
-- Civil Officer:
-- UPDATE profiles SET role = 'civil_officer', civil_status_center_id = 'b0000000-0000-0000-0000-000000000001', full_name = 'Officer Civil' WHERE email = 'civil@ebirth.cm';
