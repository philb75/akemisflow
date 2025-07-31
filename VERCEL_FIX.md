# URGENT: Vercel Environment Variable Fix

## The Problem
Your DATABASE_URL is missing `&sslmode=require` at the end. This is REQUIRED by Supabase.

## Current vs Required

### Current DATABASE_URL (144 characters):
```
postgresql://postgres.wflcaapznpczlxjaeyfd:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### REQUIRED DATABASE_URL (add `&sslmode=require`):
```
postgresql://postgres.wflcaapznpczlxjaeyfd:Philb921056$@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

### REQUIRED DIRECT_URL (add `?sslmode=require`):
```
postgresql://postgres.wflcaapznpczlxjaeyfd:Philb921056$@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require
```

## Fix Steps

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Edit DATABASE_URL
3. Add `&sslmode=require` to the end
4. Edit DIRECT_URL  
5. Add `?sslmode=require` to the end
6. Save and redeploy

## Why This Matters
Supabase REQUIRES SSL connections. Without `sslmode=require`, the connection is rejected.

## After Fixing
Visit: https://akemisflow-philippe-barthelemys-projects.vercel.app/api/test-db

You should see a successful connection!