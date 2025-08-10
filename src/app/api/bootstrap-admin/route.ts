import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

// This is a temporary endpoint to create an admin user in production
// Should be removed after use for security
export async function POST(request: NextRequest) {
  try {
    // Only allow in production for bootstrapping
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Only available in production' }, { status: 403 })
    }

    // Check if Supabase is configured
    const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    if (!useSupabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    const supabase = createSupabaseClient()
    
    // Check if any admin users exist
    const { data: existingAdmins, error: checkError } = await supabase
      .from('users')
      .select('email, role')
      .eq('role', 'ADMINISTRATOR')
    
    if (checkError) {
      console.error('Error checking existing admins:', checkError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: checkError.message 
      }, { status: 500 })
    }

    console.log('Existing admins found:', existingAdmins)
    
    if (existingAdmins && existingAdmins.length > 0) {
      // Check if test admin already exists
      const testAdminExists = existingAdmins.some(u => u.email === 'test@akemisflow.com')
      console.log('Test admin exists?', testAdminExists)
      
      if (!testAdminExists) {
        console.log('Creating test admin user...')
        // Create a test admin for sync testing
        const hashedPassword = await bcrypt.hash('TestAdmin123!', 10)
        
        const { data: testUser, error: testInsertError } = await supabase
          .from('users')
          .insert({
            email: 'test@akemisflow.com',
            password: hashedPassword,
            role: 'ADMINISTRATOR',
            is_active: true,
            name: 'Test Admin',
            first_name: 'Test',
            last_name: 'Admin',
            email_verified: new Date().toISOString()
          })
          .select()
          .single()

        if (testInsertError) {
          console.error('Error creating test admin user:', testInsertError)
        } else {
          return NextResponse.json({
            success: true,
            message: 'Test admin user created for sync testing',
            user: {
              email: testUser.email,
              role: testUser.role,
              name: testUser.name
            },
            existingAdmins: existingAdmins.map(u => u.email)
          }, { status: 201 })
        }
      }
      
      return NextResponse.json({ 
        success: false,
        message: 'Admin users already exist',
        existingAdmins: existingAdmins.map(u => u.email)
      }, { status: 200 })
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10)
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: 'admin@akemisflow.com',
        password: hashedPassword,
        role: 'ADMINISTRATOR',
        is_active: true,
        name: 'Production Admin',
        first_name: 'Production',
        last_name: 'Admin',
        email_verified: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating admin user:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create admin user', 
        details: insertError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Production admin user created successfully',
      user: {
        email: newUser.email,
        role: newUser.role,
        name: newUser.name
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Bootstrap admin error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}