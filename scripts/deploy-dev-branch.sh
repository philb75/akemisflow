#!/bin/bash

echo "🚀 AkemisFlow Development Branch Deployment"
echo "==========================================="
echo ""
echo "This sets up a PREVIEW environment on the SAME Vercel project"
echo "using Git branches for environment separation"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Create and push dev branch
setup_git_branch() {
    echo "📦 Step 1: Git Branch Setup"
    echo "---------------------------"
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    echo "Current branch: $CURRENT_BRANCH"
    
    # Create dev branch if it doesn't exist
    if ! git show-ref --verify --quiet refs/heads/dev; then
        echo "Creating 'dev' branch..."
        git checkout -b dev
    else
        echo "Switching to 'dev' branch..."
        git checkout dev
    fi
    
    # Push to GitHub
    echo "Pushing dev branch to GitHub..."
    git push -u origin dev
    
    echo -e "${GREEN}✅ Dev branch ready${NC}"
}

# Step 2: Configure Vercel for branch deployments
setup_vercel_environments() {
    echo ""
    echo "⚙️ Step 2: Vercel Environment Configuration"
    echo "-------------------------------------------"
    
    echo "Configuring Vercel project for branch deployments..."
    
    # Link to existing project (not create new)
    vercel link
    
    echo ""
    echo "Setting environment variables for Preview (dev branch)..."
    echo ""
    
    # Set Preview environment variables (dev branch)
    echo "Setting Supabase Dev credentials..."
    
    # These will apply to preview deployments from 'dev' branch
    vercel env add NEXT_PUBLIC_SUPABASE_URL preview
    vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
    vercel env add SUPABASE_SERVICE_ROLE_KEY preview
    vercel env add DATABASE_URL preview
    
    echo "Setting NextAuth for preview..."
    vercel env add NEXTAUTH_URL preview
    vercel env add NEXTAUTH_SECRET preview
    
    echo "Setting Airwallex test credentials..."
    echo "ooSEP1J_RVCyQJCXMZx42g" | vercel env add AIRWALLEX_CLIENT_ID preview --yes
    echo "894d904d7c01237087c5b9b458003bfb8393e7b9638a1bf64c80bb6dc1b9df399d45c3a29e4eb6230592912c6bd489bb" | vercel env add AIRWALLEX_API_KEY preview --yes
    echo "https://api-demo.airwallex.com" | vercel env add AIRWALLEX_BASE_URL preview --yes
    
    echo "Setting environment type..."
    echo "development" | vercel env add NODE_ENV preview --yes
    echo "development" | vercel env add AKEMIS_ENV preview --yes
    
    echo -e "${GREEN}✅ Environment variables configured${NC}"
}

# Step 3: Configure automatic deployments
configure_auto_deploy() {
    echo ""
    echo "🔄 Step 3: Automatic Deployment Setup"
    echo "--------------------------------------"
    
    cat > vercel.json << 'EOF'
{
  "framework": "nextjs",
  "buildCommand": "pnpm prisma generate && pnpm build",
  "installCommand": "pnpm install",
  "outputDirectory": ".next",
  "git": {
    "deploymentEnabled": {
      "master": true,
      "dev": true
    }
  },
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
EOF
    
    echo -e "${GREEN}✅ Auto-deployment configured for 'dev' branch${NC}"
}

# Step 4: Deploy to preview
deploy_preview() {
    echo ""
    echo "🚀 Step 4: Deploying Preview Environment"
    echo "----------------------------------------"
    
    # Ensure we're on dev branch
    git checkout dev
    
    # Deploy (this creates a preview deployment)
    echo "Deploying dev branch..."
    vercel --no-wait
    
    echo ""
    echo "Getting deployment URL..."
    DEPLOYMENT_URL=$(vercel ls --json | jq -r '.deployments[0].url')
    
    echo -e "${GREEN}✅ Deployed to: https://$DEPLOYMENT_URL${NC}"
}

# Step 5: Create documentation
create_docs() {
    echo ""
    echo "📝 Creating documentation..."
    
    cat > BRANCH_DEPLOYMENT.md << 'EOF'
# Branch-Based Development Environments

## Overview
This project uses Vercel's Preview Deployments for development environments:
- **Production**: `main`/`master` branch → akemisflow.vercel.app
- **Development**: `dev` branch → akemisflow-[hash]-[team].vercel.app
- **Feature Branches**: `feature/*` → automatic preview URLs

## Environment Configuration

### Production Environment (`main` branch)
- Uses production Supabase instance
- Production Airwallex credentials
- Stable URL: akemisflow.vercel.app

### Development Environment (`dev` branch)
- Uses development Supabase instance
- Test Airwallex credentials (demo API)
- Preview URL: Changes per deployment
- Permanent alias: akemisflow-dev.vercel.app (if configured)

### Feature Branches
- Inherits from dev environment settings
- Automatic preview deployments
- URLs: akemisflow-[hash]-[team].vercel.app

## Workflow

### Developing Features
```bash
# Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Vercel creates preview → Check PR for URL
```

### Promoting to Dev
```bash
# Merge feature to dev
git checkout dev
git merge feature/new-feature
git push origin dev

# Automatic deployment to dev environment
```

### Promoting to Production
```bash
# Merge dev to main
git checkout main
git merge dev
git push origin main

# Automatic production deployment
```

## Environment Variables

### Set different values per environment:
```bash
# Production
vercel env add VARIABLE_NAME production

# Preview (dev + feature branches)
vercel env add VARIABLE_NAME preview

# Development (local only)
vercel env add VARIABLE_NAME development
```

## URLs

| Environment | Branch | URL Pattern |
|-------------|--------|-------------|
| Production | main | akemisflow.vercel.app |
| Development | dev | akemisflow-git-dev-[team].vercel.app |
| Feature | feature/* | akemisflow-git-[branch]-[team].vercel.app |

## Benefits

✅ **Single Project**: One Vercel project, multiple environments
✅ **Automatic Deployments**: Push to branch = auto deploy
✅ **Environment Isolation**: Different configs per branch
✅ **PR Previews**: Every PR gets a preview URL
✅ **Cost Efficient**: Single project billing
✅ **Easy Promotion**: Merge branches to promote

## Viewing Deployments

```bash
# List all deployments
vercel ls

# View specific environment
vercel inspect [deployment-url]

# View logs
vercel logs [deployment-url]
```

## Rollback

```bash
# Rollback production
vercel rollback

# Promote specific deployment to production
vercel promote [deployment-url]
```
EOF
    
    echo -e "${GREEN}✅ Documentation created: BRANCH_DEPLOYMENT.md${NC}"
}

# Main execution
main() {
    echo "This script will set up branch-based deployments in your EXISTING Vercel project"
    echo ""
    read -p "Continue? (y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    
    setup_git_branch
    setup_vercel_environments
    configure_auto_deploy
    deploy_preview
    create_docs
    
    echo ""
    echo "========================================="
    echo -e "${GREEN}🎉 Branch deployment configured!${NC}"
    echo "========================================="
    echo ""
    echo "📋 Setup Complete:"
    echo "- Dev branch created and pushed"
    echo "- Preview environment configured"
    echo "- Automatic deployments enabled"
    echo ""
    echo "🔗 Your environments:"
    echo "- Production: Push to 'main' branch"
    echo "- Development: Push to 'dev' branch"
    echo "- Features: Create PR from feature branches"
    echo ""
    echo "Each push to 'dev' creates a preview deployment with test credentials!"
}

# Run
main