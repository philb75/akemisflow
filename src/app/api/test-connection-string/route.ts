import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || ''
  const directUrl = process.env.DIRECT_URL || ''
  
  // Function to mask sensitive parts but show structure
  function analyzeConnectionString(url: string, name: string) {
    if (!url) {
      return { name, status: 'NOT_SET' }
    }
    
    const analysis: any = {
      name,
      length: url.length,
      structure: {
        startsWithProtocol: url.startsWith('postgresql://'),
        hasUsername: false,
        hasPassword: false,
        hasHost: false,
        hasPort: false,
        hasDatabase: false,
        hasQueryParams: false,
      },
      queryParams: [],
    }
    
    try {
      // Check basic structure
      const protocolEnd = url.indexOf('://')
      if (protocolEnd > -1) {
        const afterProtocol = url.substring(protocolEnd + 3)
        const atIndex = afterProtocol.indexOf('@')
        
        if (atIndex > -1) {
          const authPart = afterProtocol.substring(0, atIndex)
          analysis.structure.hasUsername = authPart.includes(':')
          analysis.structure.hasPassword = authPart.includes(':') && authPart.split(':')[1].length > 0
          
          const hostPart = afterProtocol.substring(atIndex + 1)
          const questionIndex = hostPart.indexOf('?')
          const pathPart = questionIndex > -1 ? hostPart.substring(0, questionIndex) : hostPart
          
          analysis.structure.hasHost = pathPart.includes('.')
          analysis.structure.hasPort = pathPart.includes(':')
          analysis.structure.hasDatabase = pathPart.includes('/')
          
          if (questionIndex > -1) {
            analysis.structure.hasQueryParams = true
            const queryString = hostPart.substring(questionIndex + 1)
            const params = queryString.split('&')
            analysis.queryParams = params.map(p => p.split('=')[0])
          }
        }
      }
      
      // Extract safe parts
      const urlParts = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^?]+)(\?.*)?/)
      if (urlParts) {
        analysis.safeParts = {
          username: urlParts[1],
          passwordLength: urlParts[2].length,
          host: urlParts[3],
          port: urlParts[4],
          database: urlParts[5],
          queryString: urlParts[6] || 'none',
        }
      }
      
    } catch (e) {
      analysis.parseError = (e as Error).message
    }
    
    return analysis
  }
  
  const response = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    connectionStrings: {
      DATABASE_URL: analyzeConnectionString(dbUrl, 'DATABASE_URL'),
      DIRECT_URL: analyzeConnectionString(directUrl, 'DIRECT_URL'),
    },
    recommendations: [],
  }
  
  // Add recommendations based on analysis
  const dbAnalysis = response.connectionStrings.DATABASE_URL
  if (dbAnalysis.status === 'NOT_SET') {
    response.recommendations.push('DATABASE_URL is not set in environment variables')
  } else if (!dbAnalysis.structure.hasQueryParams) {
    response.recommendations.push('DATABASE_URL is missing query parameters (?pgbouncer=true&connection_limit=1&sslmode=require)')
  } else if (!dbAnalysis.queryParams?.includes('pgbouncer')) {
    response.recommendations.push('DATABASE_URL should include pgbouncer=true for connection pooling')
  }
  
  if (dbAnalysis.safeParts?.port !== '6543') {
    response.recommendations.push('DATABASE_URL should use port 6543 for transaction pooler')
  }
  
  const directAnalysis = response.connectionStrings.DIRECT_URL
  if (directAnalysis.safeParts?.port !== '5432') {
    response.recommendations.push('DIRECT_URL should use port 5432 for direct connections')
  }
  
  return NextResponse.json(response)
}