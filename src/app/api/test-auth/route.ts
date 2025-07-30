import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    const client = new Client({
      user: 'postgres.wflcaapznpczlxjaeyfd',
      password: 'Philb921056$',
      host: 'aws-0-eu-west-3.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    
    const result = await client.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      await client.end();
      return NextResponse.json({ 
        success: false, 
        message: "User not found",
        email 
      });
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    
    await client.end();
    
    return NextResponse.json({
      success: isValid,
      message: isValid ? "Password valid" : "Password invalid",
      user: {
        email: user.email,
        role: user.role,
        hasPassword: !!user.password
      }
    });
    
  } catch (error) {
    console.error('Test auth error:', error);
    return NextResponse.json({ 
      success: false, 
      message: "Error testing authentication",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}