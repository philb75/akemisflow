# AkemisFlow Development Workflow
Complete Local Development + Production Migration Guide

## 🏗️ Architecture Overview

### Local Development Stack (Docker)
- **PostgreSQL 15**: Database (mirrors Supabase)
- **PostgREST**: REST API layer (mirrors Supabase API)
- **MinIO**: S3-compatible storage (mirrors Supabase Storage)
- **Redis**: Caching and sessions
- **Next.js**: Application server (mirrors Vercel)
- **pgAdmin**: Database management UI
- **Nginx**: Optional reverse proxy for production-like setup

### Production Stack
- **Vercel**: Application hosting and deployment
- **Supabase**: Database and API services
- **Supabase Storage**: File storage (S3-compatible)

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and pnpm
- Git

### 1. Local Development Setup

#### Option A: Basic Development (Direct Database)
```bash
# Start basic services
docker-compose up -d postgres redis

# Install dependencies
pnpm install

# Set up database
pnpm prisma db push

# Start development server
pnpm dev
```

#### Option B: Complete Local Stack (Production Mirror)
```bash
# Start all services including PostgREST, MinIO, etc.
docker-compose -f docker-compose.full.yml up -d

# The app will be available at http://localhost:3000
```

#### Option C: Containerized Development
```bash
# Run Next.js app in container
docker-compose -f docker-compose.full.yml --profile app up -d

# Access the app at http://localhost:3000
```

### 2. Environment Configuration

#### Local Development (.env.local)
```env
DATABASE_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"
NEXTAUTH_URL="http://localhost:3000"
# ... other local settings
```

#### Docker Development (.env.local.docker)
```env
DATABASE_URL="postgresql://akemisflow:dev_password_2024@postgres:5432/akemisflow_dev"
NEXT_PUBLIC_SUPABASE_URL="http://localhost:3001"
# ... container-friendly settings
```

#### Production (.env.production)
```env
DATABASE_URL="[Supabase PostgreSQL URL]"
NEXT_PUBLIC_SUPABASE_URL="https://wflcaapznpczlxjaeyfd.supabase.co"
# ... production Supabase settings
```

## 🔄 Migration Workflows

### Local to Production Migration

#### Automated Migration
```bash
# Run the migration script
./scripts/migrate-to-production.sh
```

#### Manual Migration Steps
```bash
# 1. Export local database
pg_dump --schema-only [local_db] > schema.sql
pg_dump --data-only [local_db] > data.sql

# 2. Apply to production (via Supabase dashboard or CLI)
# Use the Supabase SQL editor to run schema.sql

# 3. Deploy application
vercel --prod

# 4. Verify deployment
curl https://your-app.vercel.app/api/health
```

### Production to Local Sync

#### Automated Sync
```bash
# Sync production data/schema to local
./scripts/sync-from-production.sh
```

#### Manual Sync Steps
```bash
# 1. Export from production (via Supabase dashboard)
# 2. Reset local database
docker-compose exec postgres psql -U akemisflow -d akemisflow_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. Apply production schema/data
pnpm prisma db push
# Import data via SQL files or Supabase CLI
```

## 🛠️ Development Commands

### Database Operations
```bash
# Generate Prisma client
pnpm prisma generate

# Apply schema changes
pnpm prisma db push

# Open Prisma Studio
pnpm prisma studio

# Reset database
pnpm prisma migrate reset
```

### Docker Operations
```bash
# Start basic services
docker-compose up -d

# Start full stack
docker-compose -f docker-compose.full.yml up -d

# View logs
docker-compose logs -f nextjs

# Reset everything
docker-compose down -v
```

### Testing
```bash
# Run tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## 📊 Service URLs

### Local Development
- **Application**: http://localhost:3000
- **PostgREST API**: http://localhost:3001
- **pgAdmin**: http://localhost:8080
- **MinIO Console**: http://localhost:9001
- **Redis**: localhost:6379

### Production
- **Application**: https://akemisflow-[hash].vercel.app
- **Supabase Dashboard**: https://supabase.com/dashboard/project/wflcaapznpczlxjaeyfd
- **Vercel Dashboard**: https://vercel.com/philippe-barthelemys-projects/akemisflow

## 🔒 Authentication & Security

### Local Development
- Database: `akemisflow` / `dev_password_2024`
- pgAdmin: `admin@akemisflow.local` / `admin123`
- MinIO: `akemisflow` / `dev_password_2024`

### Production
- Managed by Vercel and Supabase
- Environment variables stored securely
- JWT tokens for API authentication

## 🚨 Troubleshooting

### Common Issues

#### Docker Services Won't Start
```bash
# Check Docker daemon
docker info

# Check ports
lsof -i :5432
lsof -i :3000

# Reset Docker state
docker-compose down -v
docker system prune -a
```

#### Database Connection Issues
```bash
# Check container health
docker-compose ps

# Test connection
docker-compose exec postgres pg_isready -U akemisflow

# View logs
docker-compose logs postgres
```

#### Production Deployment Issues
```bash
# Check Vercel logs
vercel logs

# Test environment variables
vercel env ls

# Check build
pnpm build
```

### Performance Optimization

#### Local Development
- Use Docker volume mounting for faster file changes
- Enable hot reloading in Next.js
- Use Redis for session storage

#### Production
- Optimize Prisma queries
- Implement proper caching strategies
- Monitor Vercel analytics

## 📋 Deployment Checklist

### Before Production Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] File uploads working
- [ ] API endpoints tested
- [ ] Security settings reviewed

### After Production Deployment
- [ ] Health check endpoints responding
- [ ] Database connections working
- [ ] File storage operational
- [ ] Monitoring configured
- [ ] Backup procedures tested

## 🔧 Customization

### Adding New Services
1. Update `docker-compose.full.yml`
2. Add environment variables
3. Update nginx configuration if needed
4. Document in this workflow guide

### Changing Database Schema
1. Update Prisma schema
2. Test locally with `prisma db push`
3. Create migration: `prisma migrate dev`
4. Deploy to production: `prisma migrate deploy`

### Environment-Specific Configuration
- Use different `.env.*` files for each environment
- Configure service URLs appropriately
- Adjust feature flags per environment

---

**Next Steps**: Choose your development approach and start building! 🚀