import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FileSearch } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { declarationsService } from '@/services/declarations.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '@/components/shared/DataTable'
import { formatDate } from '@/utils/format'
import type { DeclarationStatus } from '@/types'

export function VerificationPage() {
  const { t, i18n } = useTranslation(['civil', 'declarations', 'common'])
  const { profile } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['verification-queue', profile?.civil_status_center_id],
    queryFn: () =>
      declarationsService.list({
        civil_status_center_id: profile!.civil_status_center_id!,
        workflow_status: 'pending_documents',
        page_size: 50,
      }),
    enabled: !!profile?.civil_status_center_id,
  })

  return (
    <div className="page-shell">
      <PageHeader
        title={t('civil:verificationQueue')}
        description={t('civil:verificationQueueDesc')}
      />

      <DataTable>
        {isLoading ? (
          <p className="p-6 text-center text-muted-foreground">{t('common:loading')}</p>
        ) : !data?.data.length ? (
          <div className="p-6">
            <EmptyState
              title={t('civil:emptyDocumentsQueue')}
              icon={FileSearch}
            />
          </div>
        ) : (
          <table className="w-full">
            <DataTableHeader>
              <DataTableHead>{t('declarations:declarationNumber')}</DataTableHead>
              <DataTableHead>{t('declarations:childInfo')}</DataTableHead>
              <DataTableHead>{t('civil:documentRequestNotes')}</DataTableHead>
              <DataTableHead>{t('common:date')}</DataTableHead>
              <DataTableHead>{t('common:status')}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {data.data.map((d) => (
                <DataTableRow key={d.id}>
                  <DataTableCell>
                    <Link to={`/civil/declarations/${d.id}`} className="font-medium text-primary hover:underline">
                      {d.declaration_number}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>{d.child?.full_name}</DataTableCell>
                  <DataTableCell className="max-w-xs truncate text-muted-foreground">
                    {d.document_request_notes ?? '—'}
                  </DataTableCell>
                  <DataTableCell>{formatDate(d.updated_at, i18n.language)}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={d.workflow_status as DeclarationStatus} />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </table>
        )}
      </DataTable>
    </div>
  )
}
