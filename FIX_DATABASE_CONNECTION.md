# Fix Database Connection Error in Production

## Issue
The error "Can't reach database server at `aws-0-eu-west-3.pooler.supabase.com:6543`" indicates that the production deployment cannot connect to the Supabase database.

## Root Cause
The DATABASE_URL environment variable is missing or incorrectly configured in Vercel.

## Solution

### 1. Add Database URLs to Vercel

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Add these variables for the **Production** environment:

```env
DATABASE_URL="postgresql://postgres.wflcaapznpczlxjaeyfd:JqQKoxNn1HMm4cThe@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

DIRECT_URL="postgresql://postgres.wflcaapznpczlxjaeyfd:JqQKoxNn1HMm4cThe@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
```

### 2. Verify All Required Variables

Ensure these are also set in Vercel:

- ✅ `NEXTAUTH_SECRET` (should already be set)
- ✅ `NEXTAUTH_URL` (should already be set)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` (should already be set)
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (should already be set)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (should already be set)
- ✅ `AIRWALLEX_CLIENT_ID` (you just added this)
- ✅ `AIRWALLEX_API_KEY` (you just added this)
- ❌ `DATABASE_URL` (MISSING - needs to be added)
- ❌ `DIRECT_URL` (MISSING - needs to be added)

### 3. Redeploy

After adding the DATABASE_URL and DIRECT_URL:
1. Go to your project's Deployments tab
2. Click on the three dots menu on the latest deployment
3. Select "Redeploy"
4. Or trigger a new deployment by pushing a commit

### 4. Test

Once redeployed, test the sync functionality again. It should now work properly.

## Why This Happened

When deploying to Vercel, you need to manually add all environment variables through their dashboard. The `.env.production.local` file is only for local reference and is not uploaded to Vercel (for security reasons).

## Security Note

The database connection strings contain passwords. Make sure:
- Never commit these to Git
- Only add them through Vercel's secure environment variables interface
- Consider rotating the database password periodically