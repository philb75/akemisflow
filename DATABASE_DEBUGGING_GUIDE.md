# Database Connection Debugging Guide

## Current Issue
The production deployment is showing: "Can't reach database server at `aws-0-eu-west-3.pooler.supabase.com:6543`"

## Debugging Steps Implemented

### 1. Test Database Connection Route
Created `/api/test-db` route to get detailed error information:
- Visit: `https://your-app.vercel.app/api/test-db`
- This will show:
  - Detailed error codes and messages
  - Environment variable status
  - Database version if connection succeeds

### 2. Prisma Client Generation
Added `postinstall` script to ensure Prisma client is generated during deployment:
```json
"postinstall": "prisma generate"
```

### 3. Enhanced Logging
Updated Prisma client to include error logging in production for better debugging.

## Next Steps to Debug

### 1. Test the Database Connection
After deployment, visit:
```
https://akemisflow-philippe-barthelemys-projects.vercel.app/api/test-db
```

This will return detailed error information.

### 2. Check Vercel Function Logs
1. Go to Vercel Dashboard
2. Click on Functions tab
3. Look for `/api/test-db` or `/api/contractors/sync-airwallex`
4. Check the logs for detailed error messages

### 3. Verify Connection String Format

The correct format should be:

**DATABASE_URL** (Transaction Pooler - Port 6543):
```
postgresql://postgres.wflcaapznpczlxjaeyfd:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**DIRECT_URL** (Session Pooler - Port 5432):
```
postgresql://postgres.wflcaapznpczlxjaeyfd:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require
```

### 4. Common Issues to Check

#### Password Encoding
If your password contains special characters, they must be URL-encoded:
- `$` → `%24`
- `@` → `%40`
- `#` → `%23`
- `!` → `%21`

Example: `Pass$word!` becomes `Pass%24word%21`

#### SSL Mode
Supabase requires SSL. Ensure `?sslmode=require` is in the connection string.

#### Project Status
Check if your Supabase project is active (not paused).

### 5. Test Connection Locally
Test if the connection works from your local machine:

```bash
# Install psql if needed
brew install postgresql

# Test connection
psql "postgresql://postgres.wflcaapznpczlxjaeyfd:[YOUR-PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?sslmode=require"
```

### 6. Alternative Connection Test
Try using the direct Supabase domain instead of AWS pooler:

```
postgresql://postgres:[PASSWORD]@db.wflcaapznpczlxjaeyfd.supabase.co:5432/postgres
```

## Error Code Reference

- **P1001**: Cannot reach database server
- **P1002**: Database server was reached but timed out
- **P1003**: Database does not exist
- **P1008**: Operations timed out
- **P1010**: User was denied access on the database

## What the Test API Will Tell You

The `/api/test-db` endpoint will provide:
1. Specific error code (P1001, P1002, etc.)
2. Whether environment variables are present
3. Detailed error messages from Prisma
4. Database version if connection succeeds

Based on this information, we can determine if the issue is:
- Network connectivity
- Authentication (wrong password)
- SSL/TLS requirements
- Database server status
- Connection string format