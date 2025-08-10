# 🚀 AkemisFlow Deployment Guide

## Overview

AkemisFlow uses a **branch-based deployment strategy** with Vercel:
- **Production**: `master` branch → Production environment (currently active)
- **Development**: `dev` branch → Preview environment with test data
- **Features**: `feature/*` branches → Automatic preview URLs

## Quick Start

### 1. Initial Setup

```bash
# Run the setup script
./scripts/deploy-dev-branch.sh
```

This script will:
- Create and push a `dev` branch
- Configure Vercel environment variables for each environment
- Set up automatic deployments
- Deploy your first preview

### 2. Environment Structure

```
┌─────────────────────────────────────────┐
│           Vercel Project                 │
│          "akemisflow"                    │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌─────────────┐    │
│  │ Production   │  │ Development │    │
│  │  (master)    │  │   (dev)     │    │
│  └──────────────┘  └─────────────┘    │
│         ↑                ↑             │
│         │                │             │
│  ┌──────────────┐  ┌─────────────┐    │
│  │  Prod DB     │  │   Dev DB    │    │
│  │  (Supabase)  │  │ (Supabase)  │    │
│  └──────────────┘  └─────────────┘    │
└─────────────────────────────────────────┘
```

## Local Development

```bash
# Clone repository
git clone https://github.com/philb75/akemisflow.git
cd akemisflow

# Install dependencies (use pnpm)
pnpm install

# Start Docker services
docker-compose up -d

# Set up local database
pnpm prisma db push
pnpm prisma db seed

# Start development server
pnpm dev
```

## Deployment Process

### Automatic Deployment
```bash
# Option 1: Use migration script
node scripts/deploy-migrations.js

# Option 2: Supabase Dashboard
# 1. Go to SQL Editor
# 2. Paste migration from prisma/migrations/
# 3. Execute
```

### 4. Environment Variables

#### Required in Vercel:
- `DATABASE_URL` - Supabase connection string
- `NEXTAUTH_SECRET` - Authentication secret
- `NEXTAUTH_URL` - https://akemisflow-philippe-barthelemys-projects.vercel.app

#### Optional:
- `AIRWALLEX_CLIENT_ID` - For payment integration
- `AIRWALLEX_API_KEY` - For payment integration
- `AIRWALLEX_BASE_URL` - API endpoint

### 5. Monitoring

#### Build Status
- Vercel Dashboard: Check deployment status
- GitHub: Check commit status

#### Application Health
- `/api/health` - Health check endpoint
- Browser console for client errors
- Vercel Functions logs for API errors

## Troubleshooting

### Build Failures
1. Check Vercel build logs
2. Common issues:
   - Missing dependencies
   - TypeScript errors
   - Environment variables

### Database Issues
1. Verify connection string
2. Check migration status
3. Ensure schema matches code

### Authentication Issues
1. Verify NEXTAUTH_SECRET is set
2. Check user exists in database
3. Verify password hash

## Rollback Procedures

### Code Rollback
1. Revert commit: `git revert <commit-hash>`
2. Push to trigger deployment

### Database Rollback
1. Keep migration down scripts
2. Run manually via SQL Editor
3. Update code to match schema

## Contact
- **Developer**: Philippe Barthelemy
- **Repository**: https://github.com/philb75/akemisflow
- **Production**: https://akemisflow-philippe-barthelemys-projects.vercel.app