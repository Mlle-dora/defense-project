export type MotherMaritalStatus = 'married' | 'single' | 'widowed' | 'divorced'

export type RequiredDocumentKey =
  | 'mother_national_id'
  | 'father_national_id'
  | 'marriage_certificate'
  | 'paternity_recognition_act'
  | 'witness_id'
  | 'birth_medical_certificate'
  | 'parent_residence_proof'
  | 'declarant_national_id'

export interface DocumentCircumstances {
  motherMaritalStatus: MotherMaritalStatus
  paternityRecognized: boolean
  fatherDeclared: boolean
}

export function getRequiredDocuments(circumstances: DocumentCircumstances): RequiredDocumentKey[] {
  const docs: RequiredDocumentKey[] = [
    'mother_national_id',
    'birth_medical_certificate',
    'parent_residence_proof',
  ]

  if (circumstances.motherMaritalStatus === 'married') {
    docs.push('marriage_certificate', 'father_national_id', 'declarant_national_id')
    return uniqueDocs(docs)
  }

  if (circumstances.fatherDeclared && circumstances.paternityRecognized) {
    docs.push('father_national_id', 'paternity_recognition_act', 'declarant_national_id')
    return uniqueDocs(docs)
  }

  docs.push('witness_id', 'witness_id', 'declarant_national_id')
  return uniqueDocs(docs)
}

function uniqueDocs(docs: RequiredDocumentKey[]): RequiredDocumentKey[] {
  return [...new Set(docs)]
}

export function formatRequiredDocumentsList(
  keys: RequiredDocumentKey[],
  t: (key: string) => string
): string {
  return keys.map((key) => `• ${t(`declarations:requiredDocs.${key}`)}`).join('\n')
}
