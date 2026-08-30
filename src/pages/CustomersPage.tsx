import { useCallback, useEffect, useState } from 'react';
import { useJobsContext } from '@/contexts/JobsContext';
import { useCustomerDirectory } from '@/hooks/useCustomerDirectory';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Customer } from '@/types';
import { CustomerCard } from '@/components/CustomerCard';
import { CustomerDetailsDialog } from '@/components/CustomerDetailsDialog';
import { CustomerEditDialog } from '@/components/CustomerEditDialog';
import { CustomerHistoryDialog } from '@/components/CustomerHistoryDialog';
import { NewCustomerDialog } from '@/components/NewCustomerDialog';
import { SmartDistributionDialog } from '@/components/SmartDistributionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Loader2, Users, Trash2, Undo2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CustomersPage() {
  // The directory list comes straight from the customers table (DB-only, paginated).
  // History is loaded per-customer by the dialog itself, not held in memory here.
  const { addLog } = useJobsContext();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // The archive view. Deleted customers are never mixed into the normal list — the
  // directory query shows one side of the is_active flag at a time.
  const [showDeleted, setShowDeleted] = useState(false);

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
    softDeleteCustomer,
    restoreCustomer,
    distributeServiceTracks,
    fetchAllUnassigned,
  } = useCustomerDirectory({ search: debouncedSearch, addLog, showDeleted });

  const { sentinelRef } = useInfiniteScroll(loadMore, hasMore);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setEditOpen(true);
  }, []);

  // Clicking the card body — the card shows only part of the record.
  const handleShowDetails = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsOpen(true);
  }, []);

  const handleShowHistory = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setHistoryOpen(true);
  }, []);

  // Soft delete only: the customer is archived, never removed. Their existing jobs keep
  // their customer link and keep showing the right name — only NEW work stops offering them.
  const confirmDelete = useCallback(async () => {
    const target = pendingDelete;
    if (!target) return;
    setPendingDelete(null);
    const ok = await softDeleteCustomer(target.id);
    if (ok) toast.success(`${target.name} הועבר לארכיון`);
    else toast.error('מחיקת הלקוח נכשלה');
  }, [pendingDelete, softDeleteCustomer]);

  const handleRestore = useCallback(
    async (customer: Customer) => {
      const ok = await restoreCustomer(customer.id);
      if (ok) toast.success(`${customer.name} שוחזר`);
      else toast.error('שחזור הלקוח נכשל');
    },
    [restoreCustomer],
  );

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {showDeleted ? 'לקוחות מחוקים' : 'כרטיסי לקוחות'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1" aria-live="polite">
            {loading ? 'טוען...' : `${customers.length} מתוך ${totalCount} לקוחות`}
            {!showDeleted && unassignedCount > 0 && (
              <span className="text-warning-strong ms-2">• {unassignedCount} ללא מסלול</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showDeleted ? 'secondary' : 'outline'}
            onClick={() => setShowDeleted(v => !v)}
            aria-pressed={showDeleted}
          >
            {showDeleted ? <Undo2 className="w-4 h-4 me-1" /> : <Trash2 className="w-4 h-4 me-1" />}
            {showDeleted ? 'חזרה לפעילים' : 'הצג מחוקים'}
          </Button>
          {!showDeleted && (
            <>
              <SmartDistributionDialog loadEligible={fetchAllUnassigned} onDistribute={distributeServiceTracks} />
              <NewCustomerDialog onAdd={addCustomer} />
            </>
          )}
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
            {debouncedSearch
              ? 'לא נמצאו לקוחות התואמים את החיפוש'
              : showDeleted
                ? 'אין לקוחות מחוקים'
                : 'אין לקוחות להצגה'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onEdit={showDeleted ? undefined : handleEdit}
                onShowHistory={handleShowHistory}
                onShowDetails={handleShowDetails}
                onDelete={showDeleted ? undefined : setPendingDelete}
                onRestore={showDeleted ? handleRestore : undefined}
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

      <CustomerDetailsDialog
        customer={selectedCustomer}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
      <CustomerEditDialog
        customer={selectedCustomer}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdate={updateCustomer}
      />
      <CustomerHistoryDialog
        customer={selectedCustomer}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={open => !open && setPendingDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת לקוח</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {pendingDelete
                ? `האם למחוק את ${pendingDelete.name}? הלקוח יועבר לארכיון ולא יוצע לפניות ולעבודות חדשות. המשימות וההיסטוריה שלו יישמרו, וניתן לשחזר אותו דרך "הצג מחוקים".`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
