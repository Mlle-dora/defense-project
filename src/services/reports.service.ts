import { supabase } from '@/lib/supabase'

export const reportsService = {
  async getStats(hospitalId?: string, civilCenterId?: string, dateFrom?: string, dateTo?: string) {
    const { data, error } = await supabase.rpc('get_declaration_stats', {
      p_hospital_id: hospitalId ?? undefined,
      p_civil_center_id: civilCenterId ?? undefined,
      p_date_from: dateFrom ?? undefined,
      p_date_to: dateTo ?? undefined,
    })
    if (error) {
      console.warn('get_declaration_stats failed:', error.message)
      return null
    }
    return data
  },

  async getMonthlyGrowth(months = 12) {
    const { data, error } = await supabase.rpc('get_monthly_growth', { p_months: months })
    if (error) {
      console.warn('get_monthly_growth failed:', error.message)
      return []
    }
    return (Array.isArray(data) ? data : []) as { month: string; count: number }[]
  },

  async getSnapshots(reportType?: string) {
    let query = supabase
      .from('reports_snapshots')
      .select('*')
      .is('deleted_at', null)
      .order('period_start', { ascending: false })
      .limit(30)

    if (reportType) query = query.eq('report_type', reportType)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getHospitalPerformance() {
    const { data, error } = await supabase
      .from('birth_declarations')
      .select('hospital_id, workflow_status, hospitals(name)')
      .is('deleted_at', null)

    if (error) throw error

    const grouped: Record<string, { name: string; total: number; registered: number }> = {}
    for (const row of data ?? []) {
      const hid = row.hospital_id as string
      const hospitals = row.hospitals as unknown
      let hName = 'Unknown'
      if (Array.isArray(hospitals) && hospitals[0]) {
        hName = (hospitals[0] as { name: string }).name
      } else if (hospitals && typeof hospitals === 'object' && 'name' in hospitals) {
        hName = (hospitals as { name: string }).name
      }
      if (!grouped[hid]) grouped[hid] = { name: hName, total: 0, registered: 0 }
      grouped[hid].total++
      if (row.workflow_status === 'registered' || row.workflow_status === 'certificate_ready') {
        grouped[hid].registered++
      }
    }
    return Object.values(grouped)
  },
}
