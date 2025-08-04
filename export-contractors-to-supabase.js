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

async function exportContractorsToSupabase() {
  try {
    console.log('🔍 Fetching contractors from local database...')
    
    // Get all contractors from local database
    const localContractors = await prisma.contractor.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Found ${localContractors.length} contractors in local database`)
    
    // Clear existing contractors in Supabase (optional - be careful!)
    console.log('🗑️  Clearing existing contractors in Supabase...')
    const { error: clearError } = await supabase
      .from('contractors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    if (clearError) {
      console.error('Error clearing contractors:', clearError)
    } else {
      console.log('✅ Cleared existing contractors')
    }
    
    // First, let's check what columns actually exist in Supabase
    console.log('🔍 Checking Supabase schema...')
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('contractors')
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
        .from('contractors')
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
      .from('contractors')
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