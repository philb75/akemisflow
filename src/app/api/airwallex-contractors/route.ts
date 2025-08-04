import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSupabaseClient } from '@/lib/supabase'

// Determine if we should use Supabase or Prisma
// TEMPORARY: Force use of Prisma for debugging
const useSupabase = false // !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const linked = searchParams.get('linked') // 'true', 'false', or null for all
    const search = searchParams.get('search') || ''
    
    const offset = (page - 1) * limit

    let airwallexContractors = []
    let total = 0

    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      let query = supabase
        .from('airwallex_contractors')
        .select(`
          *,
          linked_contractor:contractors(id, first_name, last_name, email)
        `, { count: 'exact' })
      
      // Apply filters
      if (linked === 'true') {
        query = query.not('linked_contractor_id', 'is', null)
      } else if (linked === 'false') {
        query = query.is('linked_contractor_id', null)
      }
      
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,beneficiary_id.ilike.%${search}%`)
      }
      
      // Apply pagination
      query = query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        console.error('Supabase error fetching Airwallex contractors:', error)
        return NextResponse.json({ error: 'Failed to fetch Airwallex contractors' }, { status: 500 })
      }
      
      airwallexContractors = data || []
      total = count || 0
    } else {
      // Use Prisma for local development
      const where: any = {}
      
      if (linked === 'true') {
        where.linkedContractorId = { not: null }
      } else if (linked === 'false') {
        where.linkedContractorId = null
      }
      
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { beneficiaryId: { contains: search, mode: 'insensitive' } }
        ]
      }

      [airwallexContractors, total] = await Promise.all([
        prisma.airwallexContractor.findMany({
          where,
          include: {
            linkedContractor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.airwallexContractor.count({ where })
      ])
    }

    const totalPages = Math.ceil(total / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      data: airwallexContractors,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })

  } catch (error) {
    console.error('Error fetching Airwallex contractors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { beneficiaryId, ...airwallexData } = body

    if (!beneficiaryId) {
      return NextResponse.json(
        { error: 'Beneficiary ID is required' },
        { status: 400 }
      )
    }

    let result = null

    if (useSupabase) {
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from('airwallex_contractors')
        .insert({
          beneficiary_id: beneficiaryId,
          ...airwallexData,
          last_fetched_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return NextResponse.json({ 
            error: `Airwallex contractor with beneficiary ID ${beneficiaryId} already exists` 
          }, { status: 409 })
        }
        
        console.error('Supabase error creating Airwallex contractor:', error)
        return NextResponse.json({ error: 'Failed to create Airwallex contractor' }, { status: 500 })
      }
      
      result = data
    } else {
      try {
        result = await prisma.airwallexContractor.create({
          data: {
            beneficiaryId,
            ...airwallexData
          }
        })
      } catch (error: any) {
        if (error.code === 'P2002') { // Unique constraint violation
          return NextResponse.json({ 
            error: `Airwallex contractor with beneficiary ID ${beneficiaryId} already exists` 
          }, { status: 409 })
        }
        throw error
      }
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    console.error('Error creating Airwallex contractor:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}