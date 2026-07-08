import { supabase } from '@/lib/supabase'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export const storageService = {
  validateFile(file: File): void {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Allowed: PDF, JPEG, PNG')
    }
    if (file.size > MAX_SIZE) {
      throw new Error('File too large. Maximum size is 10MB')
    }
  },

  async upload(
    bucket: 'hospital-documents' | 'declaration-documents' | 'verification-documents',
    path: string,
    file: File
  ) {
    this.validateFile(file)
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false })
    if (error) throw error
    return data
  },

  async getSignedUrl(
    bucket: 'hospital-documents' | 'declaration-documents' | 'verification-documents',
    path: string,
    expiresIn = 3600
  ) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    if (error) throw error
    return data.signedUrl
  },

  async delete(
    bucket: 'hospital-documents' | 'declaration-documents' | 'verification-documents',
    path: string
  ) {
    const { error } = await supabase.storage.from(bucket).remove([path])
    if (error) throw error
  },

  async saveDocumentMetadata(meta: {
    declaration_id: string
    document_type: 'hospital' | 'supporting' | 'verification'
    storage_path: string
    file_name: string
    mime_type: string
    uploaded_by: string
  }) {
    const { data, error } = await supabase
      .from('declaration_documents')
      .insert(meta)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
