import { CustomerEditDialog } from "@/components/CustomerEditDialog";
import { OpenJobDialog } from "@/components/OpenJobDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useJobsContext } from "@/contexts/JobsContext";
import { Customer, Job, JobType } from "@/types";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  List,
  MapPin,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { JobsByArea } from "./job-category/JobsByArea";
import { JobsTable } from "./job-category/JobsTable";
import { LiveSyncStatus } from "./job-category/LiveSyncStatus";

const categoryConfig: Record<string, { type: JobType; title: string }> = {
  malfunctions: { type: "malfunction", title: "מאגר תקלות" },
  installations: { type: "installation", title: "מאגר התקנות" },
  service: { type: "filter_replacement", title: "סיכום שירות שוטף" },
};

type ViewMode = "table" | "area";
const VIEW_STORAGE_KEY = "job-category-view";

export default function JobCategoryPage({
  category,
}: {
  category: "malfunctions" | "installations" | "service";
}) {
  const {
    jobs,
    customersList,
    addJob,
    updateCustomer,
    archiveJob,
    dbSyncStatus,
    dbSyncError,
    dbLastSyncedAt,
    refreshDbJobs,
  } = useJobsContext();
  const config = categoryConfig[category];
  // Malfunctions/installations get a dedicated "open request" button; the
  // service page is a read-only summary, so it has none.
  const canOpenRequest = category !== "service";
  const allOfType = jobs.filter((j) => j.type === config.type);
  const showLiveSyncStatus = category !== "service";
  const showSearch = category !== "service";
  const isRefreshing = dbSyncStatus === "loading" || dbSyncStatus === "syncing";

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "table";
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "area"
      ? "area"
      : "table";
  });

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Shared row actions (edit customer / archive job) — owned here so both the
  // table and the by-area views drive the same dialogs.
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Job | null>(null);
  const pendingDeleteName = pendingDelete
    ? customersList.find((c) => c.id === pendingDelete.customerId)?.name
    : undefined;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    archiveJob(pendingDelete.id);
    toast.success("הרשומה נמחקה");
    setPendingDelete(null);
  };

  // Filter by customer (name/phone/address/city) and job (notes/city/location)
  // before splitting into the unassigned/assigned pools, so both sections and
  // their header counters reflect the query. Mirrors the match fields used in
  // ServiceCyclePage's client search.
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allOfType;

    const customersById = new Map(customersList.map((c) => [c.id, c]));
    const matches = (...fields: (string | null | undefined)[]) =>
      fields.some((f) => f && f.toLowerCase().includes(q));

    return allOfType.filter((job) => {
      const customer = customersById.get(job.customerId);
      return matches(
        customer?.name,
        customer?.phone,
        customer?.address,
        customer?.city,
        job.notes,
        job.city,
        job.location,
      );
    });
  }, [allOfType, customersList, searchQuery]);

  const unassigned = filtered.filter(
    (j) => !j.technicianId && !j.scheduledDate && j.status === "draft",
  );
  const assigned = filtered.filter(
    (j) => j.technicianId || j.scheduledDate || j.status !== "draft",
  );

  const renderJobs = (jobsToRender: Job[], showAssignment?: boolean) =>
    viewMode === "table" ? (
      <JobsTable
        jobs={jobsToRender}
        showAssignment={showAssignment}
        onEditCustomer={setEditingCustomer}
        onDeleteJob={setPendingDelete}
      />
    ) : (
      <JobsByArea
        jobs={jobsToRender}
        showAssignment={showAssignment}
        onEditCustomer={setEditingCustomer}
        onDeleteJob={setPendingDelete}
      />
    );

  return (
    <div dir='rtl'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-2xl font-bold text-foreground'>{config.title}</h2>
        <div className='flex items-center gap-3 text-sm'>
          {canOpenRequest && (
            <OpenJobDialog
              type={config.type as "malfunction" | "installation"}
              customers={customersList}
              onAdd={addJob}
            />
          )}
          {showLiveSyncStatus && (
            <>
              <LiveSyncStatus
                status={dbSyncStatus}
                error={dbSyncError}
                lastSyncedAt={dbLastSyncedAt}
              />
              <Button
                variant='outline'
                size='sm'
                className='h-7 gap-1.5 px-2.5 text-xs'
                onClick={() => {
                  void refreshDbJobs();
                }}
                disabled={isRefreshing}
                aria-label='רענן נתונים מהשרת'
                title='רענן נתונים מהשרת'>
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                רענן
              </Button>
            </>
          )}
          <span className='flex items-center gap-1.5 text-muted-foreground'>
            <span className='w-2 h-2 rounded-full bg-muted-foreground' />
            ממתינים: {unassigned.length}
          </span>
          <span className='flex items-center gap-1.5 text-info'>
            <span className='w-2 h-2 rounded-full bg-info' />
            שובצו: {assigned.length}
          </span>
        </div>
      </div>

      {showSearch && (
        <div className='flex flex-wrap items-center gap-3 mb-6'>
          <div className='relative w-full sm:max-w-sm'>
            <Search className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none' />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='חיפוש לקוח (שם, טלפון, כתובת, עיר)...'
              className='pr-9 pl-9'
            />
            {searchQuery && (
              <button
                type='button'
                onClick={() => setSearchQuery("")}
                className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                aria-label='נקה חיפוש'>
                <X className='w-4 h-4' />
              </button>
            )}
          </div>
          <div className='flex items-center gap-1'>
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size='sm'
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}>
              <List className='w-4 h-4 ml-1' /> טבלה
            </Button>
            <Button
              variant={viewMode === "area" ? "default" : "outline"}
              size='sm'
              onClick={() => setViewMode("area")}
              aria-pressed={viewMode === "area"}>
              <MapPin className='w-4 h-4 ml-1' /> לפי אזור
            </Button>
          </div>
        </div>
      )}

      <div className='mb-6'>
        <h3 className='text-lg font-semibold text-foreground mb-3 flex items-center gap-2'>
          <Clock className='w-4 h-4 text-muted-foreground' />
          ממתינים לשיבוץ ({unassigned.length})
        </h3>
        {renderJobs(unassigned)}
      </div>

      {assigned.length > 0 && (
        <div>
          <h3 className='text-lg font-semibold text-foreground mb-3 flex items-center gap-2'>
            <CheckCircle2 className='w-4 h-4 text-info' />
            שובצו בלוח ({assigned.length})
          </h3>
          {renderJobs(assigned, true)}
        </div>
      )}

      <CustomerEditDialog
        customer={editingCustomer}
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        onUpdate={updateCustomer}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent dir='rtl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-right'>מחיקת רשומה</AlertDialogTitle>
            <AlertDialogDescription className='text-right'>
              {pendingDeleteName
                ? `האם למחוק את הרשומה של ${pendingDeleteName}? הרשומה תוסתר מהרשימה.`
                : "האם למחוק את הרשומה? הרשומה תוסתר מהרשימה."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
