import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Mock data for development (will be replaced with real data)
const mockData = {
  totalRevenue: { amount: 45789.93, currency: 'EUR', change: '+12.5%' },
  pendingInvoices: { count: 8, amount: 23450.00, currency: 'EUR' },
  pendingPayments: { count: 3, amount: 8750.00, currency: 'EUR' },
  profitThisMonth: { amount: 12500.00, currency: 'EUR', change: '+8.2%' },
  recentTransactions: [
    {
      id: '1',
      description: 'Payment from OpenIT Consulting',
      amount: 4779.93,
      currency: 'EUR',
      date: '2025-06-01',
      type: 'credit',
    },
    {
      id: '2',
      description: 'Payment from Global Solutions Inc',
      amount: 15000.00,
      currency: 'USD',
      date: '2025-06-05',
      type: 'credit',
    },
    {
      id: '3',
      description: 'Consultant payment - Marie Dubois',
      amount: -3600.00,
      currency: 'EUR',
      date: '2025-06-02',
      type: 'debit',
    },
  ],
  recentInvoices: [
    {
      id: 'INV-2025043045',
      client: 'OpenIT Consulting',
      amount: 4779.93,
      currency: 'EUR',
      status: 'paid',
      dueDate: '2025-05-30',
    },
    {
      id: 'INV-2025043046',
      client: 'TechCorp Ltd',
      amount: 8500.00,
      currency: 'GBP',
      status: 'sent',
      dueDate: '2025-06-15',
    },
  ],
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your financial operations
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{mockData.totalRevenue.amount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{mockData.totalRevenue.change}</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <span className="text-2xl">📄</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockData.pendingInvoices.count}
            </div>
            <p className="text-xs text-muted-foreground">
              €{mockData.pendingInvoices.amount.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <span className="text-2xl">⏳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockData.pendingPayments.count}
            </div>
            <p className="text-xs text-muted-foreground">
              €{mockData.pendingPayments.amount.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit This Month</CardTitle>
            <span className="text-2xl">📈</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{mockData.profitThisMonth.amount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{mockData.profitThisMonth.change}</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest financial activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {transaction.description}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`text-right ${
                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <p className="text-sm font-medium">
                      {transaction.type === 'credit' ? '+' : ''}
                      {transaction.currency === 'EUR' ? '€' : '$'}
                      {Math.abs(transaction.amount).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>
              Latest invoice activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {invoice.id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.client}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {invoice.currency === 'EUR' ? '€' : '£'}
                      {invoice.amount.toLocaleString()}
                    </p>
                    <p className={`text-xs ${
                      invoice.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {invoice.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <button className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-accent transition-colors">
              <span>📄</span>
              <span className="text-sm font-medium">New Invoice</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-accent transition-colors">
              <span>🏢</span>
              <span className="text-sm font-medium">Add Client</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-accent transition-colors">
              <span>💳</span>
              <span className="text-sm font-medium">Record Payment</span>
            </button>
            <button className="flex items-center justify-center space-x-2 p-4 border rounded-lg hover:bg-accent transition-colors">
              <span>📊</span>
              <span className="text-sm font-medium">View Reports</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}