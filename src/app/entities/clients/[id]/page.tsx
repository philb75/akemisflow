import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Building2, Mail, Phone, MapPin, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { DocumentSection } from '@/components/documents'
import { ContactStatus } from '@prisma/client'

interface ClientDetailPageProps {
  params: {
    id: string
  }
}

async function getClient(id: string) {
  const client = await prisma.contact.findUnique({
    where: { 
      id,
      contactType: 'CLIENT_COMPANY'
    },
    include: {
      bankAccounts: true,
      documents: {
        where: {
          deletedAt: null,
          isActive: true
        },
        orderBy: {
          uploadedAt: 'desc'
        }
      },
      clientInvoices: {
        take: 5,
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  })

  return client
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const resolvedParams = await params
  const client = await getClient(resolvedParams.id)

  if (!client) {
    notFound()
  }

  const getStatusColor = (status: ContactStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'INACTIVE':
        return 'secondary'
      case 'SUSPENDED':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/entities/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{client.name}</h1>
            <p className="text-sm text-muted-foreground">Client Details</p>
          </div>
        </div>
        <Badge variant={getStatusColor(client.status)}>{client.status}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Company Name</span>
                </div>
                <p className="text-sm">{client.name}</p>
              </div>
              
              {client.email && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Email</span>
                  </div>
                  <p className="text-sm">{client.email}</p>
                </div>
              )}

              {client.phone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Phone</span>
                  </div>
                  <p className="text-sm">{client.phone}</p>
                </div>
              )}

              {client.taxId && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Tax ID</span>
                  </div>
                  <p className="text-sm">{client.taxId}</p>
                </div>
              )}
            </div>

            {(client.addressLine1 || client.city || client.country) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Address</span>
                </div>
                <p className="text-sm">
                  {client.addressLine1 && <>{client.addressLine1}<br /></>}
                  {client.addressLine2 && <>{client.addressLine2}<br /></>}
                  {client.city && <>{client.city}, </>}
                  {client.state && <>{client.state} </>}
                  {client.postalCode && <>{client.postalCode}<br /></>}
                  {client.country}
                </p>
              </div>
            )}

            {client.notes && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Notes</p>
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Onboarding Status</p>
              <Badge variant="outline">{client.clientOnboardingStatus || 'NEW'}</Badge>
            </div>
            
            {client.clientCategory && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Category</p>
                <p className="text-sm">{client.clientCategory}</p>
              </div>
            )}

            {client.clientRiskRating && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Risk Rating</p>
                <Badge 
                  variant={
                    client.clientRiskRating === 'HIGH' ? 'destructive' : 
                    client.clientRiskRating === 'MEDIUM' ? 'warning' : 
                    'success'
                  }
                >
                  {client.clientRiskRating}
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Currency</p>
              <p className="text-sm">{client.currencyPreference || 'EUR'}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Invoice Delivery</p>
              <p className="text-sm">{client.invoiceDeliveryMethod || 'EMAIL'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="bank-accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Upload and manage documents for this client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DocumentSection
                entityType="entity" 
                entityId={client.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>
                Latest invoices for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.clientInvoices.length > 0 ? (
                <div className="space-y-4">
                  {client.clientInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {invoice.currency} {invoice.amount.toString()}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No invoices found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank-accounts">
          <Card>
            <CardHeader>
              <CardTitle>Bank Accounts</CardTitle>
              <CardDescription>
                Bank accounts associated with this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.bankAccounts.length > 0 ? (
                <div className="space-y-4">
                  {client.bankAccounts.map((account) => (
                    <div key={account.id} className="border-b pb-2">
                      <p className="font-medium">{account.accountName}</p>
                      <p className="text-sm text-muted-foreground">
                        {account.bankName} - {account.currency}
                      </p>
                      {account.iban && (
                        <p className="text-xs text-muted-foreground">IBAN: {account.iban}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bank accounts found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Recent activity for this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Activity tracking coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}