import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { 
  StorageProvider, 
  StorageResult, 
  UploadOptions, 
  StorageListResult,
  StorageFileInfo 
} from './types'

export class SupabaseStorageProvider implements StorageProvider {
  private supabase: SupabaseClient
  private bucket: string

  constructor(url: string, key: string, bucket: string) {
    this.supabase = createClient(url, key)
    this.bucket = bucket
  }

  async upload(
    file: File | Buffer, 
    path: string, 
    options?: UploadOptions
  ): Promise<StorageResult> {
    try {
      // Convert Buffer to Blob if needed
      let uploadFile: File | Blob
      if (Buffer.isBuffer(file)) {
        uploadFile = new Blob([file], { type: options?.contentType })
      } else {
        uploadFile = file
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, uploadFile, {
          contentType: options?.contentType,
          upsert: options?.overwrite || false,
          metadata: options?.metadata
        })

      if (error) {
        return {
          success: false,
          error: error.message
        }
      }

      const publicUrl = this.getPublicUrl(path)

      return {
        success: true,
        path: data.path,
        url: publicUrl || undefined,
        metadata: {
          size: uploadFile instanceof File ? uploadFile.size : uploadFile.size,
          type: options?.contentType || 'application/octet-stream'
        }
      }
    } catch (error) {
      console.error('Supabase storage upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  async download(path: string): Promise<Blob> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .download(path)

    if (error) {
      throw new Error(`Download failed: ${error.message}`)
    }

    return data
  }

  async delete(path: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove([path])

      return !error
    } catch (error) {
      console.error('Supabase storage delete error:', error)
      return false
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          limit: 1,
          search: path.split('/').pop()
        })

      return !error && data && data.length > 0
    } catch {
      return false
    }
  }

  getPublicUrl(path: string): string | null {
    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path)

    return data?.publicUrl || null
  }

  async getSignedUrl(path: string, expiresIn: number): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }

  async list(prefix: string): Promise<StorageListResult> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .list(prefix, {
          limit: 100,
          offset: 0
        })

      if (error) {
        console.error('Supabase storage list error:', error)
        return { files: [], folders: [] }
      }

      const files: StorageFileInfo[] = (data || [])
        .filter(item => item.metadata)
        .map(item => ({
          name: item.name,
          path: `${prefix}/${item.name}`,
          size: item.metadata?.size || 0,
          lastModified: new Date(item.updated_at),
          contentType: item.metadata?.contentType,
          url: this.getPublicUrl(`${prefix}/${item.name}`) || undefined
        }))

      const folders = (data || [])
        .filter(item => !item.metadata)
        .map(item => item.name)

      return { files, folders }
    } catch (error) {
      console.error('Supabase storage list error:', error)
      return { files: [], folders: [] }
    }
  }
}