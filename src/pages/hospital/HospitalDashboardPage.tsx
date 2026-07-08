import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Send,
  Award,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { declarationsService } from '@/services/declarations.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { OrgAssignmentError } from '@/components/shared/OrgAssignmentError'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/shared/DataTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/utils/format'
import { mergeStats, statsToChartData, STATUS_CHART_COLORS } from '@/utils/dashboard'
import type { DeclarationStatus } from '@/types'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartTooltip, pieLegendFormatter, renderPieSliceValue } from '@/components/shared/chartTheme'

export function HospitalDashboardPage() {
  const { t, i18n } = useTranslation(['hospital', 'declarations', 'common'])
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const hospitalId = profile?.hospital_id

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['hospital-stats', hospitalId],
    queryFn: () => declarationsService.getStats(hospitalId!),
    enabled: !!hospitalId,
    retry: 1,
  })

  const { data: recent } = useQuery({
    queryKey: ['hospital-recent', hospitalId],
    queryFn: () => declarationsService.list({ hospital_id: hospitalId!, page_size: 5 }),
    enabled: !!hospitalId,
    retry: 1,
  })

  const { data: drafts } = useQuery({
    queryKey: ['hospital-drafts', hospitalId],
    queryFn: () =>
      declarationsService.list({ hospital_id: hospitalId!, workflow_status: 'draft', page_size: 5 }),
    enabled: !!hospitalId,
    retry: 1,
  })

  useEffect(() => {
    if (!hospitalId) return
    return declarationsService.subscribeToChanges({ hospitalId }, () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-stats', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['hospital-recent', hospitalId] })
      queryClient.invalidateQueries({ queryKey: ['hospital-drafts', hospitalId] })
    })
  }, [hospitalId, queryClient])

  if (!hospitalId) {
    return (
      <OrgAssignmentError
        title={t('hospital:noHospitalAssigned')}
        description={t('hospital:noHospitalAssignedDesc')}
      />
    )
  }

  const s = mergeStats(stats)
  const chartData = statsToChartData(s, (key) =>
    t(`declarations:statuses.${key}`, { defaultValue: key })
  )

  return (
    <div className="page-shell">
      <PageHeader
        title={t('hospital:dashboard')}
        description={t('hospital:dashboardDesc')}
        actions={
          <Button size="sm" asChild>
            <Link to="/hospital/declarations/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('hospital:newDeclaration')}
            </Link>
          </Button>
        }
      />

      {statsLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title={t('hospital:totalDeclarations')} value={s.total} icon={FileText} tone="primary" />
          <StatCard
            title={t('hospital:pendingDeclarations')}
            value={s.draft + s.submitted}
            description={`${s.draft} ${t('hospital:draftsToComplete').toLowerCase()}`}
            icon={Clock}
            tone="warning"
          />
          <StatCard
            title={t('hospital:awaitingCivilStatus')}
            value={s.received + s.under_review + s.pending_documents}
            description={t('hospital:awaitingCivilStatusDesc')}
            icon={Send}
          />
          <StatCard
            title={t('hospital:completedDeclarations')}
            value={s.registered + s.certificate_ready}
            description={`${s.certificate_ready} ${t('hospital:certificateReady').toLowerCase()}`}
            icon={CheckCircle}
            tone="success"
          />
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm">{t('hospital:statusBreakdown')}</CardTitle>
            <CardDescription className="text-xs">
              {t('hospital:totalDeclarations')}: {s.total}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            {chartData.length === 0 ? (
              <div className="flex h-40 items-center justify-center px-4 text-center text-xs text-muted-foreground">
                {t('hospital:emptyChart')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="46%"
                    innerRadius={44}
                    outerRadius={72}
                    paddingAngle={2}
                    labelLine={false}
                    label={renderPieSliceValue}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={STATUS_CHART_COLORS[i % STATUS_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={pieLegendFormatter}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="space-y-3 p-3 pt-3">
            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium">{t('hospital:rejectedDeclarations')}</p>
                  <p className="text-lg font-bold leading-tight">{s.rejected}</p>
                </div>
              </div>
              {s.rejected > 0 && (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                  <Link to="/hospital/declarations">{t('common:view')}</Link>
                </Button>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/hospital/declarations">{t('hospital:viewAllDeclarations')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
            <CardTitle className="text-sm">{t('hospital:draftsToComplete')}</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
              <Link to="/hospital/declarations">{t('common:view')}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pb-3 pt-0">
            {drafts?.data.length ? (
              drafts.data.map((d) => (
                <Link
                  key={d.id}
                  to={`/hospital/declarations/${d.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.child?.full_name ?? '—'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.mother?.full_name} · {formatDate(d.created_at, i18n.language)}
                    </p>
                  </div>
                  <StatusBadge status={d.workflow_status as DeclarationStatus} />
                </Link>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">{t('common:noResults')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
            <CardTitle className="text-sm">{t('hospital:recentDeclarations')}</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
              <Link to="/hospital/declarations">{t('common:view')}</Link>
            </Button>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            {recent?.data.length ? (
              <DataTable className="border-0 shadow-none [&>div]:overflow-visible">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[65%]" />
                    <col className="w-[35%]" />
                  </colgroup>
                  <DataTableHeader>
                    <DataTableHead>{t('declarations:childInfo')}</DataTableHead>
                    <DataTableHead>{t('common:status')}</DataTableHead>
                  </DataTableHeader>
                  <DataTableBody>
                    {recent.data.map((d) => (
                      <DataTableRow key={d.id}>
                        <DataTableCell className="py-2">
                          <Link
                            to={`/hospital/declarations/${d.id}`}
                            className="truncate font-medium text-primary hover:underline"
                          >
                            {d.child?.full_name ?? '—'}
                          </Link>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {d.declaration_number ?? 'Draft'}
                          </p>
                        </DataTableCell>
                        <DataTableCell className="py-2">
                          <StatusBadge status={d.workflow_status as DeclarationStatus} />
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </table>
              </DataTable>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">{t('common:noResults')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {s.certificate_ready > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
          <CardContent className="flex items-center gap-3 p-3">
            <Award className="h-6 w-6 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{t('hospital:certificateReady')}</p>
              <p className="text-xs text-muted-foreground">
                {t('hospital:certificateReadyDesc', { count: s.certificate_ready })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
