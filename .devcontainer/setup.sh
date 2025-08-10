#!/bin/bash

echo "🚀 Setting up AkemisFlow development environment with Supabase..."

# Install required tools
echo "📦 Installing development tools..."
npm install -g pnpm
curl -sSfL https://get.supabase.com/cli | sh

# Install project dependencies
echo "📦 Installing project dependencies..."
pnpm install

# Initialize Supabase local development
echo "🗄️ Setting up Supabase local instance..."
supabase init --workdir /workspace

# Start Supabase services
cd /workspace
supabase start

# Get Supabase connection details
SUPABASE_DB_URL=$(supabase status --output json | jq -r '.db_url')

# Setup database schema
echo "📊 Setting up database schema..."
cd /workspace/akemisflow
pnpm prisma generate
DATABASE_URL="$SUPABASE_DB_URL" pnpm prisma db push

# Create admin user
echo "👤 Creating admin user..."
DATABASE_URL="$SUPABASE_DB_URL" node create-admin.js

echo "✅ Setup complete!"
echo ""
echo "🌐 Services running:"
echo "  - Supabase Studio: http://localhost:54323"
echo "  - API Gateway: http://localhost:54321"
echo "  - Database: localhost:54322"
echo ""
echo "📧 Admin credentials:"
echo "  Email: philb75@gmail.com"
echo "  Password: Philb123$"
echo ""
echo "🔑 Test Airwallex credentials configured:"
echo "  Client ID: ooSEP1J_RVCyQJCXMZx42g"
echo "  API endpoint: https://api-demo.airwallex.com"
echo ""
echo "🚀 Run 'pnpm dev' to start the development server"