# Prisma Connection Fix for Vercel

## Issue Summary
- ✅ Supabase client connects successfully
- ❌ Prisma fails to connect through PgBouncer (port 6543)
- The issue is specific to Prisma + PgBouncer combination

## Temporary Solution

Since Supabase client works, we know the credentials are correct. The issue is with Prisma connecting through PgBouncer.

### Option 1: Use Direct Connection (Recommended for now)
In Vercel, temporarily set DATABASE_URL to use the direct connection:

```
DATABASE_URL=postgresql://postgres.wflcaapznpczlxjaeyfd:Philb921056$@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require
```

Note: This uses port 5432 (direct) instead of 6543 (pooled).

### Option 2: Try Alternative Host
Sometimes the AWS pooler subdomain has issues. Try:

```
DATABASE_URL=postgresql://postgres.wflcaapznpczlxjaeyfd:Philb921056$@db.wflcaapznpczlxjaeyfd.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

### Option 3: Force Direct Connection in Code
If you can't change environment variables, we can modify the Prisma client initialization:

```typescript
// In src/lib/db.ts
const dbUrl = process.env.DATABASE_URL?.includes(':6543') 
  ? process.env.DIRECT_URL 
  : process.env.DATABASE_URL;

export const prisma = new PrismaClient({
  datasourceUrl: dbUrl,
  ...prismaClientOptions
});
```

## Test Endpoint
After deploying, test which connections work:
```
https://akemisflow-philippe-barthelemys-projects.vercel.app/api/test-direct-connection
```

## Long-term Solution
1. Contact Supabase support about PgBouncer connectivity issues
2. They may need to reset the pooler or check regional availability
3. Share the error: "Prisma can't connect through PgBouncer but Supabase client works"

## Why This Happens
- PgBouncer acts as a connection pooler between your app and PostgreSQL
- Sometimes PgBouncer has stricter connection requirements or network issues
- Direct connections bypass PgBouncer and connect straight to PostgreSQL
- Supabase client uses different connection methods that may be more resilient