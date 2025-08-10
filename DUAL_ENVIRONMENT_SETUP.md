# 🚀 Dual Environment Setup Guide

## Overview

This guide sets up **two active environments** simultaneously:

| Environment | Branch | URL | Database | Airwallex |
|-------------|--------|-----|----------|-----------|
| **Production** | `master` | `akemisflow.vercel.app` | Prod Supabase | Production API |
| **Development** | `dev` | `akemisflow-git-dev.vercel.app` | Dev Supabase | Test API |

Both environments will be live and independently accessible.

## Step 1: Create Two Supabase Projects

### Production Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project:
   - **Name**: `akemisflow-prod`
   - **Password**: Generate strong password (save it!)
   - **Region**: Choose closest to users
   - **Plan**: Free tier (upgrade later)

### Development Supabase Project  
1. Create another project:
   - **Name**: `akemisflow-dev` 
   - **Password**: Generate different password
   - **Region**: Same as production
   - **Plan**: Free tier

### Collect Credentials

For **EACH** project, go to Settings → API and collect:
- Project URL (e.g., `https://xxxxx.supabase.co`)
- Anon/Public key
- Service Role key
- Database password

## Step 2: Configure Vercel Environment Variables

### Login and Link Project
```bash
# Login to Vercel
vercel login

# Link to existing project
vercel link
# Choose: Link to existing project
# Select: akemisflow
```

### Set Production Environment Variables (master branch)
```bash
# Production Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter: https://your-prod-project.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Enter: your-prod-anon-key

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter: your-prod-service-key

vercel env add DATABASE_URL production
# Enter: postgresql://postgres:PROD_PASSWORD@db.your-prod-project.supabase.co:5432/postgres

# Production NextAuth
vercel env add NEXTAUTH_URL production
# Enter: https://akemisflow.vercel.app

vercel env add NEXTAUTH_SECRET production
# Enter: $(openssl rand -base64 32)

# Production Airwallex (when ready)
vercel env add AIRWALLEX_CLIENT_ID production
# Enter: your-real-client-id

vercel env add AIRWALLEX_API_KEY production  
# Enter: your-real-api-key

vercel env add AIRWALLEX_BASE_URL production
# Enter: https://api.airwallex.com

# Environment flags
echo "production" | vercel env add NODE_ENV production --yes
echo "production" | vercel env add AKEMIS_ENV production --yes
```

### Set Preview Environment Variables (dev branch + features)
```bash
# Development Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# Enter: https://your-dev-project.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
# Enter: your-dev-anon-key

vercel env add SUPABASE_SERVICE_ROLE_KEY preview
# Enter: your-dev-service-key

vercel env add DATABASE_URL preview
# Enter: postgresql://postgres:DEV_PASSWORD@db.your-dev-project.supabase.co:5432/postgres

# Development NextAuth
vercel env add NEXTAUTH_URL preview
# Enter: https://akemisflow-git-dev.vercel.app

vercel env add NEXTAUTH_SECRET preview
# Enter: $(openssl rand -base64 32)

# Test Airwallex credentials
echo "ooSEP1J_RVCyQJCXMZx42g" | vercel env add AIRWALLEX_CLIENT_ID preview --yes
echo "894d904d7c01237087c5b9b458003bfb8393e7b9638a1bf64c80bb6dc1b9df399d45c3a29e4eb6230592912c6bd489bb" | vercel env add AIRWALLEX_API_KEY preview --yes
echo "https://api-demo.airwallex.com" | vercel env add AIRWALLEX_BASE_URL preview --yes

# Environment flags
echo "development" | vercel env add NODE_ENV preview --yes
echo "development" | vercel env add AKEMIS_ENV preview --yes
```

## Step 3: Setup Database Schemas

### Production Database Setup
```bash
# Set production environment variables locally
export NEXT_PUBLIC_SUPABASE_URL="https://your-prod-project.supabase.co"
export DATABASE_URL="postgresql://postgres:PROD_PASSWORD@db.your-prod-project.supabase.co:5432/postgres"

# Push schema to production database
pnpm prisma db push

# Create production admin user
node create-admin.js

# Verify
echo "✅ Production database ready"
```

### Development Database Setup  
```bash
# Set development environment variables locally
export NEXT_PUBLIC_SUPABASE_URL="https://your-dev-project.supabase.co"
export DATABASE_URL="postgresql://postgres:DEV_PASSWORD@db.your-dev-project.supabase.co:5432/postgres"

# Push schema to development database
pnpm prisma db push

# Create development admin user
node create-admin.js

# Verify
echo "✅ Development database ready"
```

## Step 4: Deploy Both Branches

### Deploy Production (master branch)
```bash
# Ensure you're on master
git checkout master

# Push to trigger production deployment
git push origin master

# Verify deployment
vercel ls | grep master
```

### Deploy Development (dev branch)
```bash
# Switch to dev branch
git checkout dev

# Merge latest changes from master
git merge master

# Push to trigger dev deployment  
git push origin dev

# Verify deployment
vercel ls | grep dev
```

## Step 5: Configure Custom Domains (Optional)

### Production Domain
1. In Vercel Dashboard → akemisflow project → Settings → Domains
2. Add: `akemisflow.yourdomain.com`
3. Follow DNS configuration instructions

### Development Domain  
1. Add: `dev.akemisflow.yourdomain.com`
2. Configure to point to dev branch deployment

## Step 6: Verify Both Environments

### Test Production Environment
1. Visit: `https://akemisflow.vercel.app`
2. Login: philb75@gmail.com / Philb123$
3. Check: Production database connected
4. Verify: Real Airwallex API (when configured)

### Test Development Environment
1. Visit: `https://akemisflow-git-dev.vercel.app` 
2. Login: philb75@gmail.com / Philb123$
3. Check: Development database connected
4. Verify: Test Airwallex API working
5. Test: Contractor sync with demo data

## Environment URLs Summary

| Environment | Branch | URL Pattern | Database |
|-------------|--------|-------------|----------|
| **Production** | `master` | `akemisflow.vercel.app` | Prod Supabase |
| **Development** | `dev` | `akemisflow-git-dev-[team].vercel.app` | Dev Supabase |
| **Feature Branch** | `feature/name` | `akemisflow-git-feature-name-[team].vercel.app` | Dev Supabase |

## Daily Workflow

### Development Work
```bash
# Work on dev branch
git checkout dev
git pull origin dev

# Make changes
# Test locally: pnpm dev

# Push to dev environment
git push origin dev
# → Deploys to: akemisflow-git-dev.vercel.app
```

### Feature Development
```bash
# Create feature from dev
git checkout dev
git checkout -b feature/new-feature

# Push feature branch
git push origin feature/new-feature
# → Creates preview URL automatically
```

### Production Release
```bash
# Merge tested dev to master
git checkout master
git merge dev
git push origin master
# → Deploys to: akemisflow.vercel.app
```

## Monitoring Both Environments

### Vercel Dashboard
- Production deployments: Filter by "master" 
- Development deployments: Filter by "dev"
- Feature previews: All other branches

### Supabase Monitoring
- **Production**: Monitor usage, performance, backups
- **Development**: Monitor for testing, reset data as needed

### Environment Health Checks
```bash
# Check production
curl https://akemisflow.vercel.app/api/health

# Check development  
curl https://akemisflow-git-dev.vercel.app/api/health
```

## Data Management

### Production Data
- **Real customer data** - Handle with care
- **Regular backups** via Supabase
- **Monitor usage** against free tier limits

### Development Data
- **Test data only** - Safe to reset
- **Sync from production** occasionally (anonymized)
- **Reset when needed** for clean testing

## Cost Optimization

### Free Tier Limits
- **Vercel**: 100GB bandwidth per month
- **Supabase**: 500MB database + 1GB storage per project

### Tips
- Use dev environment for all testing
- Clean up old preview deployments
- Monitor usage dashboards
- Upgrade production when needed

## Security Best Practices

1. **Different API keys** per environment
2. **Separate database credentials** 
3. **Environment-specific secrets**
4. **No production data in dev**
5. **Regular key rotation**

## Troubleshooting

### Environment Variable Issues
```bash
# List all environment variables
vercel env ls

# Check specific deployment
vercel inspect [deployment-url]
```

### Database Connection Issues
```bash
# Test production connection
DATABASE_URL="prod-url" node scripts/test-db.js

# Test development connection  
DATABASE_URL="dev-url" node scripts/test-db.js
```

### Branch Deployment Issues
```bash
# Force redeploy
vercel --force

# Check build logs
vercel logs [deployment-url] --scope=build
```

---

## Quick Reference Commands

| Action | Command |
|--------|---------|
| Deploy to production | `git push origin master` |
| Deploy to development | `git push origin dev` |  
| Create feature preview | `git push origin feature/name` |
| View all deployments | `vercel ls` |
| Check environment vars | `vercel env ls` |
| View production logs | `vercel logs akemisflow.vercel.app` |
| View dev logs | `vercel logs akemisflow-git-dev.vercel.app` |

Both environments are now completely independent and can run simultaneously! 🚀