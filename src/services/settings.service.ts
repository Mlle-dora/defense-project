import { supabase } from '@/lib/supabase'
import type { SystemSetting } from '@/types'

export const settingsService = {
  async list() {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .is('deleted_at', null)
      .order('key')
    if (error) throw error
    return data as SystemSetting[]
  },

  async get(key: string) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', key)
      .single()
    if (error) throw error
    return data as SystemSetting
  },

  async upsert(key: string, value: Record<string, unknown>, description?: string) {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ key, value, description }, { onConflict: 'key' })
      .select()
      .single()
    if (error) throw error
    return data as SystemSetting
  },
}
