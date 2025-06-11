"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Mock data for reports
const mockReportData = {
  monthlyRevenue: {
    current: 28450.00,
    previous: 25200.00,
    change: 12.9,
    currency: 'EUR'
  },
  yearToDate: {
    revenue: 185750.00,
    expenses: 142300.00,
    profit: 43450.00,
    currency: 'EUR'
  },
  topClients: [
    { name: 'Global Solutions Inc', revenue: 67800.00, currency: 'USD' },
    { name: 'TechCorp Ltd', revenue: 45250.00, currency: 'GBP' },
    { name: 'OpenIT Consulting', revenue: 28679.86, currency: 'EUR' },
  ],
  monthlyTrends: [
    { month: 'Jan', revenue: 24500, expenses: 18200 },
    { month: 'Feb', revenue: 27800, expenses: 19500 },
    { month: 'Mar', revenue: 31200, expenses: 21800 },
    { month: 'Apr', revenue: 29500, expenses: 20300 },
    { month: 'May', revenue: 32800, expenses: 22100 },
    { month: 'Jun', revenue: 28450, expenses: 19800 },
  ]
};

function getCurrencySymbol(currency: string) {
  const symbols: { [key: string]: string } = {
    EUR: '€',
    GBP: '£',
    USD: '$',
  };
  return symbols[currency] || currency;
}

export default function ReportsPage() {
  const profitMargin = ((mockReportData.yearToDate.profit / mockReportData.yearToDate.revenue) * 100).toFixed(1);

  return (
    <DashboardLayout>
      <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Financial insights and business analytics
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <span className="mr-2">📊</span>
            Export Data
          </Button>
          <Button>
            <span className="mr-2">📈</span>
            Custom Report
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{mockReportData.monthlyRevenue.current.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{mockReportData.monthlyRevenue.change}%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Revenue</CardTitle>
            <span className="text-2xl">📈</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{mockReportData.yearToDate.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Year to date total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Profit</CardTitle>
            <span className="text-2xl">🎯</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{mockReportData.yearToDate.profit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {profitMargin}% profit margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <span className="text-2xl">📉</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{mockReportData.yearToDate.expenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Year to date expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>
              Revenue vs Expenses over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockReportData.monthlyTrends.map((month, index) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="font-medium w-12">{month.month}</div>
                  <div className="flex-1 mx-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{width: `${(month.revenue / 35000) * 100}%`}}
                        ></div>
                      </div>
                      <div className="text-sm w-16 text-right">
                        €{(month.revenue / 1000).toFixed(0)}k
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-red-400 h-1 rounded-full" 
                          style={{width: `${(month.expenses / 35000) * 100}%`}}
                        ></div>
                      </div>
                      <div className="text-xs w-16 text-right text-muted-foreground">
                        €{(month.expenses / 1000).toFixed(0)}k
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center space-x-4 mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm">Revenue</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded"></div>
                <span className="text-sm">Expenses</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Revenue</CardTitle>
            <CardDescription>
              Highest contributing clients this year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockReportData.topClients.map((client, index) => (
                <div key={client.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getCurrencySymbol(client.currency)} revenue
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {getCurrencySymbol(client.currency)}{client.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((client.revenue * (client.currency === 'USD' ? 0.92 : client.currency === 'GBP' ? 1.17 : 1)) / mockReportData.yearToDate.revenue * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Reports</CardTitle>
          <CardDescription>
            Generate common business reports instantly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <span className="text-2xl">📊</span>
              <span className="text-sm">Profit & Loss</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <span className="text-2xl">🏦</span>
              <span className="text-sm">Cash Flow</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <span className="text-2xl">📈</span>
              <span className="text-sm">Growth Analysis</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <span className="text-2xl">🎯</span>
              <span className="text-sm">Tax Summary</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export & Integration</CardTitle>
          <CardDescription>
            Export data for accounting software and analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium">CSV Export</p>
                  <p className="text-sm text-muted-foreground">Raw data for analysis</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Export</Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📊</span>
                <div>
                  <p className="font-medium">Excel Report</p>
                  <p className="text-sm text-muted-foreground">Formatted spreadsheet</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Generate</Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🔗</span>
                <div>
                  <p className="font-medium">QuickBooks</p>
                  <p className="text-sm text-muted-foreground">Sync with accounting</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}