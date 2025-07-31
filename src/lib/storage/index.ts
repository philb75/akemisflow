import { LocalStorageProvider } from './local-storage'
import { SupabaseStorageProvider } from './supabase-storage'
import { StorageProvider, StorageConfig } from './types'

let storageProvider: StorageProvider | null = null

export function initializeStorage(config: StorageConfig): StorageProvider {
  if (config.provider === 'local') {
    if (!config.localPath || !config.publicUrl) {
      throw new Error('Local storage requires localPath and publicUrl')
    }
    storageProvider = new LocalStorageProvider(config.localPath, config.publicUrl)
  } else if (config.provider === 'supabase') {
    if (!config.supabaseUrl || !config.supabaseKey || !config.bucket) {
      throw new Error('Supabase storage requires supabaseUrl, supabaseKey, and bucket')
    }
    storageProvider = new SupabaseStorageProvider(
      config.supabaseUrl,
      config.supabaseKey,
      config.bucket
    )
  } else {
    throw new Error(`Unknown storage provider: ${config.provider}`)
  }

  return storageProvider
}

export function getStorageProvider(): StorageProvider {
  if (!storageProvider) {
    // Initialize with environment variables
    const config: StorageConfig = {
      provider: (process.env.STORAGE_PROVIDER as 'local' | 'supabase') || 'local',
      localPath: process.env.STORAGE_PATH || './uploads',
      publicUrl: process.env.STORAGE_PUBLIC_URL || 'http://localhost:3000/uploads',
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_ANON_KEY,
      bucket: process.env.SUPABASE_STORAGE_BUCKET || 'documents'
    }

    return initializeStorage(config)
  }

  return storageProvider
}

// Export types
export * from './types'

// Helper functions
export function getStorageConfig(): StorageConfig {
  return {
    provider: (process.env.STORAGE_PROVIDER as 'local' | 'supabase') || 'local',
    localPath: process.env.STORAGE_PATH || './uploads',
    publicUrl: process.env.STORAGE_PUBLIC_URL || 'http://localhost:3000/uploads',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'documents'
  }
}

// Utility functions for file validation
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv'
]

export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: PDF, Images (JPEG, PNG, GIF), Word, Excel, CSV`
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }
  }

  return { valid: true }
}

export function generateStoragePath(
  type: 'entity' | 'contractor' | 'invoice',
  id: string,
  filename: string
): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  
  switch (type) {
    case 'entity':
      return `entities/${id}/${timestamp}-${sanitizedFilename}`
    case 'contractor':
      return `contractors/${id}/${timestamp}-${sanitizedFilename}`
    case 'invoice':
      return `invoices/${id}/${timestamp}-${sanitizedFilename}`
    default:
      return `misc/${timestamp}-${sanitizedFilename}`
  }
}