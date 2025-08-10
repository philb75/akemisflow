#!/bin/bash

echo "🚀 Quick Dual Environment Setup"
echo "==============================="
echo ""
echo "This script sets up both Production (master) and Development (dev)"
echo "environments with separate Supabase instances and Vercel deployments."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check requirements
check_requirements() {
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI not found. Install with: npm i -g vercel${NC}"
        exit 1
    fi
    
    if ! command -v openssl &> /dev/null; then
        echo -e "${RED}❌ OpenSSL not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Requirements met${NC}"
}

# Collect Supabase credentials
collect_supabase_credentials() {
    echo ""
    echo -e "${BLUE}📊 Supabase Credentials Collection${NC}"
    echo "================================================"
    echo ""
    echo "You need to create TWO Supabase projects first:"
    echo "1. Go to: https://supabase.com/dashboard"
    echo "2. Create 'akemisflow-prod' project"
    echo "3. Create 'akemisflow-dev' project" 
    echo ""
    read -p "Press Enter when both projects are created..."

    echo ""
    echo -e "${YELLOW}Production Supabase Credentials:${NC}"
    read -p "Production Project URL: " PROD_SUPABASE_URL
    read -p "Production Anon Key: " PROD_SUPABASE_ANON_KEY
    read -p "Production Service Role Key: " PROD_SUPABASE_SERVICE_KEY
    read -s -p "Production Database Password: " PROD_DB_PASSWORD
    echo ""

    echo ""
    echo -e "${YELLOW}Development Supabase Credentials:${NC}"
    read -p "Development Project URL: " DEV_SUPABASE_URL
    read -p "Development Anon Key: " DEV_SUPABASE_ANON_KEY
    read -p "Development Service Role Key: " DEV_SUPABASE_SERVICE_KEY
    read -s -p "Development Database Password: " DEV_DB_PASSWORD
    echo ""
    
    # Extract project IDs from URLs
    PROD_PROJECT_ID=$(echo $PROD_SUPABASE_URL | sed -n 's/https:\/\/\(.*\)\.supabase\.co/\1/p')
    DEV_PROJECT_ID=$(echo $DEV_SUPABASE_URL | sed -n 's/https:\/\/\(.*\)\.supabase\.co/\1/p')
    
    echo -e "${GREEN}✅ Credentials collected${NC}"
}

# Setup Vercel environments
setup_vercel() {
    echo ""
    echo -e "${BLUE}⚙️ Configuring Vercel Environment Variables${NC}"
    echo "============================================="
    
    # Login and link
    echo "Logging into Vercel..."
    vercel login
    
    echo "Linking project..."
    vercel link --yes
    
    # Generate secrets
    PROD_NEXTAUTH_SECRET=$(openssl rand -base64 32)
    DEV_NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    echo ""
    echo "Setting up Production environment variables..."
    
    # Production environment variables
    echo "$PROD_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --yes
    echo "$PROD_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes
    echo "$PROD_SUPABASE_SERVICE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --yes
    echo "postgresql://postgres:$PROD_DB_PASSWORD@db.$PROD_PROJECT_ID.supabase.co:5432/postgres" | vercel env add DATABASE_URL production --yes
    echo "https://akemisflow.vercel.app" | vercel env add NEXTAUTH_URL production --yes
    echo "$PROD_NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production --yes
    echo "production" | vercel env add NODE_ENV production --yes
    echo "production" | vercel env add AKEMIS_ENV production --yes
    echo "supabase" | vercel env add STORAGE_TYPE production --yes
    
    # Production Airwallex (placeholder - update with real credentials later)
    echo "your-real-client-id" | vercel env add AIRWALLEX_CLIENT_ID production --yes
    echo "your-real-api-key" | vercel env add AIRWALLEX_API_KEY production --yes
    echo "https://api.airwallex.com" | vercel env add AIRWALLEX_BASE_URL production --yes
    
    echo ""
    echo "Setting up Preview environment variables (dev + feature branches)..."
    
    # Preview environment variables (dev + feature branches)
    echo "$DEV_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview --yes
    echo "$DEV_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview --yes
    echo "$DEV_SUPABASE_SERVICE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY preview --yes
    echo "postgresql://postgres:$DEV_DB_PASSWORD@db.$DEV_PROJECT_ID.supabase.co:5432/postgres" | vercel env add DATABASE_URL preview --yes
    echo "https://akemisflow-git-dev.vercel.app" | vercel env add NEXTAUTH_URL preview --yes
    echo "$DEV_NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET preview --yes
    echo "development" | vercel env add NODE_ENV preview --yes
    echo "development" | vercel env add AKEMIS_ENV preview --yes
    echo "supabase" | vercel env add STORAGE_TYPE preview --yes
    
    # Test Airwallex credentials for dev
    echo "ooSEP1J_RVCyQJCXMZx42g" | vercel env add AIRWALLEX_CLIENT_ID preview --yes
    echo "894d904d7c01237087c5b9b458003bfb8393e7b9638a1bf64c80bb6dc1b9df399d45c3a29e4eb6230592912c6bd489bb" | vercel env add AIRWALLEX_API_KEY preview --yes
    echo "https://api-demo.airwallex.com" | vercel env add AIRWALLEX_BASE_URL preview --yes
    
    echo -e "${GREEN}✅ Vercel environment variables configured${NC}"
}

# Setup databases
setup_databases() {
    echo ""
    echo -e "${BLUE}🗄️ Setting Up Database Schemas${NC}"
    echo "================================"
    
    # Setup production database
    echo ""
    echo "Setting up Production database..."
    export DATABASE_URL="postgresql://postgres:$PROD_DB_PASSWORD@db.$PROD_PROJECT_ID.supabase.co:5432/postgres"
    export NEXT_PUBLIC_SUPABASE_URL="$PROD_SUPABASE_URL"
    
    pnpm prisma db push --accept-data-loss
    node create-admin.js
    echo -e "${GREEN}✅ Production database ready${NC}"
    
    # Setup development database
    echo ""
    echo "Setting up Development database..."
    export DATABASE_URL="postgresql://postgres:$DEV_DB_PASSWORD@db.$DEV_PROJECT_ID.supabase.co:5432/postgres"
    export NEXT_PUBLIC_SUPABASE_URL="$DEV_SUPABASE_URL"
    
    pnpm prisma db push --accept-data-loss
    node create-admin.js
    echo -e "${GREEN}✅ Development database ready${NC}"
}

# Deploy both branches
deploy_branches() {
    echo ""
    echo -e "${BLUE}🚀 Deploying Both Branches${NC}"
    echo "============================"
    
    # Deploy production (master)
    echo ""
    echo "Deploying Production (master branch)..."
    git checkout master
    git push origin master
    
    # Deploy development (dev)
    echo ""
    echo "Deploying Development (dev branch)..."
    git checkout dev
    git merge master --no-edit
    git push origin dev
    
    echo -e "${GREEN}✅ Both branches deployed${NC}"
}

# Create summary
create_summary() {
    echo ""
    echo "Creating environment summary..."
    
    cat > ENVIRONMENT_SUMMARY.md << EOF
# 🌐 AkemisFlow Environments Summary

## Active Environments

### 🏭 Production Environment
- **Branch**: \`master\`
- **URL**: https://akemisflow.vercel.app
- **Database**: $PROD_PROJECT_ID (Supabase)
- **Airwallex**: Production API (configure real credentials)
- **Admin**: philb75@gmail.com / Philb123$

### 🧪 Development Environment  
- **Branch**: \`dev\`
- **URL**: https://akemisflow-git-dev.vercel.app
- **Database**: $DEV_PROJECT_ID (Supabase)
- **Airwallex**: Demo API (ooSEP1J_RVCyQJCXMZx42g)
- **Admin**: philb75@gmail.com / Philb123$

## Supabase Dashboards
- **Production**: https://supabase.com/dashboard/project/$PROD_PROJECT_ID
- **Development**: https://supabase.com/dashboard/project/$DEV_PROJECT_ID

## Next Steps

### 1. Test Both Environments
\`\`\`bash
# Test production
curl https://akemisflow.vercel.app/api/health

# Test development
curl https://akemisflow-git-dev.vercel.app/api/health
\`\`\`

### 2. Update Production Airwallex
When ready for production:
\`\`\`bash
vercel env add AIRWALLEX_CLIENT_ID production
vercel env add AIRWALLEX_API_KEY production
# Use real credentials
\`\`\`

### 3. Daily Workflow
- **Development**: Work on \`dev\` branch → auto-deploy to dev environment
- **Features**: Create \`feature/name\` → auto-preview URLs
- **Production**: Merge \`dev\` → \`master\` → production deployment

## Environment Variables Status
✅ Production: Real database, placeholder Airwallex
✅ Development: Test database, demo Airwallex
✅ Auto-deployment: Both branches configured

---
Generated: $(date)
Environment Setup: COMPLETE ✅
EOF

    echo -e "${GREEN}✅ Summary created: ENVIRONMENT_SUMMARY.md${NC}"
}

# Main execution
main() {
    echo "This will set up BOTH production and development environments"
    echo "with separate Supabase instances and Vercel deployments."
    echo ""
    read -p "Continue? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    
    check_requirements
    collect_supabase_credentials
    setup_vercel
    setup_databases
    deploy_branches
    create_summary
    
    echo ""
    echo "========================================="
    echo -e "${GREEN}🎉 DUAL ENVIRONMENT SETUP COMPLETE!${NC}"
    echo "========================================="
    echo ""
    echo -e "${BLUE}📋 Your Active Environments:${NC}"
    echo ""
    echo -e "${YELLOW}🏭 Production:${NC} https://akemisflow.vercel.app"
    echo -e "${YELLOW}🧪 Development:${NC} https://akemisflow-git-dev.vercel.app"
    echo ""
    echo -e "${BLUE}👤 Login Credentials (both environments):${NC}"
    echo "   Email: philb75@gmail.com"
    echo "   Password: Philb123$"
    echo ""
    echo -e "${BLUE}💡 Next Steps:${NC}"
    echo "1. Test both environments"
    echo "2. Configure real Airwallex for production"
    echo "3. Start developing on 'dev' branch"
    echo ""
    echo "See ENVIRONMENT_SUMMARY.md for complete details!"
}

# Run the script
main