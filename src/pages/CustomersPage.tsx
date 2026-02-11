import { useState } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { CustomerCard } from '@/components/CustomerCard';
import { NewCustomerDialog } from '@/components/NewCustomerDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutDashboard, Users, Calendar, Contact, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CustomersPage() {
  const { customersList, addCustomer } = useJobsContext();
  const [search, setSearch] = useState('');

  const filtered = customersList.filter(c =>
    c.name.includes(search) || c.phone.includes(search) || c.city.includes(search) || c.address.includes(search)
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div dir="rtl" className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">FS</span>
              </div>
              <h1 className="font-bold text-lg text-foreground">פילד סינק</h1>
            </div>
            <nav className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/"><LayoutDashboard className="w-4 h-4 ml-1.5" />לוח בקרה</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/technician"><Users className="w-4 h-4 ml-1.5" />טכנאי</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-foreground" asChild>
                <Link to="/customers"><Contact className="w-4 h-4 ml-1.5" />לקוחות</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/confirm"><Calendar className="w-4 h-4 ml-1.5" />אישור לקוח</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div dir="rtl" className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">כרטיסי לקוחות</h2>
            <p className="text-sm text-muted-foreground mt-1">{filtered.length} מתוך {customersList.length} לקוחות</p>
          </div>
          <NewCustomerDialog onAdd={addCustomer} />
        </div>

        <div dir="rtl" className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חפש לפי שם, טלפון, עיר או כתובת..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(customer => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      </main>
    </div>
  );
}
