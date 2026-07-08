import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { usersService } from '@/services/users.service'
import { hospitalsService } from '@/services/hospitals.service'
import { civilCentersService } from '@/services/civilCenters.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { EntityStatusBadge } from '@/components/shared/EntityStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/components/shared/DataTable'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { UserRole } from '@/types'

const selectTriggerClass =
  'h-8 w-full min-w-0 text-xs [&>span]:line-clamp-1 [&>span]:text-left'

const ROLE_VALUES = ['super_admin', 'hospital', 'civil_officer'] as const

export function UsersPage() {
  const { t } = useTranslation(['admin', 'common'])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.list(),
  })

  const { data: hospitals } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => hospitalsService.list(),
  })

  const { data: centers } = useQuery({
    queryKey: ['civil-centers'],
    queryFn: () => civilCentersService.list(),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role, orgId }: { id: string; role: UserRole; orgId?: string }) =>
      usersService.updateRole(id, role, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: t('common:success', { ns: 'common' }) })
    },
  })

  return (
    <div className="page-shell">
      <PageHeader title={t('manageUsers')} description={t('manageUsersDesc')} />

      <DataTable className="[&>div]:overflow-visible">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !users?.length ? (
          <EmptyState title={t('common:noResults', { ns: 'common' })} />
        ) : (
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[18%]" />
              <col className="w-[40%]" />
              <col className="w-[12%]" />
            </colgroup>
            <DataTableHeader>
              <DataTableHead className="px-3 py-2.5">{t('common:user', { ns: 'common', defaultValue: 'User' })}</DataTableHead>
              <DataTableHead className="px-3 py-2.5">{t('assignRole')}</DataTableHead>
              <DataTableHead className="px-3 py-2.5">{t('organization')}</DataTableHead>
              <DataTableHead className="px-3 py-2.5">{t('common:status', { ns: 'common' })}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {users.map((u) => (
                <DataTableRow key={u.id}>
                  <DataTableCell className="px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{u.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell className="px-3 py-2.5">
                    <Select
                      value={u.role}
                      onValueChange={(role) =>
                        roleMutation.mutate({ id: u.id, role: role as UserRole })
                      }
                    >
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_VALUES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DataTableCell>
                  <DataTableCell className="px-3 py-2.5">
                    {u.role === 'hospital' ? (
                      <Select
                        value={u.hospital_id ?? ''}
                        onValueChange={(orgId) =>
                          roleMutation.mutate({ id: u.id, role: 'hospital', orgId })
                        }
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {hospitals?.map((h) => (
                            <SelectItem key={h.id} value={h.id}>
                              {h.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : u.role === 'civil_officer' ? (
                      <Select
                        value={u.civil_status_center_id ?? ''}
                        onValueChange={(orgId) =>
                          roleMutation.mutate({ id: u.id, role: 'civil_officer', orgId })
                        }
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {centers?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </DataTableCell>
                  <DataTableCell className="px-3 py-2.5">
                    <EntityStatusBadge status={u.status} />
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
