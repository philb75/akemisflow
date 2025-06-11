"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Mock data for bank accounts
const mockBankAccounts = [
  {
    id: '1',
    accountName: 'Akemis EUR Operations',
    bankName: 'Airwallex',
    accountNumber: 'AWX-EUR-001',
    currency: 'EUR',
    iban: 'GB29NWBK60161331926819',
    swiftBic: 'NWBKGB2L',
    status: 'active',
    dailyLimit: 50000.00,
    monthlyLimit: 1000000.00,
    currentBalance: 15779.93,
    lastTransaction: '2025-06-05',
  },
  {
    id: '2',
    accountName: 'Akemis USD Operations',
    bankName: 'Airwallex',
    accountNumber: 'AWX-USD-001',
    currency: 'USD',
    iban: 'GB76NWBK60161331926820',
    swiftBic: 'NWBKGB2L',
    status: 'active',
    dailyLimit: 60000.00,
    monthlyLimit: 1200000.00,
    currentBalance: 15000.00,
    lastTransaction: '2025-06-05',
  },
  {
    id: '3',
    accountName: 'Akemis Hong Kong Operations',
    bankName: 'HSBC Hong Kong',
    accountNumber: 'HSBC-HK-001',
    currency: 'HKD',
    iban: null,
    swiftBic: null,
    status: 'active',
    dailyLimit: 400000.00,
    monthlyLimit: 8000000.00,
    currentBalance: 125000.00,
    lastTransaction: '2025-06-03',
  },
];

function getCurrencySymbol(currency: string) {
  const symbols: { [key: string]: string } = {
    EUR: '€',
    GBP: '£',
    USD: '$',
    HKD: 'HK$',
  };
  return symbols[currency] || currency;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-100';
    case 'inactive': return 'text-gray-600 bg-gray-100';
    case 'suspended': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

function getBankIcon(bankName: string) {
  if (bankName.includes('Airwallex')) return '🌐';
  if (bankName.includes('HSBC')) return '🏦';
  return '🏛️';
}

export default function BankAccountsPage() {
  const totalBalance = mockBankAccounts.reduce((sum, account) => {
    // Convert all to EUR for summary (simplified conversion)
    let amount = account.currentBalance;
    if (account.currency === 'USD') amount *= 0.92;
    if (account.currency === 'GBP') amount *= 1.17;
    if (account.currency === 'HKD') amount *= 0.12;
    return sum + amount;
  }, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground">
            Manage your business bank accounts and monitor balances
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <span className="mr-2">📊</span>
            Sync Transactions
          </Button>
          <Button>
            <span className="mr-2">➕</span>
            Add Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <span className="text-2xl">🏦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockBankAccounts.length}</div>
            <p className="text-xs text-muted-foreground">
              Active bank accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{totalBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Equivalent in EUR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currencies</CardTitle>
            <span className="text-2xl">🌍</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...new Set(mockBankAccounts.map(acc => acc.currency))].length}
            </div>
            <p className="text-xs text-muted-foreground">
              Different currencies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Limits</CardTitle>
            <span className="text-2xl">🎯</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{mockBankAccounts.reduce((sum, acc) => {
                let limit = acc.dailyLimit;
                if (acc.currency === 'USD') limit *= 0.92;
                if (acc.currency === 'HKD') limit *= 0.12;
                return sum + limit;
              }, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined daily limits
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bank Accounts List */}
      <div className="grid gap-6">
        {mockBankAccounts.map((account) => (
          <Card key={account.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-3xl">{getBankIcon(account.bankName)}</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <h3 className="text-xl font-semibold">{account.accountName}</h3>
                      <p className="text-muted-foreground">{account.bankName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Account Number</p>
                        <p className="font-mono">{account.accountNumber}</p>
                      </div>
                      {account.iban && (
                        <div>
                          <p className="text-muted-foreground">IBAN</p>
                          <p className="font-mono text-xs">{account.iban}</p>
                        </div>
                      )}
                      {account.swiftBic && (
                        <div>
                          <p className="text-muted-foreground">SWIFT/BIC</p>
                          <p className="font-mono">{account.swiftBic}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Last Transaction</p>
                        <p>{new Date(account.lastTransaction).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-3xl font-bold">
                      {getCurrencySymbol(account.currency)}{account.currentBalance.toLocaleString()}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                      {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily Limit:</span>
                      <span>{getCurrencySymbol(account.currency)}{account.dailyLimit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Limit:</span>
                      <span>{getCurrencySymbol(account.currency)}{account.monthlyLimit.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      View Transactions
                    </Button>
                    <Button variant="outline" size="sm">
                      Settings
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
          <CardDescription>
            Bank account integrations and sync status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Airwallex Integration</p>
                  <p className="text-sm text-muted-foreground">Real-time webhook sync</p>
                </div>
              </div>
              <span className="text-green-600 text-sm font-medium">Connected</span>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 text-sm">📋</span>
                </div>
                <div>
                  <p className="font-medium">HSBC Import</p>
                  <p className="text-sm text-muted-foreground">Manual spreadsheet import</p>
                </div>
              </div>
              <span className="text-yellow-600 text-sm font-medium">Manual</span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}