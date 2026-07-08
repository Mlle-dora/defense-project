export type UserRole = 'super_admin' | 'hospital' | 'civil_officer'

export type DeclarationStatus =
  | 'draft'
  | 'submitted'
  | 'received'
  | 'under_review'
  | 'pending_documents'
  | 'registered'
  | 'certificate_ready'
  | 'rejected'
  | 'expired'

export type NotificationEvent =
  | 'declaration_submitted'
  | 'declaration_received'
  | 'reminder'
  | 'registration_completed'
  | 'certificate_ready'
  | 'documents_requested'

export type NotificationChannel = 'email' | 'sms'
export type NotificationStatus = 'pending' | 'sent' | 'failed'

export type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'notification_sent'
  | 'password_reset'
  | 'register'
  | 'certificate_ready'

export type ContactType = 'mother' | 'father' | 'guardian'
export type DocumentType = 'hospital' | 'supporting' | 'verification'
export type Gender = 'male' | 'female' | 'other'
export type Locale = 'en' | 'fr'
export type EntityStatus = 'active' | 'inactive'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  hospital_id: string | null
  civil_status_center_id: string | null
  locale: Locale
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface Hospital {
  id: string
  name: string
  code: string
  region: string
  division: string
  address: string
  contact_phone: string
  contact_email: string
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface CivilStatusCenter {
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
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface BirthDeclaration {
  id: string
  declaration_number: string | null
  hospital_id: string
  civil_status_center_id: string
  workflow_status: DeclarationStatus
  submitted_at: string | null
  registered_at: string | null
  registration_number: string | null
  rejection_reason: string | null
  document_request_notes: string | null
  mother_marital_status: string | null
  paternity_recognized: boolean | null
  required_documents: string[] | null
  expires_at: string | null
  search_vector: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
  hospital?: Hospital
  civil_status_center?: CivilStatusCenter
  child?: Child
  mother?: Mother
  father?: Father | null
  parent_contacts?: ParentContact[]
}

export interface Child {
  id: string
  declaration_id: string
  full_name: string
  gender: Gender
  birth_date: string
  birth_time: string | null
  birth_weight_kg: number | null
  birth_place: string
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface Mother {
  id: string
  declaration_id: string
  full_name: string
  date_of_birth: string
  nationality: string
  occupation: string | null
  phone: string
  address: string
  id_number: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface Father {
  id: string
  declaration_id: string
  full_name: string
  date_of_birth: string | null
  nationality: string | null
  occupation: string | null
  phone: string | null
  address: string | null
  id_number: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface ParentContact {
  id: string
  declaration_id: string
  contact_type: ContactType
  phone: string
  email: string | null
  preferred_channel: NotificationChannel
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface DeclarationDocument {
  id: string
  declaration_id: string
  document_type: DocumentType
  storage_path: string
  file_name: string
  mime_type: string
  uploaded_by: string
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface RegistrationRecord {
  id: string
  declaration_id: string
  registered_by: string
  registration_number: string
  registered_at: string
  notes: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface Notification {
  id: string
  declaration_id: string | null
  event_type: NotificationEvent
  channel: NotificationChannel
  recipient: string
  payload: Record<string, unknown>
  notification_status: NotificationStatus
  attempts: number
  scheduled_at: string | null
  sent_at: string | null
  error_message: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: AuditAction
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
  actor?: Profile
}

export interface SystemSetting {
  id: string
  key: string
  value: Record<string, unknown>
  description: string | null
  is_sensitive: boolean
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface ReportSnapshot {
  id: string
  report_type: string
  period_start: string
  period_end: string
  data: Record<string, unknown>
  status: EntityStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface DeclarationSearchFilters {
  query?: string
  declaration_number?: string
  child_name?: string
  mother_name?: string
  father_name?: string
  registration_number?: string
  hospital_id?: string
  civil_status_center_id?: string
  workflow_status?: DeclarationStatus
  workflow_statuses?: DeclarationStatus[]
  exclude_draft?: boolean
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface DashboardStats {
  total: number
  draft: number
  submitted: number
  received: number
  under_review: number
  pending_documents: number
  registered: number
  certificate_ready: number
  rejected: number
  expired: number
}
