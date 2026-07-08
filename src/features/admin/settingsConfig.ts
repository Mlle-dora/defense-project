export type SettingCategory = 'registration' | 'notifications' | 'platform'

export interface SettingMeta {
  category: SettingCategory
  labelKey: string
  descriptionKey: string
  type: 'days' | 'max' | 'platform_name' | 'sms_provider' | 'readonly'
}

export const SETTING_META: Record<string, SettingMeta> = {
  registration_deadline_days: {
    category: 'registration',
    labelKey: 'settings.registrationDeadline',
    descriptionKey: 'settings.registrationDeadlineDesc',
    type: 'days',
  },
  reminder_interval_days: {
    category: 'registration',
    labelKey: 'settings.reminderInterval',
    descriptionKey: 'settings.reminderIntervalDesc',
    type: 'days',
  },
  reminder_days_before_deadline: {
    category: 'registration',
    labelKey: 'settings.reminderDays',
    descriptionKey: 'settings.reminderDaysDesc',
    type: 'days',
  },
  notification_retry_max: {
    category: 'notifications',
    labelKey: 'settings.notificationRetry',
    descriptionKey: 'settings.notificationRetryDesc',
    type: 'max',
  },
  sms_provider: {
    category: 'notifications',
    labelKey: 'settings.smsProvider',
    descriptionKey: 'settings.smsProviderDesc',
    type: 'sms_provider',
  },
  platform_name: {
    category: 'platform',
    labelKey: 'settings.platformName',
    descriptionKey: 'settings.platformNameDesc',
    type: 'platform_name',
  },
}

export const SMS_PROVIDER_OPTIONS = ['mock', 'africas_talking', 'twilio'] as const
export type SmsProviderName = (typeof SMS_PROVIDER_OPTIONS)[number]

export const SETTING_CATEGORIES: SettingCategory[] = ['registration', 'notifications', 'platform']
