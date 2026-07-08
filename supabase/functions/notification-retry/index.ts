import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const maxRetries = 3
  const { data: failed } = await supabase
    .from('notifications')
    .select('*')
    .eq('notification_status', 'failed')
    .lt('attempts', maxRetries)
    .limit(20)

  let retried = 0
  for (const n of failed ?? []) {
    await supabase
      .from('notifications')
      .update({
        notification_status: 'pending',
        scheduled_at: new Date(Date.now() + Math.pow(2, n.attempts) * 60000).toISOString(),
      })
      .eq('id', n.id)
    retried++
  }

  return new Response(JSON.stringify({ retried }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
