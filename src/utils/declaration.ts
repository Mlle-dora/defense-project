import type { DeclarationStatus } from '@/types'

const VALID_TRANSITIONS: Record<DeclarationStatus, DeclarationStatus[]> = {
  draft: ['submitted'],
  submitted: ['received', 'expired'],
  received: ['under_review'],
  under_review: ['pending_documents', 'registered', 'rejected'],
  pending_documents: ['under_review'],
  registered: ['certificate_ready'],
  certificate_ready: [],
  rejected: [],
  expired: [],
}

export function canTransition(
  from: DeclarationStatus,
  to: DeclarationStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getStatusColor(status: DeclarationStatus): string {
  const colors: Record<DeclarationStatus, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    received: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    pending_documents: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    registered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    certificate_ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return colors[status]
}

export function getRoleDashboardPath(role: string): string {
  switch (role) {
    case 'super_admin':
      return '/admin/dashboard'
    case 'hospital':
      return '/hospital/dashboard'
    case 'civil_officer':
      return '/civil/dashboard'
    default:
      return '/login'
  }
}
