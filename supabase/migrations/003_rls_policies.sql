-- eBirth Cameroon: Row Level Security Policies
-- Migration 003

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE civil_status_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE birth_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE mothers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fathers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE declaration_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE declaration_sequences ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (id = auth.uid() OR is_super_admin());

CREATE POLICY profiles_select_admin ON profiles FOR SELECT
  USING (is_super_admin());

CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_admin_all ON profiles FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Hospitals
CREATE POLICY hospitals_select ON hospitals FOR SELECT
  USING (deleted_at IS NULL AND (
    is_super_admin() OR auth_user_role() IN ('hospital', 'civil_officer')
  ));

CREATE POLICY hospitals_admin ON hospitals FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Civil Status Centers
CREATE POLICY civil_centers_select ON civil_status_centers FOR SELECT
  USING (deleted_at IS NULL AND (
    is_super_admin() OR auth_user_role() IN ('hospital', 'civil_officer')
  ));

CREATE POLICY civil_centers_admin ON civil_status_centers FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Birth Declarations
CREATE POLICY declarations_hospital_select ON birth_declarations FOR SELECT
  USING (
    deleted_at IS NULL AND (
      is_super_admin()
      OR (auth_user_role() = 'hospital' AND hospital_id = auth_hospital_id())
      OR (auth_user_role() = 'civil_officer' AND civil_status_center_id = auth_civil_status_center_id())
    )
  );

CREATE POLICY declarations_hospital_insert ON birth_declarations FOR INSERT
  WITH CHECK (
    auth_user_role() = 'hospital'
    AND hospital_id = auth_hospital_id()
    AND workflow_status = 'draft'
  );

CREATE POLICY declarations_hospital_update ON birth_declarations FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      is_super_admin()
      OR (auth_user_role() = 'hospital' AND hospital_id = auth_hospital_id() AND workflow_status IN ('draft', 'rejected'))
      OR (auth_user_role() = 'civil_officer' AND civil_status_center_id = auth_civil_status_center_id() AND workflow_status != 'draft')
    )
  );

CREATE POLICY declarations_admin_delete ON birth_declarations FOR UPDATE
  USING (is_super_admin());

-- Children, Mothers, Fathers, Parent Contacts (follow declaration access)
CREATE POLICY children_access ON children FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM birth_declarations bd
      WHERE bd.id = children.declaration_id AND bd.deleted_at IS NULL
        AND (
          is_super_admin()
          OR (auth_user_role() = 'hospital' AND bd.hospital_id = auth_hospital_id())
          OR (auth_user_role() = 'civil_officer' AND bd.civil_status_center_id = auth_civil_status_center_id())
        )
    )
  );

CREATE POLICY mothers_access ON mothers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM birth_declarations bd
      WHERE bd.id = mothers.declaration_id AND bd.deleted_at IS NULL
        AND (
          is_super_admin()
          OR (auth_user_role() = 'hospital' AND bd.hospital_id = auth_hospital_id())
          OR (auth_user_role() = 'civil_officer' AND bd.civil_status_center_id = auth_civil_status_center_id())
        )
    )
  );

CREATE POLICY fathers_access ON fathers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM birth_declarations bd
      WHERE bd.id = fathers.declaration_id AND bd.deleted_at IS NULL
        AND (
          is_super_admin()
          OR (auth_user_role() = 'hospital' AND bd.hospital_id = auth_hospital_id())
          OR (auth_user_role() = 'civil_officer' AND bd.civil_status_center_id = auth_civil_status_center_id())
        )
    )
  );

CREATE POLICY parent_contacts_access ON parent_contacts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM birth_declarations bd
      WHERE bd.id = parent_contacts.declaration_id AND bd.deleted_at IS NULL
        AND (
          is_super_admin()
          OR (auth_user_role() = 'hospital' AND bd.hospital_id = auth_hospital_id())
          OR (auth_user_role() = 'civil_officer' AND bd.civil_status_center_id = auth_civil_status_center_id())
        )
    )
  );

-- Documents
CREATE POLICY documents_access ON declaration_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM birth_declarations bd
      WHERE bd.id = declaration_documents.declaration_id AND bd.deleted_at IS NULL
        AND (
          is_super_admin()
          OR (auth_user_role() = 'hospital' AND bd.hospital_id = auth_hospital_id())
          OR (auth_user_role() = 'civil_officer' AND bd.civil_status_center_id = auth_civil_status_center_id())
        )
    )
  );

-- Registration Records
CREATE POLICY registration_access ON registration_records FOR ALL
  USING (
    is_super_admin()
    OR auth_user_role() = 'civil_officer'
    OR EXISTS (
      SELECT 1 FROM birth_declarations bd
      WHERE bd.id = registration_records.declaration_id
        AND bd.hospital_id = auth_hospital_id()
    )
  );

-- Notifications
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM birth_declarations bd
      WHERE bd.id = notifications.declaration_id
        AND (
          (auth_user_role() = 'hospital' AND bd.hospital_id = auth_hospital_id())
          OR (auth_user_role() = 'civil_officer' AND bd.civil_status_center_id = auth_civil_status_center_id())
        )
    )
  );

CREATE POLICY notifications_service ON notifications FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Audit Logs
CREATE POLICY audit_logs_select ON audit_logs FOR SELECT
  USING (is_super_admin());

CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid() OR is_super_admin());

-- Reports
CREATE POLICY reports_select ON reports_snapshots FOR SELECT
  USING (is_super_admin() OR auth_user_role() IN ('hospital', 'civil_officer'));

CREATE POLICY reports_admin ON reports_snapshots FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- System Settings
CREATE POLICY settings_select ON system_settings FOR SELECT
  USING (deleted_at IS NULL AND (is_super_admin() OR NOT is_sensitive));

CREATE POLICY settings_admin ON system_settings FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Declaration sequences (service only via functions)
CREATE POLICY sequences_deny ON declaration_sequences FOR ALL
  USING (false);

-- Storage buckets (run via Supabase dashboard or separate migration)
-- hospital-documents, declaration-documents, verification-documents
