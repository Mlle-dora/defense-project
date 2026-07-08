import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Baby, User, Users, Building2, Bell, FileWarning } from 'lucide-react'
import { declarationsService } from '@/services/declarations.service'
import { notificationsService } from '@/services/notifications.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { WorkflowStepper } from '@/components/shared/WorkflowStepper'
import { InfoCard } from '@/components/shared/InfoCard'
import { AlertBanner } from '@/components/shared/AlertBanner'
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatDateTime } from '@/utils/format'
import type { DeclarationStatus } from '@/types'

export function CivilDeclarationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation(['civil', 'declarations', 'notifications'])
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [documentRequestNotes, setDocumentRequestNotes] = useState('')

  const { data: declaration, isLoading } = useQuery({
    queryKey: ['declaration', id],
    queryFn: () => declarationsService.getById(id!),
    enabled: !!id,
  })

  const { data: notifications } = useQuery({
    queryKey: ['declaration-notifications', id],
    queryFn: () => notificationsService.listByDeclaration(id!),
    enabled: !!id,
  })

  const transitionMutation = useMutation({
    mutationFn: ({ status, metadata }: { status: DeclarationStatus; metadata?: Record<string, unknown> }) =>
      declarationsService.transitionStatus(id!, status, metadata),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['declaration', id] })
      queryClient.invalidateQueries({ queryKey: ['declaration-notifications', id] })
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] })
      const regNumber = (result as { registration_number?: string } | null)?.registration_number
      toast({
        title: regNumber ? t('civil:registrationAssigned', { number: regNumber }) : t('common:success', { ns: 'common' }),
      })
      setRejectOpen(false)
      setRegisterOpen(false)
      setDocumentsOpen(false)
      setRegistrationNumber('')
    },
    onError: (err: Error) =>
      toast({ title: err.message || t('common:error', { ns: 'common' }), variant: 'destructive' }),
  })

  if (isLoading || !declaration) {
    return <p className="p-8 text-muted-foreground">{t('common:loading', { ns: 'common' })}</p>
  }

  const status = declaration.workflow_status as DeclarationStatus

  const actions = (
    <div className="flex flex-wrap gap-2">
      {status === 'submitted' && (
        <Button onClick={() => transitionMutation.mutate({ status: 'received' })}>
          {t('civil:markReceived')}
        </Button>
      )}
      {status === 'received' && (
        <Button onClick={() => transitionMutation.mutate({ status: 'under_review' })}>
          {t('civil:startReview')}
        </Button>
      )}
      {status === 'under_review' && (
        <>
          <Button variant="outline" onClick={() => setDocumentsOpen(true)}>
            {t('civil:requestDocuments')}
          </Button>
          <Button onClick={() => setRegisterOpen(true)}>{t('civil:registerBirth')}</Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>
            {t('civil:rejectDeclaration')}
          </Button>
        </>
      )}
      {status === 'pending_documents' && (
        <Button onClick={() => transitionMutation.mutate({ status: 'under_review' })}>
          {t('civil:documentsProvided')}
        </Button>
      )}
      {status === 'registered' && (
        <Button onClick={() => transitionMutation.mutate({ status: 'certificate_ready' })}>
          {t('civil:markCertificateReady')}
        </Button>
      )}
    </div>
  )

  return (
    <div className="page-shell">
      <PageHeader
        title={declaration.declaration_number ?? t('declarations:declarationNumber', { ns: 'declarations' })}
        description={`${declaration.hospital?.name} → ${declaration.civil_status_center?.name}`}
        actions={actions}
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={status} />
        <span className="text-sm text-muted-foreground">
          {t('common:submitted', { ns: 'common', defaultValue: 'Submitted' })}:{' '}
          {formatDateTime(declaration.submitted_at ?? declaration.created_at, i18n.language)}
        </span>
      </div>

      {status === 'pending_documents' && declaration.document_request_notes && (
        <AlertBanner
          variant="warning"
          icon={FileWarning}
          title={t('civil:pendingDocuments')}
          description={declaration.document_request_notes}
        />
      )}

      {declaration.required_documents?.length ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('declarations:requiredDocumentsTitle', { ns: 'declarations' })}</CardTitle>
            <CardDescription>{t('declarations:requiredDocumentsDesc', { ns: 'declarations' })}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {declaration.required_documents.map((key) => (
                <li key={key}>{t(`declarations:requiredDocs.${key}`, { ns: 'declarations', defaultValue: key })}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('civil:workflowProgress')}</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowStepper status={status} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title={t('declarations:childInfo', { ns: 'declarations' })}
          icon={Baby}
          rows={[
            { label: t('declarations:fullName', { ns: 'declarations' }), value: declaration.child?.full_name },
            { label: t('declarations:gender', { ns: 'declarations' }), value: declaration.child?.gender },
            { label: t('declarations:birthDate', { ns: 'declarations' }), value: formatDate(declaration.child?.birth_date, i18n.language) },
            { label: t('declarations:birthPlace', { ns: 'declarations' }), value: declaration.child?.birth_place },
            { label: t('declarations:birthWeight', { ns: 'declarations' }), value: declaration.child?.birth_weight_kg ? `${declaration.child.birth_weight_kg} kg` : null },
          ]}
        />
        <InfoCard
          title={t('declarations:motherInfo', { ns: 'declarations' })}
          icon={User}
          rows={[
            { label: t('declarations:fullName', { ns: 'declarations' }), value: declaration.mother?.full_name },
            { label: t('common:phone', { ns: 'common' }), value: declaration.mother?.phone },
            { label: t('common:address', { ns: 'common' }), value: declaration.mother?.address },
            { label: t('declarations:nationality', { ns: 'declarations' }), value: declaration.mother?.nationality },
          ]}
        />
        {declaration.father?.full_name && (
          <InfoCard
            title={t('declarations:fatherInfo', { ns: 'declarations' })}
            icon={Users}
            rows={[
              { label: t('declarations:fullName', { ns: 'declarations' }), value: declaration.father.full_name },
              { label: t('common:phone', { ns: 'common' }), value: declaration.father.phone },
            ]}
          />
        )}
        <InfoCard
          title={t('declarations:civilCenter', { ns: 'declarations' })}
          icon={Building2}
          rows={[
            { label: 'Hospital', value: declaration.hospital?.name },
            { label: t('declarations:civilCenter', { ns: 'declarations' }), value: declaration.civil_status_center?.name },
            { label: t('civil:registrationNumber'), value: declaration.registration_number },
          ]}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            {t('civil:parentNotifications')}
          </CardTitle>
          <CardDescription>{t('civil:parentNotificationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications?.length ? (
            <DataTable>
              <table className="w-full">
                <DataTableHeader>
                  <DataTableHead>{t('notifications:eventType', { ns: 'notifications' })}</DataTableHead>
                  <DataTableHead>{t('notifications:channel', { ns: 'notifications' })}</DataTableHead>
                  <DataTableHead>{t('notifications:recipient', { ns: 'notifications' })}</DataTableHead>
                  <DataTableHead>{t('common:status', { ns: 'common' })}</DataTableHead>
                  <DataTableHead>{t('common:date', { ns: 'common' })}</DataTableHead>
                </DataTableHeader>
                <DataTableBody>
                  {notifications.map((n) => (
                    <DataTableRow key={n.id}>
                      <DataTableCell>
                        {t(`notifications:events.${n.event_type}`, { defaultValue: n.event_type })}
                      </DataTableCell>
                      <DataTableCell>{t(`notifications:channels.${n.channel}`, { ns: 'notifications' })}</DataTableCell>
                      <DataTableCell className="font-mono text-xs">{n.recipient}</DataTableCell>
                      <DataTableCell>{t(`notifications:statuses.${n.notification_status}`, { ns: 'notifications' })}</DataTableCell>
                      <DataTableCell>{formatDateTime(n.created_at, i18n.language)}</DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </table>
            </DataTable>
          ) : (
            <p className="text-sm text-muted-foreground">{t('civil:noNotifications')}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('civil:requestDocuments')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('civil:requestDocumentsDesc')}</p>
          <div className="space-y-2">
            <Label>{t('civil:documentRequestNotes')}</Label>
            <Textarea
              value={documentRequestNotes}
              onChange={(e) => setDocumentRequestNotes(e.target.value)}
              placeholder="e.g. Mother's national ID copy, marriage certificate..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentsOpen(false)}>
              {t('common:cancel', { ns: 'common' })}
            </Button>
            <Button
              disabled={!documentRequestNotes.trim() || transitionMutation.isPending}
              onClick={() =>
                transitionMutation.mutate({
                  status: 'pending_documents',
                  metadata: { document_request_notes: documentRequestNotes.trim() },
                })
              }
            >
              {t('civil:requestDocuments')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('civil:rejectDeclaration')}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>{t('civil:rejectionReason')}</Label>
            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t('common:cancel', { ns: 'common' })}</Button>
            <Button
              variant="destructive"
              onClick={() => transitionMutation.mutate({ status: 'rejected', metadata: { rejection_reason: rejectionReason } })}
            >
              {t('civil:rejectDeclaration')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('civil:registerBirth')}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t('civil:registrationAutoDesc')}</p>
          <div className="space-y-2">
            <Label>{t('civil:registrationNumberOverride')}</Label>
            <Input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder={t('civil:registrationAutoPlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>{t('common:cancel', { ns: 'common' })}</Button>
            <Button
              onClick={() =>
                transitionMutation.mutate({
                  status: 'registered',
                  metadata: registrationNumber.trim()
                    ? { registration_number: registrationNumber.trim() }
                    : {},
                })
              }
            >
              {t('civil:markRegistered')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
