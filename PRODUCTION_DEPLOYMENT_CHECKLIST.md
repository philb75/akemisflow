# Production Deployment Checklist - Document Management

## Pre-Deployment Checks ✅
- [x] All code committed and pushed to GitHub
- [x] Local testing completed successfully
- [x] Database schema updated (Document model added)

## Vercel Environment Variables to Add

Add these environment variables in Vercel Dashboard:

```env
# Storage Configuration
STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=documents

# These should already exist:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY
```

## Deployment Steps

### 1. Database Migration (Already Applied)
The Document table schema has been added to the production database through Prisma.

### 2. Supabase Storage Setup
Run this from your local machine with production credentials:

```bash
# Create .env.production.local with production values
node scripts/setup-production-documents.js
```

Or manually in Supabase Dashboard:
1. Go to Storage section
2. Create bucket named "documents"
3. Set allowed MIME types: PDF, JPEG, PNG, GIF, WebP, DOC, DOCX
4. Set max file size: 10MB
5. Keep bucket private (not public)

### 3. Storage Policies (Supabase Dashboard)

Create these RLS policies for the `documents` bucket:

#### SELECT Policy: "Users can view accessible documents"
```sql
(auth.uid() = owner_id) OR 
(auth.uid() IN (
  SELECT user_id FROM users 
  WHERE role = 'ADMINISTRATOR'
))
```

#### INSERT Policy: "Authenticated users can upload"
```sql
auth.uid() IS NOT NULL
```

#### UPDATE Policy: "Users can update own documents or admins"
```sql
(auth.uid() = owner_id) OR 
(auth.uid() IN (
  SELECT user_id FROM users 
  WHERE role = 'ADMINISTRATOR'
))
```

#### DELETE Policy: "Users can delete own documents or admins"
```sql
(auth.uid() = owner_id) OR 
(auth.uid() IN (
  SELECT user_id FROM users 
  WHERE role = 'ADMINISTRATOR'
))
```

## Post-Deployment Verification

### 1. Check Vercel Deployment
- [ ] Visit: https://akemisflow.vercel.app
- [ ] Verify build succeeded without errors
- [ ] Check Functions tab for any errors

### 2. Test Document Functionality
- [ ] Login to production app
- [ ] Navigate to a supplier detail page
- [ ] Go to Documents tab
- [ ] Test upload (try PDF and image)
- [ ] Verify document appears in list
- [ ] Test download functionality
- [ ] Test delete functionality

### 3. Monitor for Issues
- [ ] Check Vercel Functions logs
- [ ] Check Supabase logs for storage operations
- [ ] Monitor for any user-reported issues

## Rollback Plan

If issues occur:
1. Revert to previous deployment in Vercel
2. Document table can remain (won't affect existing functionality)
3. Storage bucket can be disabled if needed

## Security Considerations

- ✅ Documents are stored privately in Supabase
- ✅ Access controlled by RLS policies
- ✅ File type validation implemented
- ✅ File size limits enforced (10MB)
- ✅ Soft delete preserves audit trail

## Future Enhancements

1. Add virus scanning for uploaded files
2. Implement document expiry notifications
3. Add OCR for automatic data extraction
4. Create document templates
5. Add bulk upload functionality