-- Fix submit workflow, search, and realtime for birth declarations

-- Grants for RPC functions used by the app
GRANT EXECUTE ON FUNCTION public.transition_declaration_status(UUID, declaration_status, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_declaration_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_audit_log(audit_action, TEXT, UUID, JSONB, TEXT) TO authenticated;

-- Refresh search vector when child/mother/father records change
CREATE OR REPLACE FUNCTION public.touch_declaration_search()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.birth_declarations
  SET updated_at = now()
  WHERE id = COALESCE(NEW.declaration_id, OLD.declaration_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_child_touch_search ON public.children;
CREATE TRIGGER tr_child_touch_search
  AFTER INSERT OR UPDATE OF full_name ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.touch_declaration_search();

DROP TRIGGER IF EXISTS tr_mother_touch_search ON public.mothers;
CREATE TRIGGER tr_mother_touch_search
  AFTER INSERT OR UPDATE OF full_name ON public.mothers
  FOR EACH ROW EXECUTE FUNCTION public.touch_declaration_search();

DROP TRIGGER IF EXISTS tr_father_touch_search ON public.fathers;
CREATE TRIGGER tr_father_touch_search
  AFTER INSERT OR UPDATE OF full_name ON public.fathers
  FOR EACH ROW EXECUTE FUNCTION public.touch_declaration_search();

-- Resilient status transition (notifications won't block submit)
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
    ELSIF p_new_status = 'registered' THEN
      PERFORM public.notify_parents(p_declaration_id, 'registration_completed');
    ELSIF p_new_status = 'certificate_ready' THEN
      PERFORM public.notify_parents(p_declaration_id, 'certificate_ready');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'notification enqueue failed during transition: %', SQLERRM;
  END;

  RETURN jsonb_build_object('success', true, 'from', v_current, 'to', p_new_status);
END;
$$;

-- Enable realtime for birth_declarations (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'birth_declarations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.birth_declarations;
  END IF;
END $$;
