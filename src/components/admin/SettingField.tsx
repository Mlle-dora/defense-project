import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Calendar, Globe, Lock, MessageSquare } from 'lucide-react'
import type { SystemSetting } from '@/types'
import { SETTING_META, SMS_PROVIDER_OPTIONS, type SmsProviderName } from '@/features/admin/settingsConfig'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SettingFieldProps {
  setting: SystemSetting
  onSave: (key: string, value: Record<string, unknown>) => void
  isSaving?: boolean
}

export function SettingField({ setting, onSave, isSaving }: SettingFieldProps) {
  const { t } = useTranslation('admin')
  const meta = SETTING_META[setting.key]
  const label = meta ? t(meta.labelKey) : setting.key
  const description = meta ? t(meta.descriptionKey) : setting.description

  if (meta?.type === 'sms_provider') {
    const provider = String(setting.value.provider ?? 'mock') as SmsProviderName
    return (
      <SmsProviderField
        label={label}
        description={description}
        provider={provider}
        onSave={(p) => onSave(setting.key, { provider: p })}
        isSaving={isSaving}
      />
    )
  }

  if (setting.is_sensitive || meta?.type === 'readonly') {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{label}</CardTitle>
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <code className="rounded-lg bg-muted px-3 py-2 text-sm">
            {JSON.stringify(setting.value)}
          </code>
          <p className="mt-2 text-xs text-muted-foreground">{t('settings.sensitiveNote')}</p>
        </CardContent>
      </Card>
    )
  }

  if (meta?.type === 'days') {
    const days = Number(setting.value.days ?? 0)
    return (
      <SettingNumberCard
        settingKey={setting.key}
        icon={Calendar}
        label={label}
        description={description}
        value={days}
        suffix={t('settings.days')}
        onSave={(v) => onSave(setting.key, { days: v })}
        isSaving={isSaving}
      />
    )
  }

  if (meta?.type === 'max') {
    const max = Number(setting.value.max ?? 0)
    return (
      <SettingNumberCard
        settingKey={setting.key}
        icon={Bell}
        label={label}
        description={description}
        value={max}
        suffix={t('settings.attempts')}
        onSave={(v) => onSave(setting.key, { max: v })}
        isSaving={isSaving}
      />
    )
  }

  if (meta?.type === 'platform_name') {
    return (
      <PlatformNameField
        label={label}
        description={description}
        value={setting.value}
        onSave={(v) => onSave(setting.key, v)}
        isSaving={isSaving}
      />
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{label}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <code className="rounded-lg bg-muted px-3 py-2 text-sm">{JSON.stringify(setting.value)}</code>
      </CardContent>
    </Card>
  )
}

function SettingNumberCard({
  settingKey,
  icon: Icon,
  label,
  description,
  value,
  suffix,
  onSave,
  isSaving,
}: {
  settingKey: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string | null
  value: number
  suffix: string
  onSave: (value: number) => void
  isSaving?: boolean
}) {
  const { t } = useTranslation('admin')
  const inputId = `setting-${settingKey}`

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor={inputId}>{t('settings.value')}</Label>
            <Input
              id={inputId}
              type="number"
              min={1}
              defaultValue={value}
              className="w-32"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave(Number(e.currentTarget.value))
              }}
            />
          </div>
          <span className="pb-2 text-sm text-muted-foreground">{suffix}</span>
          <Button
            size="sm"
            disabled={isSaving}
            onClick={() => {
              const input = document.getElementById(inputId) as HTMLInputElement
              onSave(Number(input.value))
            }}
          >
            {t('common:save', { ns: 'common' })}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SmsProviderField({
  label,
  description,
  provider,
  onSave,
  isSaving,
}: {
  label: string
  description: string | null
  provider: SmsProviderName
  onSave: (provider: SmsProviderName) => void
  isSaving?: boolean
}) {
  const { t } = useTranslation('admin')
  const [selected, setSelected] = useState<SmsProviderName>(provider)

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-sm">
          <Label>{t('settings.provider')}</Label>
          <Select value={selected} onValueChange={(v) => setSelected(v as SmsProviderName)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SMS_PROVIDER_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t(`settings.smsProviders.${p}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{t(`settings.smsProviderHelp.${selected}`)}</p>
        <Button size="sm" disabled={isSaving || selected === provider} onClick={() => onSave(selected)}>
          {t('common:save', { ns: 'common' })}
        </Button>
      </CardContent>
    </Card>
  )
}

function PlatformNameField({
  label,
  description,
  value,
  onSave,
  isSaving,
}: {
  label: string
  description: string | null
  value: Record<string, unknown>
  onSave: (value: Record<string, unknown>) => void
  isSaving?: boolean
}) {
  const { t } = useTranslation('admin')
  const [en, setEn] = useState(String(value.en ?? ''))
  const [fr, setFr] = useState(String(value.fr ?? ''))

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('settings.languageEn')}</Label>
            <Input value={en} onChange={(e) => setEn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.languageFr')}</Label>
            <Input value={fr} onChange={(e) => setFr(e.target.value)} />
          </div>
        </div>
        <Button size="sm" disabled={isSaving} onClick={() => onSave({ en, fr })}>
          {t('common:save', { ns: 'common' })}
        </Button>
      </CardContent>
    </Card>
  )
}
