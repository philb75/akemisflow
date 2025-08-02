'use client'

import { useState } from 'react'
import { DocumentUpload } from './document-upload'
import { DocumentList } from './document-list'

interface DocumentSectionProps {
  entityType: 'entity' | 'contractor' | 'invoice' | 'supplier'
  entityId: string
}

export function DocumentSection({ entityType, entityId }: DocumentSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    // Force a refresh of the document list by changing the key
    setRefreshKey(prev => prev + 1)
  }

  return (
    <>
      <DocumentUpload 
        entityType={entityType} 
        entityId={entityId}
        onSuccess={handleUploadSuccess}
      />
      
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Uploaded Documents</h3>
        <DocumentList 
          key={refreshKey}
          entityType={entityType} 
          entityId={entityId} 
        />
      </div>
    </>
  )
}