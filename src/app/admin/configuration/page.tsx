'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, TestTube2, Check, X, AlertTriangle, Database, HardDrive, Zap, Shield, RefreshCw, Activity } from 'lucide-react'
import { toast } from 'sonner'

interface Configuration {
  key: string
  value: string
  category: string
  subcategory?: string
  description?: string
  isSecret: boolean
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'ENCRYPTED'
  environment?: 'LOCAL' | 'PRODUCTION' | 'BOTH'
}

interface TestResult {
  success: boolean
  message: string
  details?: any
}

interface ConnectionStatus {
  success: boolean
  message: string
  type?: string
  provider?: string
  details?: any
}

interface SystemStatus {
  database: {
    type: string
    connection: ConnectionStatus
  }
  storage: {
    provider: string
    connection: ConnectionStatus
  }
}

interface EnvironmentRules {
  allowedDatabaseTypes: string[]
  allowedStorageProviders: string[]
  defaultDatabase: string
  defaultStorage: string
  requiresSecretValidation: boolean
}

export default function SystemConfigurationPage() {
  const [configurations, setConfigurations] = useState<Record<string, Configuration[]>>({})
  const [currentEnvironment, setCurrentEnvironment] = useState<'LOCAL' | 'PRODUCTION'>('LOCAL')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [environmentRules, setEnvironmentRules] = useState<EnvironmentRules | null>(null)

  useEffect(() => {
    loadConfigurations()
    loadSystemStatus()
  }, [])

  const loadConfigurations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/config')
      if (!response.ok) throw new Error('Failed to load configurations')
      
      const data = await response.json()
      setConfigurations(data.configurations)
      setCurrentEnvironment(data.environment)
      setEnvironmentRules(data.environmentRules)
    } catch (error) {
      console.error('Failed to load configurations:', error)
      toast.error('Failed to load system configurations')
    } finally {
      setLoading(false)
    }
  }

  const initializeDefaults = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/config', {
        method: 'PUT'
      })
      if (!response.ok) throw new Error('Failed to initialize configurations')
      
      const data = await response.json()
      toast.success(data.message)
      await loadConfigurations()
    } catch (error) {
      console.error('Failed to initialize configurations:', error)
      toast.error('Failed to initialize default configurations')
    } finally {
      setSaving(false)
    }
  }

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/admin/config/status')
      if (!response.ok) throw new Error('Failed to load system status')
      
      const data = await response.json()
      setSystemStatus(data.status)
    } catch (error) {
      console.error('Failed to load system status:', error)
    }
  }

  const refreshSystemStatus = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/admin/config/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' })
      })
      
      if (!response.ok) throw new Error('Failed to refresh system status')
      
      const data = await response.json()
      if (data.success) {
        setSystemStatus({
          database: {
            type: data.tests.database.type || 'unknown',
            connection: data.tests.database
          },
          storage: {
            provider: data.tests.storage.provider || 'unknown',
            connection: data.tests.storage
          }
        })
        toast.success('System status refreshed successfully')
      } else {
        toast.error('Failed to refresh system status')
      }
    } catch (error) {
      console.error('Failed to refresh system status:', error)
      toast.error('Failed to refresh system status')
    } finally {
      setRefreshing(false)
    }
  }

  const updateConfiguration = (key: string, field: string, value: any) => {
    setConfigurations(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(category => {
        const configIndex = updated[category].findIndex(c => c.key === key)
        if (configIndex !== -1) {
          updated[category][configIndex] = {
            ...updated[category][configIndex],
            [field]: value
          }
        }
      })
      return updated
    })
    setIsDirty(true)
  }

  const testConfiguration = async (config: Configuration) => {
    if (!config.value && !config.isSecret) return

    try {
      setTesting(config.key)
      const testData = {
        key: config.key,
        value: config.value,
        dataType: config.dataType,
        isSecret: config.isSecret,
        testType: getTestType(config.key)
      }

      // Add additional fields for specific test types
      if (config.key === 'database.supabase.url') {
        const anonKey = configurations.DATABASE?.find(c => c.key === 'database.supabase.anon_key')?.value
        testData.anonKey = anonKey
      } else if (config.key === 'storage.supabase.bucket') {
        const url = configurations.DATABASE?.find(c => c.key === 'database.supabase.url')?.value
        const serviceKey = configurations.DATABASE?.find(c => c.key === 'database.supabase.service_role_key')?.value
        testData.url = url
        testData.serviceKey = serviceKey
      } else if (config.key === 'integrations.airwallex.api_key') {
        const clientId = configurations.INTEGRATIONS?.find(c => c.key === 'integrations.airwallex.client_id')?.value
        const baseUrl = configurations.INTEGRATIONS?.find(c => c.key === 'integrations.airwallex.base_url')?.value
        testData.clientId = clientId
        testData.baseUrl = baseUrl
      }

      const response = await fetch('/api/admin/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })

      const result = await response.json()
      setTestResults(prev => ({
        ...prev,
        [config.key]: result
      }))

      if (result.success) {
        toast.success(`${getConfigDisplayName(config.key)} test passed`)
      } else {
        toast.error(`${getConfigDisplayName(config.key)} test failed: ${result.message}`)
      }
    } catch (error) {
      console.error('Test failed:', error)
      setTestResults(prev => ({
        ...prev,
        [config.key]: {
          success: false,
          message: 'Test failed due to an error'
        }
      }))
      toast.error('Configuration test failed')
    } finally {
      setTesting(null)
    }
  }

  const saveConfigurations = async () => {
    try {
      setSaving(true)
      const allConfigs = Object.values(configurations).flat()
      
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configurations: allConfigs })
      })

      if (!response.ok) throw new Error('Failed to save configurations')
      
      const data = await response.json()
      if (data.success) {
        toast.success(data.message)
        setIsDirty(false)
        await loadConfigurations()
      } else {
        toast.error(`Save failed: ${data.message}`)
      }
    } catch (error) {
      console.error('Failed to save configurations:', error)
      toast.error('Failed to save configurations')
    } finally {
      setSaving(false)
    }
  }

  const getTestType = (key: string): string => {
    if (key.includes('database.supabase')) return 'database.supabase'
    if (key.includes('storage.supabase')) return 'storage.supabase'
    if (key.includes('storage.local')) return 'storage.local'
    if (key.includes('airwallex')) return 'integrations.airwallex'
    return 'basic'
  }

  const getConfigDisplayName = (key: string): string => {
    const parts = key.split('.')
    return parts[parts.length - 1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const shouldShowConfig = (config: Configuration): boolean => {
    if (!config.environment || config.environment === 'BOTH') return true
    return config.environment === currentEnvironment
  }

  const renderConfigurationField = (config: Configuration) => {
    const testResult = testResults[config.key]
    const canTest = ['database.supabase.url', 'storage.supabase.bucket', 'storage.local.path', 'integrations.airwallex.api_key'].includes(config.key)

    return (
      <div key={config.key} className="space-y-2 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor={config.key} className="text-sm font-medium">
              {getConfigDisplayName(config.key)}
              {config.isSecret && <Badge variant="secondary" className="ml-2">Secret</Badge>}
            </Label>
            {config.description && (
              <p className="text-xs text-muted-foreground">{config.description}</p>
            )}
          </div>
          {testResult && (
            <div className="flex items-center space-x-2">
              {testResult.success ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              {canTest && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConfiguration(config)}
                  disabled={testing === config.key}
                >
                  {testing === config.key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <TestTube2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {config.dataType === 'BOOLEAN' ? (
          <div className="flex items-center space-x-2">
            <Switch
              id={config.key}
              checked={config.value === 'true'}
              onCheckedChange={(checked) => updateConfiguration(config.key, 'value', checked.toString())}
            />
            <Label htmlFor={config.key} className="text-sm">
              {config.value === 'true' ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        ) : config.key.includes('.type') || config.key.includes('.provider') ? (
          <Select
            value={config.value}
            onValueChange={(value) => updateConfiguration(config.key, 'value', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              {config.key.includes('database.type') && environmentRules && (
                <>
                  {environmentRules.allowedDatabaseTypes.includes('local') && (
                    <SelectItem value="local">Local PostgreSQL</SelectItem>
                  )}
                  {environmentRules.allowedDatabaseTypes.includes('supabase') && (
                    <SelectItem value="supabase">Supabase</SelectItem>
                  )}
                </>
              )}
              {config.key.includes('storage.provider') && environmentRules && (
                <>
                  {environmentRules.allowedStorageProviders.includes('local') && (
                    <SelectItem value="local">Local Storage</SelectItem>
                  )}
                  {environmentRules.allowedStorageProviders.includes('supabase') && (
                    <SelectItem value="supabase">Supabase Storage</SelectItem>
                  )}
                </>
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={config.key}
            type={config.isSecret ? 'password' : config.dataType === 'NUMBER' ? 'number' : 'text'}
            value={config.isSecret && config.value ? '••••••••' : config.value}
            onChange={(e) => updateConfiguration(config.key, 'value', e.target.value)}
            placeholder={config.isSecret ? 'Enter secret value' : 'Enter value'}
            className={testResult && !testResult.success ? 'border-red-500' : ''}
          />
        )}

        {testResult && !testResult.success && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}

        {canTest && !testResult && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => testConfiguration(config)}
            disabled={testing === config.key || (!config.value && !config.isSecret)}
            className="w-full"
          >
            {testing === config.key ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                Testing...
              </>
            ) : (
              <>
                <TestTube2 className="h-3 w-3 mr-2" />
                Test Configuration
              </>
            )}
          </Button>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Configure database, storage, and integrations. Environment: 
              <Badge variant="outline" className="ml-2">{currentEnvironment}</Badge>
              {environmentRules && (
                <span className="ml-4 text-xs">
                  Allowed: DB({environmentRules.allowedDatabaseTypes.join(', ')}), 
                  Storage({environmentRules.allowedStorageProviders.join(', ')})
                </span>
              )}
            </p>
          </div>
          <div className="flex space-x-2">
            {Object.keys(configurations).length === 0 && (
              <Button onClick={initializeDefaults} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Initialize Defaults
              </Button>
            )}
            <Button 
              onClick={saveConfigurations} 
              disabled={!isDirty || saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        {Object.keys(configurations).length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No Configurations Found</h3>
                  <p className="text-muted-foreground">Click "Initialize Defaults" to set up system configurations.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* System Status Panel */}
            {systemStatus && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <CardTitle>System Status</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshSystemStatus}
                      disabled={refreshing}
                    >
                      {refreshing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Refresh
                    </Button>
                  </div>
                  <CardDescription>
                    Current system connections and status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Database Status */}
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Database className="h-4 w-4" />
                          <span className="font-medium">Database</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {systemStatus.database.connection.success ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <Badge variant={systemStatus.database.connection.success ? "default" : "destructive"}>
                            {systemStatus.database.type}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {systemStatus.database.connection.message}
                      </p>
                    </div>

                    {/* Storage Status */}
                    <div className="space-y-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <HardDrive className="h-4 w-4" />
                          <span className="font-medium">Storage</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {systemStatus.storage.connection.success ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                          <Badge variant={systemStatus.storage.connection.success ? "default" : "destructive"}>
                            {systemStatus.storage.provider}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {systemStatus.storage.connection.message}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="DATABASE" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="DATABASE" className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>Database</span>
              </TabsTrigger>
              <TabsTrigger value="STORAGE" className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4" />
                <span>Storage</span>
              </TabsTrigger>
              <TabsTrigger value="INTEGRATIONS" className="flex items-center space-x-2">
                <Zap className="h-4 w-4" />
                <span>Integrations</span>
              </TabsTrigger>
              <TabsTrigger value="SYSTEM" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>System</span>
              </TabsTrigger>
            </TabsList>

            {Object.entries(configurations).map(([category, configs]) => (
              <TabsContent key={category} value={category}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {category === 'DATABASE' && <Database className="h-5 w-5" />}
                      {category === 'STORAGE' && <HardDrive className="h-5 w-5" />}
                      {category === 'INTEGRATIONS' && <Zap className="h-5 w-5" />}
                      {category === 'SYSTEM' && <Shield className="h-5 w-5" />}
                      <span>{category} Configuration</span>
                    </CardTitle>
                    <CardDescription>
                      {category === 'DATABASE' && 'Configure database connection and provider settings'}
                      {category === 'STORAGE' && 'Configure file storage provider and settings'}
                      {category === 'INTEGRATIONS' && 'Configure external API integrations and credentials'}
                      {category === 'SYSTEM' && 'Configure system-wide settings and limits'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {configs
                        .filter(shouldShowConfig)
                        .map(renderConfigurationField)
                      }
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
          </>
        )}

        {isDirty && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have unsaved changes. Don't forget to click "Save Changes" to apply your modifications.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}