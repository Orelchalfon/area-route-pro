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
import { Check, UserCog } from "lucide-react";

/**
 * Asked right after a job's contact details are saved from a scheduling screen. The job
 * row is already updated by this point, so declining simply leaves the customer's card
 * alone — which is the common one-off case: the customer gives a different number for
 * this visit (a relative who will be home) and the card must not change.
 */
export function UpdateCustomerCardDialog({
  open,
  onOpenChange,
  customerName,
  isNewCard,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  /** No card matched this job, so confirming opens a new one. */
  isNewCard?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir='rtl'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-right flex items-center gap-2'>
            <UserCog className='w-5 h-5 text-primary shrink-0' />
            איפה לשמור את הפרטים?
          </AlertDialogTitle>
          <AlertDialogDescription className='text-right'>
            הפרטים נשמרו במשימה הזו.
            {isNewCard ? (
              <>
                {" "}
                לא נמצא כרטיס לקוח בשם {customerName} — לפתוח כרטיס חדש עם
                הפרטים האלה?
              </>
            ) : (
              <>
                {" "}
                לעדכן אותם גם בכרטיס של {customerName}, כך שיופיעו כך גם בכל
                המשימות הבאות?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='flex-col sm:flex-col gap-2'>
          <Button className='w-full h-12 text-base gap-2' onClick={onConfirm}>
            <Check className='w-5 h-5' />
            {isNewCard ? "פתח כרטיס לקוח" : "עדכן גם בכרטיס הלקוח"}
          </Button>
          <AlertDialogCancel className='w-full h-12 text-base mt-0'>
            רק במשימה הזו
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
