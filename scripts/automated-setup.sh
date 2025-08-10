#!/bin/bash

echo "🚀 Automated Dual Environment Setup"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to set up Vercel environment variables
setup_vercel_envs() {
    local env_type=$1
    local supabase_url=$2
    local supabase_anon_key=$3
    local supabase_service_key=$4
    local database_url=$5
    local nextauth_url=$6
    local nextauth_secret=$7
    local node_env=$8
    local akemis_env=$9
    local airwallex_client_id=${10}
    local airwallex_api_key=${11}
    local airwallex_base_url=${12}
    
    echo ""
    echo -e "${BLUE}Setting up $env_type environment variables...${NC}"
    
    # Core variables
    echo "$supabase_url" | vercel env add NEXT_PUBLIC_SUPABASE_URL $env_type --yes
    echo "$supabase_anon_key" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY $env_type --yes
    echo "$supabase_service_key" | vercel env add SUPABASE_SERVICE_ROLE_KEY $env_type --yes
    echo "$database_url" | vercel env add DATABASE_URL $env_type --yes
    echo "$nextauth_url" | vercel env add NEXTAUTH_URL $env_type --yes
    echo "$nextauth_secret" | vercel env add NEXTAUTH_SECRET $env_type --yes
    
    # Environment flags
    echo "$node_env" | vercel env add NODE_ENV $env_type --yes
    echo "$akemis_env" | vercel env add AKEMIS_ENV $env_type --yes
    echo "supabase" | vercel env add STORAGE_TYPE $env_type --yes
    echo "/uploads" | vercel env add NEXT_PUBLIC_UPLOAD_PATH $env_type --yes
    
    # Airwallex
    echo "$airwallex_client_id" | vercel env add AIRWALLEX_CLIENT_ID $env_type --yes
    echo "$airwallex_api_key" | vercel env add AIRWALLEX_API_KEY $env_type --yes
    echo "$airwallex_base_url" | vercel env add AIRWALLEX_BASE_URL $env_type --yes
    
    echo -e "${GREEN}✅ $env_type environment configured${NC}"
}

# Function to setup database
setup_database() {
    local env_name=$1
    local database_url=$2
    local supabase_url=$3
    
    echo ""
    echo -e "${BLUE}Setting up $env_name database...${NC}"
    
    # Set environment variables locally
    export DATABASE_URL="$database_url"
    export NEXT_PUBLIC_SUPABASE_URL="$supabase_url"
    
    # Push schema
    echo "Pushing Prisma schema..."
    pnpm prisma db push --accept-data-loss
    
    # Create admin user
    echo "Creating admin user..."
    node create-admin.js
    
    echo -e "${GREEN}✅ $env_name database ready${NC}"
}

# Main setup function
main() {
    echo "This script will automatically set up both environments with your credentials."
    echo ""
    
    # Check if credentials are provided as environment variables
    if [[ -z "$PROD_SUPABASE_URL" || -z "$DEV_SUPABASE_URL" ]]; then
        echo -e "${RED}❌ Missing Supabase credentials${NC}"
        echo ""
        echo "Please provide credentials as environment variables:"
        echo ""
        echo "export PROD_SUPABASE_URL=\"https://your-prod-project.supabase.co\""
        echo "export PROD_SUPABASE_ANON_KEY=\"your-prod-anon-key\""
        echo "export PROD_SUPABASE_SERVICE_KEY=\"your-prod-service-key\""
        echo "export PROD_DB_PASSWORD=\"your-prod-password\""
        echo ""
        echo "export DEV_SUPABASE_URL=\"https://your-dev-project.supabase.co\""
        echo "export DEV_SUPABASE_ANON_KEY=\"your-dev-anon-key\""
        echo "export DEV_SUPABASE_SERVICE_KEY=\"your-dev-service-key\""
        echo "export DEV_DB_PASSWORD=\"your-dev-password\""
        echo ""
        echo "Then run: $0"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Credentials found${NC}"
    
    # Extract project IDs from URLs
    PROD_PROJECT_ID=$(echo $PROD_SUPABASE_URL | sed -n 's/https:\/\/\(.*\)\.supabase\.co/\1/p')
    DEV_PROJECT_ID=$(echo $DEV_SUPABASE_URL | sed -n 's/https:\/\/\(.*\)\.supabase\.co/\1/p')
    
    # Generate NextAuth secrets
    PROD_NEXTAUTH_SECRET=$(openssl rand -base64 32)
    DEV_NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    # Build database URLs
    PROD_DATABASE_URL="postgresql://postgres:$PROD_DB_PASSWORD@db.$PROD_PROJECT_ID.supabase.co:5432/postgres"
    DEV_DATABASE_URL="postgresql://postgres:$DEV_DB_PASSWORD@db.$DEV_PROJECT_ID.supabase.co:5432/postgres"
    
    echo ""
    echo -e "${BLUE}🔗 Linking Vercel project...${NC}"
    vercel link --yes
    
    # Setup production environment
    setup_vercel_envs "production" \
        "$PROD_SUPABASE_URL" \
        "$PROD_SUPABASE_ANON_KEY" \
        "$PROD_SUPABASE_SERVICE_KEY" \
        "$PROD_DATABASE_URL" \
        "https://akemisflow.vercel.app" \
        "$PROD_NEXTAUTH_SECRET" \
        "production" \
        "production" \
        "${PROD_AIRWALLEX_CLIENT_ID:-your-real-client-id}" \
        "${PROD_AIRWALLEX_API_KEY:-your-real-api-key}" \
        "${PROD_AIRWALLEX_BASE_URL:-https://api.airwallex.com}"
    
    # Setup preview environment (dev + features)
    setup_vercel_envs "preview" \
        "$DEV_SUPABASE_URL" \
        "$DEV_SUPABASE_ANON_KEY" \
        "$DEV_SUPABASE_SERVICE_KEY" \
        "$DEV_DATABASE_URL" \
        "https://akemisflow-git-dev.vercel.app" \
        "$DEV_NEXTAUTH_SECRET" \
        "development" \
        "development" \
        "ooSEP1J_RVCyQJCXMZx42g" \
        "894d904d7c01237087c5b9b458003bfb8393e7b9638a1bf64c80bb6dc1b9df399d45c3a29e4eb6230592912c6bd489bb" \
        "https://api-demo.airwallex.com"
    
    # Setup databases
    setup_database "Production" "$PROD_DATABASE_URL" "$PROD_SUPABASE_URL"
    setup_database "Development" "$DEV_DATABASE_URL" "$DEV_SUPABASE_URL"
    
    # Deploy both branches
    echo ""
    echo -e "${BLUE}🚀 Deploying both branches...${NC}"
    
    # Deploy production
    echo "Deploying master branch (production)..."
    git checkout master
    git push origin master
    
    # Deploy development  
    echo "Deploying dev branch (development)..."
    git checkout dev
    git merge master --no-edit
    git push origin dev
    
    # Create summary
    cat > ENVIRONMENT_SUMMARY.md << EOF
# 🌐 AkemisFlow Environments - LIVE!

## ✅ Active Environments

### 🏭 Production Environment
- **Branch**: \`master\`
- **URL**: https://akemisflow.vercel.app
- **Database**: $PROD_PROJECT_ID (Supabase)
- **Supabase Dashboard**: https://supabase.com/dashboard/project/$PROD_PROJECT_ID
- **Admin**: philb75@gmail.com / Philb123$
- **Status**: ✅ LIVE

### 🧪 Development Environment
- **Branch**: \`dev\`  
- **URL**: https://akemisflow-git-dev.vercel.app
- **Database**: $DEV_PROJECT_ID (Supabase)
- **Supabase Dashboard**: https://supabase.com/dashboard/project/$DEV_PROJECT_ID
- **Admin**: philb75@gmail.com / Philb123$
- **Airwallex**: Demo API (ooSEP1J_RVCyQJCXMZx42g)
- **Status**: ✅ LIVE

## 🔄 Workflow

### Daily Development
\`\`\`bash
# Work on dev branch
git checkout dev
git pull origin dev

# Make changes, then push
git push origin dev
# → Auto-deploys to dev environment
\`\`\`

### Feature Development
\`\`\`bash
# Create feature branch
git checkout -b feature/new-feature
git push origin feature/new-feature
# → Creates automatic preview URL
\`\`\`

### Production Release
\`\`\`bash
# Merge to production
git checkout master  
git merge dev
git push origin master
# → Deploys to production
\`\`\`

## 🏥 Health Check

Test both environments:
\`\`\`bash
curl https://akemisflow.vercel.app/api/health
curl https://akemisflow-git-dev.vercel.app/api/health
\`\`\`

---
Setup completed: $(date)
Both environments are LIVE and independent! ✅
EOF
    
    echo ""
    echo "========================================="
    echo -e "${GREEN}🎉 SETUP COMPLETE!${NC}"
    echo "========================================="
    echo ""
    echo -e "${BLUE}🌐 Your Live Environments:${NC}"
    echo ""
    echo -e "${YELLOW}🏭 Production:${NC}  https://akemisflow.vercel.app"
    echo -e "${YELLOW}🧪 Development:${NC} https://akemisflow-git-dev.vercel.app"
    echo ""
    echo -e "${BLUE}👤 Login (both environments):${NC}"
    echo "   📧 Email: philb75@gmail.com"
    echo "   🔑 Password: Philb123$"
    echo ""
    echo -e "${BLUE}🔧 Next Steps:${NC}"
    echo "1. Test both environments"
    echo "2. Set production Airwallex credentials (when ready)"
    echo "3. Start developing on 'dev' branch"
    echo ""
    echo "📄 See ENVIRONMENT_SUMMARY.md for complete details!"
}

# Run main function
main