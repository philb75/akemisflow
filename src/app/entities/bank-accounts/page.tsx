"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface BankAccount {
  id: string
  accountName: string
  bankName: string
  accountNumber?: string | null
  iban?: string | null
  swiftBic?: string | null
  currency: string
  accountType: 'BUSINESS' | 'PERSONAL' | 'SAVINGS' | 'CHECKING'
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CLOSED'
  createdAt: Date
  updatedAt: Date
}


const countries = [
  'France', 'Germany', 'Spain', 'Italy', 'United Kingdom', 'Netherlands', 'Belgium', 'Luxembourg'
]

const currencies = [
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' }
]

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [formData, setFormData] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    iban: '',
    swiftBic: '',
    currency: 'EUR',
    accountType: 'BUSINESS' as 'BUSINESS' | 'PERSONAL' | 'SAVINGS' | 'CHECKING'
  })

  // Fetch bank accounts on component mount
  useEffect(() => {
    fetchBankAccounts()
  }, [])

  const fetchBankAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bank-accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.bankAccounts)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to fetch bank accounts')
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error)
      alert('An error occurred while fetching bank accounts')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      accountName: '',
      bankName: '',
      accountNumber: '',
      iban: '',
      swiftBic: '',
      currency: 'EUR',
      accountType: 'BUSINESS'
    })
    setEditingAccount(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      
      if (editingAccount) {
        // Update existing account
        const response = await fetch(`/api/bank-accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })
        
        if (response.ok) {
          await fetchBankAccounts() // Refresh the list
          resetForm()
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to update bank account')
        }
      } else {
        // Create new account
        const response = await fetch('/api/bank-accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })
        
        if (response.ok) {
          await fetchBankAccounts() // Refresh the list
          resetForm()
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to create bank account')
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('An error occurred while saving the bank account')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (account: BankAccount) => {
    setFormData({
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: account.accountNumber || '',
      iban: account.iban || '',
      swiftBic: account.swiftBic || '',
      currency: account.currency,
      accountType: account.accountType
    })
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleDelete = async (accountId: string) => {
    if (confirm('Are you sure you want to delete this bank account?')) {
      try {
        setLoading(true)
        const response = await fetch(`/api/bank-accounts/${accountId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          await fetchBankAccounts() // Refresh the list
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to delete bank account')
        }
      } catch (error) {
        console.error('Error deleting bank account:', error)
        alert('An error occurred while deleting the bank account')
      } finally {
        setLoading(false)
      }
    }
  }

  const toggleAccountStatus = async (accountId: string) => {
    try {
      setLoading(true)
      const account = accounts.find(acc => acc.id === accountId)
      if (!account) return
      
      const newStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      
      const response = await fetch(`/api/bank-accounts/${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        await fetchBankAccounts() // Refresh the list
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update bank account status')
      }
    } catch (error) {
      console.error('Error updating bank account status:', error)
      alert('An error occurred while updating the bank account status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
          <p className="text-gray-600">Manage company bank accounts and financial institutions</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          style={{ backgroundColor: '#2E3A7C' }}
          className="text-white hover:opacity-90 transition-opacity"
        >
          + Add Bank Account
        </Button>
      </div>

      {/* Bank Accounts List */}
      {!showForm && (
        <div className="space-y-4">
          {loading ? (
            <Card className="p-12 text-center">
              <div className="text-gray-500">
                <p className="text-lg">Loading bank accounts...</p>
              </div>
            </Card>
          ) : accounts.length > 0 ? (
            accounts.map((account) => (
              <Card key={account.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{account.accountName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        account.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {account.status}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {account.accountType}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Bank:</span>
                        <p className="text-gray-900">{account.bankName}</p>
                      </div>
                      {account.accountNumber && (
                        <div>
                          <span className="font-medium text-gray-700">Account Number:</span>
                          <p className="text-gray-900">{account.accountNumber}</p>
                        </div>
                      )}
                      {account.iban && (
                        <div>
                          <span className="font-medium text-gray-700">IBAN:</span>
                          <p className="text-gray-900 font-mono text-xs">{account.iban}</p>
                        </div>
                      )}
                      {account.swiftBic && (
                        <div>
                          <span className="font-medium text-gray-700">SWIFT:</span>
                          <p className="text-gray-900">{account.swiftBic}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-700">Currency:</span>
                        <p className="text-gray-900">{account.currency}</p>
                      </div>
                    </div>
                  </div>
                
                <div className="flex space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(account)}
                    className="text-gray-700 border-gray-300 hover:bg-gray-50"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleAccountStatus(account.id)}
                    className={account.status === 'ACTIVE' ? 'text-red-700 border-red-300 hover:bg-red-50' : 'text-green-700 border-green-300 hover:bg-green-50'}
                  >
                    {account.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                    className="text-red-700 border-red-300 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
          ) : (
            <Card className="p-12 text-center">
              <div className="text-gray-500">
                <p className="text-lg mb-2">No bank accounts found</p>
                <p>Add your first bank account to get started</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
            </h2>
            <Button
              variant="outline"
              onClick={resetForm}
              className="text-gray-600 border-gray-300"
            >
              Cancel
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Account Details Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 className="text-lg font-medium text-gray-900">Account Details</h3>
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {currencies.map(currency => (
                    <option key={currency.code} value={currency.code}>
                      {currency.flag} {currency.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Type
                </label>
                <select
                  value={formData.accountType}
                  onChange={(e) => setFormData({...formData, accountType: e.target.value as 'BUSINESS' | 'PERSONAL' | 'SAVINGS' | 'CHECKING'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="BUSINESS">Business</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="CHECKING">Checking</option>
                </select>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">SWIFT</h4>
                    <p className="text-sm text-gray-600">International bank transfer</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="text-blue-600 border-blue-300">
                    Change
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Transfer fee: 25.00 USD (OUR) or 15.00 USD (SHA) • Speed: 0 - 3 business days</p>
              </div>

              <div>
                <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  id="iban"
                  value={formData.iban}
                  onChange={(e) => setFormData({...formData, iban: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="Enter IBAN"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">International Bank Account Number: This starts with a 2-digit country code.</p>
              </div>

              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">
                  Account name
                </label>
                <input
                  type="text"
                  id="accountName"
                  value={formData.accountName}
                  onChange={(e) => setFormData({...formData, accountName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  placeholder="Enter account holder's full name"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the account holder's full name as registered with the bank</p>
              </div>

              <div>
                <label htmlFor="swiftBic" className="block text-sm font-medium text-gray-700 mb-2">
                  SWIFT Code
                </label>
                <input
                  type="text"
                  id="swiftBic"
                  value={formData.swiftBic}
                  onChange={(e) => setFormData({...formData, swiftBic: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter SWIFT code"
                />
              </div>

              <div>
                <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({...formData, bankName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter bank name"
                  required
                />
              </div>

              <div>
                <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number <span className="text-gray-400">Optional</span>
                </label>
                <input
                  type="text"
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter account number"
                />
              </div>

            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="text-gray-600 border-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: '#2E3A7C' }}
                className="text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingAccount ? 'Update Bank Account' : 'Add Bank Account')}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}