# AkemisFlow - Financial Management System

A comprehensive financial management system for Akemis operations, built with Next.js, PostgreSQL, and modern web technologies.

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Next.js API routes + PostgreSQL
- **Database**: PostgreSQL with incremental migrations
- **Development**: Docker Compose with local PostgreSQL
- **Production**: Vercel + Supabase (or Railway)

## 🚀 Quick Start

### Development (Local with Docker)

```bash
# Clone the repository
git clone https://github.com/philb75/akemisflow.git
cd akemisflow

# Start development environment
docker-compose up -d

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Visit http://localhost:3000

### Database Management

```bash
# Create new migration
npm run db:migration:create <name>

# Run migrations
npm run db:migrate

# Reset database (with seed data)
npm run db:reset

# Access database
npm run db:studio
```

## 📋 Key Features

### Phase 1 - Foundation (Week 1-2)
- ✅ Client & Contact Management
- ✅ Bank Account Management
- ✅ Basic Dashboard

### Phase 2 - Contract & Invoice Management (Week 3-4)
- 🔄 Contract Templates & Generation
- 🔄 Dual Invoice System (Client + Contractor)
- 🔄 PDF Generation

### Phase 3 - Financial Operations (Week 5-6)
- ⏳ Payment Processing & Matching
- ⏳ Bank Charge Calculations
- ⏳ Profit Distribution Engine

### Phase 4 - Integration & Automation (Week 7-8)
- ⏳ Airwallex API Integration
- ⏳ HSBC Spreadsheet Import
- ⏳ Financial Reporting Dashboard

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: Local storage (dev) / Vercel Blob (prod)
- **PDF Generation**: @react-pdf/renderer
- **UI Components**: Radix UI + Tailwind

## 📁 Project Structure

```
akemisflow/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── clients/           # Client management
│   │   ├── contracts/         # Contract management
│   │   ├── invoices/          # Invoice management
│   │   └── transactions/      # Transaction management
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── forms/            # Form components
│   │   └── charts/           # Chart components
│   ├── lib/                   # Utility libraries
│   │   ├── db.ts             # Database connection
│   │   ├── auth.ts           # Authentication
│   │   └── utils.ts          # Utilities
│   └── types/                # TypeScript definitions
├── prisma/                   # Database schema & migrations
├── docker/                   # Docker configuration
└── docs/                     # Documentation
```

## 🔒 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://akemisflow:password@localhost:5432/akemisflow_dev"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# External APIs (Production)
AIRWALLEX_API_KEY="your-airwallex-key"
AIRWALLEX_CLIENT_ID="your-client-id"
AIRWALLEX_WEBHOOK_SECRET="your-webhook-secret"

# Google Sheets
GOOGLE_SHEETS_PRIVATE_KEY="your-private-key"
GOOGLE_SHEETS_CLIENT_EMAIL="your-client-email"
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# E2E tests
npm run test:e2e
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

### Transaction Flow
1. Contract signed → Generate dual invoices
2. Client payment received → Calculate charges
3. Pay consultant → Update balances
4. Monthly profit distribution

## 🚀 Deployment

### Production Deployment (Vercel + Supabase)
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### Alternative: Railway Deployment
```bash
# Deploy to Railway
railway deploy
```

## 📞 Support

- **Repository**: https://github.com/philb75/akemisflow
- **Issues**: https://github.com/philb75/akemisflow/issues
- **Documentation**: ./docs/

---

**AkemisFlow** - Professional financial management for modern businesses.