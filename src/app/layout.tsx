import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import ErrorBoundary from '@/components/error-boundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AkemisFlow',
  description: 'Professional financial management for Akemis operations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <SessionProvider>
            <div className="min-h-screen bg-background">
              {children}
            </div>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}