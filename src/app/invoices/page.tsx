"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';

const mockInvoices = [
  {
    id: 'INV-2025043045',
    displayNumber: '2025043045',
    client: 'OpenIT Consulting',
    amount: 4779.93,
    currency: 'EUR',
    status: 'paid',
    issueDate: '2025-05-30',
    dueDate: '2025-05-30',
    paidDate: '2025-06-01',
  },
  {
    id: 'INV-2025043046',
    displayNumber: '2025043046',
    client: 'TechCorp Ltd',
    amount: 8500.00,
    currency: 'GBP',
    status: 'sent',
    issueDate: '2025-06-05',
    dueDate: '2025-06-15',
    paidDate: null,
  },
  {
    id: 'INV-2025043047',
    displayNumber: '2025043047',
    client: 'Global Solutions Inc',
    amount: 15000.00,
    currency: 'USD',
    status: 'draft',
    issueDate: '2025-06-08',
    dueDate: '2025-06-22',
    paidDate: null,
  },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'paid': return 'text-green-600 bg-green-100';
    case 'sent': return 'text-yellow-600 bg-yellow-100';
    case 'overdue': return 'text-red-600 bg-red-100';
    case 'draft': return 'text-gray-600 bg-gray-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

function getCurrencySymbol(currency: string) {
  const symbols: { [key: string]: string } = {
    EUR: '€',
    GBP: '£',
    USD: '$',
  };
  return symbols[currency] || currency;
}

export default function InvoicesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your client invoices and payments
          </p>
        </div>
        <Button>
          <span className="mr-2">📄</span>
          Create Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <span className="text-2xl">📄</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockInvoices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockInvoices.filter(inv => inv.status === 'paid').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <span className="text-2xl">⏳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockInvoices.filter(inv => inv.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <span className="text-2xl">📝</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockInvoices.filter(inv => inv.status === 'draft').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-medium">📄</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{invoice.id}</h3>
                    <p className="text-sm text-muted-foreground">{invoice.client}</p>
                    <p className="text-xs text-muted-foreground">
                      Issued: {new Date(invoice.issueDate).toLocaleDateString()} • 
                      Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-semibold">
                      {getCurrencySymbol(invoice.currency)}{invoice.amount.toLocaleString()}
                    </p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                    {invoice.status === 'draft' && (
                      <Button size="sm">Send</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}