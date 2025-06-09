import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const mockTransactions = [
  {
    id: '1',
    date: '2025-06-01',
    description: 'Payment from OpenIT Consulting - Invoice INV-2025043045',
    amount: 4779.93,
    currency: 'EUR',
    type: 'credit',
    category: 'invoice_payment',
    bankAccount: 'Akemis EUR Operations',
    status: 'completed',
  },
  {
    id: '2',
    date: '2025-06-05',
    description: 'Payment from Global Solutions Inc - Project milestone',
    amount: 15000.00,
    currency: 'USD',
    type: 'credit',
    category: 'invoice_payment',
    bankAccount: 'Akemis USD Operations',
    status: 'completed',
  },
  {
    id: '3',
    date: '2025-06-02',
    description: 'Consultant payment - Marie Dubois',
    amount: -3600.00,
    currency: 'EUR',
    type: 'debit',
    category: 'consultant_payment',
    bankAccount: 'Akemis EUR Operations',
    status: 'completed',
  },
  {
    id: '4',
    date: '2025-06-03',
    description: 'Bank fees - International transfer',
    amount: -25.00,
    currency: 'EUR',
    type: 'debit',
    category: 'fee',
    bankAccount: 'Akemis EUR Operations',
    status: 'completed',
  },
];

function getCurrencySymbol(currency: string) {
  const symbols: { [key: string]: string } = {
    EUR: '€',
    GBP: '£',
    USD: '$',
  };
  return symbols[currency] || currency;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'invoice_payment': return '💰';
    case 'consultant_payment': return '👥';
    case 'fee': return '🏦';
    case 'expense': return '📋';
    default: return '💳';
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'invoice_payment': return 'text-green-600 bg-green-100';
    case 'consultant_payment': return 'text-blue-600 bg-blue-100';
    case 'fee': return 'text-red-600 bg-red-100';
    case 'expense': return 'text-orange-600 bg-orange-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export default function TransactionsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Track all financial transactions across your accounts
          </p>
        </div>
        <Button>
          <span className="mr-2">➕</span>
          Add Transaction
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <span className="text-2xl">💳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTransactions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits</CardTitle>
            <span className="text-2xl">📈</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockTransactions.filter(t => t.type === 'credit').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debits</CardTitle>
            <span className="text-2xl">📉</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockTransactions.filter(t => t.type === 'debit').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
            <span className="text-2xl">💸</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{mockTransactions
                .filter(t => t.currency === 'EUR')
                .reduce((sum, t) => sum + t.amount, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-sm">{getCategoryIcon(transaction.category)}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{transaction.description}</h3>
                    <p className="text-sm text-muted-foreground">
                      {transaction.bankAccount} • {new Date(transaction.date).toLocaleDateString()}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(transaction.category)}`}>
                      {transaction.category.replace('_', ' ').charAt(0).toUpperCase() + transaction.category.replace('_', ' ').slice(1)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className={`font-semibold text-lg ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'credit' ? '+' : ''}
                      {getCurrencySymbol(transaction.currency)}{Math.abs(transaction.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{transaction.status}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}