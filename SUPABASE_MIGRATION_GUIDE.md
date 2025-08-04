# Supabase Migration Guide for AkemisFlow

## ✅ Migration Status

### Completed Steps:
1. **✅ Generated complete SQL migration script** (`supabase-migration.sql`)
2. **✅ Created migration verification tools** (`test-supabase-postgres.js`, `execute-supabase-migration.js`)
3. **✅ Configured adaptive environment detection** for all 3 deployment modes
4. **✅ Prepared environment configuration** for Supabase mode

### ❌ Remaining Issue:
- **Database credentials verification needed** - Current connection strings are not working

## 🔧 How to Complete the Migration

### Step 1: Verify Supabase Project Details
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Find your project: `wflcaapznpczlxjaeyfd`
3. Go to **Settings > Database**
4. Copy the correct **Connection String** (Direct connection)

### Step 2: Update Connection Credentials
Update `.env.local` with the correct connection string:

```bash
# Replace with correct Supabase connection string
DATABASE_URL="postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/postgres"
DIRECT_URL="postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/postgres"

# Enable Supabase configuration
NEXT_PUBLIC_SUPABASE_URL="https://wflcaapznpczlxjaeyfd.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```

### Step 3: Execute Migration
Choose one of these methods:

#### Method A: Supabase Dashboard (Recommended)
1. Go to **SQL Editor** in Supabase Dashboard
2. Copy the entire contents of `supabase-migration.sql`
3. Paste and execute the SQL

#### Method B: Command Line (After fixing credentials)
```bash
node test-supabase-postgres.js  # Verify connection
node execute-supabase-migration.js  # Execute migration
```

### Step 4: Switch to Supabase Mode
Once migration is complete:

```bash
# Update .env.local with working Supabase credentials
# Then restart the application
AKEMIS_ENV=local npm run dev
```

## 📋 Migration SQL Summary

The migration creates:
- **15 Enums** (UserRole, ContactType, etc.)
- **15 Tables** (users, contractors, contacts, etc.)
- **24 Indexes** for performance
- **20 Foreign Key Constraints** for referential integrity

### Key Tables:
- `contractors` - Main contractor data with comprehensive fields
- `airwallex_contractors` - Airwallex integration data
- `documents` - Document management system
- `contacts` - Client and partner information
- `transactions` - Financial transaction records
- `invoices` - Invoice management

## 🔄 Fallback Strategy

If Supabase migration fails, the application will continue running with:
- **Local Docker PostgreSQL** (currently active)
- **Local filesystem storage** for documents
- **All stability improvements** and features working

## 🧪 Testing Commands

```bash
# Test local database (working)
DATABASE_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev" node -e "require('@prisma/client').PrismaClient().contractor.findMany().then(console.log)"

# Test Supabase connection (needs credentials)
node test-supabase-postgres.js

# Verify migration status
node execute-supabase-migration.js
```

## 📊 Current Application Status

- ✅ **Running on**: http://localhost:3000
- ✅ **Database**: Local Docker PostgreSQL (5 contractors found)
- ✅ **Storage**: Local filesystem
- ✅ **Features**: All stability improvements active
- ✅ **Document Upload**: Fixed and working
- ✅ **Multi-Environment**: Ready for Supabase when credentials are corrected

## 🎯 Next Steps

1. **Verify Supabase credentials** from dashboard
2. **Execute migration** using SQL Editor
3. **Test connection** with corrected credentials
4. **Switch environment** to Supabase mode
5. **Verify functionality** with new database

The application architecture is fully prepared for the migration - only the database credentials need to be corrected to complete the switch to Supabase.