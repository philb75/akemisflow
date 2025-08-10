# ✅ Dual Environment Setup Checklist

## Prerequisites ✅
- [x] Vercel CLI installed (`/Users/philippebarthelemy/.local/bin/vercel`)
- [x] OpenSSL available (`/opt/homebrew/bin/openssl`)
- [x] Changes committed to master branch
- [x] Dev branch exists and ready

## Step 1: Create Supabase Projects 🗄️

### Production Project
- [ ] Go to https://supabase.com/dashboard
- [ ] Click "New Project"
- [ ] Name: `akemisflow-prod`
- [ ] Generate strong database password → **Save it!**
- [ ] Choose region closest to you
- [ ] Wait for provisioning (~2 minutes)

### Development Project  
- [ ] Create second project
- [ ] Name: `akemisflow-dev`
- [ ] Generate different database password → **Save it!**
- [ ] Same region as production
- [ ] Wait for provisioning

### Collect Credentials
For **EACH** project, go to Settings → API and note down:

**Production Project:**
- [ ] Project URL: `https://______.supabase.co`
- [ ] Anon/Public key: `eyJ...`  
- [ ] Service Role key: `eyJ...`
- [ ] Database password: `[saved above]`

**Development Project:**
- [ ] Project URL: `https://______.supabase.co`
- [ ] Anon/Public key: `eyJ...`
- [ ] Service Role key: `eyJ...`  
- [ ] Database password: `[saved above]`

## Step 2: Link Vercel Project 🔗

```bash
# Login to Vercel (choose GitHub)
vercel login

# Link to existing project
vercel link
```

When prompted:
- [ ] Choose: "Link to existing project"
- [ ] Select: `akemisflow`
- [ ] Confirm linking

## Step 3: Set Production Environment Variables 🏭

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
# Enter: [generate with: openssl rand -base64 32]
```

**Checkboxes:**
- [ ] NEXT_PUBLIC_SUPABASE_URL (production)
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY (production)  
- [ ] SUPABASE_SERVICE_ROLE_KEY (production)
- [ ] DATABASE_URL (production)
- [ ] NEXTAUTH_URL (production)
- [ ] NEXTAUTH_SECRET (production)

## Step 4: Set Preview Environment Variables 🧪

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
# Enter: [generate different secret: openssl rand -base64 32]
```

**Checkboxes:**
- [ ] NEXT_PUBLIC_SUPABASE_URL (preview)
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY (preview)
- [ ] SUPABASE_SERVICE_ROLE_KEY (preview)  
- [ ] DATABASE_URL (preview)
- [ ] NEXTAUTH_URL (preview)
- [ ] NEXTAUTH_SECRET (preview)

## Step 5: Set Test Airwallex Credentials 💳

```bash
# Test credentials for preview environment
echo "ooSEP1J_RVCyQJCXMZx42g" | vercel env add AIRWALLEX_CLIENT_ID preview --yes
echo "894d904d7c01237087c5b9b458003bfb8393e7b9638a1bf64c80bb6dc1b9df399d45c3a29e4eb6230592912c6bd489bb" | vercel env add AIRWALLEX_API_KEY preview --yes  
echo "https://api-demo.airwallex.com" | vercel env add AIRWALLEX_BASE_URL preview --yes
```

**Checkboxes:**
- [ ] AIRWALLEX_CLIENT_ID (preview)
- [ ] AIRWALLEX_API_KEY (preview)
- [ ] AIRWALLEX_BASE_URL (preview)

## Step 6: Set Environment Flags 🏷️

```bash
# Production flags
echo "production" | vercel env add NODE_ENV production --yes
echo "production" | vercel env add AKEMIS_ENV production --yes  
echo "supabase" | vercel env add STORAGE_TYPE production --yes

# Preview flags  
echo "development" | vercel env add NODE_ENV preview --yes
echo "development" | vercel env add AKEMIS_ENV preview --yes
echo "supabase" | vercel env add STORAGE_TYPE preview --yes
```

**Checkboxes:**
- [ ] NODE_ENV (production)
- [ ] AKEMIS_ENV (production) 
- [ ] STORAGE_TYPE (production)
- [ ] NODE_ENV (preview)
- [ ] AKEMIS_ENV (preview)
- [ ] STORAGE_TYPE (preview)

## Step 7: Setup Production Database 🗄️

```bash
# Set production environment locally
export DATABASE_URL="postgresql://postgres:PROD_PASSWORD@db.your-prod-project.supabase.co:5432/postgres"
export NEXT_PUBLIC_SUPABASE_URL="https://your-prod-project.supabase.co"

# Push schema to production  
pnpm prisma db push

# Create admin user
node create-admin.js
```

**Checkboxes:**
- [ ] Production schema deployed
- [ ] Production admin user created
- [ ] Test login works

## Step 8: Setup Development Database 🧪

```bash
# Set development environment locally  
export DATABASE_URL="postgresql://postgres:DEV_PASSWORD@db.your-dev-project.supabase.co:5432/postgres"
export NEXT_PUBLIC_SUPABASE_URL="https://your-dev-project.supabase.co"

# Push schema to development
pnpm prisma db push  

# Create admin user
node create-admin.js
```

**Checkboxes:**
- [ ] Development schema deployed
- [ ] Development admin user created  
- [ ] Test login works

## Step 9: Deploy Production (Master) 🏭

```bash
# Ensure on master branch
git checkout master

# Push to trigger deployment
git push origin master

# Verify deployment  
vercel ls | grep master
```

**Checkboxes:**
- [ ] Master branch pushed
- [ ] Production deployment successful
- [ ] Production URL accessible: https://akemisflow.vercel.app

## Step 10: Deploy Development (Dev) 🧪

```bash
# Switch to dev branch
git checkout dev

# Merge latest from master  
git merge master

# Push to trigger deployment
git push origin dev

# Verify deployment
vercel ls | grep dev
```

**Checkboxes:**
- [ ] Dev branch updated with master
- [ ] Dev branch pushed
- [ ] Development deployment successful  
- [ ] Development URL accessible: https://akemisflow-git-dev.vercel.app

## Final Verification ✅

### Test Production Environment
- [ ] Visit: https://akemisflow.vercel.app
- [ ] Login: philb75@gmail.com / Philb123$
- [ ] Navigate to dashboard
- [ ] Check database connectivity
- [ ] Verify it's using production Supabase

### Test Development Environment  
- [ ] Visit: https://akemisflow-git-dev.vercel.app
- [ ] Login: philb75@gmail.com / Philb123$
- [ ] Navigate to contractors page
- [ ] Test Airwallex sync (should use demo API)
- [ ] Verify it's using development Supabase

### Environment Variables Check
```bash
# List all environment variables
vercel env ls

# Should show variables for both production and preview
```

- [ ] All production variables present
- [ ] All preview variables present
- [ ] No missing environment variables

## Success! 🎉

### Your Live Environments:

| Environment | Branch | URL | Database | Status |
|-------------|--------|-----|----------|--------|
| **Production** | `master` | https://akemisflow.vercel.app | Prod Supabase | [ ] Live |
| **Development** | `dev` | https://akemisflow-git-dev.vercel.app | Dev Supabase | [ ] Live |

### Daily Workflow:
1. **Development**: Work on `dev` branch → auto-deploy to dev environment
2. **Features**: Create `feature/name` → auto-preview URLs  
3. **Production**: Merge `dev` → `master` → production deployment

### Next Steps:
- [ ] Set up production Airwallex credentials (when ready)
- [ ] Configure custom domains (optional)
- [ ] Set up monitoring and alerts
- [ ] Document team workflow

---

**Estimated Setup Time**: 15-20 minutes  
**Environments**: Independent and fully functional ✅