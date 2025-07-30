#!/bin/bash

# Deploy to Supabase Script
# This script helps deploy the application to Supabase

echo "🚀 AkemisFlow Deployment to Supabase"
echo "===================================="

# Check if we have the production environment file
if [ ! -f ".env.production.local" ]; then
    echo "❌ Error: .env.production.local not found!"
    echo ""
    echo "Please create .env.production.local with your Supabase credentials:"
    echo "1. Copy .env.production to .env.production.local"
    echo "2. Fill in the actual values for:"
    echo "   - DATABASE_URL (with your Supabase password)"
    echo "   - DIRECT_URL (with your Supabase password)"
    echo "   - NEXTAUTH_SECRET (generate a secure secret)"
    echo "   - NEXTAUTH_URL (your Vercel app URL)"
    echo "   - SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard)"
    exit 1
fi

# Load production environment variables
export $(cat .env.production.local | grep -v '^#' | xargs)

echo "📋 Step 1: Generating Prisma Client..."
pnpm prisma generate

echo ""
echo "📋 Step 2: Pushing schema to Supabase..."
echo "Using database: $DATABASE_URL"
pnpm prisma db push --skip-generate

echo ""
echo "📋 Step 3: Verifying schema..."
pnpm prisma db pull --print > /tmp/supabase-schema.txt 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Schema verified successfully"
else
    echo "⚠️  Could not verify schema - continuing anyway"
fi

echo ""
echo "📋 Step 4: Running production seed (if needed)..."
npx tsx prisma/seed-production.ts

echo ""
echo "✅ Database schema deployed to Supabase!"
echo ""
echo "📋 Next Steps:"
echo "1. Commit and push your code to GitHub"
echo "2. Deploy to Vercel using 'vercel' command"
echo "3. Set environment variables in Vercel dashboard"
echo ""
echo "🔐 Required Vercel Environment Variables:"
echo "   - DATABASE_URL"
echo "   - DIRECT_URL"
echo "   - NEXTAUTH_SECRET"
echo "   - NEXTAUTH_URL"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - NODE_ENV=production"