import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Mail, Phone, MapPin, Building2, CreditCard, FileText, Edit, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { DocumentSection } from '@/components/documents'
import { SupplierStatus } from '@prisma/client'

interface SupplierDetailPageProps {
  params: {
    id: string
  }
}

async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      documents: {
        where: {
          deletedAt: null,
          isActive: true
        },
        orderBy: {
          uploadedAt: 'desc'
        }
      }
    }
  })

  return supplier
}

export default async function SupplierDetailPage({ params }: SupplierDetailPageProps) {
  const resolvedParams = await params
  const supplier = await getSupplier(resolvedParams.id)

  if (!supplier) {
    notFound()
  }

  const getStatusColor = (status: SupplierStatus) => {
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

  const fullName = `${supplier.firstName} ${supplier.lastName}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/entities/suppliers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Suppliers
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{fullName}</h1>
            <p className="text-sm text-muted-foreground">Supplier Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/entities/suppliers/${supplier.id}/edit`}>
            <Button size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Supplier
            </Button>
          </Link>
          {supplier.airwallexBeneficiaryId && (
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync with Airwallex
            </Button>
          )}
          <Badge variant={getStatusColor(supplier.status)}>{supplier.status}</Badge>
        </div>
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
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Full Name</span>
                </div>
                <p className="text-sm">{fullName}</p>
              </div>
              
              {supplier.company && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Company</span>
                  </div>
                  <p className="text-sm">{supplier.company}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-sm">{supplier.email}</p>
              </div>

              {supplier.phone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Phone</span>
                  </div>
                  <p className="text-sm">{supplier.phone}</p>
                </div>
              )}

              {supplier.vatNumber && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">VAT Number</span>
                  </div>
                  <p className="text-sm">{supplier.vatNumber}</p>
                </div>
              )}
            </div>

            {(supplier.address || supplier.city || supplier.country) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Address</span>
                </div>
                <p className="text-sm">
                  {supplier.address && <>{supplier.address}<br /></>}
                  {supplier.city && <>{supplier.city}, </>}
                  {supplier.addressState && <>{supplier.addressState} </>}
                  {supplier.postalCode && <>{supplier.postalCode}<br /></>}
                  {supplier.country}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banking & Sync Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.bankAccountName && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Bank Account</p>
                <p className="text-sm">{supplier.bankAccountName}</p>
                {supplier.bankName && (
                  <p className="text-xs text-muted-foreground">{supplier.bankName}</p>
                )}
              </div>
            )}

            {supplier.iban && (
              <div className="space-y-2">
                <p className="text-sm font-medium">IBAN</p>
                <p className="text-xs font-mono">{supplier.iban}</p>
              </div>
            )}

            {supplier.swiftCode && (
              <div className="space-y-2">
                <p className="text-sm font-medium">SWIFT Code</p>
                <p className="text-sm">{supplier.swiftCode}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Airwallex Sync</p>
              <Badge 
                variant={
                  supplier.airwallexSyncStatus === 'SYNCED' ? 'success' : 
                  supplier.airwallexSyncStatus === 'ERROR' ? 'destructive' : 
                  'secondary'
                }
              >
                {supplier.airwallexSyncStatus || 'NONE'}
              </Badge>
              {supplier.airwallexLastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {new Date(supplier.airwallexLastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Upload and manage documents for this supplier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DocumentSection
                entityType="contractor" 
                entityId={supplier.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Recent payments to this supplier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Payment history coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>
                Document compliance and verification status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    ID Document
                  </p>
                  {supplier.idDocumentUrl ? (
                    <Badge variant="success">Uploaded</Badge>
                  ) : (
                    <Badge variant="secondary">Missing</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Proof of Address
                  </p>
                  {supplier.proofOfAddressUrl ? (
                    <Badge variant="success">Uploaded</Badge>
                  ) : (
                    <Badge variant="secondary">Missing</Badge>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Required Documents</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Valid ID (Passport or National ID)</li>
                  <li>• Proof of Address (Less than 3 months old)</li>
                  <li>• Tax Forms (W-9 or W-8)</li>
                  <li>• Bank Account Verification</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Recent activity for this supplier
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