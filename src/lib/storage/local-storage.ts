import { promises as fs } from 'fs'
import path from 'path'
import { 
  StorageProvider, 
  StorageResult, 
  UploadOptions, 
  StorageListResult,
  StorageFileInfo 
} from './types'

export class LocalStorageProvider implements StorageProvider {
  private basePath: string
  private publicUrl: string

  constructor(basePath: string, publicUrl: string) {
    this.basePath = basePath
    this.publicUrl = publicUrl
  }

  async upload(
    file: File | Buffer, 
    filePath: string, 
    options?: UploadOptions
  ): Promise<StorageResult> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      const dir = path.dirname(fullPath)

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true })

      // Convert File to Buffer if needed
      let buffer: Buffer
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
      } else {
        buffer = file
      }

      // Write file
      await fs.writeFile(fullPath, buffer)

      // Get file stats
      const stats = await fs.stat(fullPath)

      return {
        success: true,
        path: filePath,
        url: `${this.publicUrl}/${filePath}`,
        metadata: {
          size: stats.size,
          type: options?.contentType || 'application/octet-stream',
          lastModified: stats.mtime
        }
      }
    } catch (error) {
      console.error('Local storage upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, filePath)
    return await fs.readFile(fullPath)
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      await fs.unlink(fullPath)
      return true
    } catch (error) {
      console.error('Local storage delete error:', error)
      return false
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, filePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  getPublicUrl(filePath: string): string {
    return `${this.publicUrl}/${filePath}`
  }

  async getSignedUrl(filePath: string, expiresIn: number): Promise<string> {
    // For local storage, just return the public URL
    // In production, you might want to implement temporary URL tokens
    return this.getPublicUrl(filePath)
  }

  async list(prefix: string): Promise<StorageListResult> {
    try {
      const fullPath = path.join(this.basePath, prefix)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })
      
      const files: StorageFileInfo[] = []
      const folders: string[] = []

      for (const entry of entries) {
        const entryPath = path.join(prefix, entry.name)
        
        if (entry.isDirectory()) {
          folders.push(entry.name)
        } else {
          const stats = await fs.stat(path.join(this.basePath, entryPath))
          files.push({
            name: entry.name,
            path: entryPath,
            size: stats.size,
            lastModified: stats.mtime,
            url: this.getPublicUrl(entryPath)
          })
        }
      }

      return { files, folders }
    } catch (error) {
      console.error('Local storage list error:', error)
      return { files: [], folders: [] }
    }
  }
}