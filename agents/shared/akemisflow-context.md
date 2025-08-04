# AkemisFlow Application Context

## 🎯 Application Overview

AkemisFlow is a comprehensive financial management system for contractor management, payment processing, and Airwallex integration. Built with Next.js 15.4.4, it provides a robust platform for managing contractors, their documentation, banking information, and payment workflows.

## 🏗️ Technical Architecture

### **Core Stack**
- **Framework**: Next.js 15.4.4 with App Router
- **Language**: TypeScript
- **Database ORM**: Prisma 5.22.0
- **Database**: PostgreSQL (local) / Supabase (production)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components with shadcn/ui

### **File Structure**
```
/src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── contractors/   # Contractor CRUD endpoints
│   │   ├── airwallex-contractors/ # Airwallex sync endpoints
│   │   └── auth/          # Authentication endpoints
│   ├── entities/          # Entity management pages
│   │   └── contractors/   # Contractor UI pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── contractor-*.tsx   # Contractor-specific components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility libraries
│   ├── db.ts            # Database client
│   ├── auth.ts          # Auth configuration
│   └── supabase.ts      # Supabase client
├── types/               # TypeScript definitions
│   └── contractor.ts    # Contractor interfaces
└── prisma/
    └── schema.prisma    # Database schema
```

## 🔧 Three Deployment Modes

### **1. Local Mode** 🏠
**Environment**: Development only
**Database**: PostgreSQL via Docker
**Storage**: Local filesystem
**Authentication**: Development auth (simplified)

**Configuration**:
```bash
DATABASE_URL="postgresql://akemisflow:dev_password_2024@localhost:5432/akemisflow_dev"
NEXTAUTH_URL="http://localhost:3000"
```

**Key Characteristics**:
- Uses Prisma ORM directly
- Docker containers for PostgreSQL
- Hot reload enabled
- Local file uploads to `/uploads`
- Simplified auth flow

### **2. Mixed Mode** 🔄
**Environment**: Development with production data
**Database**: Remote Supabase
**Storage**: Hybrid (local server, remote DB)
**Authentication**: Production auth

**Configuration**:
```bash
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="secret-key"
```

**Key Characteristics**:
- Local Next.js server
- Remote Supabase database
- Real production data access
- Mixed storage strategy
- Full auth flow

### **3. Remote Mode** ☁️
**Environment**: Production
**Database**: Supabase
**Storage**: Supabase Storage
**Authentication**: Production auth with all providers

**Configuration**:
- Deployed on Vercel/Supabase
- Edge functions enabled
- Full CDN integration
- Automatic scaling

## 📊 Database Schema

### **Core Models**

#### **Contractor**
Primary entity for contractor management
```prisma
model Contractor {
  id                String      @id @default(uuid())
  firstName         String      
  lastName          String
  email            String      @unique
  phone            String?
  company          String?
  vatNumber        String?
  
  // Address
  address          String?
  city             String?
  postalCode       String?
  country          String?
  
  // Banking
  bankAccountName  String?
  bankAccountNumber String?
  bankName         String?
  iban             String?
  swiftCode        String?
  
  // Contract Info
  jobDescription   String?
  rate             Decimal?
  rateCurrency     String?
  rateFrequency    RateFrequency?
  comments         String?
  
  // Airwallex
  airwallexContactId String?
  
  // System
  status           ContractorStatus
  createdAt        DateTime
  updatedAt        DateTime
}
```

#### **AirwallexContractor**
Synchronized data from Airwallex API
```prisma
model AirwallexContractor {
  id               String    @id
  beneficiaryId    String    @unique
  firstName        String
  lastName         String
  email            String
  linkedContractorId String?  // Links to Contractor.id
  syncError        String?
  lastSyncAt       DateTime?
}
```

## 🎨 UI Components & Features

### **1. Contractor List View**
- **Location**: `/entities/contractors`
- **Features**:
  - Paginated list of contractors
  - Search and filter capabilities
  - Quick actions (edit, delete, view)
  - Bulk operations
  - Export functionality

### **2. Contractor Expanded View**
- **Expandable rows** showing detailed information
- **Two-column layout**:
  - Left: AkemisFlow Contractor data
  - Right: Airwallex Contact data (when linked)
- **Sections**:
  - Comments (above Personal Information)
  - Personal Information
  - Address Information
  - Banking Information
  - Contract Information
  - Documents
  - Metadata

### **3. Edit Mode**
- **Inline editing** with field validation
- **Save/Cancel** actions
- **Auto-save** drafts
- **Field-level validation**
- **Real-time formatting** (names, addresses)

### **4. Airwallex Integration**
- **Sync button** triggers data synchronization
- **Status indicators** show sync state
- **Error handling** with retry logic
- **Conflict resolution** UI
- **Automatic linking** by email matching

## 🔌 API Endpoints

### **Contractor Management**
- `GET /api/contractors` - List all contractors
- `GET /api/contractors/[id]` - Get specific contractor
- `POST /api/contractors` - Create contractor
- `PUT /api/contractors/[id]` - Update contractor
- `DELETE /api/contractors/[id]` - Delete contractor

### **Airwallex Integration**
- `GET /api/airwallex-contractors` - List Airwallex contacts
- `POST /api/airwallex-contractors/sync` - Trigger sync
- `DELETE /api/airwallex-contractors/sync` - Clear sync data
- `POST /api/contractors/[id]/link-airwallex/[beneficiaryId]` - Link accounts
- `POST /api/contractors/[id]/sync-from-airwallex` - Pull data from Airwallex

## 🎯 Key Business Logic

### **1. Name Formatting**
- Automatic capitalization of names
- Handling of special characters
- Multi-part name support

### **2. Data Synchronization**
- Email-based matching
- Conflict resolution (Airwallex wins)
- Incremental updates
- Error recovery

### **3. Document Management**
- Proof of address upload
- ID document upload
- File size limits (5MB)
- Supported formats (PDF, JPG, PNG)

### **4. Rate Calculation**
- Hourly/Daily rate storage
- Multi-currency support (EUR, USD, GBP)
- Rate history tracking

## 🧪 Testing Infrastructure

### **Available Test Suites**
1. **airwallex-sync**: Tests Airwallex synchronization
2. **contractor-crud**: Tests CRUD operations
3. **layout-validation**: Tests UI layout alignment
4. **navigation**: Tests page navigation
5. **ui-interactions**: Tests form interactions

### **Test Commands**
```bash
npm run test:airwallex    # Airwallex integration
npm run test:crud        # CRUD operations
npm run test:quick       # Quick validation
npm run test:full        # Complete suite
```

## 🔐 Authentication & Authorization

### **Roles**
- `ADMINISTRATOR`: Full access
- `USER`: Standard access
- `UNASSIGNED`: Pending approval

### **Providers**
- Credentials (email/password)
- Google OAuth
- Magic links (email)

## 📝 Common Operations

### **1. Adding a New Field**
1. Update Prisma schema
2. Run `prisma db push`
3. Update TypeScript types
4. Modify API endpoints
5. Update UI components
6. Test with appropriate suite

### **2. Modifying Layout**
1. Update component JSX
2. Adjust Tailwind classes
3. Test with layout-validation
4. Verify responsive design

### **3. API Changes**
1. Update route handler
2. Modify TypeScript interfaces
3. Update client-side calls
4. Test with API suite

## 🚨 Critical Considerations

### **Database Operations**
- Always use transactions for multi-table updates
- Handle Prisma/Supabase client differences
- Respect foreign key constraints

### **UI Alignment**
- Table columns must align with headers
- Comment field spans only AkemisFlow column
- Maintain consistent spacing

### **Error Handling**
- All API routes return proper HTTP codes
- User-friendly error messages
- Logging for debugging

### **Performance**
- Pagination for large datasets
- Lazy loading for documents
- Optimistic UI updates

## 📊 Environment Variables

### **Required**
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Auth encryption key
- `NEXTAUTH_URL`: Application URL

### **Optional**
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service key
- `GOOGLE_CLIENT_ID`: Google OAuth
- `GOOGLE_CLIENT_SECRET`: Google OAuth secret

## 🔄 State Management

- **Client State**: React useState/useReducer
- **Server State**: API calls with SWR/React Query
- **Form State**: Controlled components
- **Global State**: Context API for auth/theme

## 📱 Responsive Design

- **Desktop**: Full feature set with expanded views
- **Tablet**: Condensed layout with drawer navigation
- **Mobile**: Single column with bottom navigation

---

This comprehensive context should enable any agent to understand the full scope and capabilities of the AkemisFlow application.