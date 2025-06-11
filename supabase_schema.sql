-- AkemisFlow Database Schema for Supabase
-- Generated from Prisma schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE "ContactType" AS ENUM ('CLIENT_COMPANY', 'CLIENT_CONTACT', 'CONSULTANT', 'PARTNER');
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

-- Create contacts table
CREATE TABLE "contacts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "contact_type" "ContactType" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "status" "ContactStatus" NOT NULL DEFAULT 'ACTIVE',
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(2),
    "tax_id" VARCHAR(100),
    "currency_preference" VARCHAR(3) DEFAULT 'EUR',
    "parent_company_id" UUID,
    "profit_share_percentage" DECIMAL(5,2),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("parent_company_id") REFERENCES "contacts"("id")
);

-- Create bank_accounts table
CREATE TABLE "bank_accounts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "account_name" VARCHAR(255) NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "account_number" VARCHAR(100),
    "currency" VARCHAR(3) NOT NULL,
    "iban" VARCHAR(34),
    "swift_bic" VARCHAR(11),
    "routing_number" VARCHAR(20),
    "sort_code" VARCHAR(10),
    "account_type" "BankAccountType" NOT NULL DEFAULT 'BUSINESS',
    "status" "BankAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "daily_limit" DECIMAL(15,2),
    "monthly_limit" DECIMAL(15,2),
    "airwallex_account_id" VARCHAR(255) UNIQUE,
    "contact_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id")
);

-- Create transactions table
CREATE TABLE "transactions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bank_account_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "description" TEXT,
    "reference_number" VARCHAR(255),
    "category" "TransactionCategory" NOT NULL DEFAULT 'OTHER',
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "fee_amount" DECIMAL(15,2),
    "fee_currency" VARCHAR(3),
    "original_amount" DECIMAL(15,2),
    "original_currency" VARCHAR(3),
    "exchange_rate" DECIMAL(10,6),
    "counterparty_contact_id" UUID,
    "airwallex_transaction_id" VARCHAR(255) UNIQUE,
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "raw_data" JSONB,
    "transaction_date" DATE NOT NULL,
    "value_date" DATE,
    "batch_id" UUID,
    "reconciliation_status" VARCHAR(20),
    "transaction_purpose" VARCHAR(255),
    "compliance_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id"),
    FOREIGN KEY ("counterparty_contact_id") REFERENCES "contacts"("id")
);

-- Create invoices table
CREATE TABLE "invoices" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "invoice_number" VARCHAR(100) UNIQUE NOT NULL,
    "display_number" VARCHAR(50),
    "client_contact_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "subtotal" DECIMAL(15,2),
    "total_tax" DECIMAL(15,2) DEFAULT 0,
    "total_amount" DECIMAL(15,2),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issue_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "sent_date" DATE,
    "viewed_date" DATE,
    "paid_date" DATE,
    "payment_transaction_id" UUID,
    "bank_account_id" UUID,
    "payment_terms_days" INTEGER,
    "payment_terms_text" VARCHAR(255),
    "payment_instructions" TEXT,
    "reference_number" VARCHAR(255),
    "project_name" VARCHAR(255),
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "template_id" UUID,
    "logo_url" VARCHAR(500),
    "late_fee_rate" DECIMAL(5,2),
    "discount_rate" DECIMAL(5,2),
    "discount_amount" DECIMAL(15,2),
    "is_recurring" BOOLEAN NOT NULL DEFAULT FALSE,
    "recurring_interval" VARCHAR(20),
    "next_invoice_date" DATE,
    "line_items" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("client_contact_id") REFERENCES "contacts"("id"),
    FOREIGN KEY ("payment_transaction_id") REFERENCES "transactions"("id"),
    FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id")
);

-- Create consultant_payments table
CREATE TABLE "consultant_payments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "consultant_contact_id" UUID NOT NULL,
    "related_invoice_id" UUID,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "net_amount" DECIMAL(15,2),
    "tax_withheld" DECIMAL(15,2) DEFAULT 0,
    "tax_rate" DECIMAL(5,2) DEFAULT 0,
    "commission_rate" DECIMAL(5,2),
    "status" "ConsultantPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "approval_status" VARCHAR(20),
    "approved_by" UUID,
    "approved_date" DATE,
    "payment_method" "PaymentMethod",
    "payment_date" DATE,
    "payment_transaction_id" UUID,
    "payment_reference" VARCHAR(255),
    "description" TEXT,
    "payment_details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("consultant_contact_id") REFERENCES "contacts"("id"),
    FOREIGN KEY ("related_invoice_id") REFERENCES "invoices"("id"),
    FOREIGN KEY ("payment_transaction_id") REFERENCES "transactions"("id")
);

-- Create profit_distributions table
CREATE TABLE "profit_distributions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "period" VARCHAR(7) NOT NULL,
    "total_profit" DECIMAL(15,2) NOT NULL,
    "base_currency" VARCHAR(3) NOT NULL,
    "status" "ProfitDistributionStatus" NOT NULL DEFAULT 'CALCULATED',
    "calculation_details" JSONB,
    "calculation_date" DATE NOT NULL,
    "distribution_date" DATE,
    "distribution_method" VARCHAR(50),
    "approved_by" UUID,
    "approved_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE ("period", "base_currency")
);

-- Create partner_profit_shares table
CREATE TABLE "partner_profit_shares" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "profit_distribution_id" UUID NOT NULL,
    "partner_contact_id" UUID NOT NULL,
    "share_percentage" DECIMAL(5,2) NOT NULL,
    "share_amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "PartnerProfitShareStatus" NOT NULL DEFAULT 'PENDING',
    "payment_transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    FOREIGN KEY ("profit_distribution_id") REFERENCES "profit_distributions"("id"),
    FOREIGN KEY ("partner_contact_id") REFERENCES "contacts"("id")
);

-- Create exchange_rates table
CREATE TABLE "exchange_rates" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "from_currency" VARCHAR(3) NOT NULL,
    "to_currency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "bid_rate" DECIMAL(10,6),
    "ask_rate" DECIMAL(10,6),
    "spread" DECIMAL(10,6),
    "rate_type" "ExchangeRateType" NOT NULL DEFAULT 'SPOT',
    "source" "ExchangeRateSource" NOT NULL DEFAULT 'MANUAL',
    "provider" VARCHAR(50),
    "rate_date" DATE NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    UNIQUE ("from_currency", "to_currency", "rate_date")
);

-- Create indexes for better performance
CREATE INDEX "idx_contacts_type" ON "contacts"("contact_type");
CREATE INDEX "idx_contacts_status" ON "contacts"("status");
CREATE INDEX "idx_contacts_currency" ON "contacts"("currency_preference");
CREATE INDEX "idx_bank_accounts_contact" ON "bank_accounts"("contact_id");
CREATE INDEX "idx_transactions_bank_account" ON "transactions"("bank_account_id");
CREATE INDEX "idx_transactions_date" ON "transactions"("transaction_date");
CREATE INDEX "idx_transactions_status" ON "transactions"("status");
CREATE INDEX "idx_invoices_client" ON "invoices"("client_contact_id");
CREATE INDEX "idx_invoices_status" ON "invoices"("status");
CREATE INDEX "idx_invoices_due_date" ON "invoices"("due_date");
CREATE INDEX "idx_consultant_payments_consultant" ON "consultant_payments"("consultant_contact_id");
CREATE INDEX "idx_consultant_payments_invoice" ON "consultant_payments"("related_invoice_id");

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON "contacts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON "bank_accounts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON "transactions" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON "invoices" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consultant_payments_updated_at BEFORE UPDATE ON "consultant_payments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profit_distributions_updated_at BEFORE UPDATE ON "profit_distributions" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partner_profit_shares_updated_at BEFORE UPDATE ON "partner_profit_shares" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();