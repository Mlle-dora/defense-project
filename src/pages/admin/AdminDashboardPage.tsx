import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  Building2,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  ArrowRight,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { reportsService } from '@/services/reports.service'
import { hospitalsService } from '@/services/hospitals.service'
import { civilCentersService } from '@/services/civilCenters.service'
import { usersService } from '@/services/users.service'
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
  formatChartMonth,
} from '@/components/shared/chartTheme'

const defaultStats = {
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

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation(['admin', 'common'])

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => reportsService.getStats(),
    retry: 1,
  })

  const { data: hospitals, isLoading: hospitalsLoading } = useQuery({
    queryKey: ['hospitals-count'],
    queryFn: () => hospitalsService.list(),
    retry: 1,
  })

  const { data: centers } = useQuery({
    queryKey: ['civil-centers-count'],
    queryFn: () => civilCentersService.list(),
    retry: 1,
  })

  const { data: users } = useQuery({
    queryKey: ['users-count'],
    queryFn: () => usersService.list(),
    retry: 1,
  })

  const { data: growth, isError: growthError } = useQuery({
    queryKey: ['monthly-growth'],
    queryFn: () => reportsService.getMonthlyGrowth(6),
    retry: 1,
  })

  const s = { ...defaultStats, ...(stats as Record<string, number> | undefined) }
  const chartData = Array.isArray(growth)
    ? growth.map((g) => ({ month: g.month, count: g.count }))
    : []

  const quickActions = [
    { label: t('admin:manageHospitals'), href: '/admin/hospitals', icon: Building2 },
    { label: t('admin:manageCivilCentersShort'), href: '/admin/civil-centers', icon: Building2 },
    { label: t('admin:manageUsers'), href: '/admin/users', icon: Users },
    { label: t('admin:reports'), href: '/admin/reports', icon: BarChart3 },
  ]

  const formatMonth = (month: string) => formatChartMonth(month, i18n.language === 'fr' ? 'fr' : 'en')

  return (
    <div className="page-shell">
      <PageHeader
        title={t('admin:dashboard')}
        description={t('admin:systemAnalytics')}
      />

      {statsLoading || hospitalsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('admin:totalHospitals')}
            value={hospitals?.length ?? 0}
            description={t('admin:civilCentersCount', { count: centers?.length ?? 0 })}
            icon={Building2}
            tone="primary"
          />
          <StatCard
            title={t('admin:totalDeclarations')}
            value={s.total}
            description={statsError ? t('admin:statsUnavailable') : undefined}
            icon={FileText}
          />
          <StatCard
            title={t('admin:totalRegistrations')}
            value={s.registered + s.certificate_ready}
            icon={CheckCircle}
            tone="success"
          />
          <StatCard
            title={t('admin:pendingReview')}
            value={s.submitted + s.received + s.under_review}
            icon={Clock}
            tone="warning"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm">{t('admin:monthlyGrowth')}</CardTitle>
            <CardDescription className="text-xs">{t('admin:monthlyGrowthDesc6')}</CardDescription>
          </CardHeader>
          <CardContent className="pb-3 pt-0">
            {growthError || chartData.length === 0 ? (
              <div className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                {t('admin:noDeclarationData')}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-sm sm:max-w-md">
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart
                    data={chartData.map((d) => ({ ...d, month: formatMonth(d.month) }))}
                    margin={chartMargins.bar}
                    barSize={30}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={chartTick}
                      interval={0}
                      tickMargin={8}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={chartTick}
                      width={chartYAxisWidth}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="count" position="top" {...chartLabelListStyle} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('common:actions')}</CardTitle>
            <CardDescription>{t('admin:commonTasks')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.href}
                  to={action.href}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{action.label}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{t('admin:hospitals')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/hospitals">{t('common:view')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {hospitals?.length ? (
              <ul className="space-y-2">
                {hospitals.slice(0, 5).map((h) => (
                  <li key={h.id} className="flex justify-between gap-3 border-b border-border/50 pb-2 text-sm last:border-0">
                    <span className="truncate font-medium">{h.name}</span>
                    <span className="shrink-0 text-muted-foreground">{h.region}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('common:noResults')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm">{t('admin:users')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/users">{t('common:view')}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{users?.length ?? 0}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('admin:registeredUsers')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
