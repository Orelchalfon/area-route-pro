import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJobsContext } from "@/contexts/JobsContext";
import { technicians } from "@/data/mockData";
import { areaForCity } from "@/lib/areas";
import { formatHebrewDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Customer, Job, STATUS_CONFIG } from "@/types";
import { CheckCircle2, ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { PriorityBadge, StatusBadge } from "./badges";
import { JobRowActions } from "./JobRowActions";

type SortKey = "name" | "city" | "area" | "priority" | "status" | "tech" | "date";
type SortDir = "asc" | "desc";

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER = Object.keys(STATUS_CONFIG);

interface Row {
  job: Job;
  customer: Customer | undefined;
  techName: string;
  name: string;
  city: string;
  area: string;
}

export function JobsTable({
  jobs,
  showAssignment,
  onEditCustomer,
  onDeleteJob,
}: {
  jobs: Job[];
  showAssignment?: boolean;
  onEditCustomer: (customer: Customer) => void;
  onDeleteJob: (job: Job) => void;
}) {
  const { customersList: customers } = useJobsContext();
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "name",
    dir: "asc",
  });

  const rows = useMemo<Row[]>(() => {
    const customersById = new Map(customers.map((c) => [c.id, c]));
    const built = jobs.map((job) => {
      const customer = customersById.get(job.customerId);
      const tech = technicians.find((t) => t.id === job.technicianId);
      const city = customer?.city || job.city || "";
      return {
        job,
        customer,
        techName: tech?.name || "",
        name: customer?.name || "",
        city,
        area: city ? areaForCity(city) : "",
      };
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    const cmpText = (a: string, b: string) => a.localeCompare(b, "he") * dir;

    const sorted = [...built].sort((a, b) => {
      switch (sort.key) {
        case "name":
          return cmpText(a.name, b.name);
        case "city":
          return cmpText(a.city, b.city);
        case "area":
          return cmpText(a.area, b.area);
        case "tech":
          return cmpText(a.techName, b.techName);
        case "priority":
          return (
            ((PRIORITY_RANK[a.job.priority] ?? 99) -
              (PRIORITY_RANK[b.job.priority] ?? 99)) *
            dir
          );
        case "status":
          return (
            (STATUS_ORDER.indexOf(a.job.status) -
              STATUS_ORDER.indexOf(b.job.status)) *
            dir
          );
        case "date":
          return (a.job.scheduledDate || "").localeCompare(
            b.job.scheduledDate || "",
          ) * dir;
        default:
          return 0;
      }
    });
    return sorted;
  }, [jobs, customers, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
    sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none";

  if (jobs.length === 0) {
    return (
      <div className='text-center py-8 text-muted-foreground'>
        <CheckCircle2 className='w-10 h-10 mx-auto mb-2 opacity-40' />
        <p className='font-medium'>אין משימות</p>
      </div>
    );
  }

  const SortHeader = ({
    sortKey,
    children,
    className,
  }: {
    sortKey: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => {
    const active = sort.key === sortKey;
    const Icon = !active
      ? ChevronsUpDown
      : sort.dir === "asc"
        ? ChevronUp
        : ChevronDown;
    return (
      <TableHead className={cn("text-right", className)} aria-sort={ariaSort(sortKey)}>
        <button
          type='button'
          onClick={() => toggleSort(sortKey)}
          className='inline-flex items-center gap-1 hover:text-foreground transition-colors'>
          {children}
          <Icon
            className={cn(
              "w-3.5 h-3.5",
              active ? "text-primary" : "text-muted-foreground/50",
            )}
          />
        </button>
      </TableHead>
    );
  };

  return (
    <div className='bg-card rounded-xl shadow-card border border-border overflow-hidden'>
      <div className='overflow-x-auto'>
        <Table>
          <TableHeader className='sticky top-0 z-10 bg-card'>
            <TableRow>
              <SortHeader sortKey='name'>לקוח</SortHeader>
              <SortHeader sortKey='city'>עיר</SortHeader>
              <SortHeader sortKey='area' className='hidden md:table-cell'>
                אזור
              </SortHeader>
              <SortHeader sortKey='priority'>עדיפות</SortHeader>
              <SortHeader sortKey='status'>סטטוס</SortHeader>
              {showAssignment && <SortHeader sortKey='tech'>טכנאי</SortHeader>}
              {showAssignment && <SortHeader sortKey='date'>תאריך</SortHeader>}
              <TableHead className='text-right hidden md:table-cell'>הערות</TableHead>
              <TableHead className='text-right w-12'></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ job, customer, techName, name, city, area }) => {
              const openedLabel =
                job.openedDate ?? formatHebrewDate(job.createdAt);
              return (
                <TableRow key={job.id}>
                  <TableCell className='font-medium'>
                    {name || "—"}
                    {openedLabel && (
                      <span className='block text-xs font-normal text-muted-foreground'>
                        נפתח: {openedLabel}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{city || "—"}</TableCell>
                  <TableCell className='hidden md:table-cell text-muted-foreground'>
                    {area || "—"}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={job.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  {showAssignment && <TableCell>{techName || "—"}</TableCell>}
                  {showAssignment && (
                    <TableCell className='whitespace-nowrap'>
                      {job.scheduledDate || "—"}
                    </TableCell>
                  )}
                  <TableCell className='max-w-50 truncate hidden md:table-cell'>
                    {job.notes}
                  </TableCell>
                  <TableCell>
                    <JobRowActions
                      job={job}
                      customer={customer}
                      onEditCustomer={onEditCustomer}
                      onDeleteJob={onDeleteJob}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
