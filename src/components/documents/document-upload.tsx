'use client'

import { useState, useRef } from 'react'
import { Upload, X, File, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DocumentType } from '@prisma/client'
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/storage'

interface DocumentUploadProps {
  entityType: 'entity' | 'contractor' | 'invoice'
  entityId: string
  onSuccess?: (document: any) => void
  onError?: (error: string) => void
}

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'ID', label: 'ID Document' },
  { value: 'PROOF_OF_ADDRESS', label: 'Proof of Address' },
  { value: 'BANK', label: 'Bank Document' },
]

export function DocumentUpload({
  entityType,
  entityId,
  onSuccess,
  onError,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('ID')
  const [description, setDescription] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      setError(`File type ${selectedFile.type} is not allowed`)
      return
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`)
      return
    }

    setFile(selectedFile)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file || !documentType) {
      setError('Please select a file and document type')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityType', entityType)
      formData.append('entityId', entityId)
      formData.append('documentType', documentType)
      formData.append('description', description)
      if (expiryDate) {
        formData.append('expiryDate', expiryDate)
      }

      // Simulate progress (real progress would come from XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const data = await response.json()
      
      // Reset form
      setFile(null)
      setDocumentType('ID')
      setDescription('')
      setExpiryDate('')
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onSuccess?.(data.document)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      onError?.(message)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="document-type">Document Type</Label>
        <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
          <SelectTrigger id="document-type">
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file-upload">File</Label>
        <div className="flex items-center gap-4">
          <Input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            onChange={handleFileSelect}
            accept={ALLOWED_FILE_TYPES.join(',')}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose File
          </Button>
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-4 w-4" />
              <span>{file.name}</span>
              <span>({formatFileSize(file.size)})</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any notes about this document"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiry-date">Expiry Date (Optional)</Label>
        <Input
          id="expiry-date"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!file || !documentType || uploading}
        className="w-full"
      >
        {uploading ? 'Uploading...' : 'Upload Document'}
      </Button>
    </div>
  )
}