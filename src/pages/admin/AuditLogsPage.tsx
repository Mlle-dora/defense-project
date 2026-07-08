import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { auditService } from '@/services/audit.service'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/utils/format'
import { cn } from '@/utils/cn'

const ACTION_STYLES: Record<string, string> = {
  login: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  logout: 'bg-muted text-muted-foreground',
  create: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  update: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  submit: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
}

export function AuditLogsPage() {
  const { t, i18n } = useTranslation(['admin', 'common'])
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => auditService.list({ page, pageSize: 20 }),
  })

  const translateAction = (action: string) =>
    t(`auditActions.${action}`, { defaultValue: action })

  const translateEntity = (entity: string) =>
    t(`auditEntities.${entity}`, { defaultValue: entity })

  return (
    <div className="page-shell">
      <PageHeader title={t('auditLogs')} description={t('auditLogsDesc')} />

      <DataTable className="[&>div]:overflow-visible">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <>
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[24%]" />
                <col className="w-[22%]" />
                <col className="w-[26%]" />
              </colgroup>
              <DataTableHeader>
                <DataTableHead>{t('common:date', { ns: 'common' })}</DataTableHead>
                <DataTableHead>{t('auditActor')}</DataTableHead>
                <DataTableHead>{t('auditAction')}</DataTableHead>
                <DataTableHead>{t('auditEntity')}</DataTableHead>
              </DataTableHeader>
              <DataTableBody>
                {data?.data.map((log) => (
                  <DataTableRow key={log.id}>
                    <DataTableCell className="truncate text-xs text-muted-foreground">
                      {formatDateTime(log.created_at, i18n.language)}
                    </DataTableCell>
                    <DataTableCell className="truncate text-sm font-medium">
                      {(log.actor as { full_name?: string })?.full_name ?? t('auditSystem')}
                    </DataTableCell>
                    <DataTableCell>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                          ACTION_STYLES[log.action] ?? 'bg-muted text-muted-foreground'
                        )}
                      >
                        {translateAction(log.action)}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="truncate text-xs text-muted-foreground">
                      {translateEntity(log.entity_type)}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </table>
            {data && (
              <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
            )}
          </>
        )}
      </DataTable>
    </div>
  )
}
