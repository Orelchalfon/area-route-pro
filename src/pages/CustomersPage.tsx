import { useCallback, useEffect, useState } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { useCustomerDirectory } from '@/hooks/useCustomerDirectory';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Customer } from '@/types';
import { CustomerCard } from '@/components/CustomerCard';
import { CustomerEditDialog } from '@/components/CustomerEditDialog';
import { CustomerHistoryDialog } from '@/components/CustomerHistoryDialog';
import { NewCustomerDialog } from '@/components/NewCustomerDialog';
import { SmartDistributionDialog } from '@/components/SmartDistributionDialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Loader2, Users } from 'lucide-react';

export default function CustomersPage() {
  // Activity logs live in the app-wide store; the directory list comes straight
  // from the customers table (DB-only, paginated).
  const { getCustomerLogs, addLog } = useJobsContext();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the search so each keystroke doesn't fire a DB query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {
    customers,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    totalCount,
    unassignedCount,
    error,
    addCustomer,
    updateCustomer,
    distributeServiceTracks,
    fetchAllUnassigned,
  } = useCustomerDirectory({ search: debouncedSearch, addLog });

  const { sentinelRef } = useInfiniteScroll(loadMore, hasMore);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setEditOpen(true);
  }, []);

  const handleShowHistory = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryOpen(true);
  }, []);

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">כרטיסי לקוחות</h2>
          <p className="text-sm text-muted-foreground mt-1" aria-live="polite">
            {loading ? 'טוען...' : `${customers.length} מתוך ${totalCount} לקוחות`}
            {unassignedCount > 0 && <span className="text-warning ms-2">• {unassignedCount} ללא מסלול</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SmartDistributionDialog loadEligible={fetchAllUnassigned} onDistribute={distributeServiceTracks} />
          <NewCustomerDialog onAdd={addCustomer} />
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="חפש לפי שם, טלפון, עיר או כתובת..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pr-11 h-11 text-base"
          aria-label="חיפוש לקוחות"
        />
      </div>

      {error ? (
        <div className="text-center py-16 text-destructive">
          <p className="text-sm">שגיאה בטעינת הלקוחות: {error}</p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {debouncedSearch ? 'לא נמצאו לקוחות התואמים את החיפוש' : 'אין לקוחות להצגה'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                logCount={getCustomerLogs(customer.id).length}
                onEdit={handleEdit}
                onShowHistory={handleShowHistory}
              />
            ))}
          </div>

          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center items-center h-16" aria-hidden="true">
              {loadingMore && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
            </div>
          )}
        </>
      )}

      <CustomerEditDialog
        customer={selectedCustomer}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdate={updateCustomer}
      />
      <CustomerHistoryDialog
        customer={selectedCustomer}
        logs={selectedCustomer ? getCustomerLogs(selectedCustomer.id) : []}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </div>
  );
}
