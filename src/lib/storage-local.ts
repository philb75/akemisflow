// Local file storage for development mode
// Handles document storage when not using Supabase

import fs from 'fs'
import path from 'path'
import logger from './logger-adaptive'
import environmentDetector from './environment'

class LocalStorage {
  private baseDir: string
  private uploadsDir: string

  constructor() {
    // Create uploads directory structure
    this.baseDir = process.cwd()
    this.uploadsDir = path.join(this.baseDir, 'uploads', 'documents')
    
    // Ensure directories exist
    this.ensureDirectoryExists(this.uploadsDir)
    
    logger.info('Local storage initialized', {
      category: 'STORAGE',
      metadata: {
        baseDir: this.baseDir,
        uploadsDir: this.uploadsDir,
        mode: environmentDetector.getMode()
      }
    })
  }

  private ensureDirectoryExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
        logger.info('Created storage directory', {
          category: 'STORAGE',
          metadata: { path: dirPath }
        })
      }
    } catch (error) {
      logger.error('Failed to create storage directory', {
        category: 'STORAGE',
        metadata: {
          path: dirPath,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Store a file locally and return a URL to access it
   */
  async storeFile(
    file: File, 
    supplierId: string, 
    documentType: string
  ): Promise<{ url: string; fileName: string; relativePath: string }> {
    try {
      // Generate safe filename
      const fileExt = file.name.split('.').pop() || 'bin'
      const timestamp = Date.now()
      const safeFileName = `${documentType}_${timestamp}.${fileExt}`
      
      // Create supplier-specific directory
      const supplierDir = path.join(this.uploadsDir, supplierId)
      this.ensureDirectoryExists(supplierDir)
      
      // Full file path
      const filePath = path.join(supplierDir, safeFileName)
      const relativePath = path.relative(this.baseDir, filePath)
      
      // Convert file to buffer and save
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      fs.writeFileSync(filePath, buffer)
      
      // Generate URL for serving the file (relative to public access)
      const fileUrl = `/uploads/documents/${supplierId}/${safeFileName}`
      
      logger.info('File stored locally', {
        category: 'STORAGE',
        metadata: {
          supplierId,
          documentType,
          originalFileName: file.name,
          storedFileName: safeFileName,
          fileSize: file.size,
          filePath: relativePath,
          fileUrl
        }
      })
      
      return {
        url: fileUrl,
        fileName: safeFileName,
        relativePath
      }
      
    } catch (error) {
      logger.error('Failed to store file locally', {
        category: 'STORAGE',
        metadata: {
          supplierId,
          documentType,
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }

  /**
   * Delete a stored file
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      // Convert URL back to file path
      const urlPath = fileUrl.replace('/uploads/documents/', '')
      const filePath = path.join(this.uploadsDir, urlPath)
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        logger.info('File deleted from local storage', {
          category: 'STORAGE',
          metadata: { fileUrl, filePath }
        })
        return true
      } else {
        logger.warn('File not found for deletion', {
          category: 'STORAGE',
          metadata: { fileUrl, filePath }
        })
        return false
      }
    } catch (error) {
      logger.error('Failed to delete file from local storage', {
        category: 'STORAGE',
        metadata: {
          fileUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      return false
    }
  }

  /**
   * Check if a file exists
   */
  fileExists(fileUrl: string): boolean {
    try {
      const urlPath = fileUrl.replace('/uploads/documents/', '')
      const filePath = path.join(this.uploadsDir, urlPath)
      return fs.existsSync(filePath)
    } catch {
      return false
    }
  }

  /**
   * Get file info
   */
  getFileInfo(fileUrl: string): { size: number; exists: boolean } | null {
    try {
      const urlPath = fileUrl.replace('/uploads/documents/', '')
      const filePath = path.join(this.uploadsDir, urlPath)
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        return {
          size: stats.size,
          exists: true
        }
      }
      
      return { size: 0, exists: false }
    } catch {
      return null
    }
  }
}

// Export singleton instance
const localStorage = new LocalStorage()
export default localStorage