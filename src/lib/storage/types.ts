export interface StorageResult {
  success: boolean
  path?: string
  url?: string
  error?: string
  metadata?: {
    size: number
    type: string
    lastModified?: Date
  }
}

export interface StorageProvider {
  upload(file: File | Buffer, path: string, options?: UploadOptions): Promise<StorageResult>
  download(path: string): Promise<Blob | Buffer>
  delete(path: string): Promise<boolean>
  exists(path: string): Promise<boolean>
  getPublicUrl(path: string): string | null
  getSignedUrl(path: string, expiresIn: number): Promise<string>
  list(prefix: string): Promise<StorageListResult>
}

export interface UploadOptions {
  contentType?: string
  metadata?: Record<string, string>
  public?: boolean
  overwrite?: boolean
}

export interface StorageListResult {
  files: StorageFileInfo[]
  folders: string[]
  nextCursor?: string
}

export interface StorageFileInfo {
  name: string
  path: string
  size: number
  lastModified: Date
  contentType?: string
  url?: string
}

export interface StorageConfig {
  provider: 'local' | 'supabase'
  localPath?: string
  publicUrl?: string
  supabaseUrl?: string
  supabaseKey?: string
  bucket?: string
}