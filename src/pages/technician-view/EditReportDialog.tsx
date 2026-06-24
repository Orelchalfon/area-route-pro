import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CompletionStatus } from '@/types';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { key: 'done' as CompletionStatus, label: 'בוצע', icon: CheckCircle2, cls: 'border-success text-success' },
  { key: 'not_done' as CompletionStatus, label: 'לא בוצע', icon: XCircle, cls: 'border-destructive text-destructive' },
  { key: 'need_return' as CompletionStatus, label: 'צריך לחזור', icon: RotateCcw, cls: 'border-warning text-warning' },
];

export function EditReportDialog({
  open,
  status,
  notes,
  onStatusChange,
  onNotesChange,
  onSave,
  onClose,
}: {
  open: boolean;
  status: CompletionStatus;
  notes: string;
  onStatusChange: (status: CompletionStatus) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת דיווח</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            {STATUS_OPTIONS.map(opt => (
              <Button
                key={opt.key}
                size="sm"
                variant="outline"
                className={`flex-1 ${status === opt.key ? opt.cls + ' bg-opacity-10' : ''}`}
                onClick={() => onStatusChange(opt.key)}
              >
                <opt.icon className="w-3.5 h-3.5 ml-1" />
                {opt.label}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder="הערות..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
          <Button onClick={onSave}>שמור</Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
