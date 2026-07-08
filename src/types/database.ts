export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: 'super_admin' | 'hospital' | 'civil_officer'
          hospital_id: string | null
          civil_status_center_id: string | null
          locale: 'en' | 'fr'
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & {
          id: string
          email: string
          full_name: string
          role: 'super_admin' | 'hospital' | 'civil_officer'
        }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      hospitals: {
        Row: {
          id: string
          name: string
          code: string
          region: string
          division: string
          address: string
          contact_phone: string
          contact_email: string
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['hospitals']['Row']> & {
          name: string
          code: string
          region: string
        }
        Update: Partial<Database['public']['Tables']['hospitals']['Row']>
      }
      civil_status_centers: {
        Row: {
          id: string
          name: string
          reference_number: string
          region: string
          division: string
          subdivision: string
          address: string
          officer_name: string
          contact_phone: string
          contact_email: string | null
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['civil_status_centers']['Row']> & {
          name: string
          reference_number: string
          region: string
        }
        Update: Partial<Database['public']['Tables']['civil_status_centers']['Row']>
      }
      birth_declarations: {
        Row: {
          id: string
          declaration_number: string | null
          hospital_id: string
          civil_status_center_id: string
          workflow_status: string
          submitted_at: string | null
          registered_at: string | null
          registration_number: string | null
          rejection_reason: string | null
          expires_at: string | null
          search_vector: string | null
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: Partial<Database['public']['Tables']['birth_declarations']['Row']> & {
          hospital_id: string
          civil_status_center_id: string
        }
        Update: Partial<Database['public']['Tables']['birth_declarations']['Row']>
      }
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Functions: {
      transition_declaration_status: {
        Args: {
          p_declaration_id: string
          p_new_status: string
          p_actor_id: string
          p_metadata?: Json
        }
        Returns: Json
      }
      generate_declaration_number: {
        Args: { p_hospital_id: string }
        Returns: string
      }
      insert_audit_log: {
        Args: {
          p_action: string
          p_entity_type: string
          p_entity_id?: string
          p_metadata?: Json
          p_ip_address?: string
        }
        Returns: string
      }
    }
  }
}
