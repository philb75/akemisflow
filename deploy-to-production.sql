-- AkemisFlow Production Schema Deployment
-- Execute this script in Supabase SQL Editor
-- =============================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create user management tables (for NextAuth.js)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    "emailVerified" TIMESTAMPTZ,
    image TEXT,
    role VARCHAR(50) DEFAULT 'USER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    id_token TEXT,
    scope TEXT,
    session_state TEXT,
    token_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "sessionToken" VARCHAR(255) UNIQUE NOT NULL,
    "userId" UUID NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- Step 3: Create application enums
CREATE TYPE "ContactType" AS ENUM ('CLIENT_COMPANY', 'CLIENT_CONTACT', 'SUPPLIER', 'CONSULTANT', 'PARTNER');
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "BankAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "BankAccountType" AS ENUM ('BUSINESS', 'PERSONAL', 'SAVINGS', 'CHECKING');
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');
CREATE TYPE "TransactionCategory" AS ENUM ('INVOICE_PAYMENT', 'CONSULTANT_PAYMENT', 'EXPENSE', 'TRANSFER', 'FEE', 'INTEREST', 'REFUND', 'OTHER');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "TransactionSource" AS ENUM ('AIRWALLEX', 'HSBC_IMPORT', 'MANUAL_UPLOAD', 'MANUAL');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'DISPUTED');
CREATE TYPE "ConsultantPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'WIRE_TRANSFER', 'CHECK', 'CASH', 'DIGITAL_WALLET', 'OTHER');
CREATE TYPE "ProfitDistributionStatus" AS ENUM ('CALCULATED', 'DISTRIBUTED', 'FINALIZED');
CREATE TYPE "PartnerProfitShareStatus" AS ENUM ('PENDING', 'PAID');
CREATE TYPE "ExchangeRateSource" AS ENUM ('AIRWALLEX', 'MANUAL', 'API');
CREATE TYPE "ExchangeRateType" AS ENUM ('SPOT', 'FORWARD', 'HISTORICAL');

-- Step 4: Create main application tables

-- Contacts table (clients, suppliers, consultants)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_type "ContactType" NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    status "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2),
    tax_id VARCHAR(100),
    currency_preference VARCHAR(3) DEFAULT 'EUR',
    parent_company_id UUID,
    profit_share_percentage DECIMAL(5,2),
    notes TEXT,
    
    -- Client-specific fields
    client_category VARCHAR(50),
    client_risk_rating VARCHAR(20) DEFAULT 'MEDIUM',
    client_onboarding_status VARCHAR(50) DEFAULT 'PENDING',
    preferred_payment_method "PaymentMethod",
    invoice_delivery_method VARCHAR(50) DEFAULT 'EMAIL',
    auto_invoice_generation BOOLEAN DEFAULT false,
    
    -- Airwallex integration
    airwallex_payer_account_id VARCHAR(255),
    airwallex_sync_status VARCHAR(20) DEFAULT 'NONE',
    airwallex_last_sync TIMESTAMPTZ,
    airwallex_metadata JSONB,
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (parent_company_id) REFERENCES contacts(id)
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    company_name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2),
    currency_preference VARCHAR(3) DEFAULT 'EUR',
    payment_terms_days INTEGER DEFAULT 30,
    tax_id VARCHAR(100),
    
    -- Airwallex integration
    airwallex_beneficiary_id VARCHAR(255),
    airwallex_sync_status VARCHAR(20) DEFAULT 'NONE',
    airwallex_last_sync TIMESTAMPTZ,
    airwallex_metadata JSONB,
    
    status "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bank accounts table
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    currency VARCHAR(3) NOT NULL,
    iban VARCHAR(34),
    swift_bic VARCHAR(11),
    routing_number VARCHAR(20),
    sort_code VARCHAR(10),
    account_type "BankAccountType" NOT NULL DEFAULT 'BUSINESS',
    status "BankAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    daily_limit DECIMAL(15,2),
    monthly_limit DECIMAL(15,2),
    airwallex_account_id VARCHAR(255) UNIQUE,
    contact_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID NOT NULL,
    transaction_type "TransactionType" NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    reference_number VARCHAR(255),
    category "TransactionCategory" NOT NULL DEFAULT 'OTHER',
    status "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    fee_amount DECIMAL(15,2),
    fee_currency VARCHAR(3),
    original_amount DECIMAL(15,2),
    original_currency VARCHAR(3),
    exchange_rate DECIMAL(10,6),
    counterparty_contact_id UUID,
    airwallex_transaction_id VARCHAR(255) UNIQUE,
    source "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    raw_data JSONB,
    transaction_date DATE NOT NULL,
    value_date DATE,
    batch_id UUID,
    reconciliation_status VARCHAR(20),
    transaction_purpose VARCHAR(255),
    compliance_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
    FOREIGN KEY (counterparty_contact_id) REFERENCES contacts(id)
);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_airwallex_id ON contacts(airwallex_payer_account_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_airwallex_id ON suppliers(airwallex_beneficiary_id);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_airwallex_id ON transactions(airwallex_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_number);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_currency ON bank_accounts(currency);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_status ON bank_accounts(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_airwallex_id ON bank_accounts(airwallex_account_id);

-- Step 6: Create admin user (will be updated with your email)
INSERT INTO users (name, email, role) 
VALUES ('Admin User', 'philb75@gmail.com', 'ADMINISTRATOR')
ON CONFLICT (email) DO UPDATE SET 
    role = 'ADMINISTRATOR',
    updated_at = NOW();

-- Step 7: Success message
SELECT 'AkemisFlow Production Schema Deployed Successfully!' as message,
       COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'accounts', 'sessions', 'contacts', 'suppliers', 'bank_accounts', 'transactions');