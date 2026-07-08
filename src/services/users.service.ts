import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types'

export const usersService = {
  async list() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, hospital:hospitals(name), civil_status_center:civil_status_centers(name)')
      .is('deleted_at', null)
      .order('full_name')
    if (error) throw error
    return (data ?? []) as Profile[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Profile
  },

  async update(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Profile
  },

  async updateRole(id: string, role: UserRole, orgId?: string) {
    const updates: Partial<Profile> = { role }
    if (role === 'hospital' && orgId) {
      updates.hospital_id = orgId
      updates.civil_status_center_id = null
    } else if (role === 'civil_officer' && orgId) {
      updates.civil_status_center_id = orgId
      updates.hospital_id = null
    } else if (role === 'super_admin') {
      updates.hospital_id = null
      updates.civil_status_center_id = null
    }
    return this.update(id, updates)
  },

  async softDelete(id: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
      .eq('id', id)
    if (error) throw error
  },
}
