"use client"

import { useState } from "react"

export default function AdminInitPage() {
  const [email, setEmail] = useState("philb75@gmail.com")
  const [password, setPassword] = useState("Philb123$")
  const [firstName, setFirstName] = useState("Philippe")
  const [lastName, setLastName] = useState("Barthelemy")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const createAdminUser = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/setup-admin?key=admin-setup-2024', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName
        })
      })

      const data = await response.json()
      setResult({
        status: response.status,
        data: data
      })

    } catch (error) {
      setResult({
        status: 'ERROR',
        data: { error: (error as Error).message }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Initialize Admin User</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={createAdminUser}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Admin User...' : 'Create Admin User'}
          </button>
        </div>

        {result && (
          <div className="mt-6 p-4 rounded-md bg-gray-50">
            <h3 className="font-medium mb-2">Result:</h3>
            <p className="text-sm">Status: {result.status}</p>
            <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}