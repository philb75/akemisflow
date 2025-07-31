import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'

// Environment-aware database client
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function GET() {
  try {
    let result: any = { environment: useSupabase ? 'supabase' : 'prisma' }
    
    if (useSupabase) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Get total count
      const { count: totalCount } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })
      
      // Get synced count
      const { count: syncedCount } = await supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })
        .not('airwallexBeneficiaryId', 'is', null)
      
      // Get sample data
      const { data: sampleSuppliers } = await supabase
        .from('suppliers')
        .select('id, firstName, lastName, email, airwallexBeneficiaryId, status')
        .limit(5)
      
      result = {
        ...result,
        totalSuppliers: totalCount || 0,
        syncedSuppliers: syncedCount || 0,
        sampleSuppliers: sampleSuppliers || []
      }
    } else {
      // Local Prisma
      const totalCount = await prisma.supplier.count()
      const syncedCount = await prisma.supplier.count({
        where: { airwallexBeneficiaryId: { not: null } }
      })
      
      const sampleSuppliers = await prisma.supplier.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          airwallexBeneficiaryId: true,
          status: true
        },
        take: 5
      })
      
      result = {
        ...result,
        totalSuppliers: totalCount,
        syncedSuppliers: syncedCount,
        sampleSuppliers
      }
    }
    
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      environment: useSupabase ? 'supabase' : 'prisma'
    }, { status: 500 })
  }
}