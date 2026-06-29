import logo from "@/assets/logo.png";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle,
  CalendarDays,
  Contact,
  Filter,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "לוח בקרה", icon: LayoutDashboard, adminOnly: false },
  { to: "/malfunctions", label: "תקלות", icon: AlertTriangle, adminOnly: true },
  { to: "/installations", label: "התקנות", icon: Wrench, adminOnly: true },
  { to: "/service", label: "שירות שוטף", icon: Filter, adminOnly: true },
  {
    to: "/work-schedule",
    label: "לוז עבודה",
    icon: CalendarDays,
    adminOnly: true,
  },
  { to: "/technician", label: "טכנאי", icon: Users, adminOnly: false },
  { to: "/daily-route", label: "מסלול יומי", icon: Map, adminOnly: false },
  { to: "/customers", label: "לקוחות", icon: Contact, adminOnly: true },
  { to: "/users", label: "משתמשים", icon: UserCog, adminOnly: true },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut, isAdmin } = useAuth();
  const visibleNavItems = navItems.filter((item) => isAdmin || !item.adminOnly);
  const [open, setOpen] = useState(false);

  // Shared nav links; `mobile` makes them full-width, ≥44px-tall touch targets.
  const NavLinks = ({
    mobile = false,
    onNavigate,
  }: {
    mobile?: boolean;
    onNavigate?: () => void;
  }) => (
    <>
      <Button
        variant='ghost'
        size='sm'
        className={`text-sm text-muted-foreground border-l-4 border-primary rounded-l ${mobile ? "h-11 w-full justify-start" : ""}`}
        onClick={() => {
          onNavigate?.();
          signOut();
        }}>
        <LogOut className='w-4 h-4 ml-1.5' />
        התנתק
      </Button>
      {visibleNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to;
        return (
          <Button
            key={item.to}
            variant='ghost'
            size='sm'
            className={`text-sm ${mobile ? "h-11 w-full justify-start" : ""} ${isActive ? "text-foreground font-semibold" : "text-muted-foreground"}`}
            aria-current={isActive ? "page" : undefined}
            asChild>
            <Link to={item.to} onClick={onNavigate}>
              <Icon className='w-4 h-4 ml-1.5' />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </>
  );

  return (
    <div className='min-h-dvh bg-background'>
      <header className='bg-card border-b border-border sticky top-0 z-30'>
        <div className='w-full px-4 sm:px-6 lg:px-10'>
          <div
            dir='rtl'
            className='flex flex-row-reverse items-center justify-between h-14'>
            <div className='flex items-center gap-3'>
              <img
                src={logo}
                alt='טל חרמון'
                width={32}
                height={32}
                decoding='async'
                className='w-8 h-8 rounded-lg object-cover'
              />
              <h1 className='font-bold text-lg text-foreground'>טל חרמון</h1>
            </div>

            {/* Desktop nav — shown only above 1340px (≥1341px) */}
            <nav className='hidden min-[1341px]:flex  items-center gap-1'>
              <NavLinks />
            </nav>

            {/* Mobile drawer — shown for 1340px and less */}
            <div className='min-[1341px]:hidden'>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-11 w-11'
                    aria-label='פתח תפריט'>
                    <Menu className='w-5 h-5' />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side='right'
                  dir='rtl'
                  className='w-72 flex flex-col gap-1'>
                  <SheetTitle className='text-right mb-2'>תפריט</SheetTitle>
                  <NavLinks mobile onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      <InstallAppBanner />
      <NotificationPermissionPrompt />
      <main className='w-full px-4 sm:px-6 lg:px-10 py-5'>{children}</main>
    </div>
  );
}
