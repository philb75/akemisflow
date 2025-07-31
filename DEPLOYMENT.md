# AkemisFlow Deployment Guide

## Development Workflow

### 1. Local Development Setup
```bash
# Clone repository
git clone https://github.com/philb75/akemisflow.git
cd akemisflow

# Install dependencies
npm install

# Start Docker services
docker-compose up -d

# Set up local database
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

### 2. Making Changes

#### Code Changes
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Test locally
4. Commit with descriptive messages

#### Database Changes
1. Modify `prisma/schema.prisma`
2. Create migration: `npm run db:migration:create descriptive_name`
3. Apply locally: `npm run db:migrate`
4. Test thoroughly

### 3. Deployment Process

#### Automatic Deployment (Code)
```bash
git push origin master
```
- GitHub webhook triggers Vercel
- Vercel builds and deploys
- New code is live in ~2-3 minutes

#### Manual Deployment (Database)
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