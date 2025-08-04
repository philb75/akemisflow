// Environment-aware storage client export
// This file determines which storage client to use based on AKEMIS_ENV

const environment = process.env.AKEMIS_ENV || process.env.NODE_ENV;
const useSupabase = environment === 'remote' || environment === 'production' || 
                   !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

let storage: any;
let storageType: string;
let isSupabase: boolean;
let isLocal: boolean;

if (useSupabase) {
  // Use Supabase storage for remote testing and production
  console.log('🔵 Using Supabase storage client');
  
  const supabaseStorage = require('./supabase-storage');
  storage = supabaseStorage.storage;
  storageType = supabaseStorage.storageType;
  isSupabase = true;
  isLocal = false;
} else {
  // Use local storage for development
  console.log('🟢 Using Local file storage client');
  
  const localStorage = require('./local-storage');
  storage = localStorage.storage;
  storageType = localStorage.storageType;
  isSupabase = false;
  isLocal = true;
}

// Export the active storage configuration
export { storage, storageType, isSupabase, isLocal };

// Legacy compatibility function
export function getStorageProvider() {
  return storage;
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
  type: 'entity' | 'contractor' | 'invoice' | 'supplier',
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
    case 'supplier':
      return `suppliers/${id}/${timestamp}-${sanitizedFilename}`
    default:
      return `misc/${timestamp}-${sanitizedFilename}`
  }
}