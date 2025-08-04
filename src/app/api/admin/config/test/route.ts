import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ConfigurationService } from '@/lib/config'
import { createClient } from '@supabase/supabase-js'

const configService = new ConfigurationService(prisma)

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { key, value, testType } = body

    if (!key || value === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Key and value are required'
      }, { status: 400 })
    }

    let testResult: { success: boolean; message: string; details?: any } = {
      success: false,
      message: 'Unknown test type'
    }

    switch (testType) {
      case 'database.supabase':
        testResult = await testSupabaseConnection(value, body.anonKey)
        break
        
      case 'storage.supabase':
        testResult = await testSupabaseStorage(body.url, body.serviceKey, value)
        break
        
      case 'integrations.airwallex':
        testResult = await testAirwallexConnection(body.clientId, value, body.baseUrl)
        break
        
      case 'storage.local':
        testResult = await testLocalStorage(value)
        break
        
      default:
        // Basic validation test
        const validation = await configService.testConfiguration(key, value, body.dataType || 'STRING')
        testResult = {
          success: validation.valid,
          message: validation.valid ? 'Configuration is valid' : validation.error || 'Configuration is invalid'
        }
    }

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details,
      tested: {
        key,
        value: body.isSecret ? '[HIDDEN]' : value,
        testType
      }
    })
  } catch (error) {
    console.error('Configuration test failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Test failed due to an error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    if (!url || !anonKey) {
      return {
        success: false,
        message: 'URL and anonymous key are required for Supabase connection test'
      }
    }

    const supabase = createClient(url, anonKey)
    
    // Test connection by trying to get a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is fine
      return {
        success: false,
        message: `Supabase connection failed: ${error.message}`,
        details: { error: error.code }
      }
    }

    return {
      success: true,
      message: 'Supabase database connection successful',
      details: { 
        url: url.replace(/\/\/([^@]+@)?/, '//***@'), // Hide credentials in URL
        status: 'connected'
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Supabase connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: 'connection_failed' }
    }
  }
}

async function testSupabaseStorage(url: string, serviceKey: string, bucket: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    if (!url || !serviceKey || !bucket) {
      return {
        success: false,
        message: 'URL, service key, and bucket name are required for Supabase storage test'
      }
    }

    const supabase = createClient(url, serviceKey)
    
    // Test storage by listing files in the bucket
    const { data, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 1 })

    if (error) {
      return {
        success: false,
        message: `Supabase storage test failed: ${error.message}`,
        details: { error: error.message }
      }
    }

    return {
      success: true,
      message: 'Supabase storage connection successful',
      details: { 
        bucket,
        status: 'connected',
        accessible: true
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Supabase storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: 'storage_test_failed' }
    }
  }
}

async function testAirwallexConnection(clientId: string, apiKey: string, baseUrl: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    if (!clientId || !apiKey) {
      return {
        success: false,
        message: 'Client ID and API key are required for Airwallex connection test'
      }
    }

    const authUrl = `${baseUrl || 'https://api.airwallex.com'}/api/v1/authentication/login`
    
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        x_client_id: clientId,
        x_api_key: apiKey
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return {
        success: false,
        message: `Airwallex authentication failed: ${response.status} ${response.statusText}`,
        details: { 
          status: response.status,
          error: error.substring(0, 200) // Limit error message length
        }
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      message: 'Airwallex API connection successful',
      details: { 
        status: 'authenticated',
        expires_at: data.expires_at,
        baseUrl: baseUrl || 'https://api.airwallex.com'
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Airwallex connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: 'connection_failed' }
    }
  }
}

async function testLocalStorage(path: string): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const fs = require('fs')
    const nodePath = require('path')
    
    if (!path) {
      return {
        success: false,
        message: 'Storage path is required for local storage test'
      }
    }

    const fullPath = nodePath.resolve(path)
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      // Try to create the directory
      try {
        fs.mkdirSync(fullPath, { recursive: true })
      } catch (createError) {
        return {
          success: false,
          message: `Cannot create storage directory: ${createError instanceof Error ? createError.message : 'Unknown error'}`,
          details: { path: fullPath, error: 'directory_creation_failed' }
        }
      }
    }

    // Test write permissions
    const testFile = nodePath.join(fullPath, '.write-test')
    try {
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)
    } catch (writeError) {
      return {
        success: false,
        message: `Storage directory is not writable: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`,
        details: { path: fullPath, error: 'not_writable' }
      }
    }

    return {
      success: true,
      message: 'Local storage is accessible and writable',
      details: { 
        path: fullPath,
        status: 'accessible',
        writable: true
      }
    }
  } catch (error) {
    return {
      success: false,
      message: `Local storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error: 'storage_test_failed' }
    }
  }
}