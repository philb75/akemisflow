#!/usr/bin/env node

/**
 * Setup script for document management in production
 * This script:
 * 1. Applies database migrations to Supabase
 * 2. Creates the documents storage bucket
 * 3. Sets up bucket policies
 */

const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.production.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !DATABASE_URL) {
  console.error('❌ Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL');
  process.exit(1);
}

async function setupProduction() {
  console.log('🚀 Setting up document management for production...\n');

  // Step 1: Apply database migrations
  console.log('📊 Applying database migrations...');
  try {
    execSync(`DATABASE_URL="${DATABASE_URL}" npx prisma db push --skip-generate`, {
      stdio: 'inherit'
    });
    console.log('✅ Database schema updated\n');
  } catch (error) {
    console.error('❌ Failed to apply database migrations:', error.message);
    process.exit(1);
  }

  // Step 2: Set up Supabase storage
  console.log('📦 Setting up Supabase storage...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Create documents bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const documentsBucket = buckets.find(bucket => bucket.name === 'documents');
    
    if (!documentsBucket) {
      console.log('Creating documents bucket...');
      const { error: createError } = await supabase.storage.createBucket('documents', {
        public: false,
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }
      console.log('✅ Documents bucket created');
    } else {
      console.log('✅ Documents bucket already exists');
    }

    // Set up RLS policies for the bucket
    console.log('\n📝 Setting up storage policies...');
    
    // Note: Storage policies need to be set up via Supabase dashboard or SQL
    // as the JS client doesn't support policy creation
    console.log(`
⚠️  Please ensure the following RLS policies are set in Supabase:

1. SELECT policy: Users can view their own documents and documents they have access to
2. INSERT policy: Authenticated users can upload documents
3. UPDATE policy: Users can update their own documents or admins can update any
4. DELETE policy: Users can delete their own documents or admins can delete any

You can set these up in the Supabase dashboard under Storage > Policies
`);

  } catch (error) {
    console.error('❌ Failed to set up storage:', error.message);
    process.exit(1);
  }

  // Step 3: Create production environment config guide
  console.log('\n📋 Production Environment Variables Required:');
  console.log(`
Add these to your Vercel environment variables:

STORAGE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=(your anon key)
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
SUPABASE_STORAGE_BUCKET=documents

✅ Production setup complete!
`);
}

// Run the setup
setupProduction().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});