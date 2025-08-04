-- AkemisFlow Database Migration Script for Supabase
-- Generated from Prisma schema on 2025-01-03

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('UNASSIGNED', 'ADMINISTRATOR', 'CLIENT', 'AUDITOR');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CLIENT_COMPANY', 'CLIENT_CONTACT', 'CONSULTANT', 'PARTNER');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BankAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('BUSINESS', 'PERSONAL', 'SAVINGS', 'CHECKING');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('INVOICE_PAYMENT', 'CONSULTANT_PAYMENT', 'EXPENSE', 'TRANSFER', 'FEE', 'INTEREST', 'REFUND', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('AIRWALLEX', 'HSBC_IMPORT', 'MANUAL_UPLOAD', 'MANUAL', 'API', 'CSV');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ConsultantPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'WIRE_TRANSFER', 'CHECK', 'CASH', 'DIGITAL_WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfitDistributionStatus" AS ENUM ('CALCULATED', 'DISTRIBUTED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "PartnerProfitShareStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ExchangeRateSource" AS ENUM ('AIRWALLEX', 'MANUAL', 'API');

-- CreateEnum
CREATE TYPE "ExchangeRateType" AS ENUM ('SPOT', 'FORWARD', 'HISTORICAL');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ID', 'PROOF_OF_ADDRESS', 'BANK');

-- CreateEnum
CREATE TYPE "SystemConfigCategory" AS ENUM ('DATABASE', 'STORAGE', 'INTEGRATIONS', 'SECURITY', 'SYSTEM', 'NOTIFICATIONS');

-- CreateEnum
CREATE TYPE "SystemConfigEnvironment" AS ENUM ('LOCAL', 'PRODUCTION', 'BOTH');

-- CreateEnum
CREATE TYPE "SystemConfigDataType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'ENCRYPTED');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'UNASSIGNED',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "timezone" TEXT DEFAULT 'Europe/Paris',
    "language" TEXT DEFAULT 'en',
    "company_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "airwallex_capabilities" VARCHAR(500),
    "airwallex_entity_type" VARCHAR(20),
    "airwallex_last_sync_at" TIMESTAMPTZ(6),
    "airwallex_payer_account_id" VARCHAR(255),
    "airwallex_payment_methods" VARCHAR(500),
    "airwallex_raw_data" JSONB,
    "airwallex_sync_error" TEXT,
    "airwallex_sync_status" VARCHAR(20) DEFAULT 'NONE',
    "auto_invoice_generation" BOOLEAN NOT NULL DEFAULT false,
    "client_category" VARCHAR(20),
    "client_onboarding_status" VARCHAR(20) DEFAULT 'NEW',
    "client_risk_rating" VARCHAR(10),
    "invoice_delivery_method" VARCHAR(20) DEFAULT 'EMAIL',
    "preferred_payment_method" VARCHAR(50),
    "receiving_account_currency" VARCHAR(3),
    "receiving_account_name" VARCHAR(255),
    "receiving_account_number" VARCHAR(100),
    "receiving_bank_country_code" VARCHAR(2),
    "receiving_bank_name" VARCHAR(255),
    "receiving_iban" VARCHAR(34),
    "receiving_swift_code" VARCHAR(20),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
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
    "airwallex_account_id" VARCHAR(255),
    "contact_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
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
    "airwallex_transaction_id" VARCHAR(255),
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "raw_data" JSONB,
    "transaction_date" DATE NOT NULL,
    "value_date" DATE,
    "batch_id" UUID,
    "reconciliation_status" VARCHAR(20),
    "transaction_purpose" VARCHAR(255),
    "compliance_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "balance_after_transaction" DECIMAL(15,2),
    "original_description" TEXT,
    "source_type" VARCHAR(50),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
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
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_interval" VARCHAR(20),
    "next_invoice_date" DATE,
    "line_items" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultant_payments" (
    "id" UUID NOT NULL,
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consultant_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profit_distributions" (
    "id" UUID NOT NULL,
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profit_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_profit_shares" (
    "id" UUID NOT NULL,
    "profit_distribution_id" UUID NOT NULL,
    "partner_contact_id" UUID NOT NULL,
    "share_percentage" DECIMAL(5,2) NOT NULL,
    "share_amount" DECIMAL(15,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "PartnerProfitShareStatus" NOT NULL DEFAULT 'PENDING',
    "payment_transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "partner_profit_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "company" VARCHAR(255),
    "vat_number" VARCHAR(100),
    "address" TEXT,
    "city" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100),
    "address_country_code" VARCHAR(2),
    "address_state" VARCHAR(100),
    "birth_date" DATE,
    "birth_place" VARCHAR(255),
    "position" VARCHAR(255),
    "nationality" VARCHAR(100),
    "bank_account_name" VARCHAR(255),
    "bank_account_number" VARCHAR(100),
    "bank_name" VARCHAR(255),
    "bank_country_code" VARCHAR(2),
    "bank_account_currency" VARCHAR(3),
    "iban" VARCHAR(34),
    "swift_code" VARCHAR(20),
    "proof_of_address_url" VARCHAR(500),
    "proof_of_address_name" VARCHAR(255),
    "proof_of_address_type" VARCHAR(50),
    "proof_of_address_size" INTEGER,
    "id_document_url" VARCHAR(500),
    "id_document_name" VARCHAR(255),
    "id_document_type" VARCHAR(50),
    "id_document_size" INTEGER,
    "airwallex_contact_id" VARCHAR(255),
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "preferred_currency" VARCHAR(3) DEFAULT 'EUR',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airwallex_suppliers" (
    "id" UUID NOT NULL,
    "beneficiary_id" VARCHAR(255) NOT NULL,
    "entity_type" VARCHAR(20),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "company" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country_code" VARCHAR(2),
    "bank_account_name" VARCHAR(255),
    "bank_account_number" VARCHAR(100),
    "bank_name" VARCHAR(255),
    "bank_country_code" VARCHAR(2),
    "currency" VARCHAR(3),
    "iban" VARCHAR(34),
    "swift_code" VARCHAR(20),
    "local_clearing_system" VARCHAR(100),
    "business_registration_number" VARCHAR(100),
    "business_registration_type" VARCHAR(100),
    "legal_rep_first_name" VARCHAR(100),
    "legal_rep_last_name" VARCHAR(100),
    "legal_rep_email" VARCHAR(255),
    "legal_rep_mobile_number" VARCHAR(50),
    "legal_rep_address" TEXT,
    "legal_rep_city" VARCHAR(100),
    "legal_rep_state" VARCHAR(100),
    "legal_rep_postal_code" VARCHAR(20),
    "legal_rep_country_code" VARCHAR(2),
    "legal_rep_nationality" VARCHAR(100),
    "legal_rep_occupation" VARCHAR(255),
    "legal_rep_id_type" VARCHAR(50),
    "personal_email" VARCHAR(255),
    "personal_id_number" VARCHAR(100),
    "personal_nationality" VARCHAR(100),
    "personal_occupation" VARCHAR(255),
    "personal_first_name_chinese" VARCHAR(100),
    "personal_last_name_chinese" VARCHAR(100),
    "payment_methods" VARCHAR(500),
    "capabilities" VARCHAR(500),
    "payer_entity_type" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL,
    "raw_data" JSONB,
    "last_fetched_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_error" TEXT,
    "linked_supplier_id" UUID,

    CONSTRAINT "airwallex_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" UUID NOT NULL,
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
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "storage_provider" VARCHAR(20) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "bucket_name" VARCHAR(100),
    "public_url" VARCHAR(500),
    "contact_id" UUID,
    "supplier_id" UUID,
    "invoice_id" UUID,
    "user_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "category" VARCHAR(100),
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expiry_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "previous_version_id" UUID,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configurations" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "category" "SystemConfigCategory" NOT NULL,
    "subcategory" VARCHAR(50),
    "description" TEXT,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "environment" "SystemConfigEnvironment" DEFAULT 'BOTH',
    "data_type" "SystemConfigDataType" NOT NULL DEFAULT 'STRING',
    "default_value" TEXT,
    "validation_rule" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "last_modified_by" UUID,
    "last_modified_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_airwallex_payer_account_id_key" ON "contacts"("airwallex_payer_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_airwallex_account_id_key" ON "bank_accounts"("airwallex_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_airwallex_transaction_id_key" ON "transactions"("airwallex_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "profit_distributions_period_base_currency_key" ON "profit_distributions"("period", "base_currency");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_email_key" ON "suppliers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "airwallex_suppliers_beneficiary_id_key" ON "airwallex_suppliers"("beneficiary_id");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_from_currency_to_currency_rate_date_key" ON "exchange_rates"("from_currency", "to_currency", "rate_date");

-- CreateIndex
CREATE INDEX "documents_contact_id_document_type_idx" ON "documents"("contact_id", "document_type");

-- CreateIndex
CREATE INDEX "documents_supplier_id_document_type_idx" ON "documents"("supplier_id", "document_type");

-- CreateIndex
CREATE INDEX "documents_invoice_id_idx" ON "documents"("invoice_id");

-- CreateIndex
CREATE INDEX "documents_expiry_date_idx" ON "documents"("expiry_date");

-- CreateIndex
CREATE INDEX "documents_is_active_document_type_idx" ON "documents"("is_active", "document_type");

-- CreateIndex
CREATE UNIQUE INDEX "system_configurations_key_key" ON "system_configurations"("key");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_parent_company_id_fkey" FOREIGN KEY ("parent_company_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_counterparty_contact_id_fkey" FOREIGN KEY ("counterparty_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_contact_id_fkey" FOREIGN KEY ("client_contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_payments" ADD CONSTRAINT "consultant_payments_consultant_contact_id_fkey" FOREIGN KEY ("consultant_contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_payments" ADD CONSTRAINT "consultant_payments_payment_transaction_id_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultant_payments" ADD CONSTRAINT "consultant_payments_related_invoice_id_fkey" FOREIGN KEY ("related_invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_profit_shares" ADD CONSTRAINT "partner_profit_shares_partner_contact_id_fkey" FOREIGN KEY ("partner_contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_profit_shares" ADD CONSTRAINT "partner_profit_shares_profit_distribution_id_fkey" FOREIGN KEY ("profit_distribution_id") REFERENCES "profit_distributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airwallex_suppliers" ADD CONSTRAINT "airwallex_suppliers_linked_supplier_id_fkey" FOREIGN KEY ("linked_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "system_configurations_last_modified_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;