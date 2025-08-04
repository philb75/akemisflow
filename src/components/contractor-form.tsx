"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Save, 
  RefreshCw, 
  User, 
  Building, 
  MapPin, 
  CreditCard, 
  ExternalLink,
  Calendar,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { ContractorData, CONTRACTOR_FIELD_CATEGORIES } from '@/types/contractor'

interface ContractorFormProps {
  contractor?: ContractorData
  onSave: (data: Partial<ContractorData>) => Promise<void>
  onSyncAirwallex?: (contractorId: string, options?: any) => Promise<void>
  isLoading?: boolean
  isNew?: boolean
}

export function ContractorForm({ 
  contractor, 
  onSave, 
  onSyncAirwallex, 
  isLoading = false, 
  isNew = false 
}: ContractorFormProps) {
  const [formData, setFormData] = useState<Partial<ContractorData>>(contractor || {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncOptions, setSyncOptions] = useState({
    overwriteExisting: true,
    applyNameFormatting: true,
    selectedFields: {} as Record<string, boolean>
  })

  useEffect(() => {
    if (contractor) {
      setFormData(contractor)
    }
  }, [contractor])

  const handleInputChange = (field: keyof ContractorData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setIsDirty(true)
    
    // Clear field error
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    // Required fields
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }
    
    // Birth date format
    if (formData.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(formData.birthDate)) {
      newErrors.birthDate = 'Use YYYY-MM-DD format'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return
    
    try {
      await onSave(formData)
      setIsDirty(false)
    } catch (error: any) {
      setErrors({ general: error.message })
    }
  }

  const handleSyncAirwallex = async () => {
    if (!contractor?.id || !onSyncAirwallex) return
    
    setSyncing(true)
    try {
      await onSyncAirwallex(contractor.id, syncOptions)
      setIsDirty(false)
    } catch (error: any) {
      setErrors({ sync: error.message })
    } finally {
      setSyncing(false)
    }
  }

  const renderFieldGroup = (groupKey: keyof typeof CONTRACTOR_FIELD_CATEGORIES) => {
    const group = CONTRACTOR_FIELD_CATEGORIES[groupKey]
    
    return (
      <Card key={groupKey} className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            {groupKey === 'personal' && <User className="w-5 h-5" />}
            {groupKey === 'company' && <Building className="w-5 h-5" />}
            {groupKey === 'address' && <MapPin className="w-5 h-5" />}
            {groupKey === 'banking' && <CreditCard className="w-5 h-5" />}
            {groupKey === 'airwallex' && <ExternalLink className="w-5 h-5" />}
            {group.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map((field) => renderField(field as keyof ContractorData))})
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderField = (field: keyof ContractorData) => {
    const value = formData[field]
    const error = errors[field]
    const isReadonly = ['id', 'createdAt', 'updatedAt', 'airwallexBeneficiaryId'].includes(field)
    const isAirwallexSyncable = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'city', 
      'zipCode', 'state', 'country', 'companyName', 'bankAccountName', 
      'bankAccountNumber', 'bankName', 'swiftCode', 'airwallexEntityType'
    ].includes(field)

    const fieldLabel = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())

    const commonProps = {
      id: field,
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        handleInputChange(field, e.target.value),
      disabled: isLoading || isReadonly,
      className: error ? 'border-red-500' : ''
    }

    return (
      <div key={field} className="space-y-2">
        <Label htmlFor={field} className="flex items-center gap-2">
          {fieldLabel}
          {isAirwallexSyncable && (
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              Airwallex
            </Badge>
          )}
          {['firstName', 'lastName', 'email'].includes(field) && (
            <span className="text-red-500">*</span>
          )}
        </Label>

        {/* Different input types based on field */}
        {field === 'email' && (
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input {...commonProps} type="email" className="pl-10" />
          </div>
        )}
        
        {field === 'phone' && (
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input {...commonProps} type="tel" className="pl-10" />
          </div>
        )}
        
        {field === 'birthDate' && (
          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input {...commonProps} type="date" className="pl-10" />
          </div>
        )}
        
        {field === 'status' && (
          <Select
            value={value as string || 'ACTIVE'}
            onValueChange={(value) => handleInputChange(field, value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {field === 'airwallexEntityType' && (
          <Select
            value={value as string || ''}
            onValueChange={(value) => handleInputChange(field, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERSONAL">Personal</SelectItem>
              <SelectItem value="COMPANY">Company</SelectItem>
            </SelectContent>
          </Select>
        )}
        
        {field === 'isActive' && (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value as boolean}
              onCheckedChange={(checked) => handleInputChange(field, checked)}
              disabled={isLoading}
            />
            <Label>Active</Label>
          </div>
        )}
        
        {field === 'position' && (
          <Textarea 
            {...commonProps}
            rows={2}
            placeholder="Job title, role, or position"
          />
        )}
        
        {!['email', 'phone', 'birthDate', 'status', 'airwallexEntityType', 'isActive', 'position'].includes(field) && (
          <Input {...commonProps} />
        )}

        {error && (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isNew ? 'New Contractor' : 'Edit Contractor'}
          </h1>
          {contractor && (
            <p className="text-gray-600">
              {contractor.firstName} {contractor.lastName} • {contractor.email}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {contractor?.airwallexBeneficiaryId && onSyncAirwallex && (
            <Button
              onClick={handleSyncAirwallex}
              disabled={syncing}
              variant="outline"
              className="text-orange-600 border-orange-300"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync with Airwallex
            </Button>
          )}
          
          <Button
            onClick={handleSave}
            disabled={!isDirty || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Sync Status */}
      {contractor?.airwallexBeneficiaryId && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium">Linked to Airwallex</span>
                <Badge variant="outline">{contractor.airwallexEntityType}</Badge>
              </div>
              <div className="text-sm text-gray-600">
                Last sync: {contractor.airwallexLastSyncAt 
                  ? new Date(contractor.airwallexLastSyncAt).toLocaleString()
                  : 'Never'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Sections */}
      {renderFieldGroup('personal')}
      {renderFieldGroup('address')}
      {renderFieldGroup('company')}
      {renderFieldGroup('banking')}
      
      {contractor?.airwallexBeneficiaryId && renderFieldGroup('airwallex')}
      
      {!isNew && renderFieldGroup('system')}

      {/* Error Messages */}
      {errors.general && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {errors.general}
            </div>
          </CardContent>
        </Card>
      )}

      {errors.sync && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Sync Error: {errors.sync}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}