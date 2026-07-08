import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Settings, Bell, Calendar, Globe } from 'lucide-react'
import { settingsService } from '@/services/settings.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { SettingField } from '@/components/admin/SettingField'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  SETTING_CATEGORIES,
  SETTING_META,
  type SettingCategory,
} from '@/features/admin/settingsConfig'
import type { SystemSetting } from '@/types'

const CATEGORY_ICONS: Record<SettingCategory, React.ComponentType<{ className?: string }>> = {
  registration: Calendar,
  notifications: Bell,
  platform: Globe,
}

export function SettingsPage() {
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsService.list(),
  })

  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, unknown> }) =>
      settingsService.upsert(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast({ title: t('common:success', { ns: 'common' }) })
    },
    onError: () => toast({ title: t('common:error', { ns: 'common' }), variant: 'destructive' }),
  })

  const grouped = useMemo(() => {
    const map: Record<SettingCategory, SystemSetting[]> = {
      registration: [],
      notifications: [],
      platform: [],
    }
    settings?.forEach((s) => {
      const cat = SETTING_META[s.key]?.category ?? 'platform'
      map[cat].push(s)
    })
    return map
  }, [settings])

  return (
    <div className="page-shell">
      <PageHeader
        title={t('settings')}
        description={t('settingsDesc')}
      />

      {isLoading ? (
        <div className="grid gap-4 max-w-3xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="registration" className="space-y-3">
          <TabsList className="h-9 flex-wrap gap-1 bg-muted/50 p-1">
            {SETTING_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat]
              return (
                <TabsTrigger key={cat} value={cat} className="gap-2 rounded-lg px-3 py-1.5 text-xs sm:text-sm">
                  <Icon className="h-4 w-4" />
                  {t(`settings.categories.${cat}`)}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {SETTING_CATEGORIES.map((cat) => (
            <TabsContent key={cat} value={cat} className="space-y-4 max-w-3xl">
              <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                <Settings className="h-4 w-4 text-primary" />
                {t(`settings.categoriesDesc.${cat}`)}
              </div>
              {grouped[cat].length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('settings.emptyCategory')}</p>
              ) : (
                grouped[cat].map((s) => (
                  <SettingField
                    key={s.id}
                    setting={s}
                    isSaving={saveMutation.isPending}
                    onSave={(key, value) => saveMutation.mutate({ key, value })}
                  />
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
