import { apiUpload } from '../lib/api'

export type ScannedDocumentMetadata = {
  title: string
  documentType: string
  sharedWithPatient: boolean
  description?: string
  documentDate?: string
  confidential?: boolean
}

export type ScannedDocument = {
  id: string
  patient_id: string
  title: string
  document_type: string
  source: 'scanner' | 'upload_manuel'
  mime_type: string | null
  file_size: number | null
  shared_with_patient: boolean
  created_at: string
}

/**
 * Point d'extension unique pour une future integration TWAIN/WIA.
 * Aujourd'hui, le navigateur importe le fichier produit par le scanner.
 */
export const PatientScannerService = {
  detectAvailableScanners() {
    return { assistedImport: true, directScanner: false }
  },

  async uploadScannedDocument(patientId: string, file: File, metadata: ScannedDocumentMetadata, token: string) {
    const payload: Record<string, string | File | boolean> = {
      title: metadata.title,
      document_type: metadata.documentType,
      shared_with_patient: metadata.sharedWithPatient,
      confidential: metadata.confidential || false,
      file
    }
    if (metadata.description) payload.description = metadata.description
    if (metadata.documentDate) payload.document_date = metadata.documentDate
    return apiUpload<ScannedDocument>(`/doctor/patients/${patientId}/documents/scan`, token, payload)
  }
}
