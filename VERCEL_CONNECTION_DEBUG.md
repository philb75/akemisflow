# Vercel Database Connection Debug Guide

## Issue
Production deployment shows: "Can't reach database server at `aws-0-eu-west-3.pooler.supabase.com:6543`"

## Debug Endpoints Available

### 1. Test Connection String Structure
Visit: `https://akemisflow-philippe-barthelemys-projects.vercel.app/api/test-connection-string`

This endpoint will show:
- Connection string structure analysis
- Missing components
- Recommendations for fixes
- NO sensitive data is exposed

### 2. Test Database Connection
Visit: `https://akemisflow-philippe-barthelemys-projects.vercel.app/api/test-db`

This endpoint will show:
- Detailed error information
- Environment variable status
- Connection attempt results

### 3. Test Supabase Client
Visit: `https://akemisflow-philippe-barthelemys-projects.vercel.app/api/test-supabase`

This endpoint will test:
- Supabase client connection
- Different connection method than Prisma

## Based on Your Test Results

Your test showed `dbUrlLength: 144` which indicates the DATABASE_URL might be incomplete.

### Complete Connection String Format

**DATABASE_URL** should be exactly like this (with your password):
```
postgresql://postgres.wflcaapznpczlxjaeyfd:Philb921056$@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

This should be approximately 170-180 characters long, not 144.

**DIRECT_URL** should be:
```
postgresql://postgres.wflcaapznpczlxjaeyfd:Philb921056$@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require
```

## Possible Issues

### 1. Truncated Environment Variable
The connection string might be getting truncated. In Vercel:
1. Go to Settings → Environment Variables
2. Edit DATABASE_URL
3. Make sure the ENTIRE string is pasted including the query parameters
4. The value should end with `&sslmode=require`

### 2. Password Special Characters
If your password contains `$`, it might need escaping in some contexts:
- Try replacing `$` with `%24` in the password part

### 3. Missing Query Parameters
The connection string MUST include:
- `?pgbouncer=true`
- `&connection_limit=1`
- `&sslmode=require`

## Action Steps

1. **First**: Visit `/api/test-connection-string` to see what's missing
2. **Then**: Update the DATABASE_URL in Vercel with the complete string
3. **Verify**: The string ends with `?pgbouncer=true&connection_limit=1&sslmode=require`
4. **Redeploy**: Trigger a new deployment
5. **Test**: Visit the test endpoints again

## If Still Failing

1. Try using the direct connection (not pooler):
   ```
   postgresql://postgres:Philb921056$@db.wflcaapznpczlxjaeyfd.supabase.co:5432/postgres
   ```

2. Check Supabase dashboard:
   - Is the project active (not paused)?
   - Are there any connection limits reached?

3. Try password URL encoding:
   Replace `Philb921056$` with `Philb921056%24`

## Vercel Function Logs

To see detailed errors:
1. Go to Vercel Dashboard
2. Click Functions tab
3. Find the failing function
4. Check logs for exact error messages