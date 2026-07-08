import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { civilCentersService } from '@/services/civilCenters.service'
import { civilCenterSchema } from '@/features/declarations/validators/declaration.schema'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { auditService } from '@/services/audit.service'
import type { CivilStatusCenter } from '@/types'
import { z } from 'zod'

type CivilCenterForm = z.infer<typeof civilCenterSchema>

export function CivilCentersPage() {
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CivilStatusCenter | null>(null)

  const { data: centers, isLoading } = useQuery({
    queryKey: ['civil-centers'],
    queryFn: () => civilCentersService.list(),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(civilCenterSchema),
  })

  const saveMutation = useMutation({
    mutationFn: async (data: CivilCenterForm) => {
      const payload = { ...data, contact_email: data.contact_email || null }
      if (editing) return civilCentersService.update(editing.id, payload)
      return civilCentersService.create(payload as Parameters<typeof civilCentersService.create>[0])
    },
    onSuccess: async () => {
      await auditService.log(editing ? 'update' : 'create', 'civil_status_center')
      queryClient.invalidateQueries({ queryKey: ['civil-centers'] })
      setOpen(false)
      setEditing(null)
      reset()
      toast({ title: t('common:success', { ns: 'common' }) })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => civilCentersService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['civil-centers'] })
      toast({ title: t('common:success', { ns: 'common' }) })
    },
  })

  const openCreate = () => {
    setEditing(null)
    reset()
    setOpen(true)
  }

  const openEdit = (center: CivilStatusCenter) => {
    setEditing(center)
    reset({ ...center, contact_email: center.contact_email ?? '' })
    setOpen(true)
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={t('manageCivilCentersShort')}
        description={t('manageCivilCentersDescShort')}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createCivilCenterShort')}
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
        ) : !centers?.length ? (
          <div className="p-4">
            <EmptyState action={<Button size="sm" onClick={openCreate}>{t('createCivilCenterShort')}</Button>} />
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
              <DataTableHead>{t('regionOfficer')}</DataTableHead>
              <DataTableHead>{t('common:status', { ns: 'common' })}</DataTableHead>
              <DataTableHead className="text-right">{t('common:actions', { ns: 'common' })}</DataTableHead>
            </DataTableHeader>
            <DataTableBody>
              {centers.map((c) => (
                <DataTableRow key={c.id}>
                  <DataTableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.reference_number}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="min-w-0">
                      <p className="truncate capitalize">{c.region}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.officer_name}</p>
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    <EntityStatusBadge status={c.status} />
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(c.id)}>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('common:edit', { ns: 'common' }) : t('createCivilCenter')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d as CivilCenterForm))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('common:name', { ns: 'common' })}</Label>
              <Input {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('referenceNumber')}</Label>
                <Input {...register('reference_number')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('officerName')}</Label>
                <Input {...register('officer_name')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t('common:region', { ns: 'common' })}</Label>
                <Input {...register('region')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('common:division', { ns: 'common' })}</Label>
                <Input {...register('division')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('common:subdivision', { ns: 'common' })}</Label>
                <Input {...register('subdivision')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('common:address', { ns: 'common' })}</Label>
              <Input {...register('address')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('common:phone', { ns: 'common' })}</Label>
                <Input {...register('contact_phone')} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('common:email', { ns: 'common' })}</Label>
                <Input {...register('contact_email')} type="email" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                {t('common:cancel', { ns: 'common' })}
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {t('common:save', { ns: 'common' })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
