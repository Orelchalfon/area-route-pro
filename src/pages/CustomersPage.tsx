import { useState } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { CustomerCard } from '@/components/CustomerCard';
import { NewCustomerDialog } from '@/components/NewCustomerDialog';
import { SmartDistributionDialog } from '@/components/SmartDistributionDialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function CustomersPage() {
  const { customersList, addCustomer, updateCustomer, getCustomerLogs, distributeServiceTracks } = useJobsContext();
  const [search, setSearch] = useState('');

  const filtered = customersList.filter(c =>
    c.name.includes(search) || c.phone.includes(search) || c.city.includes(search) || c.address.includes(search)
  );

  const unassignedCount = customersList.filter(c => !c.serviceTrack).length;

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">כרטיסי לקוחות</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} מתוך {customersList.length} לקוחות
            {unassignedCount > 0 && <span className="text-warning mr-2">• {unassignedCount} ללא מסלול</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SmartDistributionDialog customers={customersList} onDistribute={distributeServiceTracks} />
          <NewCustomerDialog onAdd={addCustomer} />
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="חפש לפי שם, טלפון, עיר או כתובת..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-11 h-11 text-base"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(customer => (
          <CustomerCard key={customer.id} customer={customer} logs={getCustomerLogs(customer.id)} />
        ))}
      </div>
    </div>
  );
}
