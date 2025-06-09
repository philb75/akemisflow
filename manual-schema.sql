-- Manual schema creation for AkemisFlow
-- Phase 1: Core tables needed for dashboard functionality

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('CLIENT_COMPANY', 'CLIENT_CONTACT', 'CONSULTANT', 'PARTNER')),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2),
    tax_id VARCHAR(100),
    currency_preference VARCHAR(3) DEFAULT 'EUR',
    parent_company_id UUID REFERENCES contacts(id),
    profit_share_percentage DECIMAL(5,2),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100),
    currency VARCHAR(3) NOT NULL,
    iban VARCHAR(34),
    swift_bic VARCHAR(11),
    routing_number VARCHAR(20),
    sort_code VARCHAR(10),
    account_type VARCHAR(20) DEFAULT 'BUSINESS' CHECK (account_type IN ('BUSINESS', 'PERSONAL', 'SAVINGS', 'CHECKING')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED')),
    daily_limit DECIMAL(15,2),
    monthly_limit DECIMAL(15,2),
    airwallex_account_id VARCHAR(255) UNIQUE,
    contact_id UUID REFERENCES contacts(id),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    reference_number VARCHAR(255),
    category VARCHAR(50) DEFAULT 'OTHER' CHECK (category IN ('INVOICE_PAYMENT', 'CONSULTANT_PAYMENT', 'EXPENSE', 'TRANSFER', 'FEE', 'INTEREST', 'REFUND', 'OTHER')),
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    fee_amount DECIMAL(15,2),
    fee_currency VARCHAR(3),
    original_amount DECIMAL(15,2),
    original_currency VARCHAR(3),
    exchange_rate DECIMAL(10,6),
    counterparty_contact_id UUID REFERENCES contacts(id),
    airwallex_transaction_id VARCHAR(255) UNIQUE,
    source VARCHAR(20) DEFAULT 'MANUAL' CHECK (source IN ('AIRWALLEX', 'HSBC_IMPORT', 'MANUAL_UPLOAD', 'MANUAL')),
    raw_data JSONB,
    transaction_date DATE NOT NULL,
    value_date DATE,
    batch_id UUID,
    reconciliation_status VARCHAR(20),
    transaction_purpose VARCHAR(255),
    compliance_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    display_number VARCHAR(50),
    client_contact_id UUID NOT NULL REFERENCES contacts(id),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    subtotal DECIMAL(15,2),
    total_tax DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'VIEWED', 'PAID', 'PARTIAL_PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'DISPUTED')),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    sent_date DATE,
    viewed_date DATE,
    paid_date DATE,
    payment_transaction_id UUID REFERENCES transactions(id),
    bank_account_id UUID REFERENCES bank_accounts(id),
    payment_terms_days INTEGER,
    payment_terms_text VARCHAR(255),
    payment_instructions TEXT,
    reference_number VARCHAR(255),
    project_name VARCHAR(255),
    reminder_count INTEGER DEFAULT 0,
    template_id UUID,
    logo_url VARCHAR(500),
    late_fee_rate DECIMAL(5,2),
    discount_rate DECIMAL(5,2),
    discount_amount DECIMAL(15,2),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_interval VARCHAR(20),
    next_invoice_date DATE,
    line_items JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create consultant_payments table
CREATE TABLE IF NOT EXISTS consultant_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_contact_id UUID NOT NULL REFERENCES contacts(id),
    related_invoice_id UUID REFERENCES invoices(id),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    net_amount DECIMAL(15,2),
    tax_withheld DECIMAL(15,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    commission_rate DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'CANCELLED')),
    approval_status VARCHAR(20),
    approved_by UUID,
    approved_date DATE,
    payment_method VARCHAR(20),
    payment_date DATE,
    payment_transaction_id UUID REFERENCES transactions(id),
    payment_reference VARCHAR(255),
    description TEXT,
    payment_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(10,6) NOT NULL CHECK (rate > 0),
    bid_rate DECIMAL(10,6),
    ask_rate DECIMAL(10,6),
    spread DECIMAL(10,6),
    rate_type VARCHAR(20) DEFAULT 'SPOT' CHECK (rate_type IN ('SPOT', 'FORWARD', 'HISTORICAL')),
    source VARCHAR(20) DEFAULT 'MANUAL' CHECK (source IN ('AIRWALLEX', 'MANUAL', 'API')),
    provider VARCHAR(50),
    rate_date DATE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, rate_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_counterparty ON transactions(counterparty_contact_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_parent ON contacts(parent_company_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at') THEN
        CREATE TRIGGER update_contacts_updated_at 
            BEFORE UPDATE ON contacts 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bank_accounts_updated_at') THEN
        CREATE TRIGGER update_bank_accounts_updated_at 
            BEFORE UPDATE ON bank_accounts 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transactions_updated_at') THEN
        CREATE TRIGGER update_transactions_updated_at 
            BEFORE UPDATE ON transactions 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at') THEN
        CREATE TRIGGER update_invoices_updated_at 
            BEFORE UPDATE ON invoices 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_consultant_payments_updated_at') THEN
        CREATE TRIGGER update_consultant_payments_updated_at 
            BEFORE UPDATE ON consultant_payments 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;