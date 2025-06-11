"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Mock data for consultants
const mockConsultants = [
  {
    id: '1',
    name: 'Marie Dubois',
    email: 'marie.dubois@consultant.fr',
    phone: '+33 6 12 34 56 78',
    specialty: 'Software Development',
    status: 'active',
    hourlyRate: 85.00,
    currency: 'EUR',
    totalPaid: 18500.00,
    lastPayment: '2025-06-02',
    hoursThisMonth: 42,
  },
  {
    id: '2',
    name: 'James Wilson',
    email: 'james.wilson@techconsult.com',
    phone: '+44 7890 123456',
    specialty: 'Project Management',
    status: 'active',
    hourlyRate: 95.00,
    currency: 'GBP',
    totalPaid: 12750.00,
    lastPayment: '2025-05-28',
    hoursThisMonth: 38,
  },
  {
    id: '3',
    name: 'Sarah Chen',
    email: 'sarah.chen@devexpert.com',
    phone: '+1 555 987 6543',
    specialty: 'UI/UX Design',
    status: 'inactive',
    hourlyRate: 80.00,
    currency: 'USD',
    totalPaid: 8400.00,
    lastPayment: '2025-04-15',
    hoursThisMonth: 0,
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

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-100';
    case 'inactive': return 'text-gray-600 bg-gray-100';
    case 'paused': return 'text-yellow-600 bg-yellow-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

function getSpecialtyIcon(specialty: string) {
  if (specialty.includes('Development')) return '💻';
  if (specialty.includes('Design')) return '🎨';
  if (specialty.includes('Management')) return '📋';
  return '👤';
}

export default function ConsultantsPage() {
  const activeConsultants = mockConsultants.filter(c => c.status === 'active');
  const totalHours = mockConsultants.reduce((sum, c) => sum + c.hoursThisMonth, 0);
  const totalCosts = mockConsultants.reduce((sum, consultant) => {
    // Convert all to EUR for display (simplified)
    let amount = consultant.totalPaid;
    if (consultant.currency === 'USD') amount *= 0.92;
    if (consultant.currency === 'GBP') amount *= 1.17;
    return sum + amount;
  }, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consultants</h1>
          <p className="text-muted-foreground">
            Manage your consultant network and track payments
          </p>
        </div>
        <Button>
          <span className="mr-2">➕</span>
          Add Consultant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consultants</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockConsultants.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeConsultants.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Month</CardTitle>
            <span className="text-2xl">⏰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}</div>
            <p className="text-xs text-muted-foreground">
              Across all consultants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{totalCosts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All time payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hourly Rate</CardTitle>
            <span className="text-2xl">💎</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{(mockConsultants.reduce((sum, c) => {
                let rate = c.hourlyRate;
                if (c.currency === 'USD') rate *= 0.92;
                if (c.currency === 'GBP') rate *= 1.17;
                return sum + rate;
              }, 0) / mockConsultants.length).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all consultants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Consultants List */}
      <div className="grid gap-4">
        {mockConsultants.map((consultant) => (
          <Card key={consultant.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{getSpecialtyIcon(consultant.specialty)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{consultant.name}</h3>
                    <p className="text-sm text-muted-foreground">{consultant.email}</p>
                    <p className="text-sm text-muted-foreground">{consultant.phone}</p>
                    <p className="text-sm font-medium text-primary">{consultant.specialty}</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="flex items-center space-x-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Hourly Rate</p>
                      <p className="text-lg font-semibold">
                        {getCurrencySymbol(consultant.currency)}{consultant.hourlyRate}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Hours This Month</p>
                      <p className="text-lg font-semibold">{consultant.hoursThisMonth}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="text-lg font-semibold">
                        {getCurrencySymbol(consultant.currency)}{consultant.totalPaid.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(consultant.status)}`}>
                        {consultant.status.charAt(0).toUpperCase() + consultant.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        Pay
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>
            Latest consultant payments and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockConsultants
              .filter(c => c.lastPayment)
              .sort((a, b) => new Date(b.lastPayment).getTime() - new Date(a.lastPayment).getTime())
              .slice(0, 5)
              .map((consultant) => (
                <div key={consultant.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm">{getSpecialtyIcon(consultant.specialty)}</span>
                    </div>
                    <div>
                      <p className="font-medium">{consultant.name}</p>
                      <p className="text-sm text-muted-foreground">{consultant.specialty}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {getCurrencySymbol(consultant.currency)}{(consultant.hourlyRate * 40).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(consultant.lastPayment).toLocaleDateString()}
                    </p>
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