import { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { declarationsService } from '@/services/declarations.service'
import { civilCentersService } from '@/services/civilCenters.service'
import { declarationFormSchema, type DeclarationFormData } from '@/features/declarations/validators/declaration.schema'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { AlertBanner } from '@/components/shared/AlertBanner'
import { WorkflowStepper } from '@/components/shared/WorkflowStepper'
import { getRequiredDocuments } from '@/features/declarations/documentRules'
import { FileWarning, XCircle } from 'lucide-react'
import type { DeclarationStatus } from '@/types'
import type { FieldPath } from 'react-hook-form'

const FORM_STEPS = ['child', 'mother', 'father', 'center', 'review'] as const
type FormStep = (typeof FORM_STEPS)[number]

const STEP_FIELDS: Partial<Record<FormStep, FieldPath<DeclarationFormData>[]>> = {
  child: ['child.full_name', 'child.gender', 'child.birth_date', 'child.birth_place'],
  mother: [
    'mother.full_name',
    'mother.date_of_birth',
    'mother.nationality',
    'mother.phone',
    'mother.address',
    'mother_marital_status',
  ],
  center: ['civil_status_center_id'],
}

function PreviewRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || '—'}</dd>
    </div>
  )
}

export function NewDeclarationPage() {
  const { id } = useParams()
  const isEdit = !!id
  const { t } = useTranslation(['declarations', 'hospital', 'common'])
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [activeStep, setActiveStep] = useState<FormStep>('child')
  const [savedId, setSavedId] = useState<string | undefined>(id)

  const { data: existing } = useQuery({
    queryKey: ['declaration', id],
    queryFn: () => declarationsService.getById(id!),
    enabled: isEdit,
  })

  const { data: centers } = useQuery({
    queryKey: ['civil-centers'],
    queryFn: () => civilCentersService.list(),
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<DeclarationFormData>({
    resolver: zodResolver(declarationFormSchema),
    values: existing
      ? {
          civil_status_center_id: existing.civil_status_center_id,
          mother_marital_status: (existing.mother_marital_status ?? 'single') as DeclarationFormData['mother_marital_status'],
          paternity_recognized: existing.paternity_recognized ?? false,
          mother_email: existing.parent_contacts?.find((c) => c.contact_type === 'mother')?.email ?? '',
          child: {
            full_name: existing.child?.full_name ?? '',
            gender: existing.child?.gender ?? 'male',
            birth_date: existing.child?.birth_date ?? '',
            birth_time: existing.child?.birth_time ?? '',
            birth_weight_kg: existing.child?.birth_weight_kg ?? undefined,
            birth_place: existing.child?.birth_place ?? '',
          },
          mother: {
            full_name: existing.mother?.full_name ?? '',
            date_of_birth: existing.mother?.date_of_birth ?? '',
            nationality: existing.mother?.nationality ?? 'Cameroonian',
            occupation: existing.mother?.occupation ?? '',
            phone: existing.mother?.phone ?? '',
            address: existing.mother?.address ?? '',
            id_number: existing.mother?.id_number ?? '',
          },
          father: existing.father
            ? {
                full_name: existing.father.full_name,
                date_of_birth: existing.father.date_of_birth ?? '',
                nationality: existing.father.nationality ?? '',
                occupation: existing.father.occupation ?? '',
                phone: existing.father.phone ?? '',
                address: existing.father.address ?? '',
                id_number: existing.father.id_number ?? '',
              }
            : {},
        }
      : undefined,
    defaultValues: {
      civil_status_center_id: '',
      mother_marital_status: 'single',
      paternity_recognized: false,
      mother_email: '',
      child: { full_name: '', gender: 'male', birth_date: '', birth_place: '' },
      mother: { full_name: '', date_of_birth: '', nationality: 'Cameroonian', phone: '', address: '' },
      father: {},
    },
  })

  useEffect(() => {
    if (id) setSavedId(id)
  }, [id])

  const buildPayload = (data: DeclarationFormData) => {
    if (!profile?.hospital_id) throw new Error('No hospital assigned')
    const paternityRecognized =
      data.mother_marital_status === 'married' ? true : data.paternity_recognized
    const meta = declarationsService.buildDeclarationMeta({
      mother_marital_status: data.mother_marital_status,
      paternity_recognized: paternityRecognized,
      father: data.father,
    })
    const motherEmail = data.mother_email?.trim() || null

    return {
      hospital_id: profile.hospital_id,
      civil_status_center_id: data.civil_status_center_id,
      ...meta,
      child: data.child,
      mother: data.mother,
      father: data.father?.full_name ? data.father : null,
      parent_contacts: [
        {
          contact_type: 'mother',
          phone: data.mother.phone,
          email: motherEmail,
          preferred_channel: motherEmail ? 'email' : 'sms',
        },
        ...(data.father?.phone
          ? [{ contact_type: 'father', phone: data.father.phone, preferred_channel: 'sms' }]
          : []),
      ],
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (data: DeclarationFormData) => {
      const payload = buildPayload(data)
      const effectiveId = savedId ?? id
      if (effectiveId) {
        return declarationsService.update(effectiveId, payload)
      }
      return declarationsService.create(payload)
    },
    onSuccess: (decl) => {
      toast({ title: t(isEdit || savedId ? 'declarations:declarationUpdated' : 'declarations:declarationCreated') })
      setSavedId(decl.id)
      if (!isEdit && !id) {
        window.history.replaceState(null, '', `/hospital/declarations/${decl.id}`)
      }
    },
    onError: (err: Error) =>
      toast({ title: err.message || t('common:error'), variant: 'destructive' }),
  })

  const submitMutation = useMutation({
    mutationFn: (declId: string) => declarationsService.submitDeclaration(declId),
    onSuccess: () => {
      toast({ title: t('hospital:declarationSubmitted') })
      navigate('/hospital/declarations')
    },
    onError: (err: Error) =>
      toast({
        title: t('hospital:submitFailed'),
        description: err.message,
        variant: 'destructive',
      }),
  })

  const onSave = (data: DeclarationFormData) => saveMutation.mutate(data)

  const onFinalSubmit = handleSubmit(async (data) => {
    const decl = await saveMutation.mutateAsync(data)
    await submitMutation.mutateAsync(decl.id)
  })

  const handleProceed = async () => {
    const fields = STEP_FIELDS[activeStep]
    if (fields?.length) {
      const valid = await trigger(fields)
      if (!valid) return
    }

    const index = FORM_STEPS.indexOf(activeStep)
    if (index < FORM_STEPS.length - 1) {
      setActiveStep(FORM_STEPS[index + 1])
    }
  }

  const handleBack = () => {
    const index = FORM_STEPS.indexOf(activeStep)
    if (index > 0) setActiveStep(FORM_STEPS[index - 1])
  }

  const canSubmit =
    !existing || existing.workflow_status === 'draft' || existing.workflow_status === 'rejected'
  const isBusy = isSubmitting || saveMutation.isPending || submitMutation.isPending
  const isReview = activeStep === 'review'
  const values = watch()
  const selectedCenter = centers?.find((c) => c.id === values.civil_status_center_id)
  const isMarried = values.mother_marital_status === 'married'
  const requiredDocKeys = getRequiredDocuments({
    motherMaritalStatus: values.mother_marital_status ?? 'single',
    paternityRecognized: isMarried ? true : values.paternity_recognized ?? false,
    fatherDeclared: Boolean(values.father?.full_name?.trim()),
  })

  return (
    <div className="page-shell">
      <PageHeader
        title={isEdit ? t('hospital:editDeclaration') : t('hospital:newDeclaration')}
        description={isEdit ? t('hospital:editDeclarationDesc') : t('hospital:newDeclarationDesc')}
      />

      {isEdit && existing && (
        <>
          <WorkflowStepper status={existing.workflow_status as DeclarationStatus} />
          {existing.workflow_status === 'pending_documents' && existing.document_request_notes && (
            <AlertBanner
              variant="warning"
              icon={FileWarning}
              title={t('hospital:documentsRequested')}
              description={`${t('hospital:documentsRequestedDesc')} ${existing.document_request_notes}`}
            />
          )}
          {existing.workflow_status === 'rejected' && existing.rejection_reason && (
            <AlertBanner
              variant="danger"
              icon={XCircle}
              title={t('hospital:rejectionNotice')}
              description={existing.rejection_reason}
            />
          )}
        </>
      )}

      <Card className="shadow-sm">
        <form onSubmit={handleSubmit(onSave)} className="space-y-3 p-4">
          <Tabs value={activeStep} onValueChange={(v) => setActiveStep(v as FormStep)} className="space-y-3">
            <TabsList className="h-9 w-full justify-start gap-1 bg-muted/50 p-1 sm:w-auto">
              <TabsTrigger value="child" className="px-2.5 text-xs sm:text-sm">
                {t('declarations:childInfo')}
              </TabsTrigger>
              <TabsTrigger value="mother" className="px-2.5 text-xs sm:text-sm">
                {t('declarations:motherInfo')}
              </TabsTrigger>
              <TabsTrigger value="father" className="px-2.5 text-xs sm:text-sm">
                {t('declarations:fatherInfo')}
              </TabsTrigger>
              <TabsTrigger value="center" className="px-2.5 text-xs sm:text-sm">
                {t('declarations:civilCenter')}
              </TabsTrigger>
              <TabsTrigger value="review" className="px-2.5 text-xs sm:text-sm">
                {t('declarations:review')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="child" className="mt-0">
              <Card className="border shadow-none">
                <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">{t('declarations:fullName')}</Label>
                    <Input {...register('child.full_name')} />
                    {errors.child?.full_name && (
                      <p className="text-xs text-destructive">{errors.child.full_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:gender')}</Label>
                    <Select
                      value={watch('child.gender')}
                      onValueChange={(v) => setValue('child.gender', v as 'male' | 'female' | 'other')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">{t('declarations:male')}</SelectItem>
                        <SelectItem value="female">{t('declarations:female')}</SelectItem>
                        <SelectItem value="other">{t('declarations:other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:birthDate')}</Label>
                    <Input type="date" {...register('child.birth_date')} />
                    {errors.child?.birth_date && (
                      <p className="text-xs text-destructive">{errors.child.birth_date.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:birthTime')}</Label>
                    <Input type="time" {...register('child.birth_time')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:birthWeight')}</Label>
                    <Input type="number" step="0.01" {...register('child.birth_weight_kg')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:birthPlace')}</Label>
                    <Input {...register('child.birth_place')} />
                    {errors.child?.birth_place && (
                      <p className="text-xs text-destructive">{errors.child.birth_place.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mother" className="mt-0">
              <Card className="border shadow-none">
                <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">{t('declarations:fullName')}</Label>
                    <Input {...register('mother.full_name')} />
                    {errors.mother?.full_name && (
                      <p className="text-xs text-destructive">{errors.mother.full_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:dateOfBirth')}</Label>
                    <Input type="date" {...register('mother.date_of_birth')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:nationality')}</Label>
                    <Input {...register('mother.nationality')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('common:phone')}</Label>
                    <Input {...register('mother.phone')} />
                    {errors.mother?.phone && (
                      <p className="text-xs text-destructive">{errors.mother.phone.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:occupation')}</Label>
                    <Input {...register('mother.occupation')} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">{t('common:address')}</Label>
                    <Input {...register('mother.address')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:idNumber')}</Label>
                    <Input {...register('mother.id_number')} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">{t('declarations:motherMaritalStatus')}</Label>
                    <Select
                      value={watch('mother_marital_status')}
                      onValueChange={(v) =>
                        setValue('mother_marital_status', v as DeclarationFormData['mother_marital_status'])
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['married', 'single', 'widowed', 'divorced'] as const).map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`declarations:maritalStatus.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">{t('declarations:motherEmail')}</Label>
                    <Input type="email" {...register('mother_email')} placeholder="email@example.com" />
                    {errors.mother_email && (
                      <p className="text-xs text-destructive">{errors.mother_email.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="father" className="mt-0">
              <Card className="border shadow-none">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-xs font-normal text-muted-foreground">
                    {t('declarations:fatherOptional')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 pb-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs">{t('declarations:fullName')}</Label>
                    <Input {...register('father.full_name')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('declarations:dateOfBirth')}</Label>
                    <Input type="date" {...register('father.date_of_birth')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('common:phone')}</Label>
                    <Input {...register('father.phone')} />
                  </div>
                  {!isMarried && (
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={watch('paternity_recognized')}
                          onChange={(e) => setValue('paternity_recognized', e.target.checked)}
                        />
                        <span className="text-xs leading-relaxed">
                          {t('declarations:paternityRecognized')}
                        </span>
                      </label>
                      <p className="text-xs text-muted-foreground">{t('declarations:paternityRecognizedHint')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="center" className="mt-0">
              <Card className="border shadow-none">
                <CardContent className="space-y-1.5 pt-4">
                  <Label className="text-xs">{t('declarations:selectCivilCenter')}</Label>
                  <Select
                    value={watch('civil_status_center_id')}
                    onValueChange={(v) => setValue('civil_status_center_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('declarations:selectCivilCenter')} />
                    </SelectTrigger>
                    <SelectContent>
                      {centers?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} — {c.region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.civil_status_center_id && (
                    <p className="text-xs text-destructive">{errors.civil_status_center_id.message}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review" className="mt-0">
              <Card className="border shadow-none">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm">{t('declarations:review')}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t('declarations:reviewDesc')}</p>
                </CardHeader>
                <CardContent className="space-y-4 pb-4">
                  <section className="space-y-2 rounded-lg border p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('declarations:childInfo')}
                    </h3>
                    <dl className="space-y-2">
                      <PreviewRow label={t('declarations:fullName')} value={values.child?.full_name} />
                      <PreviewRow
                        label={t('declarations:gender')}
                        value={values.child?.gender ? t(`declarations:${values.child.gender}`) : undefined}
                      />
                      <PreviewRow label={t('declarations:birthDate')} value={values.child?.birth_date} />
                      <PreviewRow label={t('declarations:birthTime')} value={values.child?.birth_time} />
                      <PreviewRow label={t('declarations:birthWeight')} value={values.child?.birth_weight_kg} />
                      <PreviewRow label={t('declarations:birthPlace')} value={values.child?.birth_place} />
                    </dl>
                  </section>

                  <section className="space-y-2 rounded-lg border p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('declarations:motherInfo')}
                    </h3>
                    <dl className="space-y-2">
                      <PreviewRow label={t('declarations:fullName')} value={values.mother?.full_name} />
                      <PreviewRow label={t('declarations:dateOfBirth')} value={values.mother?.date_of_birth} />
                      <PreviewRow label={t('declarations:nationality')} value={values.mother?.nationality} />
                      <PreviewRow label={t('common:phone')} value={values.mother?.phone} />
                      <PreviewRow label={t('common:address')} value={values.mother?.address} />
                      <PreviewRow
                        label={t('declarations:motherMaritalStatus')}
                        value={
                          values.mother_marital_status
                            ? t(`declarations:maritalStatus.${values.mother_marital_status}`)
                            : undefined
                        }
                      />
                      {values.mother_email && (
                        <PreviewRow label={t('declarations:motherEmail')} value={values.mother_email} />
                      )}
                    </dl>
                  </section>

                  {values.father?.full_name && (
                    <section className="space-y-2 rounded-lg border p-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('declarations:fatherInfo')}
                      </h3>
                      <dl className="space-y-2">
                        <PreviewRow label={t('declarations:fullName')} value={values.father.full_name} />
                        <PreviewRow label={t('declarations:dateOfBirth')} value={values.father.date_of_birth} />
                        <PreviewRow label={t('common:phone')} value={values.father.phone} />
                      </dl>
                    </section>
                  )}

                  <section className="space-y-2 rounded-lg border p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('declarations:civilCenter')}
                    </h3>
                    <PreviewRow
                      label={t('declarations:selectCivilCenter')}
                      value={selectedCenter ? `${selectedCenter.name} — ${selectedCenter.region}` : undefined}
                    />
                  </section>

                  <section className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {t('declarations:requiredDocumentsTitle')}
                    </h3>
                    <p className="text-xs text-muted-foreground">{t('declarations:requiredDocumentsDesc')}</p>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {requiredDocKeys.map((key) => (
                        <li key={key}>{t(`declarations:requiredDocs.${key}`)}</li>
                      ))}
                    </ul>
                  </section>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <div>
              {activeStep !== 'child' && (
                <Button type="button" variant="ghost" size="sm" onClick={handleBack} disabled={isBusy}>
                  {t('common:back')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" size="sm" disabled={isBusy}>
                {t('common:save')}
              </Button>
              {isReview && canSubmit ? (
                <Button type="button" size="sm" disabled={isBusy} onClick={onFinalSubmit}>
                  {t('hospital:submitDeclaration')}
                </Button>
              ) : !isReview ? (
                <Button type="button" size="sm" disabled={isBusy} onClick={handleProceed}>
                  {t('declarations:proceed')}
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </Card>
    </div>
  )
}

export { NewDeclarationPage as DeclarationDetailPage }
