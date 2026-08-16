import { AnimatedCount } from "@/components/AnimatedCount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobsContext } from "@/contexts/JobsContext";
import { OngoingService, useOngoingServices } from "@/hooks/useOngoingServices";
import { FollowUpOption } from "@/lib/followUpOptions";
import { isOngoingJob, parseDbCustomerId } from "@/lib/idConventions";
import { cn } from "@/lib/utils";
import { Job } from "@/types";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClientSearchResults } from "./service-cycle/ClientSearchResults";
import { MonthCalendarView, MonthListView } from "./service-cycle/MonthViews";
import { OpenServiceCallDialog } from "./service-cycle/OpenServiceCallDialog";
import { isServiceDone } from "./service-cycle/status";

const MONTH_NAMES = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

type ViewMode = "annual" | "month-calendar" | "month-list";

export default function ServiceCyclePage() {
  const {
    services,
    loading,
    refresh,
    updateOngoingService,
    archiveOngoingService,
  } = useOngoingServices();
  const { jobs, customersList, addJob, updateCustomer, archiveJob } =
    useJobsContext();

  // Linked-customer lookup by the customers UUID stored on ongoing_services rows
  // (customersList ids carry a db-cust- prefix). Keyed under BOTH forms: new rows store the
  // raw uuid, but rows written before that was normalized carry the prefixed id verbatim.
  const customersByRawId = useMemo(() => {
    const map = new Map<string, (typeof customersList)[number]>();
    customersList.forEach((c) => {
      const rawId = parseDbCustomerId(c.id);
      if (rawId) map.set(rawId, c);
      map.set(c.id, c);
    });
    return map;
  }, [customersList]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("annual");
  const [searchQuery, setSearchQuery] = useState("");
  // The input value stays bound to `searchQuery` (instant), but the heavy view switch +
  // filtering read the deferred value, so typing the first character never blocks on rendering
  // the results list.
  const deferredQuery = useDeferredValue(searchQuery);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Client search across all related records (ongoing services + malfunctions + installations),
  // all years. Ongoing services have no structured client/phone/address — only task_description
  // + location — so those are the only fields matched there.
  const searchResults = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return { ongoing: [], jobs: [], total: 0 };

    const matches = (...fields: (string | null | undefined)[]) =>
      fields.some((f) => f && f.toLowerCase().includes(q));

    const customersById = new Map(customersList.map((c) => [c.id, c]));

    const ongoing = services
      .filter((s) => matches(s.task_description, s.location))
      .sort((a, b) => b.service_date.localeCompare(a.service_date));

    const jobMatches = jobs
      .filter((j) => j.type === "malfunction" || j.type === "installation")
      .map((j) => ({ job: j, customer: customersById.get(j.customerId) }))
      .filter(({ job, customer }) =>
        matches(
          customer?.name,
          customer?.phone,
          customer?.address,
          customer?.city,
          job.notes,
          job.city,
          job.location,
        ),
      )
      .sort((a, b) =>
        (b.job.scheduledDate || b.job.createdAt).localeCompare(
          a.job.scheduledDate || a.job.createdAt,
        ),
      );

    return {
      ongoing,
      jobs: jobMatches,
      total: ongoing.length + jobMatches.length,
    };
  }, [deferredQuery, services, jobs, customersList]);

  // Group services by month
  const servicesByMonth = useMemo(() => {
    const grouped: Record<number, OngoingService[]> = {};
    for (let m = 1; m <= 12; m++) grouped[m] = [];
    services.forEach((s) => {
      const d = new Date(s.service_date);
      if (d.getFullYear() === selectedYear) {
        grouped[d.getMonth() + 1].push(s);
      }
    });
    return grouped;
  }, [services, selectedYear]);

  const monthStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const items = servicesByMonth[month];
      const isPast =
        selectedYear < currentYear ||
        (selectedYear === currentYear && month < currentMonth);
      const isCurrent = selectedYear === currentYear && month === currentMonth;
      return { month, total: items.length, isPast, isCurrent, services: items };
    });
  }, [servicesByMonth, selectedYear, currentMonth, currentYear]);

  const goToMonth = (month: number, mode: ViewMode) => {
    setSelectedMonth(month);
    setViewMode(mode);
  };

  // Pre-filled service date for a new call: today when the view is on the current month,
  // otherwise the first working day (Sun–Thu) of the month being looked at — a Fri/Sat date
  // would never render in MonthCalendarView.
  const defaultServiceDate = useMemo(() => {
    const today = new Date();
    const month = selectedMonth ?? today.getMonth() + 1;
    if (selectedYear === today.getFullYear() && month === today.getMonth() + 1) {
      return format(today, "yyyy-MM-dd");
    }
    const first = new Date(selectedYear, month - 1, 1);
    while (first.getDay() === 5 || first.getDay() === 6) {
      first.setDate(first.getDate() + 1);
    }
    return format(first, "yyyy-MM-dd");
  }, [selectedMonth, selectedYear]);

  // Each ticked service type becomes its own request, awaited one at a time so the created
  // records can be collected and offered as an undo — the same shape as the follow-up flow.
  // The calls are created UNSCHEDULED (no technician/date) and only carry a service_date,
  // so they show up in the cycle and wait in "ממתינים לשיבוץ".
  const handleOpenServiceCalls = useCallback(
    async ({
      customerId,
      options,
      serviceDate,
      notes,
    }: {
      customerId: string;
      options: FollowUpOption[];
      serviceDate: string;
      notes: string;
    }) => {
      const customer = customersList.find((c) => c.id === customerId);
      const created: Job[] = [];
      for (const option of options) {
        created.push(
          await addJob({
            type: "filter_replacement",
            customerId,
            technicianId: "",
            scheduledDate: "",
            scheduledTime: "",
            serviceDate,
            // The cycle views render task_description on its own, with no customer column —
            // hence the name in the label, matching the follow-up and calendar rows.
            description: customer?.name
              ? `${option.label} — ${customer.name}`
              : option.label,
            notes,
          }),
        );
      }

      // Only rows that actually reached the database can be undone: addJob swallows an
      // insert failure (it toasts on its own) and falls back to a local id with no row.
      const saved = created.filter((j) => isOngoingJob(j.id));
      if (saved.length === 0) return;

      toast.success(
        saved.length === 1
          ? "קריאת השירות נפתחה"
          : `${saved.length} קריאות שירות נפתחו`,
        {
          duration: 8000,
          action: {
            label: "בטל",
            onClick: () => {
              // No refresh() here: archiveJob persists in the background, so refetching now
              // could race ahead of the UPDATE and briefly re-show the rows. The realtime
              // channel fires once the archive lands and refetches then.
              saved.forEach((j) => archiveJob(j.id));
              toast.success(
                saved.length === 1
                  ? "קריאת השירות בוטלה"
                  : `${saved.length} קריאות שירות בוטלו`,
              );
            },
          },
        },
      );
      void refresh();
    },
    [addJob, archiveJob, customersList, refresh],
  );

  const openServiceCallDialog = (
    <OpenServiceCallDialog
      customers={customersList}
      defaultDate={defaultServiceDate}
      onAdd={handleOpenServiceCalls}
    />
  );

  const isSearching = deferredQuery.trim().length > 0;

  const searchBar = (
    <div className='relative w-full sm:max-w-sm'>
      <Search className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none' />
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder='חיפוש לקוח (שם, טלפון, כתובת, עיר)...'
        className='pr-9 pl-9 '
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
  );

  if (loading) {
    return (
      <div dir='rtl' className='space-y-6'>
        {/* Header row — title + year nav */}
        <div className='flex items-center justify-between flex-wrap gap-3'>
          <div className='space-y-2'>
            <Skeleton className='h-8 w-64' />
            <Skeleton className='h-4 w-80' />
          </div>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-9 w-9 rounded-md' />
            <Skeleton className='h-6 w-12' />
            <Skeleton className='h-9 w-9 rounded-md' />
          </div>
        </div>

        {/* Search bar */}
        <Skeleton className='h-10 w-full sm:max-w-sm' />

        {/* Month cards grid */}
        <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className='flex flex-col items-center p-4 rounded-xl border-2 border-border bg-card'>
              <Skeleton className='h-4 w-16' />
              <Skeleton className='h-8 w-10 my-2' />
              <Skeleton className='h-3 w-12 mb-2' />
              <div className='flex gap-1'>
                <Skeleton className='h-7 w-14' />
                <Skeleton className='h-7 w-14' />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Month detail view (calendar or list) — only when not actively searching, so
  // typing a query always surfaces the search results regardless of drill-down state.
  if (!isSearching && selectedMonth !== null && viewMode !== "annual") {
    const stat = monthStats[selectedMonth - 1];

    return (
      <div dir='rtl' className='space-y-4'>
        <div className='flex items-center gap-3 flex-wrap'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              setSelectedMonth(null);
              setViewMode("annual");
            }}
            className='gap-1'>
            <ArrowRight className='w-4 h-4' />
            חזרה
          </Button>
          <h2 className='text-xl font-bold text-foreground'>
            <Filter className='w-5 h-5 inline ml-2 text-primary' />
            שירות שוטף — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </h2>
          <span className='text-sm text-muted-foreground'>
            {stat.total} משימות ·{" "}
            {stat.services.filter(isServiceDone).length} בוצעו
          </span>
          <div className='mr-auto flex items-center gap-1'>
            {openServiceCallDialog}
            <Button
              variant={viewMode === "month-list" ? "default" : "outline"}
              size='sm'
              onClick={() => setViewMode("month-list")}>
              <List className='w-4 h-4 ml-1' /> רשימה
            </Button>
            <Button
              variant={viewMode === "month-calendar" ? "default" : "outline"}
              size='sm'
              onClick={() => setViewMode("month-calendar")}>
              <CalendarDays className='w-4 h-4 ml-1' /> לוח שנה
            </Button>
          </div>
        </div>

        {viewMode === "month-list" ? (
          <MonthListView
            services={stat.services}
            onUpdateService={updateOngoingService}
            onArchiveService={archiveOngoingService}
            customersById={customersByRawId}
            onUpdateCustomer={updateCustomer}
          />
        ) : (
          <MonthCalendarView
            services={stat.services}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onUpdateService={updateOngoingService}
            customersById={customersByRawId}
            onUpdateCustomer={updateCustomer}
          />
        )}
      </div>
    );
  }

  // Annual overview + search results share one structure so the search input stays
  // mounted in a stable tree position — otherwise React remounts it on the first
  // keystroke (when the view switches) and the field loses focus / "jumps".
  return (
    <div dir='rtl' className='space-y-6'>
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <div>
          {isSearching ? (
            <h2 className='text-2xl font-bold text-foreground flex items-center gap-2'>
              <Search className='w-6 h-6 text-primary' />
              תוצאות חיפוש
              <span className='text-sm font-normal text-muted-foreground'>
                ({searchResults.total} רשומות)
              </span>
            </h2>
          ) : (
            <>
              <h2 className='text-2xl font-bold text-foreground flex items-center gap-2'>
                <RefreshCw className='w-6 h-6 text-primary' />
                שירות שוטף — מעגל שנתי
              </h2>
              <p className='text-sm text-muted-foreground mt-1'>
                מעקב אחר שירות שוטף — לחץ על חודש לצפייה בלוח החודשי או ברשימה.
              </p>
            </>
          )}
        </div>
        {!isSearching && (
          <div className='flex items-center gap-2'>
            {openServiceCallDialog}
            <Button
              variant='outline'
              size='icon'
              aria-label='השנה הקודמת'
              onClick={() => setSelectedYear((y) => y - 1)}>
              <ChevronRight className='w-4 h-4' />
            </Button>
            <span className='font-bold text-lg min-w-[60px] text-center'>
              {selectedYear}
            </span>
            <Button
              variant='outline'
              size='icon'
              aria-label='השנה הבאה'
              onClick={() => setSelectedYear((y) => y + 1)}>
              <ChevronLeft className='w-4 h-4' />
            </Button>
          </div>
        )}
      </div>

      {searchBar}

      {isSearching ? (
        <ClientSearchResults
          results={searchResults}
          onUpdateService={updateOngoingService}
          onUpdateCustomer={updateCustomer}
          onArchiveService={archiveOngoingService}
          onArchiveJob={archiveJob}
          customersById={customersByRawId}
        />
      ) : (
        <>
          <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'>
            {monthStats.map((stat) => (
              <div
                key={stat.month}
                className={cn(
                  "relative flex flex-col items-center p-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer",
                  stat.isCurrent && "ring-2 ring-primary ring-offset-2",
                  stat.total === 0
                    ? "border-border bg-card opacity-60"
                    : "border-primary/30 bg-card",
                )}>
                <span className='text-sm font-semibold text-foreground'>
                  {MONTH_NAMES[stat.month - 1]}
                </span>
                <AnimatedCount
                  value={stat.total}
                  className='text-2xl font-bold text-primary my-2'
                />
                <span className='text-xs text-muted-foreground mb-2'>
                  משימות
                </span>
                <div className='flex gap-1'>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-7 px-2 text-xs'
                    onClick={() => goToMonth(stat.month, "month-list")}>
                    <List className='w-3 h-3 ml-0.5' /> רשימה
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-7 px-2 text-xs'
                    onClick={() => goToMonth(stat.month, "month-calendar")}>
                    <CalendarDays className='w-3 h-3 ml-0.5' /> לוח
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className='text-sm text-muted-foreground text-center'>
            סה״כ{" "}
            <AnimatedCount
              value={
                services.filter(
                  (s) => new Date(s.service_date).getFullYear() === selectedYear,
                ).length
              }
            />{" "}
            משימות בשנת {selectedYear}
          </div>
        </>
      )}
    </div>
  );
}
