# Document Management Functionality

## Overview
The document management system has been successfully implemented with the following features:

### Document Types (Simplified to 3)
1. **ID** - ID documents (passport, national ID, driver's license, etc.)
2. **PROOF_OF_ADDRESS** - Proof of address documents  
3. **BANK** - Bank-related documents (statements, account info, etc.)

### Key Features
- **Storage Abstraction**: Works with both local Docker storage and Supabase Storage
- **File Validation**: Validates file types and sizes before upload
- **Security**: Role-based access control with document permissions
- **UI Components**: Complete set of UI components for document management
- **Integration**: Seamlessly integrated into entity and contractor detail pages

### Architecture

#### Storage Providers
- **Local Storage** (`/uploads` directory served by nginx on port 3001)
- **Supabase Storage** (for production environment)

#### Database Schema
```prisma
model Document {
  id              String        @id @default(uuid())
  fileName        String        
  originalName    String        
  fileType        String        
  fileSize        Int           
  mimeType        String        
  
  // Storage information
  storageProvider String        // local, supabase
  storagePath     String        
  bucketName      String?       
  publicUrl       String?       
  
  // Relations
  contactId       String?       
  contractorId    String?       
  invoiceId       String?       
  userId          String        
  
  // Document metadata
  documentType    DocumentType  
  description     String?
  expiryDate      DateTime?     
  
  // Compliance
  isActive        Boolean       @default(true)
  isVerified      Boolean       @default(false)
  verifiedBy      String?       
  verifiedAt      DateTime?     
}

enum DocumentType {
  ID
  PROOF_OF_ADDRESS
  BANK
}
```

### API Endpoints
- `GET /api/documents` - List documents with filters
- `POST /api/documents/upload` - Upload a new document
- `GET /api/documents/[id]` - Get document details
- `DELETE /api/documents/[id]` - Delete a document
- `PATCH /api/documents/[id]` - Update document metadata
- `GET /api/documents/[id]/download` - Download document file

### UI Components
1. **DocumentUpload** - Upload form with file validation
2. **DocumentList** - Display documents in a table with actions
3. **DocumentSection** - Client wrapper combining upload and list

### Integration Points
Documents are integrated into:
- **Contractor Details** (`/entities/contractors/[id]`)
- **Client Details** (`/entities/clients/[id]`)
- Future: Invoice attachments

### Security Features
- Authentication required for all document operations
- Role-based permissions (Admin can manage all, users only their uploads)
- Soft delete with `deletedAt` timestamp
- Document verification workflow

## Testing the Functionality

1. **View Contractor with Documents**
   - Navigate to: http://localhost:3000/entities/contractors
   - Click on any contractor to view details
   - Go to the "Documents" tab

2. **Upload a Document**
   - Select document type (ID, Proof of Address, or Bank)
   - Choose a file (PDF, images supported)
   - Add optional description and expiry date
   - Click "Upload Document"

3. **Manage Documents**
   - View uploaded documents in the list
   - Download documents
   - Delete documents (soft delete)

## Environment Configuration

### Docker Development
```env
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads
STORAGE_PUBLIC_URL=http://localhost:3001/uploads
```

### Production (Supabase)
```env
STORAGE_PROVIDER=supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_STORAGE_BUCKET=documents
```

## Next Steps
1. Add document verification workflow for admins
2. Implement bulk upload functionality
3. Add document templates for common types
4. Create document expiry notifications
5. Add OCR capabilities for automatic data extraction