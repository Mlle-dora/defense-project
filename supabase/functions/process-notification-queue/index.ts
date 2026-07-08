import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildNotificationMessage } from '../_shared/notificationMessages.ts'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: pending } = await supabase
    .from('notifications')
    .select('*')
    .eq('notification_status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .limit(50)

  const results = []

  for (const notification of pending ?? []) {
    const fnName = notification.channel === 'sms' ? 'send-sms' : 'send-email'
    const payload = (notification.payload ?? {}) as Record<string, unknown>
    const locale = String(payload.locale ?? 'fr')
    const message = buildNotificationMessage(notification.event_type, payload, locale)

    try {
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${fnName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: notification.recipient,
          message,
          eventType: notification.event_type,
          notificationId: notification.id,
          locale,
          payload,
        }),
      })
      results.push({ id: notification.id, status: res.ok ? 'processed' : 'failed' })
    } catch (err) {
      await supabase
        .from('notifications')
        .update({
          notification_status: 'failed',
          error_message: (err as Error).message,
          attempts: notification.attempts + 1,
        })
        .eq('id', notification.id)
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
