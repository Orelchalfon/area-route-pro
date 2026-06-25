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
import { CustomerEditDialog } from "@/components/CustomerEditDialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJobsContext } from "@/contexts/JobsContext";
import { technicians } from "@/data/mockData";
import { groupJobsByArea } from "@/lib/areas";
import { Customer, Job } from "@/types";
import { CheckCircle2, ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EditableJobRow } from "./EditableJobRow";

export function JobsByArea({
  jobs,
  showAssignment,
}: {
  jobs: Job[];
  showAssignment?: boolean;
}) {
  const { customersList: customers, updateCustomer, archiveJob } =
    useJobsContext();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    job: Job;
    customerName?: string;
  } | null>(null);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    archiveJob(pendingDelete.job.id);
    toast.success("הרשומה נמחקה");
    setPendingDelete(null);
  };

  if (jobs.length === 0) {
    return (
      <div className='text-center py-8 text-muted-foreground'>
        <CheckCircle2 className='w-10 h-10 mx-auto mb-2 opacity-40' />
        <p className='font-medium'>אין משימות</p>
      </div>
    );
  }

  const areaGroups = groupJobsByArea(jobs);

  return (
    <div className='space-y-6'>
      {areaGroups.map(({ area, count, cities }) => (
        <Collapsible key={area} defaultOpen className='space-y-3'>
          <CollapsibleTrigger className='group flex w-full items-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-right transition-colors hover:bg-primary/15'>
            <ChevronDown className='w-5 h-5 text-primary transition-transform group-data-[state=closed]:-rotate-90' />
            <h3 className='text-lg font-bold text-primary'>{area}</h3>
            <span className='text-sm font-medium text-primary/70'>({count})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className='space-y-4 pr-2'>
            {cities.map(({ city, jobs: cityJobs }) => (
              <div
                key={city}
                className='bg-card rounded-xl shadow-card border border-border overflow-hidden'>
                <div className='flex items-center gap-2 p-3 border-b border-border bg-muted/30'>
                  <MapPin className='w-4 h-4 text-muted-foreground' />
                  <h4 className='font-semibold text-card-foreground'>{city}</h4>
                  <span className='text-xs text-muted-foreground'>
                    ({cityJobs.length})
                  </span>
                </div>
                <div className='overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0'>
                  <Table className='min-w-[720px]'>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='text-right'>לקוח</TableHead>
                        <TableHead className='text-right'>כתובת</TableHead>
                        <TableHead className='text-right'>עדיפות</TableHead>
                        <TableHead className='text-right'>סטטוס</TableHead>
                        {showAssignment && (
                          <TableHead className='text-right'>טכנאי</TableHead>
                        )}
                        {showAssignment && (
                          <TableHead className='text-right'>תאריך</TableHead>
                        )}
                        <TableHead className='text-right'>הערות</TableHead>
                        <TableHead className='text-right w-12'></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cityJobs.map((job) => {
                        const customer = customers.find(
                          (c) => c.id === job.customerId,
                        );
                        const tech = technicians.find(
                          (t) => t.id === job.technicianId,
                        );
                        return (
                          <EditableJobRow
                            key={job.id}
                            job={job}
                            customer={customer}
                            tech={tech}
                            showAssignment={showAssignment}
                            onEditCustomer={setEditingCustomer}
                            onDeleteJob={(j) =>
                              setPendingDelete({ job: j, customerName: customer?.name })
                            }
                          />
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}

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
              {pendingDelete?.customerName
                ? `האם למחוק את הרשומה של ${pendingDelete.customerName}? הרשומה תוסתר מהרשימה.`
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
