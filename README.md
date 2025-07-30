# AkemisFlow - Financial Management System

A comprehensive financial management system for Akemis operations, built with Next.js, PostgreSQL, and modern web technologies.

## 🚀 Deployment

This application supports both local development (Docker) and production deployment (Supabase + Vercel).

- **Local Development**: Uses Docker PostgreSQL
- **Production**: Uses Supabase (database) + Vercel (hosting)

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## 🚀 Quick Start

### Choose Your Development Environment

#### 1. Simple Local Development
```bash
# Start database services
pnpm docker:up

# Install dependencies and start development
pnpm install
pnpm prisma db push
pnpm dev
```
Access: http://localhost:3000

#### 2. Complete Local Stack (Production Mirror)
```bash
# Start all services (PostgreSQL, PostgREST, MinIO, Redis)
pnpm docker:full

# Switch to Docker environment
pnpm env:docker
```
Access: http://localhost:3000 (full stack running in containers)

#### 3. Containerized Development
```bash
# Run everything including Next.js in containers
pnpm docker:full --profile app
```

### 🏗️ Architecture

#### Local Development Stack
- **PostgreSQL 15**: Database (mirrors Supabase)
- **PostgREST**: REST API layer (mirrors Supabase API)  
- **MinIO**: S3-compatible storage (mirrors Supabase Storage)
- **Redis**: Caching and sessions
- **Next.js**: Application server (mirrors Vercel)
- **pgAdmin**: Database management UI

#### Production Stack  
- **Vercel**: Application hosting and deployment
- **Supabase**: Database and API services
- **Supabase Storage**: File storage

## 🔄 Migration & Deployment

### Local to Production
```bash
# Automated migration
pnpm migrate:to-prod

# Manual deployment
vercel --prod
```

### Production to Local Sync
```bash
# Sync production data/schema to local
pnpm sync:from-prod
```

## 📋 Key Features

### Phase 1 - Foundation ✅
- Client & Contact Management
- Bank Account Management  
- Basic Dashboard

### Phase 2 - Contract & Invoice Management 🔄
- Contract Templates & Generation
- Dual Invoice System (Client + Contractor)
- PDF Generation

### Phase 3 - Financial Operations ⏳
- Payment Processing & Matching
- Bank Charge Calculations
- Profit Distribution Engine

### Phase 4 - Integration & Automation ⏳  
- Airwallex API Integration
- HSBC Spreadsheet Import
- Financial Reporting Dashboard

## 🛠️ Common Commands

### Development
```bash
pnpm dev                 # Start development server
pnpm build              # Build for production
pnpm type-check         # TypeScript checking
pnpm lint               # Code linting
```

### Database
```bash
pnpm db:push            # Apply schema changes
pnpm db:studio          # Open Prisma Studio
pnpm db:migrate         # Apply migrations
pnpm db:reset           # Reset database
```

### Docker
```bash
pnpm docker:up          # Start basic services
pnpm docker:full        # Start complete stack
pnpm docker:reset       # Reset and restart
pnpm docker:down        # Stop services
```

### Environment
```bash
pnpm env:docker         # Switch to Docker config
pnpm env:local          # Switch to local config
```

## 🔗 Service URLs

### Local Development
- **App**: http://localhost:3000
- **API**: http://localhost:3001  
- **pgAdmin**: http://localhost:8080 (admin@akemisflow.local / admin123)
- **MinIO**: http://localhost:9001 (akemisflow / dev_password_2024)

### Production
- **App**: https://akemisflow-[hash].vercel.app
- **Supabase**: https://supabase.com/dashboard/project/wflcaapznpczlxjaeyfd
- **Vercel**: https://vercel.com/philippe-barthelemys-projects/akemisflow

## 🔒 Environment Configuration

Three environment setups:
- `.env.local`: Local development (direct database)
- `.env.local.docker`: Docker development (containerized)  
- `.env.production`: Production (Vercel + Supabase)

## 📚 Documentation

- **[DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)**: Complete development guide
- **[DEPLOYMENT_SETUP.md](./DEPLOYMENT_SETUP.md)**: Production deployment details
- **[supabase_schema.sql](./supabase_schema.sql)**: Database schema

## 🧪 Testing

```bash
pnpm test              # Run tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report  
pnpm test:e2e          # End-to-end tests
```

## 📊 Business Logic

### Akemis Charge Calculation
- **< 10K**: Fixed charge (100 USD/EUR)
- **> 10K**: 1% of received amount
- **Bank charges**: Deducted before calculation

### Profit Distribution
- Default 50/50 split between shareholders
- Configurable per client
- Multi-currency support with exchange rates

## 🤝 Contributing

1. Choose development environment (local/Docker)
2. Make changes and test locally
3. Run linting and type checking
4. Test migration to production (staging)
5. Deploy to production

## 📞 Support

- **Repository**: https://github.com/philb75/akemisflow
- **Issues**: https://github.com/philb75/akemisflow/issues
- **Documentation**: ./docs/

---

**AkemisFlow** - Professional financial management for modern businesses.