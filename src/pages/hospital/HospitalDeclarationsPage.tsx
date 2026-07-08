import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { declarationsService } from '@/services/declarations.service'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/PageHeader'
import { FilterBar } from '@/components/shared/FilterBar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/utils/format'
import type { DeclarationStatus } from '@/types'

export function HospitalDeclarationsPage() {
  const { t, i18n } = useTranslation(['hospital', 'declarations', 'common'])
  const { profile } = useAuth()
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<string>('')
  const debouncedQuery = useDebounce(query)

  const { data, isLoading } = useQuery({
    queryKey: ['hospital-declarations', profile?.hospital_id, page, debouncedQuery, status],
    queryFn: () =>
      declarationsService.list({
        hospital_id: profile!.hospital_id!,
        query: debouncedQuery || undefined,
        workflow_status: (status || undefined) as DeclarationStatus | undefined,
        page,
        page_size: 20,
      }),
    enabled: !!profile?.hospital_id,
  })

  return (
    <div className="page-shell">
      <PageHeader
        title={t('hospital:declarations')}
        description={t('hospital:declarationsDesc')}
        actions={
          <Button asChild>
            <Link to="/hospital/declarations/new">
              <Plus className="h-4 w-4 mr-2" />
              {t('hospital:newDeclaration')}
            </Link>
          </Button>
        }
      />

      <FilterBar
        searchValue={query}
        onSearchChange={(v) => { setQuery(v); setPage(1) }}
        searchPlaceholder={t('declarations:searchPlaceholder')}
      >
        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48 bg-card">
            <SelectValue placeholder={t('common:status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common:all')}</SelectItem>
            {(['draft', 'submitted', 'registered', 'rejected', 'certificate_ready', 'pending_documents'] as const).map((s) => (
              <SelectItem key={s} value={s}>{t(`declarations:statuses.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable>
        {isLoading ? (
          <p className="p-6 text-center text-muted-foreground">{t('common:loading')}</p>
        ) : !data?.data.length ? (
          <div className="p-6">
            <EmptyState
              action={
                <Button asChild>
                  <Link to="/hospital/declarations/new">{t('hospital:newDeclaration')}</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <table className="w-full">
              <DataTableHeader>
                <DataTableHead>{t('declarations:declarationNumber')}</DataTableHead>
                <DataTableHead>{t('declarations:childInfo')}</DataTableHead>
                <DataTableHead>{t('declarations:motherInfo')}</DataTableHead>
                <DataTableHead>{t('common:date')}</DataTableHead>
                <DataTableHead>{t('common:status')}</DataTableHead>
              </DataTableHeader>
              <DataTableBody>
                {data.data.map((d) => (
                  <DataTableRow key={d.id}>
                    <DataTableCell>
                      <Link to={`/hospital/declarations/${d.id}`} className="font-medium text-primary hover:underline">
                        {d.declaration_number ?? '—'}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>{d.child?.full_name}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">{d.mother?.full_name}</DataTableCell>
                    <DataTableCell className="text-muted-foreground">{formatDate(d.created_at, i18n.language)}</DataTableCell>
                    <DataTableCell>
                      <StatusBadge status={d.workflow_status as DeclarationStatus} />
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </table>
            <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
          </>
        )}
      </DataTable>
    </div>
  )
}
