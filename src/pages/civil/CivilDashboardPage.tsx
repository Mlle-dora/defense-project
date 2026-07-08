import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Award,
  Inbox,
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
import { formatDate, formatDateTime } from '@/utils/format'
import { mergeStats, statsToChartData, startOfTodayIso } from '@/utils/dashboard'
import type { DeclarationStatus } from '@/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import {
  ChartTooltip,
  chartLabelListStyle,
  chartMargins,
  chartTick,
  chartYAxisWidth,
} from '@/components/shared/chartTheme'

const PENDING_INCOMING_STATUSES: DeclarationStatus[] = ['submitted', 'received', 'under_review']

export function CivilDashboardPage() {
  const { t, i18n } = useTranslation(['civil', 'declarations', 'common'])
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const centerId = profile?.civil_status_center_id

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['civil-stats', centerId],
    queryFn: () => declarationsService.getStats(undefined, centerId!),
    enabled: !!centerId,
    retry: 1,
    refetchOnWindowFocus: true,
  })

  const { data: incoming } = useQuery({
    queryKey: ['civil-incoming', centerId],
    queryFn: () =>
      declarationsService.list({
        civil_status_center_id: centerId!,
        workflow_statuses: PENDING_INCOMING_STATUSES,
        page_size: 8,
      }),
    enabled: !!centerId,
    retry: 1,
    refetchOnWindowFocus: true,
  })

  const { data: verification } = useQuery({
    queryKey: ['civil-verification', centerId],
    queryFn: () =>
      declarationsService.list({
        civil_status_center_id: centerId!,
        workflow_status: 'pending_documents',
        page_size: 5,
      }),
    enabled: !!centerId,
    retry: 1,
    refetchOnWindowFocus: true,
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['civil-recent', centerId],
    queryFn: () =>
      declarationsService.list({
        civil_status_center_id: centerId!,
        exclude_draft: true,
        page_size: 6,
      }),
    enabled: !!centerId,
    retry: 1,
    refetchOnWindowFocus: true,
  })

  const { data: todayRegistered } = useQuery({
    queryKey: ['civil-today', centerId],
    queryFn: () =>
      declarationsService.list({
        civil_status_center_id: centerId!,
        date_from: startOfTodayIso(),
        exclude_draft: true,
        page_size: 10,
      }),
    enabled: !!centerId,
    retry: 1,
  })

  useEffect(() => {
    if (!centerId) return
    return declarationsService.subscribeToChanges({ civilCenterId: centerId }, () => {
      queryClient.invalidateQueries({ queryKey: ['civil-stats', centerId] })
      queryClient.invalidateQueries({ queryKey: ['civil-incoming', centerId] })
      queryClient.invalidateQueries({ queryKey: ['civil-verification', centerId] })
      queryClient.invalidateQueries({ queryKey: ['civil-recent', centerId] })
      queryClient.invalidateQueries({ queryKey: ['civil-today', centerId] })
    })
  }, [centerId, queryClient])

  if (!centerId) {
    return (
      <OrgAssignmentError
        title={t('civil:noCenterAssigned')}
        description={t('civil:noCenterAssignedDesc')}
      />
    )
  }

  const s = mergeStats(stats)
  const chartData = statsToChartData(s, (key) =>
    t(`declarations:statuses.${key}`, { defaultValue: key })
  ).slice(0, 6)

  const todayCount =
    todayRegistered?.data.filter(
      (d) => d.workflow_status === 'registered' || d.workflow_status === 'certificate_ready'
    ).length ?? 0

  return (
    <div className="page-shell">
      <PageHeader title={t('civil:dashboard')} description={t('civil:welcomeSubtitle')} />

      {statsLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('civil:pendingQueue')}
            value={s.submitted + s.received + s.under_review}
            description={t('civil:pendingQueueDesc', { count: s.submitted })}
            icon={Clock}
            tone="warning"
          />
          <StatCard
            title={t('civil:pendingDocuments')}
            value={s.pending_documents}
            icon={FileText}
          />
          <StatCard
            title={t('civil:todayRegistrations')}
            value={todayCount}
            icon={CheckCircle}
            tone="success"
          />
          <StatCard
            title={t('civil:lateRegistrations')}
            value={s.expired}
            icon={AlertTriangle}
            tone="warning"
          />
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
            <div>
              <CardTitle className="text-sm">{t('civil:incomingDeclarations')}</CardTitle>
              <CardDescription className="text-xs">{t('civil:incomingDesc')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
              <Link to="/civil/declarations">{t('common:view')}</Link>
            </Button>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            {incoming?.data.length ? (
              <div className="space-y-2">
                {incoming.data.map((d) => (
                  <Link
                    key={d.id}
                    to={`/civil/declarations/${d.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.declaration_number ?? '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.child?.full_name} · {d.mother?.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {t('civil:fromHospital')}: {d.hospital?.name} ·{' '}
                        {formatDateTime(d.submitted_at ?? d.created_at, i18n.language)}
                      </p>
                    </div>
                    <StatusBadge status={d.workflow_status as DeclarationStatus} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Inbox className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t('civil:emptyQueue')}</p>
                <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">{t('civil:emptyQueueHint')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm">{t('civil:registeredTotal')}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <p className="text-2xl font-bold leading-tight">{s.registered + s.certificate_ready}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.certificate_ready} {t('civil:certificateReady').toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm">{t('civil:statusOverview')}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            {chartData.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                {t('civil:emptyQueue')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 30)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ ...chartMargins.barVertical, left: 4 }}
                  barSize={16}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={chartTick} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={chartYAxisWidth + 80}
                    tick={chartTick}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.35 }} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="value" position="right" {...chartLabelListStyle} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
            <CardTitle className="text-sm">{t('civil:verificationQueue')}</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
              <Link to="/civil/verification">{t('common:view')}</Link>
            </Button>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            <div className="space-y-2">
              {verification?.data.length ? (
                verification.data.map((d) => (
                  <Link
                    key={d.id}
                    to={`/civil/declarations/${d.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.declaration_number}</p>
                      <p className="truncate text-xs text-muted-foreground">{d.child?.full_name}</p>
                    </div>
                    <StatusBadge status={d.workflow_status as DeclarationStatus} />
                  </Link>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">{t('civil:emptyDocumentsQueue')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm">{t('civil:recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-1">
          {recentActivity?.data.length ? (
            <DataTable className="border-0 shadow-none rounded-none [&>div]:overflow-visible">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                  <col className="w-[24%]" />
                  <col className="w-[16%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <DataTableHeader>
                  <DataTableHead>{t('declarations:declarationNumber')}</DataTableHead>
                  <DataTableHead>{t('declarations:childInfo')}</DataTableHead>
                  <DataTableHead>{t('civil:fromHospital')}</DataTableHead>
                  <DataTableHead>{t('common:date')}</DataTableHead>
                  <DataTableHead>{t('common:status')}</DataTableHead>
                </DataTableHeader>
                <DataTableBody>
                  {recentActivity.data.map((d) => (
                    <DataTableRow key={d.id}>
                      <DataTableCell className="py-2">
                        <Link
                          to={`/civil/declarations/${d.id}`}
                          className="truncate font-medium text-primary hover:underline"
                        >
                          {d.declaration_number ?? '—'}
                        </Link>
                      </DataTableCell>
                      <DataTableCell className="truncate py-2">{d.child?.full_name}</DataTableCell>
                      <DataTableCell className="truncate py-2 text-muted-foreground">
                        {d.hospital?.name}
                      </DataTableCell>
                      <DataTableCell className="py-2 text-muted-foreground">
                        {formatDate(d.updated_at, i18n.language)}
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
            <p className="py-6 text-center text-xs text-muted-foreground">{t('common:noResults')}</p>
          )}
        </CardContent>
      </Card>

      {s.certificate_ready > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
          <CardContent className="flex items-center gap-3 p-3">
            <Award className="h-6 w-6 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{t('civil:certificateReady')}</p>
              <p className="text-xs text-muted-foreground">
                {t('civil:certificateReadyBanner', { count: s.certificate_ready })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
