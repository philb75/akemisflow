# AkemisFlow Database Schema

## Overview

The database schema is managed by Prisma ORM and is identical between local (Docker PostgreSQL) and production (Supabase).

## Core Models

### Authentication & Users
- **User** - System users with role-based access (UNASSIGNED, ADMINISTRATOR, CLIENT, AUDITOR)
- **Account** - OAuth provider accounts (for social login)
- **Session** - User sessions
- **VerificationToken** - Email verification tokens

### Financial Entities
- **Contact** - Clients, consultants, partners (multi-purpose)
- **BankAccount** - Company bank accounts with full details
- **Supplier** - Supplier information with document uploads
- **Invoice** - Client invoices with line items
- **Transaction** - Financial transactions (debits/credits)
- **ConsultantPayment** - Payments to consultants

### Reporting & Analytics
- **ProfitDistribution** - Profit distribution calculations
- **PartnerProfitShare** - Individual partner shares
- **ExchangeRate** - Currency exchange rates

## Recent Additions

### Supplier Model (Added for supplier management)
```prisma
model Supplier {
  id                 String         @id @default(uuid())
  firstName          String
  lastName           String
  email              String         @unique
  phone              String?
  company            String?
  vatNumber          String?
  address            String?
  city               String?
  postalCode         String?
  country            String?
  proofOfAddressUrl  String?        // Document storage
  proofOfAddressName String?
  proofOfAddressType String?
  proofOfAddressSize Int?
  idDocumentUrl      String?        // ID document storage
  idDocumentName     String?
  idDocumentType     String?
  idDocumentSize     Int?
  status             SupplierStatus @default(ACTIVE)
  isActive           Boolean        @default(true)
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
}
```

### BankAccount Model (Integrated with UI)
```prisma
model BankAccount {
  id                 String            @id @default(uuid())
  accountName        String
  bankName           String
  accountNumber      String?
  currency           String
  iban               String?
  swiftBic           String?
  accountType        BankAccountType   @default(BUSINESS)
  status             BankAccountStatus @default(ACTIVE)
  // ... additional fields
}
```

## Schema Deployment

### Local Development
```bash
# Apply schema changes
pnpm prisma db push

# Generate migrations
pnpm prisma migrate dev
```

### Production (Supabase)
```bash
# Use the deployment script
./scripts/deploy-to-supabase.sh

# Or manually
pnpm prisma db push --skip-generate
```

## Schema Alignment

Both environments use the exact same Prisma schema file (`prisma/schema.prisma`). The deployment script ensures:

1. **Schema Push** - Creates/updates all tables and relationships
2. **Type Safety** - Generates TypeScript types from schema
3. **Data Integrity** - Maintains foreign key constraints
4. **Enum Consistency** - Ensures all enums match (UserRole, Status types, etc.)

## Important Enums

### UserRole
- UNASSIGNED (default for new users)
- ADMINISTRATOR
- CLIENT  
- AUDITOR

### BankAccountType
- BUSINESS
- PERSONAL
- SAVINGS
- CHECKING

### BankAccountStatus / SupplierStatus
- ACTIVE
- INACTIVE
- SUSPENDED

## File Storage

Currently, uploaded files (supplier documents) are stored:
- **Local**: `/public/uploads/suppliers/`
- **Production**: Consider migrating to Supabase Storage or S3

## Migration Notes

When deploying to production for the first time:
1. The schema will be created fresh (all tables)
2. Default admin user will be created (change password!)
3. No data migration from local to production by default
4. Use `prisma/seed-production.ts` for initial data

## Future Considerations

1. **Row Level Security (RLS)** - Enable in Supabase for additional security
2. **File Storage** - Migrate from local storage to Supabase Storage
3. **Audit Trails** - Add audit log tables for compliance
4. **Soft Deletes** - Consider adding `deletedAt` fields instead of hard deletes