import Link from 'next/link';
import { Navigation } from './navigation';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">AF</span>
              </div>
              <span className="font-bold text-xl">AkemisFlow</span>
            </Link>
            <Navigation />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Welcome back, Philippe
            </div>
            <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center">
              <span className="text-secondary-foreground font-medium text-sm">PB</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}