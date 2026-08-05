import { Switch } from '@/components/ui/switch';
import { ShareLocationApi } from '@/hooks/useShareLocation';
import { AlertTriangle, Navigation } from 'lucide-react';

/**
 * Technician-facing opt-in for live location. Deliberately explicit about what is shared and
 * with whom — this is the only place the technician can see or control it.
 */
export function ShareLocationToggle({ sharing, error, toggle }: ShareLocationApi) {
  return (
    <div className="flex flex-col items-end gap-1">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Switch checked={sharing} onCheckedChange={toggle} aria-label="שתף מיקום עם המנהל" />
        <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <Navigation className={`w-4 h-4 ${sharing ? 'text-primary' : 'text-muted-foreground'}`} />
          שתף מיקום
        </span>
      </label>
      {error ? (
        <p className="text-xs text-destructive flex items-center gap-1 max-w-[15rem] text-end">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground max-w-[15rem] text-end">
          {sharing ? 'המנהל רואה את מיקומך הנוכחי' : 'המיקום שלך אינו משותף'}
        </p>
      )}
    </div>
  );
}
