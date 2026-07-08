import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enCommon from '@/locales/en/common.json'
import enAuth from '@/locales/en/auth.json'
import enHospital from '@/locales/en/hospital.json'
import enCivil from '@/locales/en/civil.json'
import enAdmin from '@/locales/en/admin.json'
import enDeclarations from '@/locales/en/declarations.json'
import enNotifications from '@/locales/en/notifications.json'
import frCommon from '@/locales/fr/common.json'
import frAuth from '@/locales/fr/auth.json'
import frHospital from '@/locales/fr/hospital.json'
import frCivil from '@/locales/fr/civil.json'
import frAdmin from '@/locales/fr/admin.json'
import frDeclarations from '@/locales/fr/declarations.json'
import frNotifications from '@/locales/fr/notifications.json'

const savedLocale = localStorage.getItem('ebirth-locale') || 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      hospital: enHospital,
      civil: enCivil,
      admin: enAdmin,
      declarations: enDeclarations,
      notifications: enNotifications,
    },
    fr: {
      common: frCommon,
      auth: frAuth,
      hospital: frHospital,
      civil: frCivil,
      admin: frAdmin,
      declarations: frDeclarations,
      notifications: frNotifications,
    },
  },
  lng: savedLocale,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export default i18n
