// Simple database utilities without Prisma
// This is a temporary solution until npm dependencies are resolved

export interface Contact {
  id: string;
  contact_type: 'CLIENT_COMPANY' | 'CLIENT_CONTACT' | 'CONSULTANT' | 'PARTNER';
  name: string;
  email?: string;
  phone?: string;
  currency_preference: string;
  parent_company_id?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  transaction_type: 'CREDIT' | 'DEBIT';
  amount: number;
  currency: string;
  description?: string;
  category: string;
  transaction_date: string;
  bank_account_name?: string;
  counterparty_name?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  display_number?: string;
  amount: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string;
  paid_date?: string;
  client_name?: string;
}

export interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  currency: string;
  status: string;
  daily_limit?: number;
  monthly_limit?: number;
}

// Mock database queries (will be replaced with real queries when npm is working)
export const db = {
  // Dashboard summary data
  async getDashboardSummary() {
    return {
      totalRevenue: { amount: 45789.93, currency: 'EUR', change: '+12.5%' },
      pendingInvoices: { count: 2, amount: 23500.00, currency: 'EUR' },
      pendingPayments: { count: 1, amount: 3600.00, currency: 'EUR' },
      profitThisMonth: { amount: 12500.00, currency: 'EUR', change: '+8.2%' },
    };
  },

  // Recent transactions
  async getRecentTransactions(limit = 5): Promise<Transaction[]> {
    return [
      {
        id: '1',
        transaction_type: 'CREDIT',
        amount: 4779.93,
        currency: 'EUR',
        description: 'Payment from OpenIT Consulting - Invoice INV-2025043045',
        category: 'INVOICE_PAYMENT',
        transaction_date: '2025-06-01',
        bank_account_name: 'Akemis EUR Operations',
        counterparty_name: 'OpenIT Consulting',
      },
      {
        id: '2',
        transaction_type: 'CREDIT',
        amount: 15000.00,
        currency: 'USD',
        description: 'Payment from Global Solutions Inc - Project milestone',
        category: 'INVOICE_PAYMENT',
        transaction_date: '2025-06-05',
        bank_account_name: 'Akemis USD Operations',
        counterparty_name: 'Global Solutions Inc',
      },
      {
        id: '3',
        transaction_type: 'DEBIT',
        amount: 3600.00,
        currency: 'EUR',
        description: 'Consultant payment - Marie Dubois',
        category: 'CONSULTANT_PAYMENT',
        transaction_date: '2025-06-02',
        bank_account_name: 'Akemis EUR Operations',
        counterparty_name: 'Marie Dubois',
      },
    ];
  },

  // Recent invoices
  async getRecentInvoices(limit = 5): Promise<Invoice[]> {
    return [
      {
        id: '1',
        invoice_number: 'INV-2025043045',
        display_number: '2025043045',
        amount: 4779.93,
        currency: 'EUR',
        status: 'PAID',
        issue_date: '2025-05-30',
        due_date: '2025-05-30',
        paid_date: '2025-06-01',
        client_name: 'OpenIT Consulting',
      },
      {
        id: '2',
        invoice_number: 'INV-2025043046',
        display_number: '2025043046',
        amount: 8500.00,
        currency: 'GBP',
        status: 'SENT',
        issue_date: '2025-06-05',
        due_date: '2025-06-15',
        client_name: 'TechCorp Ltd',
      },
      {
        id: '3',
        invoice_number: 'INV-2025043047',
        display_number: '2025043047',
        amount: 15000.00,
        currency: 'USD',
        status: 'DRAFT',
        issue_date: '2025-06-08',
        due_date: '2025-06-22',
        client_name: 'Global Solutions Inc',
      },
    ];
  },

  // All clients
  async getClients(): Promise<Contact[]> {
    return [
      {
        id: '1',
        contact_type: 'CLIENT_COMPANY',
        name: 'OpenIT Consulting',
        email: 'contact@openit.fr',
        phone: '+33 1 42 34 56 78',
        currency_preference: 'EUR',
        created_at: '2025-01-15T10:00:00Z',
      },
      {
        id: '2',
        contact_type: 'CLIENT_COMPANY',
        name: 'TechCorp Ltd',
        email: 'contact@techcorp.com',
        phone: '+44 20 7123 4567',
        currency_preference: 'GBP',
        created_at: '2025-02-01T10:00:00Z',
      },
      {
        id: '3',
        contact_type: 'CLIENT_COMPANY',
        name: 'Global Solutions Inc',
        email: 'info@globalsolutions.com',
        phone: '+1 555 123 4567',
        currency_preference: 'USD',
        created_at: '2025-03-10T10:00:00Z',
      },
    ];
  },

  // All invoices
  async getInvoices(): Promise<Invoice[]> {
    return this.getRecentInvoices();
  },

  // All transactions
  async getTransactions(): Promise<Transaction[]> {
    return this.getRecentTransactions(10);
  },

  // Bank accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    return [
      {
        id: '1',
        account_name: 'Akemis EUR Operations',
        bank_name: 'Airwallex',
        currency: 'EUR',
        status: 'ACTIVE',
        daily_limit: 50000.00,
        monthly_limit: 1000000.00,
      },
      {
        id: '2',
        account_name: 'Akemis USD Operations',
        bank_name: 'Airwallex',
        currency: 'USD',
        status: 'ACTIVE',
        daily_limit: 60000.00,
        monthly_limit: 1200000.00,
      },
      {
        id: '3',
        account_name: 'Akemis Hong Kong Operations',
        bank_name: 'HSBC Hong Kong',
        currency: 'HKD',
        status: 'ACTIVE',
        daily_limit: 400000.00,
        monthly_limit: 8000000.00,
      },
    ];
  },
};