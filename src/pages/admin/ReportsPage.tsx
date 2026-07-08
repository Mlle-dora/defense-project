import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, FileType, LayoutDashboard, PanelTop } from 'lucide-react'
import { reportsService } from '@/services/reports.service'
import { notificationsService } from '@/services/notifications.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/shared/DataTable'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  exportReportCsv,
  exportReportPdf,
  exportReportWord,
  type ReportTableSection,
} from '@/utils/reportExport'
import { cn } from '@/utils/cn'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts'
import {
  ChartTooltip,
  chartLabelListStyle,
  chartMargins,
  chartTick,
  chartYAxisWidth,
  formatChartMonth,
  pieLegendFormatter,
  renderPieSliceValue,
} from '@/components/shared/chartTheme'

const COLORS = ['var(--primary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export function ReportsPage() {
  const { t, i18n } = useTranslation(['admin', 'notifications', 'declarations', 'common'])
  const [reportType, setReportType] = useState('monthly')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportStep, setExportStep] = useState<'scope' | 'format'>('scope')
  const [exportFull, setExportFull] = useState(false)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['report-stats'],
    queryFn: () => reportsService.getStats(),
  })

  const { data: growth, isLoading: growthLoading } = useQuery({
    queryKey: ['report-growth'],
    queryFn: () => reportsService.getMonthlyGrowth(12),
  })

  const { data: hospitalPerf, isLoading: perfLoading } = useQuery({
    queryKey: ['hospital-performance'],
    queryFn: () => reportsService.getHospitalPerformance(),
  })

  const { data: notifications, isLoading: notifLoading } = useQuery({
    queryKey: ['notification-history'],
    queryFn: () => notificationsService.list({ pageSize: 500 }),
  })

  const statusData = stats
    ? Object.entries(stats as Record<string, number>)
        .filter(([k, v]) => k !== 'total' && v > 0)
        .map(([name, value]) => ({
          key: name,
          name: t(`declarations:statuses.${name}`, { defaultValue: name }),
          value,
        }))
    : []

  const timestamp = Date.now()
  const locale = i18n.language === 'fr' ? 'fr' : 'en'
  const formatMonth = (month: string) => formatChartMonth(month, locale)
  const growthChartData = (growth ?? []).map((g) => ({
    ...g,
    month: formatMonth(g.month),
  }))

  const buildFullSections = (): ReportTableSection[] => [
    {
      title: t('admin:statusDistribution'),
      headers: [t('common:status', { ns: 'common' }), t('admin:totalDeclarations')],
      rows: statusData.map((s) => [s.name, s.value]),
    },
    {
      title: t('admin:monthlyReport'),
      headers: [t('common:date', { ns: 'common' }), t('admin:totalDeclarations')],
      rows: (growth ?? []).map((g) => [g.month, g.count]),
    },
    {
      title: t('admin:hospitalPerformance'),
      headers: [
        t('admin:hospitals'),
        t('admin:totalDeclarations'),
        t('admin:totalRegistrations'),
        t('admin:registrationRate'),
      ],
      rows: (hospitalPerf ?? []).map((h) => [
        h.name,
        h.total,
        h.registered,
        h.total > 0 ? `${Math.round((h.registered / h.total) * 100)}%` : '—',
      ]),
    },
    {
      title: t('admin:notificationHistory'),
      headers: [
        t('notifications:eventType'),
        t('notifications:channel'),
        t('notifications:recipient'),
        t('common:status', { ns: 'common' }),
        t('common:date', { ns: 'common' }),
      ],
      rows: (notifications?.data ?? []).map((n) => [
        t(`notifications:events.${n.event_type}`, { defaultValue: n.event_type }),
        t(`notifications:channels.${n.channel}`),
        n.recipient,
        t(`notifications:statuses.${n.notification_status}`),
        n.created_at,
      ]),
    },
  ]

  const buildCurrentSections = (): ReportTableSection[] => {
    if (reportType === 'monthly') {
      return [
        {
          title: t('admin:statusDistribution'),
          headers: [t('common:status', { ns: 'common' }), t('admin:totalDeclarations')],
          rows: statusData.map((s) => [s.name, s.value]),
        },
        {
          title: t('admin:monthlyReport'),
          headers: [t('common:date', { ns: 'common' }), t('admin:totalDeclarations')],
          rows: (growth ?? []).map((g) => [g.month, g.count]),
        },
      ]
    }
    if (reportType === 'performance') {
      return [
        {
          title: t('admin:hospitalPerformance'),
          headers: [
            t('admin:hospitals'),
            t('admin:totalDeclarations'),
            t('admin:totalRegistrations'),
            t('admin:registrationRate'),
          ],
          rows: (hospitalPerf ?? []).map((h) => [
            h.name,
            h.total,
            h.registered,
            h.total > 0 ? `${Math.round((h.registered / h.total) * 100)}%` : '—',
          ]),
        },
      ]
    }
    return [
      {
        title: t('admin:notificationHistory'),
        headers: [
          t('notifications:eventType'),
          t('notifications:channel'),
          t('notifications:recipient'),
          t('common:status', { ns: 'common' }),
          t('common:date', { ns: 'common' }),
        ],
        rows: (notifications?.data ?? []).map((n) => [
          t(`notifications:events.${n.event_type}`, { defaultValue: n.event_type }),
          t(`notifications:channels.${n.channel}`),
          n.recipient,
          t(`notifications:statuses.${n.notification_status}`),
          n.created_at,
        ]),
      },
    ]
  }

  const currentSubtitle =
    reportType === 'monthly'
      ? t('admin:monthlyReport')
      : reportType === 'performance'
        ? t('admin:hospitalPerformance')
        : t('admin:notificationHistory')

  const exportReport = (format: 'csv' | 'pdf' | 'word', full: boolean) => {
    const sections = full ? buildFullSections() : buildCurrentSections()
    if (!sections.some((s) => s.rows.length > 0)) return

    const base = full ? 'ebirth-full-report' : `ebirth-${reportType}-report`
    const title = full ? t('admin:reportGenerated') : t('admin:reports')
    const subtitle = full ? t('admin:exportFullReport') : currentSubtitle
    const exportOptions = { title, subtitle, locale, sections }

    if (format === 'csv') {
      exportReportCsv(sections, `${base}-${timestamp}.csv`)
    } else if (format === 'pdf') {
      exportReportPdf({ ...exportOptions, filename: `${base}-${timestamp}.pdf` })
    } else {
      exportReportWord({ ...exportOptions, filename: `${base}-${timestamp}.doc` })
    }
  }

  const exportFormats: {
    format: 'csv' | 'pdf' | 'word'
    label: string
    description: string
    icon: typeof FileSpreadsheet
    iconClass: string
  }[] = [
    {
      format: 'csv',
      label: t('admin:exportFormatCsv'),
      description: t('admin:exportFormatCsvDesc'),
      icon: FileSpreadsheet,
      iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      format: 'pdf',
      label: t('admin:exportFormatPdf'),
      description: t('admin:exportFormatPdfDesc'),
      icon: FileText,
      iconClass: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
    {
      format: 'word',
      label: t('admin:exportFormatWord'),
      description: t('admin:exportFormatWordDesc'),
      icon: FileType,
      iconClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
  ]

  const exportScopeOptions = [
    {
      full: false,
      label: t('admin:exportCurrentTab'),
      description: t('admin:exportCurrentTabDesc'),
      icon: PanelTop,
    },
    {
      full: true,
      label: t('admin:exportFullReport'),
      description: t('admin:exportFullReportDesc'),
      icon: LayoutDashboard,
    },
  ] as const

  const handleExportMenuOpenChange = (open: boolean) => {
    setExportMenuOpen(open)
    if (!open) setExportStep('scope')
  }

  const handleScopeSelect = (full: boolean) => {
    setExportFull(full)
    setExportStep('format')
  }

  const handleFormatSelect = (format: 'csv' | 'pdf' | 'word') => {
    exportReport(format, exportFull)
    setExportMenuOpen(false)
    setExportStep('scope')
  }

  const selectedScope = exportScopeOptions.find((option) => option.full === exportFull)

  const exportActions = (
    <DropdownMenu open={exportMenuOpen} onOpenChange={handleExportMenuOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="shadow-sm">
          <Download className="h-4 w-4" />
          {t('admin:exportReport')}
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {exportStep === 'scope' ? (
          <>
            <div className="px-2.5 pb-1 pt-2">
              <p className="text-sm font-semibold leading-none">{t('common:export')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('admin:exportMenuHint')}</p>
            </div>
            <DropdownMenuSeparator />
            {exportScopeOptions.map(({ full, label, description, icon: ScopeIcon }) => (
              <DropdownMenuItem
                key={String(full)}
                className="items-start"
                onSelect={(event) => {
                  event.preventDefault()
                  handleScopeSelect(full)
                }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ScopeIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-medium leading-none">{label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/70" />
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          <>
            <DropdownMenuItem
              className="gap-2 text-xs text-muted-foreground focus:text-foreground"
              onSelect={(event) => {
                event.preventDefault()
                setExportStep('scope')
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('admin:exportMenuBack')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2.5 pb-1">
              <p className="text-sm font-semibold leading-none">{t('admin:exportMenuFormat')}</p>
              {selectedScope && (
                <p className="mt-1 text-xs text-muted-foreground">{selectedScope.label}</p>
              )}
            </div>
            <DropdownMenuSeparator />
            {exportFormats.map(({ format, label: formatLabel, description: formatDesc, icon: FormatIcon, iconClass }) => (
              <DropdownMenuItem key={format} onClick={() => handleFormatSelect(format)} className="items-start">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconClass)}>
                  <FormatIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-medium leading-none">{formatLabel}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{formatDesc}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="page-shell">
      <PageHeader
        title={t('admin:reports')}
        description={t('admin:reportsDesc')}
        actions={exportActions}
      />

      <Tabs value={reportType} onValueChange={setReportType} className="space-y-3">
        <TabsList className="h-9 w-full justify-start gap-1 bg-muted/50 p-1 sm:w-auto">
          <TabsTrigger value="monthly" className="px-3 text-xs sm:text-sm">
            {t('admin:monthlyReport')}
          </TabsTrigger>
          <TabsTrigger value="performance" className="px-3 text-xs sm:text-sm">
            {t('admin:hospitalPerformance')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="px-3 text-xs sm:text-sm">
            {t('admin:notificationHistory')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-3">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm">{t('admin:monthlyReport')}</CardTitle>
                <CardDescription className="text-xs">{t('admin:monthlyReportDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                {growthLoading ? (
                  <Skeleton className="mx-auto h-[170px] w-full max-w-sm" />
                ) : !growth?.length ? (
                  <p className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                    {t('admin:noReportData')}
                  </p>
                ) : (
                  <div className="mx-auto w-full max-w-sm">
                    <ResponsiveContainer width="100%" height={170}>
                      <BarChart data={growthChartData} margin={chartMargins.bar} barSize={25}>
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
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.35 }} />
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
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm">{t('admin:statusDistribution')}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 pt-0">
                {statsLoading ? (
                  <Skeleton className="mx-auto h-36 w-full max-w-[11rem]" />
                ) : statusData.length === 0 ? (
                  <p className="flex h-36 items-center justify-center text-xs text-muted-foreground">
                    {t('admin:noReportData')}
                  </p>
                ) : (
                  <div className="mx-auto w-full max-w-xs">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="46%"
                          outerRadius={56}
                          labelLine={false}
                          label={renderPieSliceValue}
                        >
                          {statusData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          {perfLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : !hospitalPerf?.length ? (
            <EmptyState title={t('admin:noReportData')} />
          ) : (
            <DataTable className="[&>div]:overflow-visible">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[40%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <DataTableHeader>
                  <DataTableHead>{t('admin:hospitals')}</DataTableHead>
                  <DataTableHead>{t('admin:totalDeclarations')}</DataTableHead>
                  <DataTableHead>{t('admin:totalRegistrations')}</DataTableHead>
                  <DataTableHead>{t('admin:registrationRate')}</DataTableHead>
                </DataTableHeader>
                <DataTableBody>
                  {hospitalPerf.map((h) => (
                    <DataTableRow key={h.name}>
                      <DataTableCell className="truncate font-medium">{h.name}</DataTableCell>
                      <DataTableCell>{h.total}</DataTableCell>
                      <DataTableCell>{h.registered}</DataTableCell>
                      <DataTableCell>
                        {h.total > 0 ? `${Math.round((h.registered / h.total) * 100)}%` : '—'}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </table>
            </DataTable>
          )}
        </TabsContent>

        <TabsContent value="notifications">
          {notifLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : !notifications?.data.length ? (
            <EmptyState title={t('admin:noReportData')} />
          ) : (
            <DataTable className="[&>div]:overflow-visible">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[14%]" />
                  <col className="w-[38%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <DataTableHeader>
                  <DataTableHead>{t('notifications:eventType')}</DataTableHead>
                  <DataTableHead>{t('notifications:channel')}</DataTableHead>
                  <DataTableHead>{t('notifications:recipient')}</DataTableHead>
                  <DataTableHead>{t('common:status')}</DataTableHead>
                </DataTableHeader>
                <DataTableBody>
                  {notifications.data.map((n) => (
                    <DataTableRow key={n.id}>
                      <DataTableCell className="truncate">
                        {t(`notifications:events.${n.event_type}`, { defaultValue: n.event_type })}
                      </DataTableCell>
                      <DataTableCell>{t(`notifications:channels.${n.channel}`)}</DataTableCell>
                      <DataTableCell className="truncate font-mono text-xs">{n.recipient}</DataTableCell>
                      <DataTableCell className="truncate">
                        {t(`notifications:statuses.${n.notification_status}`)}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </table>
            </DataTable>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
