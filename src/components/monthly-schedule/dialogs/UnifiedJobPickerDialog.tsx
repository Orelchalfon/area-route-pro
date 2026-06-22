import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJobsContext } from "@/contexts/JobsContext";
import { cn } from "@/lib/utils";
import { Job } from "@/types";
import { AlertTriangle, Clock, Filter, Plus, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { jobMatchesAreas } from "../regions";

// Unified picker dialog for adding any job type to a day
export function UnifiedJobPickerDialog({
  open,
  onClose,
  unassignedManualJobs,
  unassignedFilterJobs,
  filterJobsFromOtherDays,
  otherDayIds,
  onSelectManualJobs,
  onSelectFilterJobs,
  dayLabel,
  dayAreas,
}: {
  open: boolean;
  onClose: () => void;
  unassignedManualJobs: Job[];
  unassignedFilterJobs: Job[];
  filterJobsFromOtherDays: Job[];
  otherDayIds: Set<string>;
  onSelectManualJobs: (jobIds: string[]) => void;
  onSelectFilterJobs: (jobIds: string[], otherDayIds: Set<string>) => void;
  dayLabel: string;
  dayAreas: string[];
}) {
  const { customersList: customers } = useJobsContext();
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("malfunction");

  // Filter jobs to only those in the selected day areas
  const areaFilteredManualJobs = useMemo(
    () =>
      dayAreas.length > 0
        ? unassignedManualJobs.filter((j) => jobMatchesAreas(j, dayAreas))
        : unassignedManualJobs,
    [dayAreas, unassignedManualJobs],
  );

  const areaFilteredFilterJobs = useMemo(() => {
    const all = [...unassignedFilterJobs, ...filterJobsFromOtherDays];
    return dayAreas.length > 0
      ? all.filter((j) => jobMatchesAreas(j, dayAreas))
      : all;
  }, [dayAreas, unassignedFilterJobs, filterJobsFromOtherDays]);

  const jobsByType = useMemo(
    () => ({
      malfunction: areaFilteredManualJobs.filter(
        (j) => j.type === "malfunction",
      ),
      installation: areaFilteredManualJobs.filter(
        (j) => j.type === "installation",
      ),
      filter_replacement: areaFilteredFilterJobs,
    }),
    [areaFilteredManualJobs, areaFilteredFilterJobs],
  );

  const toggleJob = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleConfirm = () => {
    const manualIds = Array.from(selectedJobIds).filter((id) =>
      unassignedManualJobs.some((j) => j.id === id),
    );
    const filterIds = Array.from(selectedJobIds).filter((id) =>
      [...unassignedFilterJobs, ...filterJobsFromOtherDays].some(
        (j) => j.id === id,
      ),
    );

    if (manualIds.length > 0) onSelectManualJobs(manualIds);
    if (filterIds.length > 0) onSelectFilterJobs(filterIds, otherDayIds);

    setSelectedJobIds(new Set());
  };

  const handleClose = () => {
    setSelectedJobIds(new Set());
    onClose();
  };

  const renderJobList = (items: Job[], isFilter = false) => {
    if (items.length === 0)
      return (
        <p className='text-xs text-muted-foreground py-4 text-center'>
          אין פניות באזור זה
        </p>
      );
    return (
      <div className='space-y-2'>
        {items.map((job) => {
          const customer = customers.find((c) => c.id === job.customerId);
          const isFromOther = otherDayIds.has(job.id);
          return (
            <label
              key={job.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors",
                isFromOther ? "border-accent bg-accent/5" : "border-border",
              )}>
              <Checkbox
                checked={selectedJobIds.has(job.id)}
                onCheckedChange={() => toggleJob(job.id)}
                className='mt-0.5'
              />
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <span className='font-medium text-sm'>{customer?.name}</span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                      job.priority === "high"
                        ? "bg-destructive/15 text-destructive"
                        : job.priority === "medium"
                          ? "bg-warning/15 text-warning"
                          : "bg-info/15 text-info"
                    }`}>
                    {job.priority === "high"
                      ? "גבוהה"
                      : job.priority === "medium"
                        ? "בינונית"
                        : "נמוכה"}
                  </span>
                </div>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  {job.location}
                  {job.city ? `, ${job.city}` : ""}
                </p>
                <div className='flex items-center gap-3 text-xs text-muted-foreground mt-0.5'>
                  <span className='flex items-center gap-1'>
                    <Clock className='w-3 h-3' />
                    {job.estimatedDuration} דק׳
                  </span>
                  <span>{job.notes}</span>
                </div>
                {isFromOther && (
                  <p className='text-xs text-accent-foreground mt-0.5'>
                    📌 משובץ ביום אחר — יועבר לכאן
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className='max-w-lg max-h-[80vh] overflow-y-auto'
        dir='rtl'>
        <DialogHeader>
          <DialogTitle>הוספת משימה — {dayLabel}</DialogTitle>
          {dayAreas.length > 0 && (
            <p className='text-xs text-muted-foreground'>
              אזורים: {dayAreas.join(", ")}
            </p>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
          <TabsList className='w-full justify-start'>
            <TabsTrigger value='malfunction' className='gap-1'>
              <AlertTriangle className='w-3.5 h-3.5' />
              תקלות ({jobsByType.malfunction.length})
            </TabsTrigger>
            <TabsTrigger value='installation' className='gap-1'>
              <Wrench className='w-3.5 h-3.5' />
              התקנות ({jobsByType.installation.length})
            </TabsTrigger>
            <TabsTrigger value='filter_replacement' className='gap-1'>
              <Filter className='w-3.5 h-3.5' />
              שירות ({jobsByType.filter_replacement.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value='malfunction'>
            {renderJobList(jobsByType.malfunction)}
          </TabsContent>
          <TabsContent value='installation'>
            {renderJobList(jobsByType.installation)}
          </TabsContent>
          <TabsContent value='filter_replacement'>
            {renderJobList(jobsByType.filter_replacement, true)}
          </TabsContent>
        </Tabs>

        {selectedJobIds.size > 0 && (
          <div className='sticky bottom-0 bg-card border-t border-border pt-3 flex items-center justify-between'>
            <span className='text-sm font-medium'>
              {selectedJobIds.size} נבחרו
            </span>
            <Button onClick={handleConfirm}>
              <Plus className='w-4 h-4 ml-1' />
              הוסף
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
