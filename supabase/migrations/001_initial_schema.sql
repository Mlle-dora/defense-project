-- eBirth Cameroon: Initial Schema
-- Migration 001

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
CREATE TYPE user_role AS ENUM ('super_admin', 'hospital', 'civil_officer');
CREATE TYPE declaration_status AS ENUM (
  'draft', 'submitted', 'received', 'under_review',
  'pending_documents', 'registered', 'certificate_ready', 'rejected', 'expired'
);
CREATE TYPE notification_event AS ENUM (
  'declaration_submitted', 'declaration_received', 'reminder',
  'registration_completed', 'certificate_ready'
);
CREATE TYPE notification_channel AS ENUM ('email', 'sms');
CREATE TYPE notification_delivery_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE audit_action AS ENUM (
  'login', 'logout', 'create', 'update', 'delete', 'submit',
  'approve', 'reject', 'notification_sent', 'password_reset', 'register', 'certificate_ready'
);
CREATE TYPE contact_type AS ENUM ('mother', 'father', 'guardian');
CREATE TYPE document_type AS ENUM ('hospital', 'supporting', 'verification');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE entity_status AS ENUM ('active', 'inactive');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hospitals
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  division TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_hospitals_region ON hospitals(region);
CREATE INDEX idx_hospitals_status ON hospitals(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_hospitals_deleted ON hospitals(deleted_at);

-- Civil Status Centers
CREATE TABLE civil_status_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reference_number TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL,
  division TEXT NOT NULL,
  subdivision TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  officer_name TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_email TEXT,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_civil_centers_region ON civil_status_centers(region);
CREATE INDEX idx_civil_centers_status ON civil_status_centers(status) WHERE deleted_at IS NULL;

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL,
  hospital_id UUID REFERENCES hospitals(id),
  civil_status_center_id UUID REFERENCES civil_status_centers(id),
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'fr')),
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_hospital ON profiles(hospital_id);
CREATE INDEX idx_profiles_civil_center ON profiles(civil_status_center_id);

-- Declaration sequences for number generation
CREATE TABLE declaration_sequences (
  region TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (region, year)
);

-- Birth Declarations
CREATE TABLE birth_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_number TEXT UNIQUE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  civil_status_center_id UUID NOT NULL REFERENCES civil_status_centers(id) ON DELETE RESTRICT,
  workflow_status declaration_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ,
  registration_number TEXT,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  search_vector TSVECTOR,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_declarations_hospital_status ON birth_declarations(hospital_id, workflow_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_declarations_civil_status ON birth_declarations(civil_status_center_id, workflow_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_declarations_number ON birth_declarations(declaration_number);
CREATE INDEX idx_declarations_search ON birth_declarations USING GIN(search_vector);
CREATE INDEX idx_declarations_created ON birth_declarations(created_at DESC);

-- Children
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL UNIQUE REFERENCES birth_declarations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  gender gender_type NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  birth_weight_kg NUMERIC(5,2),
  birth_place TEXT NOT NULL,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_children_name ON children USING GIN(full_name gin_trgm_ops);

-- Mothers
CREATE TABLE mothers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL UNIQUE REFERENCES birth_declarations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  nationality TEXT NOT NULL DEFAULT 'Cameroonian',
  occupation TEXT,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  id_number TEXT,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_mothers_name ON mothers USING GIN(full_name gin_trgm_ops);

-- Fathers (optional)
CREATE TABLE fathers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL UNIQUE REFERENCES birth_declarations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  nationality TEXT,
  occupation TEXT,
  phone TEXT,
  address TEXT,
  id_number TEXT,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- Parent Contacts (notification targets)
CREATE TABLE parent_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES birth_declarations(id) ON DELETE CASCADE,
  contact_type contact_type NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_channel notification_channel NOT NULL DEFAULT 'sms',
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_parent_contacts_declaration ON parent_contacts(declaration_id);

-- Declaration Documents
CREATE TABLE declaration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES birth_declarations(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_declaration ON declaration_documents(declaration_id);

-- Registration Records
CREATE TABLE registration_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL UNIQUE REFERENCES birth_declarations(id) ON DELETE CASCADE,
  registered_by UUID NOT NULL REFERENCES auth.users(id),
  registration_number TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- Notifications queue
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID REFERENCES birth_declarations(id) ON DELETE SET NULL,
  event_type notification_event NOT NULL,
  channel notification_channel NOT NULL,
  recipient TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  notification_status notification_delivery_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_status ON notifications(notification_status) WHERE notification_status = 'pending';
CREATE INDEX idx_notifications_declaration ON notifications(declaration_id);

-- Audit Logs (immutable)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Reports Snapshots
CREATE TABLE reports_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_reports_type_period ON reports_snapshots(report_type, period_start, period_end);

-- System Settings
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  status entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ
);

-- Apply updated_at triggers
CREATE TRIGGER tr_hospitals_updated BEFORE UPDATE ON hospitals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_civil_centers_updated BEFORE UPDATE ON civil_status_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_declarations_updated BEFORE UPDATE ON birth_declarations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_children_updated BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_mothers_updated BEFORE UPDATE ON mothers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_fathers_updated BEFORE UPDATE ON fathers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_parent_contacts_updated BEFORE UPDATE ON parent_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_documents_updated BEFORE UPDATE ON declaration_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_registration_updated BEFORE UPDATE ON registration_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_notifications_updated BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_audit_updated BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_reports_updated BEFORE UPDATE ON reports_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER tr_settings_updated BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Search vector update function
CREATE OR REPLACE FUNCTION update_declaration_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  child_name TEXT;
  mother_name TEXT;
  father_name TEXT;
BEGIN
  SELECT c.full_name INTO child_name FROM children c WHERE c.declaration_id = NEW.id;
  SELECT m.full_name INTO mother_name FROM mothers m WHERE m.declaration_id = NEW.id;
  SELECT f.full_name INTO father_name FROM fathers f WHERE f.declaration_id = NEW.id;

  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.declaration_number, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(child_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(mother_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(father_name, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.registration_number, '')), 'A');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_declaration_search
  BEFORE INSERT OR UPDATE ON birth_declarations
  FOR EACH ROW EXECUTE FUNCTION update_declaration_search_vector();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'hospital')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
