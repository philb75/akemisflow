# AkemisFlow Deployment Guide

This guide covers deploying AkemisFlow to production using Supabase (database) and Vercel (hosting).

## Prerequisites

- GitHub account with repository access
- Supabase account and project
- Vercel account
- Local development environment working

## Environment Setup

### 1. Local Development (Docker)

Your local environment uses Docker PostgreSQL and is configured in `.env.local`:
```env
DATABASE_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"
DIRECT_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"
```

### 2. Production Environment (Supabase)

Create `.env.production.local` (DO NOT COMMIT) with your actual values:
```env
# Get these from Supabase dashboard > Settings > Database
DATABASE_URL="postgresql://postgres.wflcaapznpczlxjaeyfd:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.wflcaapznpczlxjaeyfd:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"

# Generate a secure secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret"

# Your Vercel app URL
NEXTAUTH_URL="https://your-app.vercel.app"

# From Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL="https://wflcaapznpczlxjaeyfd.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

NODE_ENV="production"
```

## Deployment Steps

### Step 1: Prepare Database (Supabase)

1. Get your database password from Supabase:
   - Go to Settings > Database
   - Copy the password (you may need to reset it)

2. Deploy database schema:
   ```bash
   # Run the deployment script
   ./scripts/deploy-to-supabase.sh
   ```

   Or manually:
   ```bash
   # Load production environment
   export $(cat .env.production.local | grep -v '^#' | xargs)
   
   # Push schema to Supabase
   pnpm prisma db push
   ```

### Step 2: Deploy to GitHub

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin master
   ```

### Step 3: Deploy to Vercel

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Link to existing project or create new
   - Select the repository
   - Use default settings

### Step 4: Configure Vercel Environment Variables

1. Go to Vercel Dashboard > Your Project > Settings > Environment Variables

2. Add ALL these variables for Production environment:
   - `DATABASE_URL` - Supabase pooled connection string
   - `DIRECT_URL` - Supabase direct connection string
   - `NEXTAUTH_SECRET` - Your generated secret
   - `NEXTAUTH_URL` - https://your-app.vercel.app
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key
   - `NODE_ENV` - production

3. Redeploy to apply environment variables:
   ```bash
   vercel --prod
   ```

## Post-Deployment

### Create Admin User

After deployment, create your first admin user:

1. Visit https://your-app.vercel.app/auth/signup
2. Create an account
3. Access Supabase SQL editor and run:
   ```sql
   UPDATE users 
   SET role = 'ADMINISTRATOR' 
   WHERE email = 'your-email@example.com';
   ```

### Verify Deployment

1. Check application: https://your-app.vercel.app
2. Try signing in with your admin account
3. Test key features:
   - User management
   - Bank accounts
   - Contractors
   - File uploads

## Troubleshooting

### Database Connection Issues

If you see "Database Unavailable":
1. Check Supabase dashboard - database might be paused
2. Verify DATABASE_URL in Vercel environment variables
3. Ensure connection pooling is enabled (pgbouncer=true)

### Authentication Issues

If sign-in fails:
1. Verify NEXTAUTH_SECRET is set correctly
2. Check NEXTAUTH_URL matches your Vercel URL
3. Ensure database has auth tables (run schema push)

### File Upload Issues

Uploaded files are stored in Vercel's temporary storage. For production, consider:
1. Using Supabase Storage
2. Integrating with AWS S3
3. Using Cloudinary or similar service

## Maintenance

### Update Schema

When you change the Prisma schema:
```bash
# Local development
pnpm prisma db push

# Production
./scripts/deploy-to-supabase.sh
```

### Monitor Application

1. Vercel Dashboard - Check deployments and logs
2. Supabase Dashboard - Monitor database usage
3. Set up error tracking (e.g., Sentry) for production

## Security Notes

- Never commit `.env.local` or `.env.production.local`
- Rotate NEXTAUTH_SECRET periodically
- Use strong database passwords
- Enable RLS (Row Level Security) in Supabase for additional security
- Regular backups of production database