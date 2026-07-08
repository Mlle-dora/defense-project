-- Parent document rules, auto registration numbers, enriched submit notifications, 14-day reminders

ALTER TABLE public.birth_declarations
  ADD COLUMN IF NOT EXISTS mother_marital_status TEXT,
  ADD COLUMN IF NOT EXISTS paternity_recognized BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.registration_sequences (
  civil_status_center_id UUID NOT NULL REFERENCES public.civil_status_centers(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (civil_status_center_id, year)
);

INSERT INTO public.system_settings (key, value, description, is_sensitive)
VALUES
  ('reminder_interval_days', '{"days": 14}', 'Days between parent reminder messages', false)
ON CONFLICT (key) DO NOTHING;

UPDATE public.system_settings
SET value = '{"days": 14}'
WHERE key = 'reminder_days_before_deadline';

CREATE OR REPLACE FUNCTION public.get_setting_days(p_key TEXT, p_default INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v JSONB;
BEGIN
  SELECT value INTO v FROM public.system_settings WHERE key = p_key;
  IF v IS NULL THEN
    RETURN p_default;
  END IF;
  RETURN COALESCE((v->>'days')::INTEGER, p_default);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_registration_number(p_civil_center_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref TEXT;
  v_year INTEGER;
  v_seq INTEGER;
BEGIN
  SELECT reference_number INTO v_ref
  FROM public.civil_status_centers
  WHERE id = p_civil_center_id;

  IF v_ref IS NULL THEN
    RAISE EXCEPTION 'Civil status center not found';
  END IF;

  v_year := EXTRACT(YEAR FROM now())::INTEGER;
  v_ref := UPPER(LEFT(REPLACE(v_ref, ' ', ''), 8));

  INSERT INTO public.registration_sequences (civil_status_center_id, year, last_seq)
  VALUES (p_civil_center_id, v_year, 1)
  ON CONFLICT (civil_status_center_id, year)
  DO UPDATE SET last_seq = public.registration_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN 'REG-' || v_ref || '-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.build_submit_notification_payload(p_declaration_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decl RECORD;
  v_child RECORD;
  v_deadline_days INTEGER;
BEGIN
  v_deadline_days := public.get_setting_days('registration_deadline_days', 90);

  SELECT bd.declaration_number, bd.required_documents, bd.expires_at, csc.name AS center_name
  INTO v_decl
  FROM public.birth_declarations bd
  LEFT JOIN public.civil_status_centers csc ON csc.id = bd.civil_status_center_id
  WHERE bd.id = p_declaration_id;

  SELECT birth_date INTO v_child
  FROM public.children
  WHERE declaration_id = p_declaration_id;

  RETURN jsonb_build_object(
    'declaration_number', COALESCE(v_decl.declaration_number, ''),
    'civil_center_name', COALESCE(v_decl.center_name, ''),
    'deadline_date', COALESCE(
      to_char(v_decl.expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
      to_char((COALESCE(v_child.birth_date, CURRENT_DATE) + v_deadline_days)::date, 'YYYY-MM-DD')
    ),
    'deadline_days', v_deadline_days,
    'required_documents', COALESCE(v_decl.required_documents, '[]'::jsonb),
    'reminder_interval_days', public.get_setting_days('reminder_interval_days', 14)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_declaration_submitted(p_declaration_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_parents(
    p_declaration_id,
    'declaration_submitted',
    public.build_submit_notification_payload(p_declaration_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_declaration_status(
  p_declaration_id UUID,
  p_new_status declaration_status,
  p_actor_id UUID,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current declaration_status;
  v_valid BOOLEAN := false;
  v_center_id UUID;
  v_reg_number TEXT;
  v_deadline_days INTEGER;
  v_birth_date DATE;
BEGIN
  SELECT workflow_status, civil_status_center_id
  INTO v_current, v_center_id
  FROM public.birth_declarations
  WHERE id = p_declaration_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Declaration not found';
  END IF;

  v_valid := CASE
    WHEN v_current IN ('draft', 'rejected') AND p_new_status = 'submitted' THEN true
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

  v_deadline_days := public.get_setting_days('registration_deadline_days', 90);
  SELECT birth_date INTO v_birth_date FROM public.children WHERE declaration_id = p_declaration_id;

  IF p_new_status = 'registered' THEN
    v_reg_number := COALESCE(
      NULLIF(TRIM(p_metadata->>'registration_number'), ''),
      public.generate_registration_number(v_center_id)
    );
  END IF;

  UPDATE public.birth_declarations SET
    workflow_status = p_new_status,
    submitted_at = CASE WHEN p_new_status = 'submitted' THEN now() ELSE submitted_at END,
    registered_at = CASE WHEN p_new_status = 'registered' THEN now() ELSE registered_at END,
    rejection_reason = CASE WHEN p_new_status = 'rejected' THEN (p_metadata->>'rejection_reason') ELSE rejection_reason END,
    document_request_notes = CASE
      WHEN p_new_status = 'pending_documents' THEN (p_metadata->>'document_request_notes')
      WHEN p_new_status = 'under_review' AND v_current = 'pending_documents' THEN NULL
      ELSE document_request_notes
    END,
    mother_marital_status = COALESCE(p_metadata->>'mother_marital_status', mother_marital_status),
    paternity_recognized = COALESCE((p_metadata->>'paternity_recognized')::BOOLEAN, paternity_recognized),
    required_documents = CASE
      WHEN p_metadata ? 'required_documents' THEN p_metadata->'required_documents'
      ELSE required_documents
    END,
    registration_number = CASE WHEN p_new_status = 'registered' THEN v_reg_number ELSE registration_number END,
    declaration_number = CASE
      WHEN p_new_status = 'submitted' AND declaration_number IS NULL
      THEN public.generate_declaration_number(hospital_id)
      ELSE declaration_number
    END,
    expires_at = CASE
      WHEN p_new_status = 'submitted'
      THEN (COALESCE(v_birth_date, CURRENT_DATE) + v_deadline_days)::timestamptz
      ELSE expires_at
    END
  WHERE id = p_declaration_id;

  IF p_new_status = 'registered' AND v_reg_number IS NOT NULL THEN
    INSERT INTO public.registration_records (declaration_id, registration_number, registered_by, registered_at)
    VALUES (p_declaration_id, v_reg_number, p_actor_id, now())
    ON CONFLICT (declaration_id) DO UPDATE
    SET registration_number = EXCLUDED.registration_number,
        registered_at = EXCLUDED.registered_at,
        registered_by = EXCLUDED.registered_by;
  END IF;

  BEGIN
    PERFORM public.insert_audit_log(
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
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'audit log failed during transition: %', SQLERRM;
  END;

  BEGIN
    IF p_new_status = 'submitted' THEN
      PERFORM public.notify_parents(
        p_declaration_id,
        'declaration_submitted',
        public.build_submit_notification_payload(p_declaration_id)
      );
    ELSIF p_new_status = 'received' THEN
      PERFORM public.notify_parents(p_declaration_id, 'declaration_received');
    ELSIF p_new_status = 'pending_documents' THEN
      PERFORM public.notify_parents(
        p_declaration_id,
        'documents_requested',
        jsonb_build_object('document_request_notes', p_metadata->>'document_request_notes')
      );
    ELSIF p_new_status = 'registered' THEN
      PERFORM public.notify_parents(
        p_declaration_id,
        'registration_completed',
        jsonb_build_object('registration_number', v_reg_number)
      );
    ELSIF p_new_status = 'certificate_ready' THEN
      PERFORM public.notify_parents(p_declaration_id, 'certificate_ready');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'notification enqueue failed during transition: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'from', v_current,
    'to', p_new_status,
    'registration_number', v_reg_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_registration_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_declaration_submitted(UUID) TO authenticated;
