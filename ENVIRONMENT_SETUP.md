# AkemisFlow Environment Setup Guide

This project supports three distinct development environments, each running on different ports to avoid conflicts.

## 🏗️ Environment Matrix

| Environment | Port | Database | Storage | Node Mode | Use Case |
|-------------|------|----------|---------|-----------|----------|
| **Local Development** | 3000 | Local PostgreSQL | Local Files | Development | Daily development, schema changes |
| **Local + Supabase** | 3001 | Supabase Remote | Supabase Storage | Development | Test with production data |
| **Production Build** | 3002 | Supabase Remote | Supabase Storage | Production | Pre-deployment testing |

## 🚀 Quick Start Commands

### Local Development (Port 3000)
```bash
npm run test:local
# Opens: http://localhost:3000
# Uses: Local PostgreSQL database
# Mode: Development with hot reload
```

### Local Development + Supabase Database (Port 3001)  
```bash
npm run test:supabase
# Opens: http://localhost:3001
# Uses: Supabase production database
# Mode: Development with hot reload + real data
```

### Production Build Test (Port 3002)
```bash
npm run test:prod
# Opens: http://localhost:3002  
# Uses: Supabase production database
# Mode: Production optimized build
```

## 📋 Environment Details

### 1. Local Development Environment
**Command:** `npm run test:local`
**Config File:** `.env.local`

**Features:**
- ✅ Fast development iteration
- ✅ Isolated test data
- ✅ Hot reload
- ✅ Local PostgreSQL database
- ✅ Local file storage
- ❌ Different from production

**When to use:**
- Daily development work
- Testing new features
- Database schema changes
- When you need isolated test data

### 2. Local Development + Supabase
**Command:** `npm run test:supabase`
**Config File:** `.env.local.supabase`

**Features:**
- ✅ Fast development iteration
- ✅ Real production data
- ✅ Hot reload
- ✅ Supabase database connection
- ✅ Production parity for data
- ⚠️ Modifies production data

**When to use:**
- Testing Airwallex sync with real data
- Validating database queries
- Testing with actual contractor data
- Pre-deployment validation

### 3. Production Build Test
**Command:** `npm run test:prod`  
**Config File:** `.env.production.local`

**Features:**
- ✅ Production-optimized code
- ✅ Real production data
- ✅ Supabase database connection
- ✅ Production build validation
- ❌ No hot reload
- ⚠️ Modifies production data

**When to use:**
- Final testing before deployment
- Performance testing
- Build optimization validation
- Production environment simulation

## 🔧 Manual Environment Switching

If you need to manually switch environments:

```bash
# Load specific environment
node scripts/load-env.js local       # Loads .env.local
node scripts/load-env.js supabase    # Loads .env.local.supabase  
node scripts/load-env.js production  # Loads .env.production.local

# Then run your preferred command
npm run dev                # Port 3000
npm run dev:supabase      # Port 3001
npm run start:prod        # Port 3002
```

## 🧪 Testing the Airwallex Sync Fix

With this setup, you can test the Airwallex sync fix across all environments:

### Test 1: Local Development (if needed)
```bash
npm run test:local
curl -X POST http://localhost:3000/api/contractors/sync-airwallex
```

### Test 2: Development + Production Database (Recommended)
```bash
npm run test:supabase
curl -X POST http://localhost:3001/api/contractors/sync-airwallex
```

### Test 3: Production Build + Production Database  
```bash
npm run test:prod
curl -X POST http://localhost:3002/api/contractors/sync-airwallex
```

## 🗄️ Database Detection Logic

The application automatically detects which database to use:

```typescript
// Environment detection
const useSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

if (useSupabase) {
  console.log('🔵 Using Supabase database client')  // Production database
} else {
  console.log('🟡 Using Prisma database client')   // Local database
}
```

## 📂 Environment Files

- `.env.local` - Local development configuration
- `.env.local.supabase` - Local development with Supabase database  
- `.env.production.local` - Production build testing
- `.env` - Active environment (auto-generated, don't edit)

## ⚠️ Important Notes

1. **Port Conflicts**: Each environment uses a different port to avoid conflicts
2. **Data Safety**: Local + Supabase and Production Build environments modify real production data
3. **Environment Loading**: The `test:*` commands automatically load the correct environment
4. **NextAuth URLs**: Each environment has the correct callback URL configured
5. **Database Connections**: Supabase environments use connection pooling for better performance

## 🔍 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001  
lsof -i :3002

# Kill processes if needed
kill $(lsof -ti :3000)
```

### Environment Not Loading
```bash
# Check if environment file exists
ls -la .env*

# Manually load environment
node scripts/load-env.js local
cat .env
```

### Database Connection Issues
```bash
# Test Supabase connection
npm run test:supabase
# Look for: "🔵 Using Supabase database client"

# Test local connection  
npm run test:local
# Look for: "🟡 Using Prisma database client"
```

## 🚀 Next Steps

1. Use `npm run test:supabase` to test the Airwallex sync fix with real data
2. Use `npm run test:prod` to validate the production build
3. Deploy to production when testing confirms the fix works