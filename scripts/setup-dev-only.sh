#!/bin/bash

echo "🚀 Development Environment Setup"
echo "==============================="
echo ""
echo "Setting up DEV environment while keeping existing PROD setup intact"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Development Supabase Credentials Collection${NC}"
echo "============================================="
echo ""
echo "From your NEW 'AkemisFlow DEV' project:"
echo "Go to Settings > API and collect:"
echo ""

read -p "Development Project URL (https://xxxxx.supabase.co): " DEV_SUPABASE_URL
read -p "Development Anon/Public Key: " DEV_SUPABASE_ANON_KEY  
read -p "Development Service Role Key: " DEV_SUPABASE_SERVICE_KEY

# We know the password
DEV_DB_PASSWORD="Philb123$"

# Extract project ID
DEV_PROJECT_ID=$(echo $DEV_SUPABASE_URL | sed -n 's/https:\/\/\(.*\)\.supabase\.co/\1/p')
DEV_DATABASE_URL="postgresql://postgres:$DEV_DB_PASSWORD@db.$DEV_PROJECT_ID.supabase.co:5432/postgres"

echo ""
echo -e "${GREEN}✅ Development credentials collected${NC}"
echo "Project ID: $DEV_PROJECT_ID"

# Generate dev NextAuth secret
DEV_NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo ""
echo -e "${BLUE}⚙️ Setting up Vercel Preview Environment Variables${NC}"
echo "=================================================="

# Link to existing Vercel project (should already be linked)
vercel link --yes

echo "Setting up preview environment variables (dev + feature branches)..."

# Preview environment variables (dev + features)
echo "$DEV_SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview --yes
echo "$DEV_SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview --yes
echo "$DEV_SUPABASE_SERVICE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY preview --yes
echo "$DEV_DATABASE_URL" | vercel env add DATABASE_URL preview --yes
echo "https://akemisflow-git-dev.vercel.app" | vercel env add NEXTAUTH_URL preview --yes
echo "$DEV_NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET preview --yes

# Environment flags
echo "development" | vercel env add NODE_ENV preview --yes
echo "development" | vercel env add AKEMIS_ENV preview --yes
echo "supabase" | vercel env add STORAGE_TYPE preview --yes
echo "/uploads" | vercel env add NEXT_PUBLIC_UPLOAD_PATH preview --yes

# Test Airwallex credentials for dev
echo "ooSEP1J_RVCyQJCXMZx42g" | vercel env add AIRWALLEX_CLIENT_ID preview --yes
echo "894d904d7c01237087c5b9b458003bfb8393e7b9638a1bf64c80bb6dc1b9df399d45c3a29e4eb6230592912c6bd489bb" | vercel env add AIRWALLEX_API_KEY preview --yes
echo "https://api-demo.airwallex.com" | vercel env add AIRWALLEX_BASE_URL preview --yes

echo -e "${GREEN}✅ Preview environment variables configured${NC}"

echo ""
echo -e "${BLUE}🗄️ Setting up Development Database${NC}"
echo "=================================="

# Set development environment locally
export DATABASE_URL="$DEV_DATABASE_URL"
export NEXT_PUBLIC_SUPABASE_URL="$DEV_SUPABASE_URL"

echo "Pushing Prisma schema to development database..."
pnpm prisma db push --accept-data-loss

echo "Creating development admin user..."
node create-admin.js

echo -e "${GREEN}✅ Development database ready${NC}"

echo ""
echo -e "${BLUE}🚀 Deploying Development Branch${NC}"
echo "================================"

# Switch to dev branch and merge latest from master
git checkout dev
git merge master --no-edit

# Push to trigger dev deployment
echo "Pushing dev branch to trigger deployment..."
git push origin dev

echo -e "${GREEN}✅ Development branch deployed${NC}"

# Create summary
cat > DEV_ENVIRONMENT_SUMMARY.md << EOF
# 🧪 Development Environment - LIVE!

## ✅ Development Environment Active

### 🧪 Development Environment Details
- **Branch**: \`dev\`
- **URL**: https://akemisflow-git-dev.vercel.app
- **Database**: $DEV_PROJECT_ID (Supabase)
- **Database Password**: Philb123$
- **Supabase Dashboard**: https://supabase.com/dashboard/project/$DEV_PROJECT_ID
- **Admin**: philb75@gmail.com / Philb123$
- **Status**: ✅ LIVE

### 🧪 Test Airwallex Configuration
- **Client ID**: ooSEP1J_RVCyQJCXMZx42g
- **API Base**: https://api-demo.airwallex.com
- **Environment**: Demo/Test (safe for testing)

### 🏭 Production Environment (Unchanged)
- **Branch**: \`master\`
- **URL**: https://akemisflow.vercel.app
- **Status**: ✅ Unchanged (still using existing setup)

## 🔄 Development Workflow

### Work on Development
\`\`\`bash
git checkout dev
git pull origin dev
# Make changes
git push origin dev
# → Auto-deploys to: https://akemisflow-git-dev.vercel.app
\`\`\`

### Create Feature Previews
\`\`\`bash
git checkout dev
git checkout -b feature/new-feature
git push origin feature/new-feature
# → Creates preview URL automatically
\`\`\`

### Test Development Environment
\`\`\`bash
# Health check
curl https://akemisflow-git-dev.vercel.app/api/health

# Login and test
# URL: https://akemisflow-git-dev.vercel.app
# Email: philb75@gmail.com
# Password: Philb123$
\`\`\`

## 🎯 Next Steps

1. **Test Development Environment**
   - Visit: https://akemisflow-git-dev.vercel.app
   - Login with admin credentials
   - Test Airwallex sync (demo mode)

2. **Team Development**
   - Use \`dev\` branch for all development work
   - Create feature branches from \`dev\`
   - Test in dev environment before merging to master

3. **Production Releases**
   - Test thoroughly in dev environment
   - Merge \`dev\` → \`master\` for production deployment

---
Development setup completed: $(date)
Development environment is LIVE! ✅

**Production**: Unchanged, still using existing setup
**Development**: New isolated environment with test data
EOF

echo ""
echo "================================================="
echo -e "${GREEN}🎉 DEVELOPMENT ENVIRONMENT READY!${NC}"
echo "================================================="
echo ""
echo -e "${BLUE}🌐 Your Development Environment:${NC}"
echo -e "${YELLOW}🧪 Development:${NC} https://akemisflow-git-dev.vercel.app"
echo ""
echo -e "${BLUE}👤 Login credentials:${NC}"
echo "   📧 Email: philb75@gmail.com"
echo "   🔑 Password: Philb123$"
echo ""
echo -e "${BLUE}🔧 Test Airwallex (Demo Mode):${NC}"
echo "   🆔 Client ID: ooSEP1J_RVCyQJCXMZx42g"
echo "   🌍 Environment: Demo/Test (safe)"
echo ""
echo -e "${BLUE}✅ Status:${NC}"
echo "   🏭 Production: Unchanged (existing setup)"
echo "   🧪 Development: New isolated environment"
echo ""
echo "📄 See DEV_ENVIRONMENT_SUMMARY.md for complete details!"