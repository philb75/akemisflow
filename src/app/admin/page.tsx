"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to user management as the default admin page
    router.push("/admin/users")
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderBottomColor: '#2E3A7C'}}></div>
    </div>
  )
}