import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Mail, Phone, MapPin, Building2, CreditCard, FileText, Edit, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { DocumentSection } from '@/components/documents'
import { ContractorStatus } from '@prisma/client'

interface ContractorDetailPageProps {
  params: {
    id: string
  }
}

async function getContractor(id: string) {
  const contractor = await prisma.contractor.findUnique({
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

  return contractor
}

export default async function ContractorDetailPage({ params }: ContractorDetailPageProps) {
  const resolvedParams = await params
  const contractor = await getContractor(resolvedParams.id)

  if (!contractor) {
    notFound()
  }

  const getStatusColor = (status: ContractorStatus) => {
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

  const fullName = `${contractor.firstName} ${contractor.lastName}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/entities/contractors">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contractors
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{fullName}</h1>
            <p className="text-sm text-muted-foreground">Contractor Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/entities/contractors/${contractor.id}/edit`}>
            <Button size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Edit Contractor
            </Button>
          </Link>
          {contractor.airwallexBeneficiaryId && (
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync with Airwallex
            </Button>
          )}
          <Badge variant={getStatusColor(contractor.status)}>{contractor.status}</Badge>
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
              
              {contractor.company && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Company</span>
                  </div>
                  <p className="text-sm">{contractor.company}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-sm">{contractor.email}</p>
              </div>

              {contractor.phone && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Phone</span>
                  </div>
                  <p className="text-sm">{contractor.phone}</p>
                </div>
              )}

              {contractor.vatNumber && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">VAT Number</span>
                  </div>
                  <p className="text-sm">{contractor.vatNumber}</p>
                </div>
              )}
            </div>

            {(contractor.address || contractor.city || contractor.country) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Address</span>
                </div>
                <p className="text-sm">
                  {contractor.address && <>{contractor.address}<br /></>}
                  {contractor.city && <>{contractor.city}, </>}
                  {contractor.addressState && <>{contractor.addressState} </>}
                  {contractor.postalCode && <>{contractor.postalCode}<br /></>}
                  {contractor.country}
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
            {contractor.bankAccountName && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Bank Account</p>
                <p className="text-sm">{contractor.bankAccountName}</p>
                {contractor.bankName && (
                  <p className="text-xs text-muted-foreground">{contractor.bankName}</p>
                )}
              </div>
            )}

            {contractor.iban && (
              <div className="space-y-2">
                <p className="text-sm font-medium">IBAN</p>
                <p className="text-xs font-mono">{contractor.iban}</p>
              </div>
            )}

            {contractor.swiftCode && (
              <div className="space-y-2">
                <p className="text-sm font-medium">SWIFT Code</p>
                <p className="text-sm">{contractor.swiftCode}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Airwallex Sync</p>
              <Badge 
                variant={
                  contractor.airwallexSyncStatus === 'SYNCED' ? 'success' : 
                  contractor.airwallexSyncStatus === 'ERROR' ? 'destructive' : 
                  'secondary'
                }
              >
                {contractor.airwallexSyncStatus || 'NONE'}
              </Badge>
              {contractor.airwallexLastSyncAt && (
                <p className="text-xs text-muted-foreground">
                  Last sync: {new Date(contractor.airwallexLastSyncAt).toLocaleString()}
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
                Upload and manage documents for this contractor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DocumentSection
                entityType="contractor" 
                entityId={contractor.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Recent payments to this contractor
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
                  {contractor.idDocumentUrl ? (
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
                  {contractor.proofOfAddressUrl ? (
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
                Recent activity for this contractor
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