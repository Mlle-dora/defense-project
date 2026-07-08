import { supabase } from '@/lib/supabase'
import type { Hospital } from '@/types'

export const hospitalsService = {
  async list() {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .is('deleted_at', null)
      .order('name')
    if (error) throw error
    return data as Hospital[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error) throw error
    return data as Hospital
  },

  async create(hospital: Omit<Hospital, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'deleted_at'>) {
    const { data, error } = await supabase
      .from('hospitals')
      .insert(hospital)
      .select()
      .single()
    if (error) throw error
    return data as Hospital
  },

  async update(id: string, updates: Partial<Hospital>) {
    const { data, error } = await supabase
      .from('hospitals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Hospital
  },

  async softDelete(id: string) {
    const { error } = await supabase
      .from('hospitals')
      .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
      .eq('id', id)
    if (error) throw error
  },
}
