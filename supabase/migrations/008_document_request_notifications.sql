-- Document request notes + parent notification for pending_documents

ALTER TABLE public.birth_declarations
  ADD COLUMN IF NOT EXISTS document_request_notes TEXT;

DO $$
BEGIN
  ALTER TYPE public.notification_event ADD VALUE 'documents_requested';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_parents(
  p_declaration_id UUID,
  p_event_type notification_event,
  p_payload JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT phone, email, preferred_channel
    FROM public.parent_contacts
    WHERE declaration_id = p_declaration_id AND deleted_at IS NULL
  LOOP
    IF rec.phone IS NOT NULL THEN
      PERFORM public.enqueue_notification(p_declaration_id, p_event_type, 'sms', rec.phone, p_payload);
    END IF;
    IF rec.email IS NOT NULL THEN
      PERFORM public.enqueue_notification(p_declaration_id, p_event_type, 'email', rec.email, p_payload);
    END IF;
  END LOOP;
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
BEGIN
  SELECT workflow_status INTO v_current
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
    registration_number = CASE WHEN p_new_status = 'registered' THEN (p_metadata->>'registration_number') ELSE registration_number END,
    declaration_number = CASE
      WHEN p_new_status = 'submitted' AND declaration_number IS NULL
      THEN public.generate_declaration_number(hospital_id)
      ELSE declaration_number
    END,
    expires_at = CASE
      WHEN p_new_status = 'submitted'
      THEN now() + INTERVAL '90 days'
      ELSE expires_at
    END
  WHERE id = p_declaration_id;

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
      PERFORM public.notify_parents(p_declaration_id, 'declaration_submitted');
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
        jsonb_build_object('registration_number', p_metadata->>'registration_number')
      );
    ELSIF p_new_status = 'certificate_ready' THEN
      PERFORM public.notify_parents(p_declaration_id, 'certificate_ready');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'notification enqueue failed during transition: %', SQLERRM;
  END;

  RETURN jsonb_build_object('success', true, 'from', v_current, 'to', p_new_status);
END;
$$;
