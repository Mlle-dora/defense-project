import { supabase } from '@/lib/supabase'
import type { AuditAction, AuditLog } from '@/types'

export const auditService = {
  async log(
    action: AuditAction,
    entityType: string,
    entityId?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await supabase.rpc('insert_audit_log', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId ?? undefined,
        p_metadata: metadata,
      })
    } catch (err) {
      console.error('Audit log failed:', err)
    }
  },

  async list(params: {
    page?: number
    pageSize?: number
    action?: string
    entityType?: string
    dateFrom?: string
    dateTo?: string
  }) {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('audit_logs')
      .select('*, actor:profiles!audit_logs_actor_id_fkey(full_name, email)', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params.action) query = query.eq('action', params.action)
    if (params.entityType) query = query.eq('entity_type', params.entityType)
    if (params.dateFrom) query = query.gte('created_at', params.dateFrom)
    if (params.dateTo) query = query.lte('created_at', params.dateTo)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: (data ?? []) as AuditLog[],
      total: count ?? 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count ?? 0) / pageSize),
    }
  },
}
