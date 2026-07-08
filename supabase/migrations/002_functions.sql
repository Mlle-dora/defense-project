-- eBirth Cameroon: Functions
-- Migration 002

-- Auth helper functions
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_hospital_id()
RETURNS UUID AS $$
  SELECT hospital_id FROM profiles WHERE id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_civil_status_center_id()
RETURNS UUID AS $$
  SELECT civil_status_center_id FROM profiles WHERE id = auth.uid() AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Audit log insert
CREATE OR REPLACE FUNCTION insert_audit_log(
  p_action audit_action,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata, ip_address, created_by)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata, p_ip_address, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate declaration number
CREATE OR REPLACE FUNCTION generate_declaration_number(p_hospital_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_region TEXT;
  v_year INTEGER;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  SELECT region INTO v_region FROM hospitals WHERE id = p_hospital_id;
  IF v_region IS NULL THEN
    RAISE EXCEPTION 'Hospital not found';
  END IF;

  v_year := EXTRACT(YEAR FROM now())::INTEGER;
  v_region := UPPER(LEFT(REPLACE(v_region, ' ', ''), 3));

  INSERT INTO declaration_sequences (region, year, last_seq)
  VALUES (v_region, v_year, 1)
  ON CONFLICT (region, year)
  DO UPDATE SET last_seq = declaration_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  v_number := 'EBC-' || v_region || '-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enqueue notification
CREATE OR REPLACE FUNCTION enqueue_notification(
  p_declaration_id UUID,
  p_event_type notification_event,
  p_channel notification_channel,
  p_recipient TEXT,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO notifications (declaration_id, event_type, channel, recipient, payload, scheduled_at, created_by)
  VALUES (p_declaration_id, p_event_type, p_channel, p_recipient, p_payload, now(), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify parents for declaration event
CREATE OR REPLACE FUNCTION notify_parents(
  p_declaration_id UUID,
  p_event_type notification_event
)
RETURNS VOID AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT phone, email, preferred_channel
    FROM parent_contacts
    WHERE declaration_id = p_declaration_id AND deleted_at IS NULL
  LOOP
    IF rec.phone IS NOT NULL THEN
      PERFORM enqueue_notification(p_declaration_id, p_event_type, 'sms', rec.phone, '{}');
    END IF;
    IF rec.email IS NOT NULL THEN
      PERFORM enqueue_notification(p_declaration_id, p_event_type, 'email', rec.email, '{}');
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Status transition state machine
CREATE OR REPLACE FUNCTION transition_declaration_status(
  p_declaration_id UUID,
  p_new_status declaration_status,
  p_actor_id UUID,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_current declaration_status;
  v_valid BOOLEAN := false;
BEGIN
  SELECT workflow_status INTO v_current
  FROM birth_declarations
  WHERE id = p_declaration_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Declaration not found';
  END IF;

  -- Validate transitions
  v_valid := CASE
    WHEN v_current = 'draft' AND p_new_status = 'submitted' THEN true
    WHEN v_current = 'submitted' AND p_new_status IN ('received', 'expired') THEN true
    WHEN v_current = 'received' AND p_new_status = 'under_review' THEN true
    WHEN v_current = 'under_review' AND p_new_status IN ('pending_documents', 'registered', 'rejected') THEN true
    WHEN v_current = 'pending_documents' AND p_new_status = 'under_review' THEN true
    WHEN v_current = 'registered' AND p_new_status = 'certificate_ready' THEN true
    ELSE false
  END;

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_current, p_new_status;
  END IF;

  UPDATE birth_declarations SET
    workflow_status = p_new_status,
    submitted_at = CASE WHEN p_new_status = 'submitted' THEN now() ELSE submitted_at END,
    registered_at = CASE WHEN p_new_status = 'registered' THEN now() ELSE registered_at END,
    rejection_reason = CASE WHEN p_new_status = 'rejected' THEN (p_metadata->>'rejection_reason') ELSE rejection_reason END,
    registration_number = CASE WHEN p_new_status = 'registered' THEN (p_metadata->>'registration_number') ELSE registration_number END,
    declaration_number = CASE
      WHEN p_new_status = 'submitted' AND declaration_number IS NULL
      THEN generate_declaration_number(hospital_id)
      ELSE declaration_number
    END,
    expires_at = CASE
      WHEN p_new_status = 'submitted'
      THEN now() + INTERVAL '90 days'
      ELSE expires_at
    END
  WHERE id = p_declaration_id;

  -- Audit log
  PERFORM insert_audit_log(
    CASE
      WHEN p_new_status = 'submitted' THEN 'submit'::audit_action
      WHEN p_new_status = 'rejected' THEN 'reject'::audit_action
      WHEN p_new_status = 'registered' THEN 'register'::audit_action
      WHEN p_new_status = 'certificate_ready' THEN 'certificate_ready'::audit_action
      ELSE 'update'::audit_action
    END,
    'birth_declaration',
    p_declaration_id,
    jsonb_build_object('from_status', v_current, 'to_status', p_new_status) || p_metadata
  );

  -- Trigger notifications
  IF p_new_status = 'submitted' THEN
    PERFORM notify_parents(p_declaration_id, 'declaration_submitted');
  ELSIF p_new_status = 'received' THEN
    PERFORM notify_parents(p_declaration_id, 'declaration_received');
  ELSIF p_new_status = 'registered' THEN
    PERFORM notify_parents(p_declaration_id, 'registration_completed');
  ELSIF p_new_status = 'certificate_ready' THEN
    PERFORM notify_parents(p_declaration_id, 'certificate_ready');
  END IF;

  RETURN jsonb_build_object('success', true, 'from', v_current, 'to', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Report aggregation function
CREATE OR REPLACE FUNCTION get_declaration_stats(
  p_hospital_id UUID DEFAULT NULL,
  p_civil_center_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'draft', COUNT(*) FILTER (WHERE workflow_status = 'draft'),
    'submitted', COUNT(*) FILTER (WHERE workflow_status = 'submitted'),
    'received', COUNT(*) FILTER (WHERE workflow_status = 'received'),
    'under_review', COUNT(*) FILTER (WHERE workflow_status = 'under_review'),
    'pending_documents', COUNT(*) FILTER (WHERE workflow_status = 'pending_documents'),
    'registered', COUNT(*) FILTER (WHERE workflow_status = 'registered'),
    'certificate_ready', COUNT(*) FILTER (WHERE workflow_status = 'certificate_ready'),
    'rejected', COUNT(*) FILTER (WHERE workflow_status = 'rejected'),
    'expired', COUNT(*) FILTER (WHERE workflow_status = 'expired')
  ) INTO v_result
  FROM birth_declarations
  WHERE deleted_at IS NULL
    AND (p_hospital_id IS NULL OR hospital_id = p_hospital_id)
    AND (p_civil_center_id IS NULL OR civil_status_center_id = p_civil_center_id)
    AND (p_date_from IS NULL OR created_at >= p_date_from)
    AND (p_date_to IS NULL OR created_at <= p_date_to);

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Monthly growth report
CREATE OR REPLACE FUNCTION get_monthly_growth(p_months INTEGER DEFAULT 12)
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.month), '[]'::jsonb)
    FROM (
      SELECT
        to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
        COUNT(*) AS count
      FROM birth_declarations
      WHERE deleted_at IS NULL
        AND created_at >= date_trunc('month', now()) - (p_months || ' months')::INTERVAL
      GROUP BY date_trunc('month', created_at)
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
