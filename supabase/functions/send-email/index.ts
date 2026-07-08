import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildNotificationMessage } from '../_shared/notificationMessages.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      to,
      message,
      eventType,
      locale = 'fr',
      payload = {},
      notificationId,
    } = await req.json()
    const body =
      message ??
      buildNotificationMessage(eventType ?? 'default', payload as Record<string, unknown>, locale)

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'eBirth Cameroon <noreply@ebirth.cm>',
          to: [to],
          subject: `eBirth Cameroon — ${eventType ?? 'Notification'}`,
          text: body,
        }),
      })
    } else {
      console.log(`[MOCK EMAIL] To: ${to}, Body: ${body}`)
    }

    if (notificationId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabase
        .from('notifications')
        .update({
          notification_status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: 1,
        })
        .eq('id', notificationId)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
