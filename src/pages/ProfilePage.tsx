import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { profileSchema } from '@/features/declarations/validators/declaration.schema'
import { usersService } from '@/services/users.service'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { z } from 'zod'

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { t, i18n } = useTranslation(['auth', 'common'])
  const { profile, refreshProfile } = useAuth()
  const { toast } = useToast()

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      locale: profile?.locale ?? 'en',
    },
  })

  const locale = watch('locale')

  const onSubmit = async (data: ProfileForm) => {
    if (!profile) return
    try {
      await usersService.update(profile.id, data)
      await refreshProfile()
      await i18n.changeLanguage(data.locale)
      localStorage.setItem('ebirth-locale', data.locale)
      toast({ title: t('profileUpdated') })
    } catch {
      toast({ title: t('common:error'), variant: 'destructive' })
    }
  }

  return (
    <div className="page-shell">
      <PageHeader title={t('profileTitle')} description={t('profileDesc')} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-8 pb-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <User className="h-8 w-8" />
            </div>
            <p className="mt-4 font-semibold">{profile?.full_name}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            {profile && (
              <span className="mt-3 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize">
                {t(`roles.${profile.role}`)}
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t('profileSettings')}</CardTitle>
            <CardDescription>{t('profileSettingsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('fullName')}</Label>
                <Input id="full_name" {...register('full_name')} />
                {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('common:phone')}</Label>
                <Input id="phone" {...register('phone')} />
              </div>
              <div className="space-y-2">
                <Label>{t('common:language')}</Label>
                <Select
                  value={locale}
                  onValueChange={(v) => setValue('locale', v as 'en' | 'fr', { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {t('updateProfile')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
