import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DOC_LABELS: Record<string, Record<string, string>> = {
  mother_national_id: { en: 'Mother national ID card', fr: 'Carte d\'identité de la mère' },
  father_national_id: { en: 'Father national ID card', fr: 'Carte d\'identité du père' },
  marriage_certificate: { en: 'Marriage certificate', fr: 'Certificat de mariage' },
  paternity_recognition_act: { en: 'Paternity recognition act', fr: 'Acte de reconnaissance de paternité' },
  witness_id: { en: 'Witness ID card', fr: 'Carte d\'identité du témoin' },
  birth_medical_certificate: { en: 'Hospital birth certificate', fr: 'Certificat médical de naissance' },
  parent_residence_proof: { en: 'Proof of residence', fr: 'Justificatif de domicile' },
  declarant_national_id: { en: 'Declarant ID card', fr: 'Carte d\'identité du déclarant' },
}

function formatDocuments(keys: unknown, locale = 'fr'): string {
  if (!Array.isArray(keys) || keys.length === 0) {
    return locale === 'fr'
      ? 'Pièces à confirmer auprès du centre d\'état civil.'
      : 'Documents to confirm with the civil registry office.'
  }
  return keys
    .map((key) => {
      const labels = DOC_LABELS[String(key)]
      return labels ? `• ${labels[locale] ?? labels.en}` : `• ${key}`
    })
    .join('\n')
}

export function buildNotificationMessage(
  eventType: string,
  payload: Record<string, unknown>,
  locale = 'fr'
): string {
  const isFr = locale === 'fr'
  const docs = formatDocuments(payload.required_documents, locale)
  const declarationNumber = String(payload.declaration_number ?? '')
  const centerName = String(payload.civil_center_name ?? '')
  const deadline = String(payload.deadline_date ?? '')
  const regNumber = String(payload.registration_number ?? '')

  switch (eventType) {
    case 'declaration_submitted':
      return isFr
        ? `eBirth Cameroun — Déclaration ${declarationNumber} envoyée au centre ${centerName}.\n\n` +
            `Date limite légale d'enregistrement: ${deadline}.\n\n` +
            `Documents à présenter:\n${docs}\n\n` +
            `Rappels automatiques tous les ${payload.reminder_interval_days ?? 14} jours jusqu'à l'enregistrement.`
        : `eBirth Cameroon — Declaration ${declarationNumber} sent to ${centerName}.\n\n` +
            `Legal registration deadline: ${deadline}.\n\n` +
            `Documents to bring:\n${docs}\n\n` +
            `Automatic reminders every ${payload.reminder_interval_days ?? 14} days until registration.`
    case 'declaration_received':
      return isFr
        ? 'Votre déclaration de naissance a été reçue par le centre d\'état civil.'
        : 'Your birth declaration has been received by the civil registry office.'
    case 'registration_completed':
      return isFr
        ? `Naissance enregistrée. Numéro d'enregistrement: ${regNumber}`
        : `Birth registered. Registration number: ${regNumber}`
    case 'certificate_ready':
      return isFr
        ? 'Votre acte de naissance est prêt au centre d\'état civil.'
        : 'Your birth certificate is ready at the civil registry office.'
    case 'reminder':
      return isFr
        ? `Rappel eBirth — Enregistrement avant le ${deadline}.\n\nDocuments requis:\n${docs}`
        : `eBirth reminder — Register before ${deadline}.\n\nRequired documents:\n${docs}`
    case 'documents_requested':
      return isFr
        ? `Documents supplémentaires requis: ${payload.document_request_notes ?? 'Contactez le centre d\'état civil.'}`
        : `Additional documents required: ${payload.document_request_notes ?? 'Contact the civil registry office.'}`
    default:
      return isFr ? 'Notification eBirth Cameroun' : 'eBirth Cameroon notification'
  }
}

export async function getSettingDays(
  supabase: ReturnType<typeof createClient>,
  key: string,
  fallback: number
): Promise<number> {
  const { data } = await supabase.from('system_settings').select('value').eq('key', key).maybeSingle()
  const days = data?.value?.days
  return typeof days === 'number' ? days : fallback
}
