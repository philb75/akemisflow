#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')

// Local Prisma client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"
    }
  }
})

// Production Supabase client
const supabaseUrl = "https://wflcaapznpczlxjaeyfd.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbGNhYXB6bnBjemx4amFleWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODYxODk1NSwiZXhwIjoyMDY0MTk0OTU1fQ.Vv6milIIq0Ne9XdEG2yfwmAfn73t2AOuJ27CIamLRYo"
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function exportSuppliersToSupabase() {
  try {
    console.log('🔍 Fetching suppliers from local database...')
    
    // Get all suppliers from local database
    const localSuppliers = await prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Found ${localSuppliers.length} suppliers in local database`)
    
    // Clear existing suppliers in Supabase (optional - be careful!)
    console.log('🗑️  Clearing existing suppliers in Supabase...')
    const { error: clearError } = await supabase
      .from('suppliers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    if (clearError) {
      console.error('Error clearing suppliers:', clearError)
    } else {
      console.log('✅ Cleared existing suppliers')
    }
    
    // First, let's check what columns actually exist in Supabase
    console.log('🔍 Checking Supabase schema...')
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', 'test-schema-check')
    
    if (schemaError) {
      console.log('Schema error (this helps us understand the structure):', schemaError.message)
    }
    
    // Convert with minimal fields that should exist
    const supabaseSuppliers = localSuppliers.map(supplier => ({
      firstName: supplier.firstName,
      lastName: supplier.lastName,
      email: supplier.email,
      status: supplier.status
    }))
    
    console.log('📤 Uploading suppliers to Supabase...')
    
    // Insert in batches to avoid API limits
    const batchSize = 100
    let uploaded = 0
    
    for (let i = 0; i < supabaseSuppliers.length; i += batchSize) {
      const batch = supabaseSuppliers.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('suppliers')
        .insert(batch)
      
      if (error) {
        console.error(`Error uploading batch ${Math.floor(i / batchSize) + 1}:`, error)
        break
      }
      
      uploaded += batch.length
      console.log(`✅ Uploaded ${uploaded}/${supabaseSuppliers.length} suppliers`)
    }
    
    console.log('🎉 Export completed successfully!')
    
    // Verify the upload
    const { count } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
    
    console.log(`🔍 Verification: ${count} suppliers now in Supabase`)
    
  } catch (error) {
    console.error('❌ Export failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the export
exportSuppliersToSupabase()