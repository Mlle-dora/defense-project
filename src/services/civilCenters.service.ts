import { supabase } from '@/lib/supabase'
import type { CivilStatusCenter } from '@/types'

export const civilCentersService = {
  async list() {
    const { data, error } = await supabase
      .from('civil_status_centers')
      .select('*')
      .is('deleted_at', null)
      .order('name')
    if (error) throw error
    return data as CivilStatusCenter[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('civil_status_centers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (error) throw error
    return data as CivilStatusCenter
  },

  async create(center: Omit<CivilStatusCenter, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'deleted_at'>) {
    const { data, error } = await supabase
      .from('civil_status_centers')
      .insert(center)
      .select()
      .single()
    if (error) throw error
    return data as CivilStatusCenter
  },

  async update(id: string, updates: Partial<CivilStatusCenter>) {
    const { data, error } = await supabase
      .from('civil_status_centers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as CivilStatusCenter
  },

  async softDelete(id: string) {
    const { error } = await supabase
      .from('civil_status_centers')
      .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
      .eq('id', id)
    if (error) throw error
  },
}
