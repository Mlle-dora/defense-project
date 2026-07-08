import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

export const notificationsService = {
  async list(params: { page?: number; pageSize?: number; status?: string } = {}) {
    const page = params.page ?? 1
    const pageSize = params.pageSize ?? 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params.status) query = query.eq('notification_status', params.status)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: (data ?? []) as Notification[],
      total: count ?? 0,
      page,
      page_size: pageSize,
      total_pages: Math.ceil((count ?? 0) / pageSize),
    }
  },

  async enqueue(
    declarationId: string,
    eventType: string,
    channel: 'email' | 'sms',
    recipient: string,
    payload: Record<string, unknown> = {}
  ) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        declaration_id: declarationId,
        event_type: eventType,
        channel,
        recipient,
        payload,
        notification_status: 'pending',
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async listByDeclaration(declarationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('declaration_id', declarationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Notification[]
  },
}
