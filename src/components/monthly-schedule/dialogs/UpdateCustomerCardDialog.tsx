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
 * Asked right after a job's contact details are saved from a scheduling screen. The
 * job row is already updated; the open question is whether the customer's own card
 * should carry the same address/phone from now on, or whether this was a one-off for
 * this visit. Only shown for jobs backed by a real customer record.
 */
export function UpdateCustomerCardDialog({
  open,
  onOpenChange,
  customerName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir='rtl'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-right flex items-center gap-2'>
            <UserCog className='w-5 h-5 text-primary shrink-0' />
            לעדכן גם בכרטיס הלקוח?
          </AlertDialogTitle>
          <AlertDialogDescription className='text-right'>
            הפרטים עודכנו במשימה. לעדכן אותם גם בכרטיס של {customerName}, כך
            שיופיעו כך בכל המשימות הבאות?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className='flex-col sm:flex-col gap-2'>
          <Button className='w-full h-12 text-base gap-2' onClick={onConfirm}>
            <Check className='w-5 h-5' />
            כן, עדכן
          </Button>
          <AlertDialogCancel className='w-full h-12 text-base mt-0'>
            לא, רק במשימה זו
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
