"use client"

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpIcon, 
  ArrowDownIcon,
  Download,
  Upload,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Trash2,
  X,
  Eye,
  EyeOff
} from 'lucide-react'

interface Transaction {
  id: string
  transactionDate: string
  description: string
  amount: number
  currency: string
  transactionType: 'CREDIT' | 'DEBIT'
  category: string
  status: string
  bankAccount: {
    accountName: string
    bankName: string
  }
  referenceNumber?: string
  airwallexTransactionId?: string
  feeAmount?: number | null
  feeCurrency?: string | null
  source: string
  sourceType?: string
  balanceAfterTransaction?: number | null
  originalDescription?: string
  exchangeRate?: number | null
  originalAmount?: number | null
  originalCurrency?: string | null
  valueDate?: string
  batchId?: string
  reconciliationStatus?: string
  transactionPurpose?: string
  complianceNotes?: string
  counterpartyContactId?: string
  createdAt: string
  updatedAt: string
}

interface TransactionStats {
  totalTransactions: number
  totalCredits: number
  totalDebits: number
  netFlow: number
  currencies: string[]
}

type SortField = 'transactionDate' | 'description' | 'amount' | 'currency' | 'status'
type SortDirection = 'asc' | 'desc'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteFromDate, setDeleteFromDate] = useState('')
  const [deleteSource, setDeleteSource] = useState('')
  const [deleteBank, setDeleteBank] = useState('')
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [syncFromDate, setSyncFromDate] = useState('')
  const [sortField, setSortField] = useState<SortField>('transactionDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('All')
  const [showAllFields, setShowAllFields] = useState<boolean>(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    bank: 80,           // w-20 = 80px
    date: 128,          // w-32 = 128px
    description: 300,   // w-75 = 300px (wider for full descriptions)
    amount: 112,        // w-28 = 112px
    currency: 64,       // w-16 = 64px
    status: 80,         // w-20 = 80px
    sourceType: 100,    // w-25 = 100px
    balance: 120,       // w-30 = 120px
    feeAmount: 80,      // w-20 = 80px
    reference: 120,     // w-30 = 120px
    airwallexId: 200,   // w-50 = 200px
    category: 100,      // w-25 = 100px
    exchangeRate: 100,  // w-25 = 100px
    createdAt: 150      // w-38 = 150px
  })
  
  // Resizing state
  const [resizing, setResizing] = useState<string | null>(null)
  const resizingRef = useRef<string | null>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/transactions')
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    try {
      setImporting(true)
      const response = await fetch('/api/transactions/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: 'Balance_Activity_Report_2025-06-14.csv'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Import successful! Imported ${result.imported} transactions, skipped ${result.skipped}`)
        await fetchTransactions() // Refresh the data
      } else {
        alert(`Import failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Import failed due to an error')
    } finally {
      setImporting(false)
    }
  }

  const handleSync = async (fromDate?: string) => {
    try {
      setSyncing(true)
      const response = await fetch('/api/transactions/sync-airwallex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync',
          forceFullSync: false,
          fromDate: fromDate
        }),
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Sync successful! Imported ${result.imported} new transactions, skipped ${result.skipped} duplicates`)
        await fetchTransactions() // Refresh the data
      } else {
        alert(`Sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Sync failed due to an error')
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncFromDate = async () => {
    if (!syncFromDate) {
      alert('Please select a start date')
      return
    }

    const confirmMessage = `Are you sure you want to sync transactions from ${syncFromDate} to now? This will import new transactions from Airwallex.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    await handleSync(syncFromDate)
    setShowSyncDialog(false)
    setSyncFromDate('')
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      const response = await fetch('/api/transactions/sync-airwallex', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test'
        }),
      })

      const result = await response.json()

      if (response.ok) {
        if (result.success) {
          alert(`Connection test successful! ${result.message}`)
        } else {
          alert(`Connection test failed: ${result.message}`)
        }
      } else {
        alert(`Connection test failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Connection test error:', error)
      alert('Connection test failed due to an error')
    } finally {
      setTesting(false)
    }
  }

  const handleDeleteTransactions = async () => {
    console.log('Delete button clicked')
    if (!deleteFromDate) {
      alert('Please select a date')
      return
    }

    const confirmMessage = `Are you sure you want to delete transactions${deleteFromDate ? ` from ${deleteFromDate}` : ''}${deleteBank ? ` from bank "${deleteBank}"` : ''}${deleteSource ? ` with source "${deleteSource}"` : ''}? This action cannot be undone.`
    
    console.log('Showing confirmation:', confirmMessage)
    if (!confirm(confirmMessage)) {
      console.log('User cancelled')
      return
    }

    console.log('User confirmed, starting delete...')
    setDeleting(true)
    try {
      const requestBody: any = {
        fromDate: deleteFromDate
      }


      if (deleteSource) {
        requestBody.source = deleteSource
      }

      if (deleteBank) {
        requestBody.bank = deleteBank
      }

      console.log('Sending request:', requestBody)
      const response = await fetch('/api/transactions/delete-by-date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response result:', result)

      if (result.success) {
        alert(`${result.message}`)
        setShowDeleteDialog(false)
        setDeleteFromDate('')
        setDeleteSource('')
        setDeleteBank('')
        // Refresh transactions
        await fetchTransactions()
      } else {
        alert(`Delete failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Delete failed due to an error')
    } finally {
      setDeleting(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleRowExpansion = (transactionId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId)
    } else {
      newExpanded.add(transactionId)
    }
    setExpandedRows(newExpanded)
  }

  // Get unique currencies from transactions
  const availableCurrencies = ['All', ...Array.from(new Set(transactions.map(t => t.currency))).sort()]
  
  // Filter transactions by selected currency
  const filteredTransactions = selectedCurrency === 'All' 
    ? transactions 
    : transactions.filter(t => t.currency === selectedCurrency)
  
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    // Handle special sorting for different data types
    if (sortField === 'transactionDate') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    } else if (sortField === 'amount') {
      aValue = Math.abs(parseFloat(aValue.toString()))
      bValue = Math.abs(parseFloat(bValue.toString()))
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" />
      : <ChevronDown className="h-4 w-4 text-blue-600" />
  }

  // Column resizing handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return
    
    const deltaX = e.clientX - startXRef.current
    const newWidth = Math.max(50, startWidthRef.current + deltaX) // Minimum width of 50px
    
    console.log('Mouse move - column:', resizingRef.current, 'deltaX:', deltaX, 'newWidth:', newWidth)
    
    setColumnWidths(prev => ({
      ...prev,
      [resizingRef.current!]: newWidth
    }))
  }, [])

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null
    setResizing(null)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [handleMouseMove])

  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Mouse down on column:', column, 'clientX:', e.clientX)
    
    resizingRef.current = column
    startXRef.current = e.clientX
    startWidthRef.current = columnWidths[column] || 100 // Fallback to 100px if column not found
    
    setResizing(column)
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const preventSort = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  useEffect(() => {
    fetchTransactions()
  }, [])


  const formatAmount = (amount: number) => {
    const isNegative = amount < 0
    const absAmount = Math.abs(amount)
    
    return (
      <span className={`font-semibold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
        {isNegative ? '-' : ''}{absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    // Format as YYYY-MM-DD only (no time)
    if (!dateString) return 'N/A'
    
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return 'Invalid Date'
    }
    
    return date.toISOString().split('T')[0]
  }

  const formatDateTime = (dateString: string) => {
    // Format as full date and time string
    if (!dateString) return 'N/A'
    
    const date = new Date(dateString)
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString)
      return 'Invalid Date'
    }
    
    return date.toLocaleString()
  }

  return (
    <div className="space-y-6">
        {/* Import Controls */}
        <div className="px-6 pt-6">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={() => setShowSyncDialog(true)} 
              disabled={syncing || loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? 'Syncing...' : 'Sync from Airwallex'}
            </Button>
            <Button 
              onClick={handleTestConnection} 
              disabled={testing || loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={importing || loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            <Button 
              onClick={fetchTransactions} 
              variant="outline"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={() => setShowDeleteDialog(true)} 
              variant="outline"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete Transactions
            </Button>
          </div>
        </div>

        {/* Currency Filter and Display Options */}
        <div className="px-6">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-sm font-medium text-gray-700">
              Filter by Currency:
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableCurrencies.map(currency => (
                <option key={currency} value={currency}>
                  {currency === 'All' ? 'All Currencies' : currency}
                </option>
              ))}
            </select>
            <Button
              onClick={() => setShowAllFields(!showAllFields)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {showAllFields ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAllFields ? 'Hide Details' : 'Show All Fields'}
            </Button>
            <span className="text-sm text-gray-500">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </span>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  €{stats.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  €{Math.abs(stats.totalDebits).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{stats.netFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white shadow-sm border-t border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Transactions ({filteredTransactions.length}
              {selectedCurrency !== 'All' && ` ${selectedCurrency}`}
              {filteredTransactions.length !== transactions.length && ` of ${transactions.length}`})
            </h2>
          </div>
          <div>
            {loading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No transactions found. Import the CSV file to get started.</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No transactions found for {selectedCurrency}. Try selecting a different currency.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="min-w-full table-fixed"
                  style={{ 
                    minWidth: showAllFields ? '1800px' : '800px' // Ensure adequate width for all columns
                  }}
                >
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {/* Expand Column */}
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <span>Expand</span>
                      </th>
                      <th 
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                        style={{ width: `${columnWidths.bank || 80}px` }}
                      >
                        <div className="flex items-center justify-between">
                          <span>Bank</span>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                            onMouseDown={(e) => handleMouseDown('bank', e)}
                            onClick={preventSort}
                            onDoubleClick={preventSort}
                            title="Drag to resize column"
                          />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                        style={{ width: `${columnWidths.date || 128}px` }}
                        onClick={() => handleSort('transactionDate')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <span>Date</span>
                            {getSortIcon('transactionDate')}
                          </div>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                            onMouseDown={(e) => handleMouseDown('date', e)}
                            onClick={preventSort}
                            onDoubleClick={preventSort}
                            title="Drag to resize column"
                          />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                        style={{ width: `${columnWidths.description || 300}px` }}
                        onClick={() => handleSort('description')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <span>Description</span>
                            {getSortIcon('description')}
                          </div>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                            onMouseDown={(e) => handleMouseDown('description', e)}
                            onClick={preventSort}
                            onDoubleClick={preventSort}
                            title="Drag to resize column"
                          />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                        style={{ width: `${columnWidths.amount || 112}px` }}
                        onClick={() => handleSort('amount')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center justify-end space-x-1 flex-1">
                            <span>Amount</span>
                            {getSortIcon('amount')}
                          </div>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                            onMouseDown={(e) => handleMouseDown('amount', e)}
                            onClick={preventSort}
                            onDoubleClick={preventSort}
                            title="Drag to resize column"
                          />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                        style={{ width: `${columnWidths.currency || 64}px` }}
                        onClick={() => handleSort('currency')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <span>Curr</span>
                            {getSortIcon('currency')}
                          </div>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                            onMouseDown={(e) => handleMouseDown('currency', e)}
                            onClick={preventSort}
                            onDoubleClick={preventSort}
                            title="Drag to resize column"
                          />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 relative"
                        style={{ width: `${columnWidths.status || 80}px` }}
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <span>Status</span>
                            {getSortIcon('status')}
                          </div>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                            onMouseDown={(e) => handleMouseDown('status', e)}
                            onClick={preventSort}
                            onDoubleClick={preventSort}
                            title="Drag to resize column"
                          />
                        </div>
                      </th>
                      <th 
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                        style={{ width: `${columnWidths.reference || 120}px` }}
                      >
                        <div className="flex items-center justify-between">
                          <span>Reference</span>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                            onMouseDown={(e) => handleMouseDown('reference', e)}
                            onClick={preventSort}
                            onDoubleClick={preventSort}
                            title="Drag to resize column"
                          />
                        </div>
                      </th>
                      
                      {/* Additional columns when showAllFields is enabled */}
                      {showAllFields && (
                        <>
                          <th 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                            style={{ width: `${columnWidths.sourceType || 100}px` }}
                          >
                            <div className="flex items-center justify-between">
                              <span>Source Type</span>
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                                onMouseDown={(e) => handleMouseDown('sourceType', e)}
                                onClick={preventSort}
                                onDoubleClick={preventSort}
                                title="Drag to resize column"
                              />
                            </div>
                          </th>
                          <th 
                            className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                            style={{ width: `${columnWidths.balance || 120}px` }}
                          >
                            <div className="flex items-center justify-between">
                              <span>Balance After</span>
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                                onMouseDown={(e) => handleMouseDown('balance', e)}
                                onClick={preventSort}
                                onDoubleClick={preventSort}
                                title="Drag to resize column"
                              />
                            </div>
                          </th>
                          <th 
                            className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                            style={{ width: `${columnWidths.feeAmount || 80}px` }}
                          >
                            <div className="flex items-center justify-between">
                              <span>Fee</span>
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                                onMouseDown={(e) => handleMouseDown('feeAmount', e)}
                                onClick={preventSort}
                                onDoubleClick={preventSort}
                                title="Drag to resize column"
                              />
                            </div>
                          </th>
                          <th 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                            style={{ width: `${columnWidths.airwallexId || 200}px` }}
                          >
                            <div className="flex items-center justify-between">
                              <span>Airwallex ID</span>
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                                onMouseDown={(e) => handleMouseDown('airwallexId', e)}
                                onClick={preventSort}
                                onDoubleClick={preventSort}
                                title="Drag to resize column"
                              />
                            </div>
                          </th>
                          <th 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                            style={{ width: `${columnWidths.category || 100}px` }}
                          >
                            <div className="flex items-center justify-between">
                              <span>Category</span>
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                                onMouseDown={(e) => handleMouseDown('category', e)}
                                onClick={preventSort}
                                onDoubleClick={preventSort}
                                title="Drag to resize column"
                              />
                            </div>
                          </th>
                          <th 
                            className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                            style={{ width: `${columnWidths.exchangeRate || 100}px` }}
                          >
                            <div className="flex items-center justify-between">
                              <span>Ex Rate</span>
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                                onMouseDown={(e) => handleMouseDown('exchangeRate', e)}
                                onClick={preventSort}
                                onDoubleClick={preventSort}
                                title="Drag to resize column"
                              />
                            </div>
                          </th>
                          <th 
                            className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative"
                            style={{ width: `${columnWidths.createdAt || 150}px` }}
                          >
                            <div className="flex items-center justify-between">
                              <span>Created</span>
                              <div 
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 bg-transparent hover:bg-opacity-60 transition-all z-10"
                                onMouseDown={(e) => handleMouseDown('createdAt', e)}
                                onClick={preventSort}
                                onDoubleClick={preventSort}
                                title="Drag to resize column"
                              />
                            </div>
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTransactions.map((transaction, index) => (
                      <React.Fragment key={transaction.id}>
                        <tr className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          {/* Expand Button */}
                          <td className="px-3 py-3 text-sm w-12">
                            <button
                              onClick={() => toggleRowExpansion(transaction.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Expand/Collapse details"
                            >
                              <ChevronRight 
                                className={`h-4 w-4 transition-transform ${
                                  expandedRows.has(transaction.id) ? 'rotate-90' : ''
                                }`} 
                              />
                            </button>
                          </td>
                          <td className="px-3 py-3 text-sm overflow-hidden" style={{ width: `${columnWidths.bank || 80}px`, maxWidth: `${columnWidths.bank || 80}px` }}>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded truncate ${
                              transaction.source === 'API' ? 'bg-blue-100 text-blue-800' : 
                              transaction.source === 'MANUAL' ? 'bg-gray-100 text-gray-800' : 'bg-purple-100 text-purple-800'
                            }`} title="Airwallex">
                              Airwallex
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 overflow-hidden" style={{ width: `${columnWidths.date || 128}px`, maxWidth: `${columnWidths.date || 128}px` }}>
                            <div className="font-medium truncate" title={formatDate(transaction.transactionDate)}>
                              {formatDate(transaction.transactionDate)}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 overflow-hidden" style={{ width: `${columnWidths.description || 300}px`, maxWidth: `${columnWidths.description || 300}px` }}>
                            <div className="truncate font-medium" title={transaction.description}>
                              {transaction.description}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-right overflow-hidden" style={{ width: `${columnWidths.amount || 112}px`, maxWidth: `${columnWidths.amount || 112}px` }}>
                            <div className="truncate" title={`${transaction.amount < 0 ? '-' : ''}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                              {formatAmount(transaction.amount)}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 font-medium overflow-hidden" style={{ width: `${columnWidths.currency || 64}px`, maxWidth: `${columnWidths.currency || 64}px` }}>
                            <div className="truncate" title={transaction.currency}>
                              {transaction.currency}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm overflow-hidden" style={{ width: `${columnWidths.status || 80}px`, maxWidth: `${columnWidths.status || 80}px` }}>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full truncate ${
                              transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`} title={transaction.status}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500 overflow-hidden" style={{ width: `${columnWidths.reference || 120}px`, maxWidth: `${columnWidths.reference || 120}px` }}>
                            {transaction.referenceNumber && (
                              <div className="truncate text-xs" title={transaction.referenceNumber}>
                                {transaction.referenceNumber}
                              </div>
                            )}
                          </td>
                          
                          {/* Additional columns when showAllFields is enabled */}
                          {showAllFields && (
                            <>
                              <td className="px-3 py-3 text-sm text-gray-700 overflow-hidden" style={{ width: `${columnWidths.sourceType || 100}px`, maxWidth: `${columnWidths.sourceType || 100}px` }}>
                                <div className="truncate" title={transaction.sourceType || 'N/A'}>
                                  {transaction.sourceType || 'N/A'}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-right text-gray-700 overflow-hidden" style={{ width: `${columnWidths.balance || 120}px`, maxWidth: `${columnWidths.balance || 120}px` }}>
                                {transaction.balanceAfterTransaction !== null && transaction.balanceAfterTransaction !== undefined ? (
                                  <div className="truncate" title={transaction.balanceAfterTransaction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}>
                                    {transaction.balanceAfterTransaction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-right text-gray-700 overflow-hidden" style={{ width: `${columnWidths.feeAmount || 80}px`, maxWidth: `${columnWidths.feeAmount || 80}px` }}>
                                {transaction.feeAmount !== null && transaction.feeAmount !== undefined ? (
                                  <div className="truncate" title={transaction.feeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}>
                                    {transaction.feeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 overflow-hidden" style={{ width: `${columnWidths.airwallexId || 200}px`, maxWidth: `${columnWidths.airwallexId || 200}px` }}>
                                {transaction.airwallexTransactionId && (
                                  <div className="truncate text-xs font-mono" title={transaction.airwallexTransactionId}>
                                    {transaction.airwallexTransactionId}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 overflow-hidden" style={{ width: `${columnWidths.category || 100}px`, maxWidth: `${columnWidths.category || 100}px` }}>
                                <div className="truncate" title={transaction.category}>
                                  {transaction.category}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sm text-right text-gray-700 overflow-hidden" style={{ width: `${columnWidths.exchangeRate || 100}px`, maxWidth: `${columnWidths.exchangeRate || 100}px` }}>
                                {transaction.exchangeRate !== null && transaction.exchangeRate !== undefined ? (
                                  <div className="truncate" title={transaction.exchangeRate.toFixed(6)}>
                                    {transaction.exchangeRate.toFixed(4)}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-sm text-gray-700 overflow-hidden" style={{ width: `${columnWidths.createdAt || 150}px`, maxWidth: `${columnWidths.createdAt || 150}px` }}>
                                <div className="truncate text-xs" title={formatDateTime(transaction.createdAt)}>
                                  {formatDate(transaction.createdAt)}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                        
                        {/* Expanded Row Details */}
                        {expandedRows.has(transaction.id) && (
                          <tr className="bg-gray-50/80">
                            <td colSpan={showAllFields ? 15 : 8} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Transaction ID:</span>
                                  <div className="text-gray-900 font-mono text-xs">{transaction.id}</div>
                                </div>
                                {transaction.originalDescription && (
                                  <div>
                                    <span className="font-medium text-gray-700">Original Description:</span>
                                    <div className="text-gray-900">{transaction.originalDescription}</div>
                                  </div>
                                )}
                                {transaction.valueDate && (
                                  <div>
                                    <span className="font-medium text-gray-700">Value Date:</span>
                                    <div className="text-gray-900">{formatDate(transaction.valueDate)}</div>
                                  </div>
                                )}
                                {transaction.originalAmount && transaction.originalCurrency && (
                                  <div>
                                    <span className="font-medium text-gray-700">Original Amount:</span>
                                    <div className="text-gray-900">
                                      {transaction.originalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {transaction.originalCurrency}
                                    </div>
                                  </div>
                                )}
                                {transaction.feeCurrency && transaction.feeAmount && (
                                  <div>
                                    <span className="font-medium text-gray-700">Fee Details:</span>
                                    <div className="text-gray-900">
                                      {transaction.feeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {transaction.feeCurrency}
                                    </div>
                                  </div>
                                )}
                                {transaction.batchId && (
                                  <div>
                                    <span className="font-medium text-gray-700">Batch ID:</span>
                                    <div className="text-gray-900 font-mono text-xs">{transaction.batchId}</div>
                                  </div>
                                )}
                                {transaction.reconciliationStatus && (
                                  <div>
                                    <span className="font-medium text-gray-700">Reconciliation:</span>
                                    <div className="text-gray-900">{transaction.reconciliationStatus}</div>
                                  </div>
                                )}
                                {transaction.transactionPurpose && (
                                  <div>
                                    <span className="font-medium text-gray-700">Purpose:</span>
                                    <div className="text-gray-900">{transaction.transactionPurpose}</div>
                                  </div>
                                )}
                                {transaction.complianceNotes && (
                                  <div>
                                    <span className="font-medium text-gray-700">Compliance Notes:</span>
                                    <div className="text-gray-900">{transaction.complianceNotes}</div>
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-gray-700">Source:</span>
                                  <div className="text-gray-900">{transaction.source}</div>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Created:</span>
                                  <div className="text-gray-900">{formatDateTime(transaction.createdAt)}</div>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Updated:</span>
                                  <div className="text-gray-900">{formatDateTime(transaction.updatedAt)}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Delete Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Delete Transactions</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(false)}
                  className="p-1 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={deleteFromDate}
                    onChange={(e) => setDeleteFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank (optional)
                  </label>
                  <select
                    value={deleteBank}
                    onChange={(e) => setDeleteBank(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All banks</option>
                    <option value="Airwallex">Airwallex</option>
                    <option value="HSBC">HSBC</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source (optional)
                  </label>
                  <select
                    value={deleteSource}
                    onChange={(e) => setDeleteSource(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All sources</option>
                    <option value="API">API</option>
                    <option value="CSV">CSV</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteTransactions}
                  disabled={deleting || !deleteFromDate}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Sync Dialog */}
        {showSyncDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Sync from Airwallex</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSyncDialog(false)}
                  className="p-1 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sync from date *
                  </label>
                  <input
                    type="date"
                    value={syncFromDate}
                    onChange={(e) => setSyncFromDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will sync all transactions from the selected date up to now
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowSyncDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSyncFromDate}
                  disabled={syncing || !syncFromDate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}