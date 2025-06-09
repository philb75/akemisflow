import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Mock data for development
const mockClients = [
  {
    id: '1',
    name: 'OpenIT Consulting',
    email: 'contact@openit.fr',
    phone: '+33 1 42 34 56 78',
    country: 'FR',
    currency: 'EUR',
    totalInvoiced: 28679.86,
    pendingAmount: 8500.00,
    status: 'active',
  },
  {
    id: '2',
    name: 'TechCorp Ltd',
    email: 'contact@techcorp.com',
    phone: '+44 20 7123 4567',
    country: 'GB',
    currency: 'GBP',
    totalInvoiced: 45250.00,
    pendingAmount: 0,
    status: 'active',
  },
  {
    id: '3',
    name: 'Global Solutions Inc',
    email: 'info@globalsolutions.com',
    phone: '+1 555 123 4567',
    country: 'US',
    currency: 'USD',
    totalInvoiced: 67800.00,
    pendingAmount: 15000.00,
    status: 'active',
  },
];

function getCountryFlag(countryCode: string) {
  const flags: { [key: string]: string } = {
    FR: '🇫🇷',
    GB: '🇬🇧',
    US: '🇺🇸',
  };
  return flags[countryCode] || '🌍';
}

function getCurrencySymbol(currency: string) {
  const symbols: { [key: string]: string } = {
    EUR: '€',
    GBP: '£',
    USD: '$',
  };
  return symbols[currency] || currency;
}

export default function ClientsPage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client companies and contacts
          </p>
        </div>
        <Button>
          <span className="mr-2">➕</span>
          Add Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <span className="text-2xl">🏢</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockClients.length}</div>
            <p className="text-xs text-muted-foreground">
              All active clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{mockClients.reduce((sum, client) => {
                // Convert all to EUR for display (simplified)
                let amount = client.totalInvoiced;
                if (client.currency === 'USD') amount *= 0.92;
                if (client.currency === 'GBP') amount *= 1.17;
                return sum + amount;
              }, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all currencies
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
              €{mockClients.reduce((sum, client) => {
                // Convert all to EUR for display (simplified)
                let amount = client.pendingAmount;
                if (client.currency === 'USD') amount *= 0.92;
                if (client.currency === 'GBP') amount *= 1.17;
                return sum + amount;
              }, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Outstanding invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <div className="grid gap-4">
        {mockClients.map((client) => (
          <Card key={client.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{getCountryFlag(client.country)}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{client.name}</h3>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                    <p className="text-sm text-muted-foreground">{client.phone}</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Invoiced</p>
                      <p className="text-lg font-semibold">
                        {getCurrencySymbol(client.currency)}{client.totalInvoiced.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className={`text-lg font-semibold ${
                        client.pendingAmount > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {getCurrencySymbol(client.currency)}{client.pendingAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}