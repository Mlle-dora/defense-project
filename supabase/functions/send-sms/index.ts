import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createSmsProvider, resolveSmsProviderName } from '../_shared/sms/provider.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, message, notificationId } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    const providerName = await resolveSmsProviderName(supabase)
    const provider = createSmsProvider(providerName)
    const result = await provider.send(to, message)

    if (notificationId) {
      await supabase
        .from('notifications')
        .update({
          notification_status: result.success ? 'sent' : 'failed',
          sent_at: result.success ? new Date().toISOString() : null,
          error_message: result.error ?? null,
          attempts: 1,
        })
        .eq('id', notificationId)
    }

    return new Response(JSON.stringify({ ...result, provider: providerName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
