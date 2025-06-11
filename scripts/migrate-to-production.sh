#!/bin/bash

# AkemisFlow Migration Script: Local to Production
# =============================================================================
# This script migrates database schema and data from local Docker setup
# to production Vercel + Supabase environment

set -e

echo "🚀 AkemisFlow: Migrating Local to Production..."
echo "=============================================="

# Configuration
LOCAL_DB="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"
PROD_DB="postgresql://postgres:JqQKoxNn1HMm4cThe@db.wflcaapznpczlxjaeyfd.supabase.co:5432/postgres"

# Functions
log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_warning() {
    echo "⚠️  $1"
}

log_error() {
    echo "❌ $1"
}

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

# Check if Docker containers are running
if ! docker ps | grep -q "akemisflow_postgres"; then
    log_warning "Local PostgreSQL container not running. Starting Docker services..."
    docker-compose up -d postgres
    sleep 10
fi

# Step 1: Export schema from local database
log_info "Exporting schema from local database..."
pg_dump \
    --schema-only \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="./migrations/$(date +%Y%m%d_%H%M%S)_schema_export.sql" \
    "$LOCAL_DB"

log_success "Schema exported to migrations directory"

# Step 2: Export data from local database (excluding system tables)
log_info "Exporting data from local database..."
pg_dump \
    --data-only \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="./migrations/$(date +%Y%m%d_%H%M%S)_data_export.sql" \
    "$LOCAL_DB"

log_success "Data exported to migrations directory"

# Step 3: Test connection to production database
log_info "Testing connection to production database..."
if pg_isready -h "db.wflcaapznpczlxjaeyfd.supabase.co" -p 5432 -U postgres; then
    log_success "Production database is accessible"
else
    log_error "Cannot connect to production database. Please check credentials."
    exit 1
fi

# Step 4: Apply schema to production (optional, with confirmation)
read -p "Do you want to apply schema to production? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Applying schema to production database..."
    
    # Use Prisma to apply schema
    DATABASE_URL="$PROD_DB" npx prisma db push --force-reset --accept-data-loss
    
    log_success "Schema applied to production database"
else
    log_info "Schema application skipped"
fi

# Step 5: Sync environment variables to Vercel
log_info "Syncing environment variables to Vercel..."

# Core environment variables (using values from .env.production)
if [ -f ".env.production" ]; then
    log_info "Reading production environment variables..."
    
    # You can add more sophisticated parsing here
    log_warning "Environment variables should be manually verified in Vercel dashboard"
    log_info "Vercel Dashboard: https://vercel.com/philippe-barthelemys-projects/akemisflow/settings/environment-variables"
else
    log_warning ".env.production file not found"
fi

# Step 6: Deploy to Vercel
read -p "Do you want to deploy to Vercel? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Deploying to Vercel..."
    vercel --prod
    log_success "Deployed to Vercel"
else
    log_info "Vercel deployment skipped"
fi

# Step 7: Run post-migration checks
log_info "Running post-migration checks..."

# Check if production API is accessible
if curl -f -s "https://akemisflow-vercel-app.vercel.app/api/health" > /dev/null; then
    log_success "Production API is accessible"
else
    log_warning "Production API check failed or requires authentication"
fi

echo ""
echo "🎉 Migration process completed!"
echo "=============================================="
echo "Next steps:"
echo "1. Verify data in production Supabase dashboard"
echo "2. Test critical application features"
echo "3. Update DNS/domain settings if needed"
echo "4. Monitor application logs for any issues"
echo ""
echo "Production URLs:"
echo "- App: https://akemisflow-vercel-app.vercel.app"
echo "- Supabase: https://supabase.com/dashboard/project/wflcaapznpczlxjaeyfd"
echo "- Vercel: https://vercel.com/philippe-barthelemys-projects/akemisflow"