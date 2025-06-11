import { NextRequest, NextResponse } from "next/server"
import { prisma as db } from "@/lib/db"

export async function GET() {
  try {
    // Try to create the User table if it doesn't exist
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT,
        "email" TEXT NOT NULL UNIQUE,
        "emailVerified" TIMESTAMPTZ,
        "image" TEXT,
        "password" TEXT,
        "role" TEXT DEFAULT 'USER',
        "lastLoginAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
      );
    `

    // Create Account table for NextAuth
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "refresh_token" TEXT,
        "access_token" TEXT,
        "expires_at" INTEGER,
        "token_type" TEXT,
        "scope" TEXT,
        "id_token" TEXT,
        "session_state" TEXT,
        "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
    `

    // Create Session table for NextAuth
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionToken" TEXT NOT NULL UNIQUE,
        "userId" TEXT NOT NULL,
        "expires" TIMESTAMPTZ NOT NULL,
        "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      );
    `

    // Create VerificationToken table for NextAuth
    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "VerificationToken" (
        "identifier" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "expires" TIMESTAMPTZ NOT NULL,
        PRIMARY KEY ("identifier", "token")
      );
    `

    return NextResponse.json({
      message: "Database tables created successfully",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("Database setup error:", error)
    return NextResponse.json(
      { 
        error: "Failed to setup database", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}