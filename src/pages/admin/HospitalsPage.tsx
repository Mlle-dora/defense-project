import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { hospitalsService } from '@/services/hospitals.service'
import { hospitalSchema } from '@/features/declarations/validators/declaration.schema'
import { PageHeader } from '@/components/shared/PageHeader'
import { EntityStatusBadge } from '@/components/shared/EntityStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { auditService } from '@/services/audit.service'
import type { Hospital } from '@/types'
import { z } from 'zod'

type HospitalForm = z.infer<typeof hospitalSchema>

export function HospitalsPage() {
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Hospital | null>(null)

  const { data: hospitals, isLoading } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => hospitalsService.list(),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(hospitalSchema),
  })

  const createMutation = useMutation({
    mutationFn: (data: HospitalForm) => hospitalsService.create(data),
    onSuccess: async () => {
      await auditService.log('create', 'hospital')
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setOpen(false)
      reset()
      toast({ title: t('common:success', { ns: 'common' }) })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HospitalForm> }) =>
      hospitalsService.update(id, data),
    onSuccess: async () => {
      await auditService.log('update', 'hospital')
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      setOpen(false)
      setEditing(null)
      reset()
      toast({ title: t('common:success', { ns: 'common' }) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hospitalsService.softDelete(id),
    onSuccess: async () => {
      await auditService.log('delete', 'hospital')
      queryClient.invalidateQueries({ queryKey: ['hospitals'] })
      toast({ title: t('common:success', { ns: 'common' }) })
    },
  })

  const openCreate = () => {
    setEditing(null)
    reset()
    setOpen(true)
  }

  const openEdit = (hospital: Hospital) => {
    setEditing(hospital)
    reset(hospital)
    setOpen(true)
  }

  const onSubmit = (data: HospitalForm) => {
    if (editing) updateMutation.mutate({ id: editing.id, data })
    else createMutation.mutate(data)
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={t('manageHospitals')}
        description={t('manageHospitalsDescShort')}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createHospitalShort')}
          </Button>
        }
      />

      <DataTable className="[&>div]:overflow-visible">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : !hospitals?.length ? (
          <div className="p-4">
            <EmptyState action={<Button size="sm" onClick={openCreate}>{t('createHospitalShort')}</Button>} />
          </div>
        ) : (
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[30%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
            </colgroup>
            <DataTableHeader>
              <DataTableHead>{t('common:name', { ns: 'common' })}</DataTableHead>
              <DataTableHead>{t('regionContact')}</DataTableHead>
              <DataTableHead>{t('common:status', { ns: 'common' })}</DataTableHead>
              <DataTableHead className="text-right">{t('common:actions', { ns: 'common' })}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {hospitals.map((h) => (
                <DataTableRow key={h.id}>
                  <DataTableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{h.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{h.code}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="min-w-0">
                      <p className="truncate capitalize">{h.region}</p>
                      <p className="truncate text-xs text-muted-foreground">{h.contact_phone}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell><EntityStatusBadge status={h.status} /></DataTableCell>
                  <DataTableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(h)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(h.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </table>
        )}
      </DataTable>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('common:edit', { ns: 'common' }) : t('createHospital')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => onSubmit(d as HospitalForm))} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('common:name', { ns: 'common' })}</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('hospitalCode')}</Label>
                <Input {...register('code')} />
              </div>
              <div className="space-y-2">
                <Label>{t('common:region', { ns: 'common' })}</Label>
                <Input {...register('region')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('common:division', { ns: 'common' })}</Label>
              <Input {...register('division')} />
            </div>
            <div className="space-y-2">
              <Label>{t('common:address', { ns: 'common' })}</Label>
              <Input {...register('address')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('common:phone', { ns: 'common' })}</Label>
                <Input {...register('contact_phone')} />
              </div>
              <div className="space-y-2">
                <Label>{t('common:email', { ns: 'common' })}</Label>
                <Input {...register('contact_email')} type="email" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common:cancel', { ns: 'common' })}</Button>
              <Button type="submit" disabled={isSubmitting}>{t('common:save', { ns: 'common' })}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
