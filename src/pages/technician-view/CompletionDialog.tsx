import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CompletionStatus } from '@/types';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

export function CompletionDialog({
  open,
  status,
  notes,
  onNotesChange,
  onConfirm,
  onClose,
}: {
  open: boolean;
  status: CompletionStatus;
  notes: string;
  onNotesChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {status === 'done' ? 'סימון כבוצע' :
             status === 'not_done' ? 'סימון כלא בוצע' :
             'סימון — צריך לחזור'}
          </DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="הוסף הערות..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
        />
        <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
          <Button
            onClick={onConfirm}
            className={
              status === 'done' ? 'bg-success hover:bg-success/90 text-success-foreground' :
              status === 'not_done' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' :
              'bg-warning hover:bg-warning/90 text-warning-foreground'
            }
          >
            {status === 'done' ? <CheckCircle2 className="w-4 h-4 ml-2" /> :
             status === 'not_done' ? <XCircle className="w-4 h-4 ml-2" /> :
             <RotateCcw className="w-4 h-4 ml-2" />}
            אישור
          </Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
