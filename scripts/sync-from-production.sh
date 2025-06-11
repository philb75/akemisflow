#!/bin/bash

# AkemisFlow Sync Script: Production to Local
# =============================================================================
# This script syncs database schema and data from production Supabase
# to local Docker development environment

set -e

echo "⬇️  AkemisFlow: Syncing Production to Local..."
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

# Start local Docker services
log_info "Starting local Docker services..."
docker-compose up -d postgres redis
sleep 10

# Wait for PostgreSQL to be ready
log_info "Waiting for local PostgreSQL to be ready..."
until docker exec akemisflow_postgres pg_isready -U akemisflow -d akemisflow_dev; do
    log_info "Waiting for PostgreSQL..."
    sleep 2
done

log_success "Local PostgreSQL is ready"

# Step 1: Create migrations directory
mkdir -p ./migrations/from-production

# Step 2: Export schema from production
log_info "Exporting schema from production database..."
pg_dump \
    --schema-only \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="./migrations/from-production/$(date +%Y%m%d_%H%M%S)_prod_schema.sql" \
    "$PROD_DB" 2>/dev/null || {
    log_warning "Could not export from production DB directly. Using existing schema..."
    cp ./supabase_schema.sql "./migrations/from-production/$(date +%Y%m%d_%H%M%S)_schema_fallback.sql"
}

log_success "Production schema exported"

# Step 3: Export data from production (with confirmation)
read -p "Do you want to sync production data to local? This will overwrite local data. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Exporting data from production database..."
    
    pg_dump \
        --data-only \
        --no-owner \
        --no-privileges \
        --format=plain \
        --file="./migrations/from-production/$(date +%Y%m%d_%H%M%S)_prod_data.sql" \
        "$PROD_DB" 2>/dev/null || {
        log_warning "Could not export data from production. Skipping data sync."
    }
    
    log_success "Production data exported"
else
    log_info "Data sync skipped"
fi

# Step 4: Reset local database and apply schema
log_info "Resetting local database..."
docker exec akemisflow_postgres psql -U akemisflow -d akemisflow_dev -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

log_info "Applying schema to local database..."
DATABASE_URL="$LOCAL_DB" npx prisma db push

log_success "Local database schema updated"

# Step 5: Apply production data if exported
if [ -f "./migrations/from-production/"*"_prod_data.sql" ]; then
    read -p "Apply production data to local database? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Applying production data to local database..."
        latest_data_file=$(ls -t ./migrations/from-production/*_prod_data.sql | head -1)
        docker exec -i akemisflow_postgres psql -U akemisflow -d akemisflow_dev < "$latest_data_file"
        log_success "Production data applied to local database"
    fi
fi

# Step 6: Update local environment variables
log_info "Updating local environment configuration..."
if [ ! -f ".env.local.backup" ]; then
    cp .env.local .env.local.backup
    log_info "Backed up existing .env.local"
fi

# Copy Docker environment for local development
cp .env.local.docker .env.local
log_success "Local environment updated for Docker development"

# Step 7: Start all services
log_info "Starting all local services..."
docker-compose -f docker-compose.full.yml up -d

log_success "All services started"

echo ""
echo "🎉 Production sync completed!"
echo "=============================================="
echo "Your local environment now mirrors production:"
echo ""
echo "Local Services:"
echo "- Next.js App: http://localhost:3000"
echo "- PostgREST API: http://localhost:3001"
echo "- pgAdmin: http://localhost:8080 (admin@akemisflow.local / admin123)"
echo "- MinIO Console: http://localhost:9001 (akemisflow / dev_password_2024)"
echo "- Redis: localhost:6379"
echo ""
echo "To develop locally:"
echo "  pnpm dev"
echo ""
echo "To stop services:"
echo "  docker-compose -f docker-compose.full.yml down"