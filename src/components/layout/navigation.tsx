'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: '🏢',
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: '📄',
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: '💳',
  },
  {
    name: 'Bank Accounts',
    href: '/bank-accounts',
    icon: '🏦',
  },
  {
    name: 'Consultants',
    href: '/consultants',
    icon: '👥',
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: '📈',
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-4">
      {navigationItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === item.href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <span>{item.icon}</span>
          <span>{item.name}</span>
        </Link>
      ))}
    </nav>
  );
}