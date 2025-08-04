# AkemisFlow Project Documentation

## 🤖 IMPORTANT: Development Workflow with Orchestration Agent

**ALL CHANGE REQUESTS must use the orchestration agent system:**

```bash
# For any change request, use:
node agents/orchestrator/change-request.js "your change request here"

# Or simply say "change" or "fix" and I'll trigger it automatically!
```

### Why Use Orchestration?
- Automated requirement analysis
- Test-driven development
- Automatic retry with model switching (Sonnet → Opus)
- Comprehensive validation
- Consistent quality

### Agent Architecture:
1. **Orchestrator** (Opus) - Analyzes and coordinates
2. **Developer** (Sonnet/Opus) - Implements changes
3. **Tester** (Sonnet) - Validates changes

**DO NOT make direct file edits. Always use the orchestration system.**

---

## 🏗️ Project Overview

**AkemisFlow** is a comprehensive financial management system for contractor management, payment processing, and Airwallex integration.

### Tech Stack
- **Framework**: Next.js 15.4.4 with App Router
- **Database**: PostgreSQL (local) / Supabase (production)
- **ORM**: Prisma 5.22.0
- **Authentication**: NextAuth.js
- **UI**: Tailwind CSS + shadcn/ui
- **Testing**: Puppeteer-based test agents

## 🚀 Quick Start

### Local Development (Docker PostgreSQL)
```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Install dependencies
npm install

# Push database schema
npx prisma db push

# Start development server
DATABASE_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev" npm run dev
```

### Server Configuration
- **Default Port**: 3000
- **Database**: Local PostgreSQL via Docker
- **Auth**: Development mode (simplified)

## 📁 Project Structure

```
/src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── contractors/   # Contractor CRUD
│   │   └── airwallex-contractors/ # Sync endpoints
│   └── entities/          
│       └── contractors/   # Main contractor UI
├── components/            # React components
├── lib/                  # Utilities
├── types/                # TypeScript definitions
└── prisma/
    └── schema.prisma     # Database schema

/agents/                   # Orchestration system
├── orchestrator/         # Main coordinator (Opus)
├── developer/           # Code implementation (Sonnet/Opus)
├── tester/             # Validation (Sonnet)
└── shared/             # Shared context
```

## 🧪 Testing

### Test Commands
```bash
npm run test:airwallex    # Airwallex sync tests
npm run test:crud        # CRUD operations
npm run test:quick       # Quick validation
npm run test:full        # Complete suite
```

### Using Test Agents
```bash
# Run specific test
node ./agents/test-agent.js run layout-validation

# Run test scenario
node test-runner.js scenario quick
```

## 📊 Key Features

### Contractor Management
- Full CRUD operations
- Two-column view (AkemisFlow | Airwallex)
- Inline editing
- Bulk operations
- Export functionality

### Airwallex Integration
- Email-based matching
- Sync status tracking
- Conflict resolution
- Error recovery

### Contract Information
- Job descriptions
- Rate management (hourly/daily)
- Multi-currency support
- Comments field

## 🔄 Recent Changes

### Contractor UI Updates
1. **Renamed**: Supplier → Contractor (everywhere)
2. **Added**: Contract Information section
   - Job Description
   - Rate/Currency/Frequency
   - Comments field
3. **Fixed**: Comment field alignment with Account Name field
4. **Fixed**: Airwallex Contact header alignment

## 🚨 Critical Notes

### Authentication
- Middleware excludes `/api/` routes from auth redirects
- API calls must include `credentials: 'include'`

### Database Operations
- Always use transactions for multi-table updates
- Run `npx prisma db push` after schema changes
- Use `npx prisma generate` to update types

### UI Alignment
- Comment field spans only AkemisFlow column
- All fields use consistent table structure
- Maintain responsive design principles

## 🔧 Common Tasks

### Adding a New Field
1. Update Prisma schema
2. Run `npx prisma db push`
3. Update TypeScript types
4. Modify API endpoints
5. Update UI components
6. Test with appropriate suite

### Modifying Layout
1. Use orchestration agent
2. Test with layout-validation
3. Verify responsive design

## 📝 Environment Variables

```bash
# Required
DATABASE_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional (for production)
NEXT_PUBLIC_SUPABASE_URL="https://project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="secret-key"
```

## 🎯 Deployment Modes

### Local Mode (Development)
- Docker PostgreSQL
- Local file storage
- Simplified auth

### Mixed Mode (Staging)
- Local server + Remote Supabase DB
- Production data access
- Full auth flow

### Remote Mode (Production)
- Full Supabase deployment
- CDN integration
- Auto-scaling

---

**Last Updated**: 2025-08-04
**Orchestration System**: Active and Required