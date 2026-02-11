import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Contact, AlertTriangle, Wrench, Filter } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'לוח בקרה', icon: LayoutDashboard },
  { to: '/malfunctions', label: 'תקלות', icon: AlertTriangle },
  { to: '/installations', label: 'התקנות', icon: Wrench },
  { to: '/service', label: 'שירות שוטף', icon: Filter },
  { to: '/technician', label: 'טכנאי', icon: Users },
  { to: '/customers', label: 'לקוחות', icon: Contact },
  
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div dir="rtl" className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">טח</span>
              </div>
              <h1 className="font-bold text-lg text-foreground">טל חרמון</h1>
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Button
                    key={item.to}
                    variant="ghost"
                    size="sm"
                    className={isActive ? 'text-foreground' : 'text-muted-foreground'}
                    asChild
                  >
                    <Link to={item.to}>
                      <Icon className="w-4 h-4 ml-1.5" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
