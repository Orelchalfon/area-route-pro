import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';
import { LayoutDashboard, Users, Contact, AlertTriangle, Wrench, Filter, CalendarDays, LogOut, UserCog } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/', label: 'לוח בקרה', icon: LayoutDashboard },
  { to: '/malfunctions', label: 'תקלות', icon: AlertTriangle },
  { to: '/installations', label: 'התקנות', icon: Wrench },
  { to: '/service', label: 'שירות שוטף', icon: Filter },
  { to: '/work-schedule', label: 'לוז עבודה', icon: CalendarDays },
  { to: '/technician', label: 'טכנאי', icon: Users },
  { to: '/customers', label: 'לקוחות', icon: Contact },
  { to: '/users', label: 'משתמשים', icon: UserCog },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          <div dir="rtl" className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img src={logo} alt="טל חרמון" className="w-8 h-8 rounded-lg object-cover" />
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
                    className={`text-sm ${isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
                    asChild
                  >
                    <Link to={item.to}>
                      <Icon className="w-4 h-4 ml-1.5" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="text-sm text-muted-foreground"
                onClick={() => signOut()}
              >
                <LogOut className="w-4 h-4 ml-1.5" />
                התנתק
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="w-full px-4 sm:px-6 lg:px-10 py-5">
        {children}
      </main>
    </div>
  );
}
