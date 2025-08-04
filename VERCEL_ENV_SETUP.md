# Vercel Environment Variables Setup

## 🚨 CRITICAL: Your app is deployed but showing 404 because environment variables are likely missing!

## Required Environment Variables for Vercel

You MUST set these in your Vercel dashboard:

### 1. Go to Vercel Dashboard
1. Visit: https://vercel.com/philb75s-projects/akemisflow/settings/environment-variables
2. Or navigate: Vercel Dashboard → Your Project → Settings → Environment Variables

### 2. Add These Variables (REQUIRED)

#### Database Configuration
```
DATABASE_URL = postgresql://postgres.[YOUR-PROJECT-ID]:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL = postgresql://postgres.[YOUR-PROJECT-ID]:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

Get these from Supabase:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → Database
4. Copy the connection strings

#### Authentication (CRITICAL)
```
NEXTAUTH_SECRET = [GENERATE-A-SECRET]
NEXTAUTH_URL = https://wvdi-ph-vercel.vercel.app
```

To generate NEXTAUTH_SECRET, run:
```bash
openssl rand -base64 32
```

#### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL = https://[YOUR-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = [YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY = [YOUR-SERVICE-KEY]
```

Get these from Supabase:
1. Go to Settings → API
2. Copy the URL and keys

### 3. Example Values (Replace with YOUR actual values)

```
DATABASE_URL = postgresql://postgres.wflcaapznpczlxjaeyfd:DEV_DB_2024_akemis!@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

DIRECT_URL = postgresql://postgres.wflcaapznpczlxjaeyfd:DEV_DB_2024_akemis!@aws-0-eu-west-1.pooler.supabase.com:5432/postgres

NEXTAUTH_SECRET = your-generated-secret-here

NEXTAUTH_URL = https://wvdi-ph-vercel.vercel.app

NEXT_PUBLIC_SUPABASE_URL = https://wflcaapznpczlxjaeyfd.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. After Adding Variables

1. **Redeploy**: Click "Redeploy" in Vercel dashboard
2. **Wait**: 2-3 minutes for deployment
3. **Test**: Visit https://wvdi-ph-vercel.vercel.app

## 🔍 Debugging Steps

If still showing 404:

1. **Check Function Logs** in Vercel:
   - Go to Functions tab
   - Look for error messages

2. **Verify Database Connection**:
   - Ensure Supabase database is active
   - Check if password is correct

3. **Check Build Logs**:
   - Look for any build errors
   - Ensure Prisma generated correctly

## 📝 Quick Checklist

- [ ] DATABASE_URL set
- [ ] DIRECT_URL set
- [ ] NEXTAUTH_SECRET set
- [ ] NEXTAUTH_URL set
- [ ] NEXT_PUBLIC_SUPABASE_URL set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set
- [ ] SUPABASE_SERVICE_ROLE_KEY set
- [ ] Redeployed after setting variables
- [ ] Checked Function logs for errors

## 🚀 After Environment Variables are Set

The app should work immediately after redeployment with proper environment variables!