# How to Get Correct Database Connection Strings from Supabase

## Steps to Get the Correct URLs:

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project (wflcaapznpczlxjaeyfd)

2. **Navigate to Settings → Database**
   - Click on "Settings" in the left sidebar
   - Click on "Database" section

3. **Find the Connection Strings**
   - Look for "Connection string" section
   - You'll see different connection modes:
     - **Session mode** (for direct connections)
     - **Transaction mode** (for serverless/connection pooling)

4. **Copy the Correct URLs**
   
   For Vercel/Serverless, you need:
   
   **DATABASE_URL** (Transaction mode - Pooler):
   - This will be something like:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   - Make sure to append `?pgbouncer=true` to the end
   
   **DIRECT_URL** (Session mode - Direct):
   - This will be something like:
   ```
   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   ```

## Important Notes:

1. **Password**: The password shown in Supabase dashboard is your database password. It might be different from what you have in your local files.

2. **Connection Pooler**: For serverless environments like Vercel, you MUST use the pooler connection (port 6543) as the main DATABASE_URL.

3. **Direct Connection**: The DIRECT_URL should use the direct connection (port 5432) without the pooler.

## Quick Test:

You can test the connection locally:
```bash
# Test the connection string
psql "postgresql://postgres.wflcaapznpczlxjaeyfd:[YOUR_PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

If this works locally, it should work in Vercel.

## Alternative Solution:

If you're still having issues, you can also try:
1. Reset your database password in Supabase (Settings → Database → Reset database password)
2. Update both connection strings with the new password
3. Redeploy

The connection error suggests either:
- The password is incorrect
- The connection string format is wrong
- The database is paused (check if your Supabase project is active)