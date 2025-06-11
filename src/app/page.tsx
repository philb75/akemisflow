"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (session) {
      // User is authenticated, redirect to dashboard
      router.push("/dashboard")
    } else {
      // User is not authenticated, redirect to sign in
      router.push("/auth/signin")
    }
  }, [session, status, router])

  // Show loading while determining auth status
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#dcd7ca]">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="flex flex-col items-center space-y-2">
            <img 
              src="/images/logo.png" 
              alt="Akemis Logo" 
              className="h-16 w-auto"
            />
            <div className="text-center">
              <div className="text-2xl font-bold" style={{color: '#2E3A7C'}}>
                AkemisFlow
              </div>
              <div className="text-sm" style={{color: '#4A6BA8'}}>Financial Management</div>
            </div>
          </div>
        </div>
        <div style={{color: '#4A6BA8'}}>Loading...</div>
      </div>
    </div>
  )
}