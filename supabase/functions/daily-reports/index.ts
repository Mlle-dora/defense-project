import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const periodEnd = new Date()
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - 1)

  const { data: stats } = await supabase.rpc('get_declaration_stats', {
    p_date_from: periodStart.toISOString(),
    p_date_to: periodEnd.toISOString(),
  })

  const { data: growth } = await supabase.rpc('get_monthly_growth', { p_months: 12 })

  await supabase.from('reports_snapshots').insert({
    report_type: 'daily',
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    data: { stats, growth },
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
