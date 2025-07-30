#!/bin/bash

# Verify Schema Alignment Script
# Compares local and production database schemas

echo "🔍 Schema Alignment Verification"
echo "================================"

# Function to get schema from database
get_schema() {
    local env_file=$1
    local env_name=$2
    
    echo ""
    echo "📋 Checking $env_name schema..."
    
    # Load environment variables
    export $(cat $env_file | grep -v '^#' | xargs)
    
    # Get table list
    echo "Tables in $env_name:"
    pnpm prisma db pull --print 2>/dev/null | grep "model" | awk '{print "  - " $2}' || echo "  ❌ Could not connect"
}

# Check local schema
if [ -f ".env.local" ]; then
    get_schema ".env.local" "Local (Docker)"
else
    echo "❌ .env.local not found"
fi

# Check production schema
if [ -f ".env.production.local" ]; then
    get_schema ".env.production.local" "Production (Supabase)"
else
    echo "⚠️  .env.production.local not found - skipping production check"
fi

echo ""
echo "📋 Current Prisma Schema Models:"
grep "^model" prisma/schema.prisma | awk '{print "  - " $2}'

echo ""
echo "📋 Schema Alignment Actions:"
echo "1. To push local schema to production: ./scripts/deploy-to-supabase.sh"
echo "2. To pull production schema locally: pnpm prisma db pull"
echo "3. To generate migration: pnpm prisma migrate dev"
echo ""
echo "⚠️  Important: Always backup production data before schema changes!"