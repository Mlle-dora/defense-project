import type { DashboardStats } from '@/types'

export const defaultDashboardStats: DashboardStats = {
  total: 0,
  draft: 0,
  submitted: 0,
  received: 0,
  under_review: 0,
  pending_documents: 0,
  registered: 0,
  certificate_ready: 0,
  rejected: 0,
  expired: 0,
}

export function mergeStats(stats: unknown): DashboardStats {
  return { ...defaultDashboardStats, ...(stats as Partial<DashboardStats> | null) }
}

export const STATUS_CHART_COLORS = [
  '#94a3b8',
  '#3b82f6',
  '#6366f1',
  '#eab308',
  '#f97316',
  '#22c55e',
  '#10b981',
  '#ef4444',
  '#6b7280',
]

export function statsToChartData(
  stats: DashboardStats,
  labelFn: (key: string) => string
) {
  return Object.entries(stats)
    .filter(([key, value]) => key !== 'total' && typeof value === 'number' && value > 0)
    .map(([key, value]) => ({ name: labelFn(key), value, key }))
}

export function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
