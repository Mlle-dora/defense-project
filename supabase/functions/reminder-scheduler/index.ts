import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getSettingDays } from '../_shared/notificationMessages.ts'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const intervalDays = await getSettingDays(supabase, 'reminder_interval_days', 14)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - intervalDays)

  const { data: declarations } = await supabase
    .from('birth_declarations')
    .select(`
      id,
      expires_at,
      declaration_number,
      required_documents,
      last_reminder_sent_at,
      civil_status_center:civil_status_centers(name),
      parent_contacts(phone, email)
    `)
    .in('workflow_status', ['submitted', 'received', 'under_review', 'pending_documents'])
    .is('deleted_at', null)

  let enqueued = 0

  for (const decl of declarations ?? []) {
    const lastSent = decl.last_reminder_sent_at ? new Date(decl.last_reminder_sent_at) : null
    if (lastSent && lastSent > cutoff) continue

    const payload = {
      declaration_number: decl.declaration_number,
      civil_center_name: (decl.civil_status_center as { name?: string } | null)?.name ?? '',
      deadline_date: decl.expires_at ? String(decl.expires_at).slice(0, 10) : '',
      required_documents: decl.required_documents ?? [],
      reminder_interval_days: intervalDays,
    }

    const contacts = decl.parent_contacts as { phone: string; email?: string }[]
    let sentForDecl = false

    for (const contact of contacts ?? []) {
      if (contact.phone) {
        await supabase.from('notifications').insert({
          declaration_id: decl.id,
          event_type: 'reminder',
          channel: 'sms',
          recipient: contact.phone,
          payload,
          notification_status: 'pending',
          scheduled_at: new Date().toISOString(),
        })
        enqueued++
        sentForDecl = true
      }
      if (contact.email) {
        await supabase.from('notifications').insert({
          declaration_id: decl.id,
          event_type: 'reminder',
          channel: 'email',
          recipient: contact.email,
          payload,
          notification_status: 'pending',
          scheduled_at: new Date().toISOString(),
        })
        enqueued++
        sentForDecl = true
      }
    }

    if (sentForDecl) {
      await supabase
        .from('birth_declarations')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', decl.id)
    }
  }

  return new Response(JSON.stringify({ enqueued, intervalDays }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
