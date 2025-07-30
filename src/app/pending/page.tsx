"use client"

import { useSession, signOut } from "next-auth/react"

export default function PendingApproval() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src="/images/logo.png"
            alt="AkemisFlow Logo" 
            className="h-16 w-auto object-contain"
          />
        </div>
        
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Account Under Review
        </h2>
        
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Pending Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
              <svg
                className="h-8 w-8 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Application Under Review
            </h3>
            
            <p className="text-gray-600 mb-6">
              Your account has been created successfully. Our team is currently reviewing your access request. 
              You will be notified when your access is approved.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <strong>Account Information:</strong>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Email: {session?.user?.email}
              </p>
              <p className="text-sm text-gray-600">
                Name: {session?.user?.name}
              </p>
              <p className="text-sm text-gray-600">
                Status: Pending Approval
              </p>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              If you have any questions, please contact your administrator.
            </p>
            
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2E3A7C]"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            © 2024 AkemisFlow. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}