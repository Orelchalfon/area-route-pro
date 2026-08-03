import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ListPlus, RotateCcw } from "lucide-react";

/**
 * Shown when the manager schedules work onto a day whose route is already approved —
 * meaning the technician can already see it and the customers have already been given
 * times. Adding silently would change a plan people are acting on, so the manager picks
 * between slotting the job in at the end and reopening the whole day for re-planning.
 */
export function AddToApprovedDayDialog({
  open,
  onOpenChange,
  dayLabel,
  technicianName,
  jobLabel,
  jobCount,
  onAppendToRoute,
  onUnapproveAndReplan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayLabel: string;
  technicianName: string;
  jobLabel: string;
  jobCount: number;
  onAppendToRoute: () => void;
  onUnapproveAndReplan: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir='rtl'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-right flex items-center gap-2'>
            <AlertTriangle className='w-5 h-5 text-warning shrink-0' />
            היום כבר אושר
          </AlertDialogTitle>
          <AlertDialogDescription className='text-right'>
            הוספת {jobCount > 1 ? `${jobCount} משימות` : `"${jobLabel}"`} ליום{" "}
            {dayLabel} שכבר אושר ל{technicianName}. הטכנאי כבר רואה את הלו״ז
            והלקוחות קיבלו שעות.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='flex-col sm:flex-col gap-2'>
          <Button className='w-full gap-2' onClick={onAppendToRoute}>
            <ListPlus className='w-4 h-4' />
            הוסף לסוף המסלול
          </Button>
          <Button
            variant='outline'
            className='w-full gap-2 border-destructive text-destructive hover:bg-destructive/10'
            onClick={onUnapproveAndReplan}>
            <RotateCcw className='w-4 h-4' />
            בטל אישור ותכנן מחדש
          </Button>
          <AlertDialogCancel className='w-full mt-0'>ביטול</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
