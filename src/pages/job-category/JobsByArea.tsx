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
import { useGoogleMapsKey } from "@/hooks/useGoogleMapsKey";
import { groupJobsByArea } from "@/lib/areas";
import { geocodeAddress } from "@/lib/geocodeAddress";
import { Customer, Job } from "@/types";
import { CheckCircle2, ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import { EditableJobRow, type EditForm } from "./EditableJobRow";

export function JobsByArea({
  jobs,
  showAssignment,
}: {
  jobs: Job[];
  showAssignment?: boolean;
}) {
  const {
    customersList: customers,
    updateJob,
    updateCustomer,
  } = useJobsContext();
  const { fetchKey } = useGoogleMapsKey();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = async (
    jobId: string,
    customerId: string,
    data: EditForm,
  ) => {
    updateJob(jobId, {
      location: data.location,
      city: data.city,
      notes: data.notes,
      priority: data.priority as Job["priority"],
    });

    const customerData: Partial<Customer> = {
      address: data.location,
      city: data.city,
    };

    const currentCustomer = customers.find(
      (customer) => customer.id === customerId,
    );
    const hasLocationChange =
      (data.location || "").trim() !==
        (currentCustomer?.address || "").trim() ||
      (data.city || "").trim() !== (currentCustomer?.city || "").trim();

    const fullAddress = [data.location, data.city].filter(Boolean).join(", ");
    if (hasLocationChange && fullAddress) {
      const geocoded = await geocodeAddress(fullAddress, await fetchKey());

      if (geocoded) {
        customerData.lat = geocoded.lat;
        customerData.lng = geocoded.lng;
        customerData.placeId = geocoded.placeId;
      } else {
        customerData.lat = undefined;
        customerData.lng = undefined;
        customerData.placeId = undefined;
      }
    }

    updateCustomer(customerId, customerData);
    setEditingId(null);
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
                            editingId={editingId}
                            onStartEdit={setEditingId}
                            onCancelEdit={() => setEditingId(null)}
                            onSave={handleSave}
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
    </div>
  );
}
