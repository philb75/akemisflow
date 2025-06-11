"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z" />
      </svg>
    ),
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    submenu: [
      { name: 'All Clients', href: '/clients' },
      { name: 'Add Client', href: '/clients/new' },
      { name: 'Client Reports', href: '/clients/reports' },
    ]
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    submenu: [
      { name: 'All Invoices', href: '/invoices' },
      { name: 'Create Invoice', href: '/invoices/new' },
      { name: 'Pending', href: '/invoices/pending' },
      { name: 'Paid', href: '/invoices/paid' },
    ]
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
    submenu: [
      { name: 'All Transactions', href: '/transactions' },
      { name: 'Income', href: '/transactions/income' },
      { name: 'Expenses', href: '/transactions/expenses' },
    ]
  },
  {
    name: 'Bank Accounts',
    href: '/bank-accounts',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    name: 'Consultants',
    href: '/consultants',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    submenu: [
      { name: 'All Consultants', href: '/consultants' },
      { name: 'Add Consultant', href: '/consultants/new' },
      { name: 'Payments', href: '/consultants/payments' },
    ]
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    submenu: [
      { name: 'Financial Overview', href: '/reports/financial' },
      { name: 'Profit & Loss', href: '/reports/profit-loss' },
      { name: 'Tax Reports', href: '/reports/tax' },
    ]
  },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleMenu = (menuName: string) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 bg-white shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo */}
        <div className="flex h-16 items-center px-4 border-b border-gray-200 bg-white">
          <div className="flex items-center min-w-0 flex-1">
            {/* Akemis logo */}
            <div className="flex-shrink-0 p-2">
              <img 
                src={sidebarCollapsed ? "/images/mini-logo.png" : "/images/logo.png"}
                alt="Akemis Logo" 
                className={sidebarCollapsed ? "h-8 w-8 object-contain" : "h-10 w-auto object-contain"}
              />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.name}>
                <div
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors",
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? "text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                  style={pathname === item.href || pathname.startsWith(item.href + '/') 
                    ? {backgroundColor: '#2E3A7C'} 
                    : {}
                  }
                  onClick={() => item.submenu && !sidebarCollapsed ? toggleMenu(item.name) : null}
                >
                  <Link href={item.href} className="flex items-center space-x-3 flex-1" title={sidebarCollapsed ? item.name : undefined}>
                    <span className={cn(
                      "flex-shrink-0",
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? "text-white"
                        : "text-gray-500"
                    )}>
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                  {item.submenu && !sidebarCollapsed && (
                    <svg
                      className={cn(
                        "h-4 w-4 transition-transform",
                        expandedMenu === item.name ? "rotate-90" : ""
                      )}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
                
                {/* Submenu */}
                {item.submenu && expandedMenu === item.name && !sidebarCollapsed && (
                  <div className="mt-1 space-y-1 pl-6">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={cn(
                          "block px-3 py-2 text-sm rounded-md transition-colors",
                          pathname === subItem.href
                            ? "text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        )}
                        style={pathname === subItem.href 
                          ? {backgroundColor: '#4A6BA8'} 
                          : {}
                        }
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* User Menu at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200">
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-gray-700">
                {session?.user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.name || 'User'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {session?.user?.email}
                </div>
              </div>
            )}
            <button
              onClick={() => signOut()}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Sign out"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Toggle Button on Edge */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`fixed top-12 z-50 bg-white border border-gray-200 rounded-r-md shadow-lg hover:shadow-xl transition-all duration-300 p-2 ${
          sidebarCollapsed ? 'left-16' : 'left-64'
        }`}
        style={{ transform: 'translateX(-50%)' }}
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg 
          className={`h-4 w-4 text-gray-600 transition-transform duration-300 ${sidebarCollapsed ? '' : 'rotate-180'}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'pl-16' : 'pl-64'}`}>
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {navigationItems.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h1>
                <div className="flex items-center mt-1 space-x-2">
                  {session?.user?.role === 'ADMIN' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor: '#2E3A7C'}}>
                      Admin
                    </span>
                  )}
                  <span className="text-sm text-gray-600">
                    Welcome back, {session?.user?.name}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}