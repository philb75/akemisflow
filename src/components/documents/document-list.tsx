'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  MoreVertical,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { DocumentType } from '@prisma/client'

interface Document {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  documentType: DocumentType
  description?: string
  expiryDate?: string
  isVerified: boolean
  uploadedAt: string
  uploadedBy: {
    id: string
    name: string
    email: string
  }
  verifiedByUser?: {
    id: string
    name: string
    email: string
  }
}

interface DocumentListProps {
  entityType?: 'entity' | 'contractor' | 'invoice'
  entityId?: string
  onDocumentDeleted?: (documentId: string) => void
}

export function DocumentList({
  entityType,
  entityId,
  onDocumentDeleted,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    documentId: string | null
    documentName: string
  }>({ open: false, documentId: null, documentName: '' })

  useEffect(() => {
    fetchDocuments()
  }, [entityType, entityId])

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams()
      if (entityType) params.append('entityType', entityType)
      if (entityId) params.append('entityId', entityId)

      const response = await fetch(`/api/documents?${params}`)
      if (!response.ok) throw new Error('Failed to fetch documents')

      const data = await response.json()
      setDocuments(data.documents)
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (documentId: string) => {
    window.open(`/api/documents/${documentId}/download`, '_blank')
  }

  const handleDelete = async () => {
    if (!deleteDialog.documentId) return

    try {
      const response = await fetch(`/api/documents/${deleteDialog.documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete document')

      setDocuments(documents.filter((doc) => doc.id !== deleteDialog.documentId))
      onDocumentDeleted?.(deleteDialog.documentId)
      setDeleteDialog({ open: false, documentId: null, documentName: '' })
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return null

    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiry < 0) {
      return { status: 'expired', text: 'Expired', variant: 'destructive' as const }
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', text: `Expires in ${daysUntilExpiry} days`, variant: 'warning' as const }
    }
    return { status: 'valid', text: format(expiry, 'MMM d, yyyy'), variant: 'default' as const }
  }

  const getDocumentTypeLabel = (type: DocumentType) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No documents uploaded yet</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => {
            const expiryStatus = getExpiryStatus(document.expiryDate)

            return (
              <TableRow key={document.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{document.fileName}</p>
                    {document.description && (
                      <p className="text-sm text-muted-foreground">{document.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getDocumentTypeLabel(document.documentType)}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(document.fileSize)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {document.isVerified && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                    {expiryStatus && (
                      <Badge variant={expiryStatus.variant} className="gap-1">
                        {expiryStatus.status === 'expired' && <AlertTriangle className="h-3 w-3" />}
                        {expiryStatus.status === 'expiring' && <Clock className="h-3 w-3" />}
                        {expiryStatus.text}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{format(new Date(document.uploadedAt), 'MMM d, yyyy')}</p>
                    <p className="text-muted-foreground">by {document.uploadedBy.name}</p>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`/api/documents/${document.id}/download`, '_blank')}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            documentId: document.id,
                            documentName: document.fileName,
                          })
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ ...deleteDialog, open })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.documentName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}